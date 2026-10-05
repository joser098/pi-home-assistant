import { config } from './config';
import type { CalEvent, Reminder } from './types';

const DAY_MS = 86_400_000;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes());
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Lunes de la semana de `d`. */
export function startOfWeek(d: Date): Date {
  const day = (d.getDay() + 6) % 7;
  return addDays(startOfDay(d), -day);
}

/** YYYY-MM-DD en hora local. */
export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Parsea YYYY-MM-DD como medianoche local (no UTC). */
export function parseIsoDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Combina YYYY-MM-DD + HH:MM en un Date local. */
export function combine(date: string, time: string): Date {
  const [h, min] = time.split(':').map(Number);
  const d = parseIsoDate(date);
  d.setHours(h, min, 0, 0);
  return d;
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString(config.locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function fmtLongDate(d: Date): string {
  const s = d.toLocaleDateString(config.locale, { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtShortDate(d: Date): string {
  return d.toLocaleDateString(config.locale, { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
}

export function fmtMonth(d: Date): string {
  const s = d.toLocaleDateString(config.locale, { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function weekdayShort(d: Date): string {
  return d.toLocaleDateString(config.locale, { weekday: 'short' }).replace('.', '');
}

/** "Hoy", "Mañana", "Ayer" o fecha corta. */
export function dayLabel(d: Date, now = new Date()): string {
  const diff = Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY_MS);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  const s = fmtShortDate(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function eventTimeLabel(e: CalEvent): string {
  if (e.allDay) return 'Todo el día';
  return `${fmtTime(e.start)} – ${fmtTime(e.end)}`;
}

/** Eventos que ocupan algún momento de `day`, ordenados (todo el día primero). */
export function eventsOnDay(events: CalEvent[], day: Date): CalEvent[] {
  const from = startOfDay(day).getTime();
  const to = addDays(startOfDay(day), 1).getTime();
  return events
    .filter((e) => e.start.getTime() < to && (e.end.getTime() > from || e.start.getTime() === from))
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.getTime() - b.start.getTime());
}

export function remindersOnDay(reminders: Reminder[], day: Date): Reminder[] {
  return reminders.filter((r) => r.dueAt && sameDay(r.dueAt, day));
}

export function isOverdue(r: Reminder, now = new Date()): boolean {
  return !r.doneAt && !!r.dueAt && r.dueAt.getTime() < now.getTime();
}

/** Recordatorios con hora 00:00 se consideran "en el día", sin hora. */
export function hasTime(d: Date): boolean {
  return d.getHours() !== 0 || d.getMinutes() !== 0;
}
