import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { parseIsoDate } from '../dates';
import type { CalEvent, ChangeKind, DataSource, Member, NewEvent, NewReminder, Recurrence, Reminder, Verse } from '../types';

interface MemberRow {
  id: string;
  name: string;
  color: string;
  role: 'person' | 'kiosk';
  google_email: string | null;
}

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  all_day: boolean;
  start_at: string | null;
  end_at: string | null;
  start_date: string | null;
  end_date: string | null;
  owner_id: string | null;
}

interface ReminderRow {
  id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  assigned_to: string | null;
  recurrence: Recurrence | null;
  done_at: string | null;
  done_by: string | null;
  created_by: string | null;
}

const toDate = (s: string | null) => (s ? new Date(s) : null);

function toMember(r: MemberRow): Member {
  return { id: r.id, name: r.name, color: r.color, role: r.role, googleEmail: r.google_email };
}

function toEvent(r: EventRow): CalEvent {
  const allDay = r.all_day;
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    location: r.location,
    allDay,
    start: allDay ? parseIsoDate(r.start_date!) : new Date(r.start_at!),
    end: allDay ? parseIsoDate(r.end_date!) : new Date(r.end_at!),
    ownerId: r.owner_id,
  };
}

function toReminder(r: ReminderRow): Reminder {
  return {
    id: r.id,
    title: r.title,
    notes: r.notes,
    dueAt: toDate(r.due_at),
    assignedTo: r.assigned_to,
    recurrence: r.recurrence,
    doneAt: toDate(r.done_at),
    doneBy: r.done_by,
    createdBy: r.created_by,
  };
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

function rows<T>(res: { data: unknown[] | null; error: { message: string } | null }): T[] {
  return (check(res) ?? []) as T[];
}

/** Recordatorios hechos que se siguen mostrando (para poder deshacer). */
const DONE_VISIBLE_DAYS = 7;

export class SupabaseDataSource implements DataSource {
  readonly kind = 'supabase';
  readonly client: SupabaseClient;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }

  async currentMember(): Promise<Member | null> {
    const { data } = await this.client.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return null;
    const row = check(await this.client.from('members').select('*').eq('id', uid).maybeSingle<MemberRow>());
    if (!row) throw new Error('Tu usuario no está habilitado en esta casa (falta en la tabla members).');
    return toMember(row);
  }

  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : error.message);
  }

  async signOut() {
    await this.client.auth.signOut();
  }

  async listMembers() {
    return rows<MemberRow>(await this.client.from('members').select('*').order('created_at')).map(toMember);
  }

  async listEvents() {
    return rows<EventRow>(await this.client.from('events_cache').select('*')).map(toEvent);
  }

  private async invokeEvents(body: Record<string, unknown>) {
    const { error } = await this.client.functions.invoke('calendar-events', { body });
    if (error) {
      let msg = error.message;
      try {
        const ctx = (error as { context?: Response }).context;
        const j = ctx ? await ctx.json() : null;
        if (j?.error) msg = j.error;
      } catch {
        /* respuesta sin JSON */
      }
      throw new Error(msg);
    }
  }

  async createEvent(e: NewEvent) {
    await this.invokeEvents({
      action: 'create',
      event: { ...e, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    });
  }

  async deleteEvent(id: string) {
    await this.invokeEvents({ action: 'delete', id });
  }

  async listReminders() {
    const since = new Date(Date.now() - DONE_VISIBLE_DAYS * 86_400_000).toISOString();
    return rows<ReminderRow>(
      await this.client.from('reminders').select('*').or(`done_at.is.null,done_at.gte.${since}`).order('due_at', { nullsFirst: false }),
    ).map(toReminder);
  }

  async createReminder(r: NewReminder) {
    check(
      await this.client.from('reminders').insert({
        title: r.title,
        notes: r.notes ?? null,
        due_at: r.dueAt?.toISOString() ?? null,
        assigned_to: r.assignedTo,
        recurrence: r.recurrence,
      }),
    );
  }

  async completeReminder(id: string) {
    check(await this.client.rpc('complete_reminder', { p_id: id }));
  }

  async reopenReminder(id: string) {
    check(await this.client.from('reminders').update({ done_at: null, done_by: null }).eq('id', id));
  }

  async deleteReminder(id: string) {
    check(await this.client.from('reminders').delete().eq('id', id));
  }

  async lastSync() {
    const row = check(await this.client.from('sync_state').select('value').eq('key', 'calendar').maybeSingle<{ value: { last_sync?: string } }>());
    return toDate(row?.value.last_sync ?? null);
  }

  async savePushSubscription(sub: PushSubscriptionJSON) {
    const { data } = await this.client.auth.getSession();
    check(
      await this.client.from('push_subscriptions').upsert(
        {
          member_id: data.session!.user.id,
          endpoint: sub.endpoint,
          p256dh: sub.keys!.p256dh,
          auth: sub.keys!.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: 'endpoint' },
      ),
    );
  }

  async deletePushSubscription(endpoint: string) {
    check(await this.client.from('push_subscriptions').delete().eq('endpoint', endpoint));
  }

  async sendTestPush() {
    const { error } = await this.client.functions.invoke('send-reminders', { body: { test: true } });
    if (error) throw new Error('No se pudo enviar la notificación de prueba');
  }

  async verseOfDay(): Promise<Verse | null> {
    const { data, error } = await this.client.functions.invoke('verse-of-day', { method: 'GET' });
    if (error || !data?.content) {
      console.warn('[pihome] versículo del día no disponible', error);
      return null;
    }
    return { day: data.day, reference: data.reference, content: data.content, version: data.version ?? null };
  }

  subscribe(onChange: (k: ChangeKind) => void) {
    const tables: Record<string, ChangeKind> = { events_cache: 'events', reminders: 'reminders', members: 'members' };
    let channel = this.client.channel('pihome-changes');
    for (const [table, kind] of Object.entries(tables)) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange(kind));
    }
    channel.subscribe();
    return () => {
      this.client.removeChannel(channel);
    };
  }
}
