<script lang="ts">
  import EventItem from '../lib/components/EventItem.svelte';
  import ReminderItem from '../lib/components/ReminderItem.svelte';
  import Sheet from '../lib/components/Sheet.svelte';
  import { eventsOnDay, fmtLongDate, remindersOnDay } from '../lib/dates';
  import { app } from '../lib/store.svelte';
  import type { Selected } from '../lib/types';

  let {
    day,
    onclose,
    onselect,
    onadd,
  }: { day: Date; onclose: () => void; onselect: (s: Selected) => void; onadd: (d: Date) => void } = $props();

  const events = $derived(eventsOnDay(app.events, day));
  const reminders = $derived(remindersOnDay(app.reminders, day));
</script>

<Sheet {onclose}>
  <div class="head">
    <h2>{fmtLongDate(day)}</h2>
    <button class="btn primary" onclick={() => onadd(day)}>+ Agregar</button>
  </div>
  <div class="list">
    {#each events as e (e.id)}
      <EventItem event={e} onclick={() => onselect({ type: 'event', item: e })} />
    {/each}
    {#each reminders as r (r.id)}
      <ReminderItem reminder={r} onclick={() => onselect({ type: 'reminder', item: r })} />
    {/each}
    {#if events.length === 0 && reminders.length === 0}
      <p class="empty">Día libre</p>
    {/if}
  </div>
</Sheet>

<style>
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }
  h2 {
    margin: 0;
    font-size: 20px;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
