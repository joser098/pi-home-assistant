<script lang="ts">
  import { data } from '../data';
  import { dayLabel, eventTimeLabel, fmtLongDate, fmtTime, hasTime } from '../dates';
  import { app } from '../store.svelte';
  import type { Selected } from '../types';
  import Sheet from './Sheet.svelte';

  let { selected, onclose }: { selected: Selected; onclose: () => void } = $props();

  let confirming = $state(false);
  let busy = $state(false);

  const ownerId = $derived(selected.type === 'event' ? selected.item.ownerId : selected.item.assignedTo);

  async function run(fn: () => Promise<void>, ok: string) {
    busy = true;
    if (await app.act(fn, ok)) onclose();
    busy = false;
  }

  function remove() {
    if (!confirming) {
      confirming = true;
      return;
    }
    const id = selected.item.id;
    if (selected.type === 'event') void run(() => data.deleteEvent(id), 'Evento borrado');
    else void run(() => data.deleteReminder(id), 'Recordatorio borrado');
  }
</script>

<Sheet {onclose}>
  <div class="detail">
    <div class="head">
      <span class="dot big" style:background={app.colorFor(ownerId)}></span>
      <div>
        <h2>{selected.item.title}</h2>
        <p class="muted">{selected.type === 'event' ? 'Evento' : 'Recordatorio'} · {app.nameFor(ownerId)}</p>
      </div>
    </div>

    {#if selected.type === 'event'}
      {@const e = selected.item}
      <p>📅 {fmtLongDate(e.start)} · {eventTimeLabel(e)}</p>
      {#if e.location}<p>📍 {e.location}</p>{/if}
      {#if e.description}<p class="muted">{e.description}</p>{/if}
    {:else}
      {@const r = selected.item}
      <p>
        {#if r.dueAt}⏰ {dayLabel(r.dueAt, app.now)}{hasTime(r.dueAt) ? ` a las ${fmtTime(r.dueAt)}` : ''}{:else}Sin fecha{/if}
      </p>
      {#if r.notes}<p class="muted">{r.notes}</p>{/if}
      {#if r.doneAt}<p class="muted">✓ Hecho por {app.nameFor(r.doneBy)} · {dayLabel(r.doneAt, app.now)} {fmtTime(r.doneAt)}</p>{/if}
    {/if}

    <div class="actions">
      {#if selected.type === 'reminder'}
        {@const r = selected.item}
        {#if r.doneAt}
          <button class="btn" disabled={busy} onclick={() => run(() => data.reopenReminder(r.id), 'Marcado pendiente')}>Marcar pendiente</button>
        {:else}
          <button class="btn primary" disabled={busy} onclick={() => run(() => data.completeReminder(r.id), '¡Hecho!')}>✓ Hecho</button>
        {/if}
      {/if}
      <button class="btn danger" disabled={busy} onclick={remove}>{confirming ? '¿Seguro? Tocá de nuevo' : 'Borrar'}</button>
      <button class="btn" onclick={onclose}>Cerrar</button>
    </div>
  </div>
</Sheet>

<style>
  .detail p {
    margin: 10px 0;
  }
  .head {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .head h2 {
    margin: 0;
    font-size: 22px;
  }
  .head p {
    margin: 2px 0 0;
  }
  .big {
    width: 16px;
    height: 16px;
    margin-top: 6px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 18px;
  }
  .actions .btn {
    flex: 1 1 auto;
  }
</style>
