// Versículo del día: se pide una vez por día y se cachea (sirve sin internet).
import { data } from './data';
import { isoDate } from './dates';
import type { Verse } from './types';

const CACHE_KEY = 'pihome.verse.v1';
const CHECK_MS = 30 * 60_000;

class VerseState {
  current = $state<Verse | null>(null);
  private started = false;

  start() {
    if (this.started) return;
    this.started = true;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) this.current = JSON.parse(raw);
    } catch {
      /* sin storage */
    }
    void this.refresh();
    // Cada media hora: si cambió el día, trae el nuevo.
    setInterval(() => void this.refresh(), CHECK_MS);
  }

  async refresh() {
    if (this.current?.day === isoDate(new Date())) return;
    const v = await data.verseOfDay().catch(() => null);
    if (!v) return;
    this.current = v;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(v));
    } catch {
      /* sin storage */
    }
  }
}

export const verse = new VerseState();
