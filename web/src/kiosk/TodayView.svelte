<script lang="ts">
  import EventItem from '../lib/components/EventItem.svelte';
  import ReminderItem from '../lib/components/ReminderItem.svelte';
  import { addDays, eventsOnDay, startOfDay } from '../lib/dates';
  import { app } from '../lib/store.svelte';
  import type { Selected } from '../lib/types';

  let { onselect }: { onselect: (s: Selected) => void } = $props();

  const today = $derived(startOfDay(app.now));
  // Los eventos de hoy que ya terminaron se ocultan.
  const todayEvents = $derived(eventsOnDay(app.events, today).filter((e) => e.allDay || e.end > app.now));
  const tomorrowEvents = $derived(eventsOnDay(app.events, addDays(today, 1)));
  // Recordatorios: vencidos, de hoy/mañana y sin fecha.
  const reminders = $derived(app.pendingReminders.filter((r) => !r.dueAt || r.dueAt < addDays(today, 2)));
  const later = $derived(app.pendingReminders.length - reminders.length);
</script>

<div class="grid">
  <div class="col scroll">
    <h3 class="section-title">Hoy</h3>
    <div class="list">
      {#each todayEvents as e (e.id)}
        <EventItem event={e} onclick={() => onselect({ type: 'event', item: e })} />
      {:else}
        <p class="empty">Nada más por hoy 🎉</p>
      {/each}
    </div>
    <h3 class="section-title spaced">Mañana</h3>
    <div class="list">
      {#each tomorrowEvents as e (e.id)}
        <EventItem event={e} compact onclick={() => onselect({ type: 'event', item: e })} />
      {:else}
        <p class="empty">Sin eventos</p>
      {/each}
    </div>
  </div>

  <div class="col scroll">
    <h3 class="section-title">Recordatorios</h3>
    <div class="list">
      {#each reminders as r (r.id)}
        <ReminderItem reminder={r} onclick={() => onselect({ type: 'reminder', item: r })} />
      {:else}
        <p class="empty">Todo al día ✓</p>
      {/each}
    </div>
    {#if later > 0}
      <p class="empty">+{later} más adelante</p>
    {/if}
  </div>
</div>

<style>
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    height: 100%;
  }
  .col {
    min-height: 0;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .spaced {
    margin-top: 16px;
  }
</style>
