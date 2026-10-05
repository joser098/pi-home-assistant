import { addDays, combine, parseIsoDate, startOfDay } from '../dates';
import type { CalEvent, ChangeKind, DataSource, Member, NewEvent, NewReminder, Recurrence, Reminder } from '../types';

const STORE_KEY = 'pihome.mock.v1';

const MEMBERS: Member[] = [
  { id: 'a', name: 'Jose', color: '#4f9cf9', role: 'person', googleEmail: 'a@example.com' },
  { id: 'b', name: 'Angi', color: '#f472b6', role: 'person', googleEmail: 'b@example.com' },
  { id: 'kiosk', name: 'Pantalla', color: '#a3a3a3', role: 'kiosk', googleEmail: null },
];

interface State {
  events: CalEvent[];
  reminders: Reminder[];
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function at(dayOffset: number, h: number, m = 0): Date {
  const d = addDays(startOfDay(new Date()), dayOffset);
  d.setHours(h, m, 0, 0);
  return d;
}

function timed(title: string, day: number, h: number, durMin: number, ownerId: string | null, location: string | null = null): CalEvent {
  const start = at(day, h);
  return { id: uid(), title, description: null, location, start, end: new Date(start.getTime() + durMin * 60_000), allDay: false, ownerId };
}

function allDay(title: string, day: number, days: number, ownerId: string | null): CalEvent {
  return { id: uid(), title, description: null, location: null, start: at(day, 0), end: at(day + days, 0), allDay: true, ownerId };
}

function reminder(title: string, due: Date | null, assignedTo: string | null, recurrence: Recurrence | null = null): Reminder {
  return { id: uid(), title, notes: null, dueAt: due, assignedTo, recurrence, doneAt: null, doneBy: null, createdBy: 'a' };
}

function seed(): State {
  return {
    events: [
      timed('Dentista', 0, 15, 60, 'a', 'Av. Corrientes 1234'),
      timed('Cena con amigos', 0, 21, 150, null),
      timed('Gimnasio', 1, 8, 60, 'b'),
      timed('Reunión de consorcio', 1, 19, 90, null),
      allDay('Cumpleaños de mamá', 3, 1, null),
      timed('Veterinaria', 4, 10, 30, 'b'),
      allDay('Viaje a Córdoba', 9, 3, null),
      timed('Turno médico', 12, 9, 30, 'a'),
      timed('Partido de fútbol', -2, 20, 120, 'a'),
    ],
    reminders: [
      reminder('Sacar la basura', at(0, 20), null, 'daily'),
      reminder('Pagar la luz', at(-1, 0), 'a'),
      reminder('Comprar alimento del perro', at(1, 0), 'b'),
      reminder('Llamar al plomero', null, 'a'),
      reminder('Regar las plantas', at(2, 9), null, 'weekly'),
    ],
  };
}

function revive(raw: string): State {
  const s = JSON.parse(raw) as State;
  const d = (v: unknown) => (v ? new Date(v as string) : null);
  return {
    events: s.events.map((e) => ({ ...e, start: new Date(e.start), end: new Date(e.end) })),
    reminders: s.reminders.map((r) => ({ ...r, dueAt: d(r.dueAt), doneAt: d(r.doneAt) })),
  };
}

export function nextOccurrence(d: Date, rec: Recurrence): Date {
  const n = new Date(d);
  if (rec === 'daily') n.setDate(n.getDate() + 1);
  if (rec === 'weekly') n.setDate(n.getDate() + 7);
  if (rec === 'monthly') n.setMonth(n.getMonth() + 1);
  if (rec === 'yearly') n.setFullYear(n.getFullYear() + 1);
  return n;
}

/** Datos de ejemplo en memoria (persistidos en localStorage) para desarrollar sin Supabase. */
export class MockDataSource implements DataSource {
  readonly kind = 'mock';
  private state: State;
  private listeners = new Set<(k: ChangeKind) => void>();
  private me: Member;

  constructor(kiosk: boolean) {
    this.me = kiosk ? MEMBERS[2] : MEMBERS[0];
    let state: State | null = null;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) state = revive(raw);
    } catch {
      state = null;
    }
    this.state = state ?? seed();
  }

  private save(kind: ChangeKind) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.state));
    } catch {
      /* sin storage: queda en memoria */
    }
    // Simula la latencia de Realtime.
    setTimeout(() => this.listeners.forEach((l) => l(kind)), 150);
  }

  async currentMember() {
    return this.me;
  }
  async signIn() {}
  async signOut() {
    localStorage.removeItem(STORE_KEY);
    location.reload();
  }

  async listMembers() {
    return MEMBERS;
  }

  async listEvents() {
    return this.state.events.map((e) => ({ ...e }));
  }

  async createEvent(e: NewEvent) {
    const start = e.time ? combine(e.date, e.time) : parseIsoDate(e.date);
    const end = e.time ? new Date(start.getTime() + e.durationMin * 60_000) : addDays(start, 1);
    this.state.events.push({
      id: uid(),
      title: e.title,
      description: null,
      location: e.location ?? null,
      start,
      end,
      allDay: !e.time,
      ownerId: e.ownerId,
    });
    this.save('events');
  }

  async deleteEvent(id: string) {
    this.state.events = this.state.events.filter((e) => e.id !== id);
    this.save('events');
  }

  async listReminders() {
    return this.state.reminders.map((r) => ({ ...r }));
  }

  async createReminder(r: NewReminder) {
    this.state.reminders.push({ ...reminder(r.title, r.dueAt, r.assignedTo, r.recurrence), notes: r.notes ?? null, createdBy: this.me.id });
    this.save('reminders');
  }

  async completeReminder(id: string) {
    const r = this.state.reminders.find((x) => x.id === id);
    if (!r || r.doneAt) return;
    r.doneAt = new Date();
    r.doneBy = this.me.id;
    if (r.recurrence) {
      const base = r.dueAt ?? startOfDay(new Date());
      this.state.reminders.push({ ...reminder(r.title, nextOccurrence(base, r.recurrence), r.assignedTo, r.recurrence), notes: r.notes });
      r.recurrence = null;
    }
    this.save('reminders');
  }

  async reopenReminder(id: string) {
    const r = this.state.reminders.find((x) => x.id === id);
    if (!r) return;
    r.doneAt = null;
    r.doneBy = null;
    this.save('reminders');
  }

  async deleteReminder(id: string) {
    this.state.reminders = this.state.reminders.filter((r) => r.id !== id);
    this.save('reminders');
  }

  async lastSync() {
    return new Date();
  }

  async savePushSubscription() {}
  async deletePushSubscription() {}
  async sendTestPush() {
    throw new Error('En modo demo no hay notificaciones push');
  }

  subscribe(onChange: (k: ChangeKind) => void) {
    this.listeners.add(onChange);
    return () => this.listeners.delete(onChange);
  }
}

