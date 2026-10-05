export type Role = 'person' | 'kiosk';

export interface Member {
  id: string;
  name: string;
  color: string;
  role: Role;
  googleEmail: string | null;
}

/** Evento de Google Calendar (copia de solo lectura en events_cache). */
export interface CalEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  /** Para eventos de todo el día: medianoche local del primer día. */
  start: Date;
  /** Exclusivo. Para todo el día: medianoche local del día siguiente al último. */
  end: Date;
  allDay: boolean;
  /** null = de los dos / de la casa. */
  ownerId: string | null;
}

export type Recurrence = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Reminder {
  id: string;
  title: string;
  notes: string | null;
  dueAt: Date | null;
  /** null = para los dos. */
  assignedTo: string | null;
  recurrence: Recurrence | null;
  doneAt: Date | null;
  doneBy: string | null;
  createdBy: string | null;
}

export interface NewEvent {
  title: string;
  /** YYYY-MM-DD (local). */
  date: string;
  /** HH:MM (local) o null para todo el día. */
  time: string | null;
  durationMin: number;
  ownerId: string | null;
  location?: string | null;
}

export interface NewReminder {
  title: string;
  notes?: string | null;
  dueAt: Date | null;
  assignedTo: string | null;
  recurrence: Recurrence | null;
}

export interface Verse {
  /** YYYY-MM-DD (fecha local de la casa). */
  day: string;
  reference: string;
  content: string;
  version: string | null;
}

export type ChangeKind = 'events' | 'reminders' | 'members';

export interface DataSource {
  readonly kind: 'mock' | 'supabase';
  /** Devuelve el miembro logueado, o null si no hay sesión. */
  currentMember(): Promise<Member | null>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;

  listMembers(): Promise<Member[]>;
  listEvents(): Promise<CalEvent[]>;
  createEvent(e: NewEvent): Promise<void>;
  deleteEvent(id: string): Promise<void>;

  listReminders(): Promise<Reminder[]>;
  createReminder(r: NewReminder): Promise<void>;
  completeReminder(id: string): Promise<void>;
  reopenReminder(id: string): Promise<void>;
  deleteReminder(id: string): Promise<void>;

  /** Fecha del último sync con Google, si se conoce. */
  lastSync(): Promise<Date | null>;

  savePushSubscription(sub: PushSubscriptionJSON): Promise<void>;
  deletePushSubscription(endpoint: string): Promise<void>;
  sendTestPush(): Promise<void>;

  /** Versículo del día (YouVersion), o null si no está disponible. */
  verseOfDay(): Promise<Verse | null>;

  subscribe(onChange: (kind: ChangeKind) => void): () => void;
}

export type Selected = { type: 'event'; item: CalEvent } | { type: 'reminder'; item: Reminder };
