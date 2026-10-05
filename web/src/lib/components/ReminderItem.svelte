<script lang="ts">
  import { data } from '../data';
  import { dayLabel, fmtTime, hasTime, isOverdue } from '../dates';
  import { app } from '../store.svelte';
  import type { Reminder } from '../types';

  let { reminder, onclick }: { reminder: Reminder; onclick?: () => void } = $props();

  const REC_LABEL = { daily: 'cada día', weekly: 'cada semana', monthly: 'cada mes', yearly: 'cada año' } as const;

  let busy = $state(false);
  const done = $derived(!!reminder.doneAt);
  const overdue = $derived(isOverdue(reminder, app.now));

  async function toggle(ev: MouseEvent) {
    ev.stopPropagation();
    if (busy) return;
    busy = true;
    if (done) await app.act(() => data.reopenReminder(reminder.id));
    else await app.act(() => data.completeReminder(reminder.id), '¡Hecho!');
    busy = false;
  }

  function dueText(r: Reminder): string {
    if (!r.dueAt) return '';
    const day = dayLabel(r.dueAt, app.now);
    return hasTime(r.dueAt) ? `${day} ${fmtTime(r.dueAt)}` : day;
  }
</script>

<div class="item" class:done role="button" tabindex="0" {onclick} onkeydown={(e) => e.key === 'Enter' && onclick?.()}>
  <button class="check" class:busy onclick={toggle} aria-label={done ? 'Marcar como no hecho' : 'Marcar hecho'} style:--c={app.colorFor(reminder.assignedTo)}>
    {#if done}
      <svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
    {/if}
  </button>
  <span class="body">
    <span class="title">{reminder.title}</span>
    <span class="meta">
      {#if reminder.dueAt}<span class:overdue>{dueText(reminder)}</span>{/if}
      {#if reminder.recurrence}<span>↻ {REC_LABEL[reminder.recurrence]}</span>{/if}
      <span class="who"><span class="dot" style:background={app.colorFor(reminder.assignedTo)}></span>{app.nameFor(reminder.assignedTo)}</span>
    </span>
  </span>
</div>

<style>
  .item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 6px 12px 6px 6px;
    border-radius: var(--radius-sm);
    background: var(--surface);
    min-height: 56px;
    cursor: pointer;
  }
  .check {
    width: 48px;
    height: 48px;
    flex: none;
    display: grid;
    place-items: center;
    position: relative;
  }
  .check::before {
    content: '';
    position: absolute;
    inset: 11px;
    border-radius: 50%;
    border: 2.5px solid var(--c);
  }
  .done .check::before {
    background: var(--c);
  }
  .check svg {
    position: relative;
    color: var(--bg);
  }
  .check.busy {
    opacity: 0.5;
  }
  .body {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .title {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .done .title {
    text-decoration: line-through;
    color: var(--text-3);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    font-size: 14px;
    color: var(--text-2);
  }
  .overdue {
    color: var(--danger);
    font-weight: 600;
  }
  .who {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .who .dot {
    width: 8px;
    height: 8px;
  }
</style>
