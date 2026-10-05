<script lang="ts">
  import ReminderItem from '../lib/components/ReminderItem.svelte';
  import { addDays, sameDay, startOfDay } from '../lib/dates';
  import { app } from '../lib/store.svelte';
  import type { Reminder, Selected } from '../lib/types';

  let { onselect }: { onselect: (s: Selected) => void } = $props();

  let onlyMine = $state(false);
  let showDone = $state(false);

  const visible = $derived(
    app.reminders.filter((r) => !onlyMine || r.assignedTo === null || r.assignedTo === app.me?.id),
  );

  const groups = $derived.by(() => {
    const today = startOfDay(app.now);
    const tomorrow = addDays(today, 1);
    const pending = visible.filter((r) => !r.doneAt).sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0));
    const g: { title: string; items: Reminder[] }[] = [
      { title: 'Vencidos', items: pending.filter((r) => r.dueAt && r.dueAt < today) },
      { title: 'Hoy', items: pending.filter((r) => r.dueAt && sameDay(r.dueAt, today)) },
      { title: 'Próximos', items: pending.filter((r) => r.dueAt && r.dueAt >= tomorrow) },
      { title: 'Sin fecha', items: pending.filter((r) => !r.dueAt) },
    ];
    return g.filter((x) => x.items.length);
  });

  const done = $derived(visible.filter((r) => r.doneAt).sort((a, b) => b.doneAt!.getTime() - a.doneAt!.getTime()));
</script>

<div class="filters">
  <button class="chip" class:selected={!onlyMine} onclick={() => (onlyMine = false)}>Todos</button>
  <button class="chip" class:selected={onlyMine} onclick={() => (onlyMine = true)}>Míos</button>
</div>

{#each groups as g (g.title)}
  <section>
    <h3 class="section-title" class:danger={g.title === 'Vencidos'}>{g.title}</h3>
    <div class="list">
      {#each g.items as r (r.id)}
        <ReminderItem reminder={r} onclick={() => onselect({ type: 'reminder', item: r })} />
      {/each}
    </div>
  </section>
{:else}
  <p class="empty">No hay pendientes ✓</p>
{/each}

{#if done.length}
  <button class="btn toggle" onclick={() => (showDone = !showDone)}>
    {showDone ? 'Ocultar' : 'Ver'} hechos ({done.length})
  </button>
  {#if showDone}
    <div class="list">
      {#each done as r (r.id)}
        <ReminderItem reminder={r} onclick={() => onselect({ type: 'reminder', item: r })} />
      {/each}
    </div>
  {/if}
{/if}

<style>
  .filters {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }
  .filters .chip {
    min-height: 40px;
  }
  section {
    margin-bottom: 20px;
  }
  .danger {
    color: var(--danger);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .toggle {
    width: 100%;
    margin-bottom: 10px;
  }
</style>
