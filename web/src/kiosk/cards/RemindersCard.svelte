<script lang="ts">
  import ReminderItem from '../../lib/components/ReminderItem.svelte';
  import { addDays, startOfDay } from '../../lib/dates';
  import { app } from '../../lib/store.svelte';
  import type { Reminder, Selected } from '../../lib/types';
  import Card from './Card.svelte';

  let { onopen, onselect }: { onopen: () => void; onselect: (s: Selected) => void } = $props();

  const SHOWN = 3;

  // Prioridad: vencidos y de hoy, después sin fecha, después los próximos.
  function rank(r: Reminder): number {
    if (!r.dueAt) return 1;
    return r.dueAt < addDays(startOfDay(app.now), 1) ? 0 : 2;
  }
  const pending = $derived([...app.pendingReminders].sort((a, b) => rank(a) - rank(b)));
  const shown = $derived(pending.slice(0, SHOWN));
</script>

<Card title={`Pendientes${pending.length ? ` (${pending.length})` : ''}`} {onopen} grow>
  <div class="list">
    {#each shown as r (r.id)}
      <ReminderItem reminder={r} onclick={() => onselect({ type: 'reminder', item: r })} />
    {:else}
      <p class="empty">Todo al día ✓</p>
    {/each}
  </div>
</Card>

<style>
  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
    overflow: hidden;
  }
  .list :global(.item) {
    background: var(--surface-2);
    min-height: 52px;
  }
</style>
