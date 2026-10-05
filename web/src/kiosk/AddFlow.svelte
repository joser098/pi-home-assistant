<script lang="ts">
  import Keyboard from '../lib/components/Keyboard.svelte';
  import Sheet from '../lib/components/Sheet.svelte';
  import { data } from '../lib/data';
  import { addDays, dayLabel, isoDate, sameDay, startOfDay } from '../lib/dates';
  import { app, BOTH_COLOR } from '../lib/store.svelte';
  import type { Recurrence } from '../lib/types';

  let { initialDate, onclose }: { initialDate: Date | null; onclose: () => void } = $props();

  const DURATIONS = [
    { min: 30, label: '30 min' },
    { min: 60, label: '1 h' },
    { min: 120, label: '2 h' },
    { min: 180, label: '3 h' },
  ];
  const RECURRENCES: { value: Recurrence | null; label: string }[] = [
    { value: null, label: 'No' },
    { value: 'daily', label: 'Diario' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' },
  ];

  // Próxima hora en punto como hora por defecto.
  const defaultMinutes = Math.min((new Date().getHours() + 1) * 60, 23 * 60);

  let kind = $state<'event' | 'reminder'>('event');
  let step = $state<'title' | 'details'>('title');
  let title = $state('');
  // svelte-ignore state_referenced_locally
  let date = $state(startOfDay(initialDate ?? new Date()));
  let withTime = $state(true);
  let minutes = $state(defaultMinutes);
  let duration = $state(60);
  let who = $state<string | null>(null);
  let recurrence = $state<Recurrence | null>(null);
  let busy = $state(false);

  const today = $derived(startOfDay(app.now));
  const timeText = $derived(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);

  function setKind(k: 'event' | 'reminder') {
    kind = k;
    // Los recordatorios suelen ser "en el día", sin hora.
    withTime = k === 'event';
  }

  function stepTime(delta: number) {
    minutes = (minutes + delta + 24 * 60) % (24 * 60);
  }

  function stepDate(delta: number) {
    const next = addDays(date, delta);
    if (next >= today) date = next;
  }

  async function save() {
    busy = true;
    const t = title.trim();
    const ok =
      kind === 'event'
        ? await app.act(
            () =>
              data.createEvent({
                title: t,
                date: isoDate(date),
                time: withTime ? timeText : null,
                durationMin: duration,
                ownerId: who,
              }),
            'Evento agregado',
          )
        : await app.act(() => {
            const due = new Date(date);
            if (withTime) due.setHours(Math.floor(minutes / 60), minutes % 60);
            return data.createReminder({ title: t, dueAt: due, assignedTo: who, recurrence });
          }, 'Recordatorio agregado');
    busy = false;
    if (ok) onclose();
  }
</script>

<Sheet {onclose} full>
  <div class="flow">
    <div class="top">
      <button class="btn" onclick={step === 'details' ? () => (step = 'title') : onclose}>
        {step === 'details' ? '‹ Atrás' : 'Cancelar'}
      </button>
      <div class="seg">
        <button class:on={kind === 'event'} onclick={() => setKind('event')}>📅 Evento</button>
        <button class:on={kind === 'reminder'} onclick={() => setKind('reminder')}>⏰ Recordatorio</button>
      </div>
      {#if step === 'details'}
        <button class="btn primary" disabled={busy} onclick={save}>{busy ? 'Guardando…' : 'Guardar'}</button>
      {:else}
        <span class="spacer"></span>
      {/if}
    </div>

    {#if step === 'title'}
      <div class="title-field" class:placeholder={!title}>
        {title || (kind === 'event' ? '¿Qué evento?' : '¿Qué hay que recordar?')}<span class="caret"></span>
      </div>
      <div class="kb">
        <Keyboard bind:value={title} doneLabel="Siguiente ›" ondone={() => (step = 'details')} />
      </div>
    {:else}
      <div class="details">
        <p class="summary">{title}</p>

        <div class="row">
          <span class="label">Día</span>
          <button class="chip" class:selected={sameDay(date, today)} onclick={() => (date = today)}>Hoy</button>
          <button class="chip" class:selected={sameDay(date, addDays(today, 1))} onclick={() => (date = addDays(today, 1))}>Mañana</button>
          <div class="stepper">
            <button onclick={() => stepDate(-1)} aria-label="Día anterior">−</button>
            <span>{dayLabel(date, app.now)}</span>
            <button onclick={() => stepDate(1)} aria-label="Día siguiente">+</button>
          </div>
          <button class="chip" onclick={() => stepDate(7)}>+1 sem</button>
        </div>

        <div class="row">
          <span class="label">Hora</span>
          <button class="chip" class:selected={!withTime} onclick={() => (withTime = !withTime)}>
            {kind === 'event' ? 'Todo el día' : 'Sin hora'}
          </button>
          {#if withTime}
            <div class="stepper">
              <button onclick={() => stepTime(-60)} aria-label="Una hora menos">−</button>
              <span class="time">{timeText}</span>
              <button onclick={() => stepTime(60)} aria-label="Una hora más">+</button>
            </div>
            <div class="stepper small">
              <button onclick={() => stepTime(-15)} aria-label="15 minutos menos">−15</button>
              <button onclick={() => stepTime(15)} aria-label="15 minutos más">+15</button>
            </div>
          {/if}
        </div>

        {#if kind === 'event' && withTime}
          <div class="row">
            <span class="label">Dura</span>
            {#each DURATIONS as d (d.min)}
              <button class="chip" class:selected={duration === d.min} onclick={() => (duration = d.min)}>{d.label}</button>
            {/each}
          </div>
        {:else if kind === 'reminder'}
          <div class="row">
            <span class="label">Repetir</span>
            {#each RECURRENCES as r (r.label)}
              <button class="chip" class:selected={recurrence === r.value} onclick={() => (recurrence = r.value)}>{r.label}</button>
            {/each}
          </div>
        {/if}

        <div class="row">
          <span class="label">Para</span>
          {#each app.people as m (m.id)}
            <button class="chip" class:selected={who === m.id} onclick={() => (who = m.id)}>
              <span class="dot" style:background={m.color}></span>{m.name}
            </button>
          {/each}
          <button class="chip" class:selected={who === null} onclick={() => (who = null)}>
            <span class="dot" style:background={BOTH_COLOR}></span>Los dos
          </button>
        </div>
      </div>
    {/if}
  </div>
</Sheet>

<style>
  .flow {
    display: flex;
    flex-direction: column;
    height: 100%;
    user-select: none;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    background: var(--surface);
  }
  .top .btn {
    min-width: 120px;
  }
  .spacer {
    width: 120px;
  }
  .seg {
    flex: 1;
    display: flex;
    justify-content: center;
    background: var(--bg);
    border-radius: 999px;
    padding: 4px;
  }
  .seg button {
    flex: 1;
    max-width: 200px;
    min-height: 42px;
    border-radius: 999px;
    font-weight: 600;
    color: var(--text-2);
  }
  .seg .on {
    background: var(--surface-2);
    color: var(--text);
  }
  .title-field {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0 24px;
    font-size: 28px;
    font-weight: 600;
    background: var(--bg);
    overflow: hidden;
    white-space: nowrap;
  }
  .placeholder {
    color: var(--text-3);
  }
  .caret {
    display: inline-block;
    width: 3px;
    height: 32px;
    margin-left: 2px;
    background: var(--accent);
    animation: blink 1s steps(1) infinite;
  }
  @keyframes blink {
    50% {
      opacity: 0;
    }
  }
  .kb {
    flex: none;
  }
  .details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px 16px;
    background: var(--bg);
    overflow-y: auto;
  }
  .summary {
    margin: 0 0 2px;
    font-size: 22px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .label {
    width: 72px;
    font-weight: 700;
    color: var(--text-2);
    font-size: 15px;
  }
  .chip {
    min-height: 52px;
  }
  .stepper {
    display: flex;
    align-items: center;
    background: var(--surface-2);
    border-radius: 999px;
    min-height: 52px;
  }
  .stepper button {
    min-width: 52px;
    height: 52px;
    font-size: 22px;
    font-weight: 600;
  }
  .stepper span {
    min-width: 96px;
    text-align: center;
    font-weight: 700;
  }
  .stepper .time {
    font-size: 22px;
    font-variant-numeric: tabular-nums;
  }
  .stepper.small button {
    font-size: 16px;
    min-width: 60px;
  }
</style>
