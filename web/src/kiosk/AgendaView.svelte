<script lang="ts">
  import EventItem from '../lib/components/EventItem.svelte';
  import { addDays, dayLabel, eventsOnDay, startOfDay } from '../lib/dates';
  import { app } from '../lib/store.svelte';
  import type { Selected } from '../lib/types';

  let { onselect, onday }: { onselect: (s: Selected) => void; onday: (d: Date) => void } = $props();

  const DAYS = 60;

  // Días con eventos desde hoy (hoy siempre aparece).
  const days = $derived.by(() => {
    const today = startOfDay(app.now);
    const out = [];
    for (let i = 0; i < DAYS; i++) {
      const d = addDays(today, i);
      const events = eventsOnDay(app.events, d).filter((e) => i > 0 || e.allDay || e.end > app.now);
      if (i === 0 || events.length) out.push({ d, events });
    }
    return out;
  });
</script>

<div class="agenda scroll">
  {#each days as { d, events } (d.getTime())}
    <section>
      <button class="day" onclick={() => onday(d)}>{dayLabel(d, app.now)}</button>
      <div class="list">
        {#each events as e (e.id)}
          <EventItem event={e} onclick={() => onselect({ type: 'event', item: e })} />
        {:else}
          <p class="empty">Nada más por hoy</p>
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .agenda {
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px 12px;
    align-content: start;
  }
  section {
    min-width: 0;
    margin-bottom: 8px;
  }
  .day {
    min-height: 32px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
