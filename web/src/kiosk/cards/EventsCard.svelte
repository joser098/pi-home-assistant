<script lang="ts">
  import { addDays, dayLabel, eventsOnDay, fmtTime, remindersOnDay, sameDay, startOfDay, weekdayShort } from '../../lib/dates';
  import { app } from '../../lib/store.svelte';
  import type { CalEvent, Selected } from '../../lib/types';
  import type { View } from '../views';
  import Card from './Card.svelte';

  let { go, onselect, onday }: { go: (v: View) => void; onselect: (s: Selected) => void; onday: (d: Date) => void } =
    $props();

  const SHOWN = 3;
  const MAX_DOTS = 3;

  // Próximos: los que todavía no terminaron, en orden de inicio.
  const upcoming = $derived(
    app.events.filter((e) => e.end > app.now).sort((a, b) => a.start.getTime() - b.start.getTime()),
  );
  const next = $derived(upcoming.slice(0, SHOWN));
  const week = $derived(Array.from({ length: 7 }, (_, i) => addDays(startOfDay(app.now), i)));

  function when(e: CalEvent): string {
    // Un evento que ya empezó (ej: viaje de varios días) se muestra como "Ahora".
    const start = e.start < app.now ? app.now : e.start;
    const day = dayLabel(start, app.now);
    if (e.allDay) return e.start < app.now ? 'En curso' : day;
    if (e.start <= app.now) return `Ahora · hasta ${fmtTime(e.end)}`;
    return `${day} · ${fmtTime(e.start)}`;
  }

  function dots(d: Date): string[] {
    return [
      ...eventsOnDay(app.events, d).map((e) => app.colorFor(e.ownerId)),
      ...remindersOnDay(app.reminders, d)
        .filter((r) => !r.doneAt)
        .map((r) => app.colorFor(r.assignedTo)),
    ];
  }
</script>

<Card title="Próximos eventos" onopen={() => go('agenda')}>
  {#snippet actions()}
    <button class="pill" onclick={() => go('week')}>Semana</button>
    <button class="pill" onclick={() => go('month')}>Mes</button>
  {/snippet}

  <div class="list">
    {#each next as e (e.id)}
      <button class="ev" style:--c={app.colorFor(e.ownerId)} onclick={() => onselect({ type: 'event', item: e })}>
        <span class="bar"></span>
        <span class="txt">
          <span class="title">{e.title}</span>
          <span class="when">{when(e)}</span>
        </span>
      </button>
    {:else}
      <p class="empty">Sin eventos próximos</p>
    {/each}
    {#if upcoming.length > SHOWN}
      <button class="more" onclick={() => go('agenda')}>+{upcoming.length - SHOWN} más</button>
    {/if}
  </div>

  <div class="week">
    {#each week as d (d.getTime())}
      {@const ds = dots(d)}
      <button class="day" class:today={sameDay(d, app.now)} onclick={() => onday(d)}>
        <span class="wd">{weekdayShort(d)}</span>
        <span class="num">{d.getDate()}</span>
        <span class="dots">
          {#each ds.slice(0, MAX_DOTS) as c, i (i)}<span class="dot" style:background={c}></span>{/each}
        </span>
      </button>
    {/each}
  </div>
</Card>

<style>
  .pill {
    min-height: 40px;
    padding: 0 14px;
    border-radius: 999px;
    background: var(--surface-2);
    font-size: 14px;
    font-weight: 600;
  }
  .pill:active {
    background: var(--border);
  }
  .list {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ev {
    display: flex;
    align-items: stretch;
    gap: 10px;
    text-align: left;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
    min-height: 58px;
  }
  .ev:active {
    background: var(--border);
  }
  .bar {
    width: 5px;
    border-radius: 3px;
    background: var(--c);
    flex: none;
  }
  .txt {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  }
  .title {
    font-weight: 600;
    font-size: 17px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .when {
    font-size: 14px;
    color: var(--text-2);
  }
  .more {
    align-self: flex-start;
    min-height: 32px;
    font-size: 14px;
    color: var(--text-3);
  }
  .week {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-top: 8px;
  }
  .day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 0;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
  }
  .day.today {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .wd {
    font-size: 11px;
    color: var(--text-3);
    text-transform: capitalize;
  }
  .num {
    font-size: 16px;
    font-weight: 700;
  }
  .today .num {
    color: var(--accent);
  }
  .dots {
    display: flex;
    gap: 3px;
    height: 7px;
  }
  .dots .dot {
    width: 6px;
    height: 6px;
  }
</style>
