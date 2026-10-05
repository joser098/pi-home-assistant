<script lang="ts">
  import { addDays, eventsOnDay, fmtTime, remindersOnDay, sameDay, startOfWeek, weekdayShort } from '../lib/dates';
  import { app } from '../lib/store.svelte';
  import type { Selected } from '../lib/types';

  let { onselect, onday }: { onselect: (s: Selected) => void; onday: (d: Date) => void } = $props();

  let offset = $state(0);
  const monday = $derived(addDays(startOfWeek(app.now), offset * 7));
  const days = $derived(Array.from({ length: 7 }, (_, i) => addDays(monday, i)));
  const range = $derived(
    `${monday.getDate()}/${monday.getMonth() + 1} – ${days[6].getDate()}/${days[6].getMonth() + 1}`,
  );
</script>

<div class="week">
  <div class="bar">
    <button class="btn" onclick={() => offset--} aria-label="Semana anterior">‹</button>
    <button class="btn label" onclick={() => (offset = 0)}>{offset === 0 ? 'Esta semana' : range}</button>
    <button class="btn" onclick={() => offset++} aria-label="Semana siguiente">›</button>
  </div>
  <div class="cols">
    {#each days as d (d.getTime())}
      {@const isToday = sameDay(d, app.now)}
      <div class="col" class:today={isToday}>
        <button class="head" onclick={() => onday(d)}>
          <span class="wd">{weekdayShort(d)}</span>
          <span class="num">{d.getDate()}</span>
        </button>
        <div class="items scroll">
          {#each eventsOnDay(app.events, d) as e (e.id)}
            <button class="chip-ev" style:--c={app.colorFor(e.ownerId)} onclick={() => onselect({ type: 'event', item: e })}>
              {#if !e.allDay}<b>{fmtTime(e.start)}</b>{/if}
              {e.title}
            </button>
          {/each}
          {#each remindersOnDay(app.reminders, d).filter((r) => !r.doneAt) as r (r.id)}
            <button class="chip-ev rem" style:--c={app.colorFor(r.assignedTo)} onclick={() => onselect({ type: 'reminder', item: r })}>
              ○ {r.title}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .week {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 8px;
  }
  .bar {
    display: flex;
    gap: 8px;
  }
  .bar .btn {
    min-height: 40px;
    min-width: 56px;
    font-size: 20px;
  }
  .bar .label {
    flex: 1;
    font-size: 15px;
  }
  .cols {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }
  .col {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    background: var(--surface);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  .col.today {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .head {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 0;
    min-height: 48px;
  }
  .wd {
    font-size: 12px;
    text-transform: capitalize;
    color: var(--text-2);
  }
  .num {
    font-size: 18px;
    font-weight: 700;
  }
  .today .num {
    color: var(--accent);
  }
  .items {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 0 3px 4px;
  }
  .chip-ev {
    text-align: left;
    font-size: 12px;
    line-height: 1.25;
    padding: 5px 5px 5px 7px;
    border-radius: 6px;
    border-left: 3px solid var(--c);
    background: color-mix(in srgb, var(--c) 16%, var(--surface-2));
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    word-break: break-word;
    flex: none;
  }
  .chip-ev b {
    display: block;
    font-size: 11px;
  }
  .rem {
    background: var(--surface-2);
    color: var(--text-2);
  }
</style>
