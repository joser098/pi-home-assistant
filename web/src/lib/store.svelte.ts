import { data } from './data';
import { weather } from './weather.svelte';
import type { CalEvent, ChangeKind, Member, Reminder } from './types';

const CACHE_KEY = 'pihome.cache.v1';
export const BOTH_COLOR = '#f5b942';

type Status = 'loading' | 'login' | 'ready' | 'error';

interface Cache {
  members: Member[];
  events: CalEvent[];
  reminders: Reminder[];
  lastSync: string | null;
}

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    const d = (v: string | null) => (v ? new Date(v) : null);
    return {
      members: c.members,
      events: c.events.map((e: CalEvent & { start: string; end: string }) => ({ ...e, start: new Date(e.start), end: new Date(e.end) })),
      reminders: c.reminders.map((r: Reminder & { dueAt: string | null; doneAt: string | null }) => ({
        ...r,
        dueAt: d(r.dueAt),
        doneAt: d(r.doneAt),
      })),
      lastSync: c.lastSync,
    };
  } catch {
    return null;
  }
}

class AppState {
  status = $state<Status>('loading');
  error = $state<string | null>(null);
  me = $state<Member | null>(null);
  members = $state<Member[]>([]);
  events = $state<CalEvent[]>([]);
  reminders = $state<Reminder[]>([]);
  lastSync = $state<Date | null>(null);
  online = $state(navigator.onLine);
  now = $state(new Date());
  toast = $state<{ text: string; kind: 'ok' | 'error' } | null>(null);

  people = $derived(this.members.filter((m) => m.role === 'person'));
  pendingReminders = $derived(
    this.reminders
      .filter((r) => !r.doneAt)
      .sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity)),
  );

  private unsubscribe: (() => void) | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  async init() {
    setInterval(() => (this.now = new Date()), 15_000);
    weather.start();
    addEventListener('online', () => {
      this.online = true;
      void this.refresh();
    });
    addEventListener('offline', () => (this.online = false));
    // Al volver a la app (celular) refrescamos, porque Realtime puede haberse cortado.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.status === 'ready') void this.refresh();
    });

    const cache = readCache();
    if (cache) {
      this.members = cache.members;
      this.events = cache.events;
      this.reminders = cache.reminders;
      this.lastSync = cache.lastSync ? new Date(cache.lastSync) : null;
    }

    try {
      this.me = await data.currentMember();
    } catch (e) {
      // Sin internet pero con cache: mostramos lo último que tenemos.
      if (cache && !navigator.onLine) {
        this.status = 'ready';
        return;
      }
      this.fail(e);
      return;
    }
    if (!this.me) {
      this.status = 'login';
      return;
    }
    await this.start();
  }

  private async start() {
    await this.refresh();
    this.unsubscribe?.();
    this.unsubscribe = data.subscribe((kind) => void this.refresh(kind));
    // Respaldo por si Realtime se pierde algún cambio.
    setInterval(() => void this.refresh(), 5 * 60_000);
    this.status = 'ready';
  }

  async refresh(kind?: ChangeKind) {
    try {
      const all = !kind;
      const [members, events, reminders, lastSync] = await Promise.all([
        all || kind === 'members' ? data.listMembers() : null,
        all || kind === 'events' ? data.listEvents() : null,
        all || kind === 'reminders' ? data.listReminders() : null,
        all || kind === 'events' ? data.lastSync() : null,
      ]);
      if (members) this.members = members;
      if (events) this.events = events;
      if (reminders) this.reminders = reminders;
      if (lastSync) this.lastSync = lastSync;
      this.saveCache();
    } catch (e) {
      console.warn('[pihome] refresh falló', e);
      if (this.status !== 'ready') this.fail(e);
    }
  }

  private saveCache() {
    try {
      const c: Cache = {
        members: this.members,
        events: this.events,
        reminders: this.reminders,
        lastSync: this.lastSync?.toISOString() ?? null,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
    } catch {
      /* sin storage */
    }
  }

  private fail(e: unknown) {
    this.error = e instanceof Error ? e.message : String(e);
    this.status = 'error';
  }

  async signIn(email: string, password: string) {
    await data.signIn(email, password);
    this.me = await data.currentMember();
    if (this.me) await this.start();
  }

  async signOut() {
    this.unsubscribe?.();
    await data.signOut();
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      /* sin storage */
    }
    location.reload();
  }

  /** Ejecuta una acción mostrando un toast con el resultado. Devuelve true si salió bien. */
  async act(fn: () => Promise<void>, okText?: string): Promise<boolean> {
    try {
      await fn();
      if (okText) this.showToast(okText, 'ok');
      return true;
    } catch (e) {
      this.showToast(e instanceof Error ? e.message : 'Algo salió mal', 'error');
      return false;
    }
  }

  showToast(text: string, kind: 'ok' | 'error' = 'ok') {
    clearTimeout(this.toastTimer);
    this.toast = { text, kind };
    this.toastTimer = setTimeout(() => (this.toast = null), kind === 'error' ? 5000 : 2500);
  }

  member(id: string | null): Member | null {
    return id ? (this.members.find((m) => m.id === id) ?? null) : null;
  }

  colorFor(id: string | null): string {
    return this.member(id)?.color ?? BOTH_COLOR;
  }

  nameFor(id: string | null): string {
    return this.member(id)?.name ?? 'Los dos';
  }
}

export const app = new AppState();
