<script lang="ts">
  import { addDays, addMonths, eventsOnDay, fmtMonth, remindersOnDay, sameDay, startOfWeek } from '../lib/dates';
  import { app } from '../lib/store.svelte';

  let { onday }: { onday: (d: Date) => void } = $props();

  const WEEKDAYS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];
  const MAX_DOTS = 4;

  let offset = $state(0);
  const month = $derived(addMonths(app.now, offset));
  const first = $derived(startOfWeek(month));
  const cells = $derived(Array.from({ length: 42 }, (_, i) => addDays(first, i)));

  function dots(d: Date): string[] {
    const evs = eventsOnDay(app.events, d).map((e) => app.colorFor(e.ownerId));
    const rems = remindersOnDay(app.reminders, d)
      .filter((r) => !r.doneAt)
      .map((r) => app.colorFor(r.assignedTo));
    return [...evs, ...rems];
  }
</script>

<div class="month">
  <div class="bar">
    <button class="btn" onclick={() => offset--} aria-label="Mes anterior">‹</button>
    <button class="btn label" onclick={() => (offset = 0)}>{fmtMonth(month)}</button>
    <button class="btn" onclick={() => offset++} aria-label="Mes siguiente">›</button>
  </div>
  <div class="grid">
    {#each WEEKDAYS as w (w)}
      <div class="wd">{w}</div>
    {/each}
    {#each cells as d (d.getTime())}
      {@const ds = dots(d)}
      <button
        class="cell"
        class:other={d.getMonth() !== month.getMonth()}
        class:today={sameDay(d, app.now)}
        onclick={() => onday(d)}
      >
        <span class="num">{d.getDate()}</span>
        <span class="dots">
          {#each ds.slice(0, MAX_DOTS) as c, i (i)}
            <span class="dot" style:background={c}></span>
          {/each}
          {#if ds.length > MAX_DOTS}<span class="more">+{ds.length - MAX_DOTS}</span>{/if}
        </span>
      </button>
    {/each}
  </div>
</div>

<style>
  .month {
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 6px;
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
  .grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: auto repeat(6, 1fr);
    gap: 3px;
  }
  .wd {
    text-align: center;
    font-size: 12px;
    color: var(--text-3);
    text-transform: uppercase;
    font-weight: 700;
  }
  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    border-radius: 8px;
    background: var(--surface);
    min-height: 0;
  }
  .cell:active {
    background: var(--surface-2);
  }
  .other {
    opacity: 0.35;
  }
  .num {
    font-size: 16px;
    font-weight: 600;
    line-height: 1;
  }
  .today .num {
    background: var(--accent);
    color: var(--accent-text);
    border-radius: 999px;
    padding: 3px 7px;
  }
  .dots {
    display: flex;
    gap: 3px;
    align-items: center;
    height: 8px;
  }
  .dots .dot {
    width: 7px;
    height: 7px;
  }
  .more {
    font-size: 10px;
    color: var(--text-2);
  }
</style>
