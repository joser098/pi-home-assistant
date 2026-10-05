<script lang="ts">
  import Sheet from '../lib/components/Sheet.svelte';
  import { data } from '../lib/data';
  import { combine, isoDate, parseIsoDate } from '../lib/dates';
  import { app, BOTH_COLOR } from '../lib/store.svelte';
  import type { Recurrence } from '../lib/types';

  let { initialKind, onclose }: { initialKind: 'event' | 'reminder'; onclose: () => void } = $props();

  const nextHour = `${String(Math.min(new Date().getHours() + 1, 23)).padStart(2, '0')}:00`;

  // svelte-ignore state_referenced_locally
  let kind = $state(initialKind);
  let title = $state('');
  let date = $state(isoDate(new Date()));
  // svelte-ignore state_referenced_locally
  let withTime = $state(initialKind === 'event');
  let time = $state(nextHour);
  let duration = $state(60);
  let who = $state<string | null>(null);
  let recurrence = $state<Recurrence | null>(null);
  let extra = $state('');
  let busy = $state(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    busy = true;
    const ok =
      kind === 'event'
        ? await app.act(
            () =>
              data.createEvent({
                title: title.trim(),
                date,
                time: withTime ? time : null,
                durationMin: duration,
                ownerId: who,
                location: extra.trim() || null,
              }),
            'Evento agregado',
          )
        : await app.act(
            () =>
              data.createReminder({
                title: title.trim(),
                notes: extra.trim() || null,
                dueAt: date ? (withTime ? combine(date, time) : parseIsoDate(date)) : null,
                assignedTo: who,
                recurrence,
              }),
            'Recordatorio agregado',
          );
    busy = false;
    if (ok) onclose();
  }
</script>

<Sheet {onclose}>
  <form onsubmit={submit}>
    <div class="seg">
      <button type="button" class:on={kind === 'event'} onclick={() => (kind = 'event')}>📅 Evento</button>
      <button type="button" class:on={kind === 'reminder'} onclick={() => (kind = 'reminder')}>⏰ Recordatorio</button>
    </div>

    <!-- svelte-ignore a11y_autofocus -->
    <input class="title" placeholder={kind === 'event' ? '¿Qué evento?' : '¿Qué hay que recordar?'} bind:value={title} autofocus required />

    <div class="grid">
      <label>
        Día
        <input type="date" bind:value={date} required={kind === 'event'} />
      </label>
      <label>
        Hora
        <span class="time">
          <input type="checkbox" bind:checked={withTime} aria-label="Con hora" />
          <input type="time" bind:value={time} disabled={!withTime} />
        </span>
      </label>
    </div>

    {#if kind === 'event'}
      {#if withTime}
        <label>
          Duración
          <select bind:value={duration}>
            <option value={30}>30 minutos</option>
            <option value={60}>1 hora</option>
            <option value={90}>1 h 30</option>
            <option value={120}>2 horas</option>
            <option value={180}>3 horas</option>
            <option value={240}>4 horas</option>
          </select>
        </label>
      {/if}
      <label>
        Lugar
        <input placeholder="Opcional" bind:value={extra} />
      </label>
    {:else}
      <label>
        Repetir
        <select bind:value={recurrence}>
          <option value={null}>No se repite</option>
          <option value="daily">Todos los días</option>
          <option value="weekly">Todas las semanas</option>
          <option value="monthly">Todos los meses</option>
          <option value="yearly">Todos los años</option>
        </select>
      </label>
      <label>
        Notas
        <input placeholder="Opcional" bind:value={extra} />
      </label>
    {/if}

    <div class="who">
      {#each app.people as m (m.id)}
        <button type="button" class="chip" class:selected={who === m.id} onclick={() => (who = m.id)}>
          <span class="dot" style:background={m.color}></span>{m.name}
        </button>
      {/each}
      <button type="button" class="chip" class:selected={who === null} onclick={() => (who = null)}>
        <span class="dot" style:background={BOTH_COLOR}></span>Los dos
      </button>
    </div>

    <div class="actions">
      <button type="button" class="btn" onclick={onclose}>Cancelar</button>
      <button class="btn primary" disabled={busy || !title.trim()}>{busy ? 'Guardando…' : 'Guardar'}</button>
    </div>
  </form>
</Sheet>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .seg {
    display: flex;
    background: var(--bg);
    border-radius: 999px;
    padding: 4px;
  }
  .seg button {
    flex: 1;
    min-height: 40px;
    border-radius: 999px;
    font-weight: 600;
    color: var(--text-2);
  }
  .seg .on {
    background: var(--surface-2);
    color: var(--text);
  }
  input,
  select {
    min-height: 46px;
    padding: 0 12px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--bg);
    font-size: 16px;
    width: 100%;
    min-width: 0;
  }
  .title {
    font-size: 20px;
    font-weight: 600;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    font-weight: 700;
    color: var(--text-2);
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 10px;
  }
  .time {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
  }
  .time input[type='checkbox'] {
    width: 22px;
    min-height: 22px;
    flex: none;
    accent-color: var(--accent);
  }
  .time input:disabled {
    opacity: 0.4;
  }
  .who {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .who .chip {
    min-height: 42px;
  }
  .actions {
    display: flex;
    gap: 10px;
  }
  .actions .btn {
    flex: 1;
  }
</style>
