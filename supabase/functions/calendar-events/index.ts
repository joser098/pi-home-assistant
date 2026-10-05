// Crear y borrar eventos en Google Calendar en nombre de un miembro.
// Después de escribir en Google actualiza events_cache, así la app lo ve al instante.
import { loadMembers, OWNER_PROP, toRow } from '../_shared/calendar.ts';
import { calendarId, deleteEvent, type GEvent, insertEvent } from '../_shared/google.ts';
import { adminClient, corsHeaders, json, memberFromRequest } from '../_shared/supabase.ts';

interface NewEvent {
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM
  durationMin: number;
  ownerId: string | null;
  location?: string | null;
  timeZone: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/** Suma minutos a una fecha/hora "de pared" sin depender de la zona horaria. */
function addMinutes(date: string, time: string, minutes: number): string {
  const d = new Date(`${date}T${time}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString().slice(0, 19);
}

function nextDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function validate(e: NewEvent): string | null {
  if (!e?.title?.trim()) return 'Falta el título';
  if (!DATE_RE.test(e.date)) return 'Fecha inválida';
  if (e.time !== null && !TIME_RE.test(e.time)) return 'Hora inválida';
  if (e.time !== null && !(e.durationMin > 0 && e.durationMin <= 24 * 60)) return 'Duración inválida';
  if (!e.timeZone) return 'Falta la zona horaria';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = adminClient();
  const member = await memberFromRequest(admin, req);
  if (!member) return json({ error: 'no autorizado' }, 401);

  try {
    const body = await req.json();
    const calId = calendarId();

    if (body.action === 'create') {
      const e = body.event as NewEvent;
      const invalid = validate(e);
      if (invalid) return json({ error: invalid }, 400);

      const members = await loadMembers(admin);
      if (e.ownerId && !members.some((m) => m.id === e.ownerId)) return json({ error: 'Miembro desconocido' }, 400);

      const gEvent: Partial<GEvent> = {
        summary: e.title.trim(),
        location: e.location?.trim() || undefined,
        start: e.time ? { dateTime: `${e.date}T${e.time}:00`, timeZone: e.timeZone } : { date: e.date },
        end: e.time
          ? { dateTime: addMinutes(e.date, e.time, e.durationMin), timeZone: e.timeZone }
          : { date: nextDay(e.date) },
        description: `Agregado desde Casa por ${member.name}`,
        extendedProperties: { private: { [OWNER_PROP]: e.ownerId ?? 'both' } },
      };
      const created = await insertEvent(calId, gEvent);
      const { error } = await admin.from('events_cache').upsert(toRow(created, calId, members));
      if (error) throw error;
      return json({ ok: true, id: created.id });
    }

    if (body.action === 'delete') {
      if (typeof body.id !== 'string' || !body.id) return json({ error: 'Falta el id' }, 400);
      await deleteEvent(calId, body.id);
      const { error } = await admin.from('events_cache').delete().eq('id', body.id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: 'Acción desconocida' }, 400);
  } catch (err) {
    console.error('calendar-events', err);
    return json({ error: 'No se pudo guardar en Google Calendar' }, 502);
  }
});
