import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { calendarId, type GEvent, listEvents, stopChannel, watch } from './google.ts';
import { cronSecret, type MemberRow } from './supabase.ts';

/** Propiedad privada donde guardamos para quién es el evento (id de miembro o "both"). */
export const OWNER_PROP = 'pihome_owner';

const DAY_MS = 86_400_000;
const PAST_DAYS = 30;
const FUTURE_DAYS = 365;
/** Los canales de Google duran como máximo ~7 días; renovamos con 1 día de margen. */
const CHANNEL_TTL_S = 7 * 24 * 3600;
const RENEW_BEFORE_MS = DAY_MS;

export function toRow(e: GEvent, calId: string, members: MemberRow[]) {
  const allDay = !!e.start.date;
  const owner = e.extendedProperties?.private?.[OWNER_PROP];
  let ownerId: string | null = null;
  if (owner && owner !== 'both') {
    ownerId = members.some((m) => m.id === owner) ? owner : null;
  } else if (!owner && e.creator?.email) {
    const email = e.creator.email.toLowerCase();
    ownerId = members.find((m) => m.google_email?.toLowerCase() === email)?.id ?? null;
  }
  return {
    id: e.id,
    calendar_id: calId,
    title: e.summary ?? '(sin título)',
    description: e.description ?? null,
    location: e.location ?? null,
    all_day: allDay,
    start_at: allDay ? null : e.start.dateTime,
    end_at: allDay ? null : e.end.dateTime,
    start_date: allDay ? e.start.date : null,
    end_date: allDay ? e.end.date : null,
    owner_id: ownerId,
    creator_email: e.creator?.email ?? null,
    html_link: e.htmlLink ?? null,
    google_updated: e.updated ?? null,
    synced_at: new Date().toISOString(),
  };
}

export async function loadMembers(admin: SupabaseClient): Promise<MemberRow[]> {
  const { data, error } = await admin.from('members').select('id, name, role, google_email');
  if (error) throw error;
  return data ?? [];
}

async function getState(admin: SupabaseClient): Promise<Record<string, unknown>> {
  const { data } = await admin.from('sync_state').select('value').eq('key', 'calendar').maybeSingle();
  return (data?.value as Record<string, unknown>) ?? {};
}

async function setState(admin: SupabaseClient, patch: Record<string, unknown>) {
  const value = { ...(await getState(admin)), ...patch };
  const { error } = await admin.from('sync_state').upsert({ key: 'calendar', value, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Trae la ventana [hoy-30d, hoy+365d] de Google y deja events_cache igual. */
export async function syncCalendar(admin: SupabaseClient): Promise<{ count: number }> {
  const calId = calendarId();
  const now = Date.now();
  const [events, members] = await Promise.all([
    listEvents(calId, new Date(now - PAST_DAYS * DAY_MS), new Date(now + FUTURE_DAYS * DAY_MS)),
    loadMembers(admin),
  ]);
  const rows = events.map((e) => toRow(e, calId, members));

  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await admin.from('events_cache').upsert(rows.slice(i, i + 500));
    if (error) throw error;
  }

  // Borrar lo que ya no está en Google (o salió de la ventana).
  const { data: cachedIds, error: idsError } = await admin.from('events_cache').select('id').eq('calendar_id', calId);
  if (idsError) throw idsError;
  const keep = new Set(rows.map((r) => r.id));
  const stale = (cachedIds ?? []).map((r) => r.id as string).filter((id) => !keep.has(id));
  for (let i = 0; i < stale.length; i += 200) {
    const { error } = await admin.from('events_cache').delete().in('id', stale.slice(i, i + 200));
    if (error) throw error;
  }
  // También limpiamos calendarios viejos si se cambió GOOGLE_CALENDAR_ID.
  await admin.from('events_cache').delete().neq('calendar_id', calId);

  await setState(admin, { last_sync: new Date().toISOString(), last_count: rows.length, last_error: null });
  return { count: rows.length };
}

export async function recordError(admin: SupabaseClient, err: unknown) {
  try {
    await setState(admin, { last_error: String(err), last_error_at: new Date().toISOString() });
  } catch {
    /* no tapar el error original */
  }
}

/** Crea o renueva el canal de notificaciones push de Google hacia calendar-sync. */
export async function ensureWatch(admin: SupabaseClient): Promise<'ok' | 'renewed'> {
  const state = await getState(admin);
  const ch = state.channel as { id: string; resourceId: string; expiration: number } | undefined;
  if (ch && ch.expiration - Date.now() > RENEW_BEFORE_MS) return 'ok';

  const address = `${Deno.env.get('SUPABASE_URL')}/functions/v1/calendar-sync`;
  const fresh = await watch(calendarId(), address, cronSecret(), CHANNEL_TTL_S);
  await setState(admin, { channel: fresh });
  if (ch) {
    try {
      await stopChannel(ch);
    } catch (e) {
      console.warn('No se pudo cerrar el canal anterior', e);
    }
  }
  return 'renewed';
}
