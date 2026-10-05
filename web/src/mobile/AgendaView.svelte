<script lang="ts">
  import EventItem from '../lib/components/EventItem.svelte';
  import ReminderItem from '../lib/components/ReminderItem.svelte';
  import { addDays, dayLabel, eventsOnDay, fmtShortDate, remindersOnDay, startOfDay } from '../lib/dates';
  import { app } from '../lib/store.svelte';
  import type { Selected } from '../lib/types';
  import WeatherCard from './WeatherCard.svelte';

  let { onselect }: { onselect: (s: Selected) => void } = $props();

  const PAGE_DAYS = 30;
  let daysShown = $state(PAGE_DAYS);

  const days = $derived.by(() => {
    const today = startOfDay(app.now);
    const out = [];
    for (let i = 0; i < daysShown; i++) {
      const d = addDays(today, i);
      const events = eventsOnDay(app.events, d);
      const reminders = remindersOnDay(app.reminders, d).filter((r) => !r.doneAt);
      // "Hoy" siempre aparece aunque esté vacío.
      if (i === 0 || events.length || reminders.length) out.push({ d, events, reminders });
    }
    return out;
  });
</script>

<WeatherCard />

{#each days as { d, events, reminders } (d.getTime())}
  {@const label = dayLabel(d, app.now)}
  <section>
    <h3 class="section-title">
      {label}{#if label === 'Hoy' || label === 'Mañana'}<span class="muted">&nbsp;· {fmtShortDate(d)}</span>{/if}
    </h3>
    <div class="list">
      {#each events as e (e.id)}
        <EventItem event={e} onclick={() => onselect({ type: 'event', item: e })} />
      {/each}
      {#each reminders as r (r.id)}
        <ReminderItem reminder={r} onclick={() => onselect({ type: 'reminder', item: r })} />
      {/each}
      {#if !events.length && !reminders.length}
        <p class="empty">Nada para hoy</p>
      {/if}
    </div>
  </section>
{/each}

<button class="btn more" onclick={() => (daysShown += PAGE_DAYS)}>Ver más días</button>

<style>
  section {
    margin-bottom: 20px;
  }
  .section-title .muted {
    text-transform: none;
    letter-spacing: 0;
    font-weight: 500;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .more {
    width: 100%;
  }
</style>
