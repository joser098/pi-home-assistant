<script lang="ts">
  import { cubicOut } from 'svelte/easing';
  import { fade, fly } from 'svelte/transition';
  import ItemDetail from '../lib/components/ItemDetail.svelte';
  import Toast from '../lib/components/Toast.svelte';
  import { fmtLongDate, fmtTime } from '../lib/dates';
  import { app } from '../lib/store.svelte';
  import type { Selected } from '../lib/types';
  import RemindersView from '../mobile/RemindersView.svelte';
  import AddFlow from './AddFlow.svelte';
  import AgendaView from './AgendaView.svelte';
  import Dashboard from './Dashboard.svelte';
  import DayView from './DayView.svelte';
  import DetailBar from './DetailBar.svelte';
  import MonthView from './MonthView.svelte';
  import NightOverlay from './NightOverlay.svelte';
  import type { View } from './views';
  import WeatherView from './WeatherView.svelte';
  import WeekView from './WeekView.svelte';

  const TITLES: Record<Exclude<View, 'home'>, string> = {
    agenda: 'Calendario',
    week: 'Calendario',
    month: 'Calendario',
    reminders: 'Recordatorios',
    weather: 'Clima',
  };
  const CALENDAR_TABS: { id: View; label: string }[] = [
    { id: 'agenda', label: 'Agenda' },
    { id: 'week', label: 'Semana' },
    { id: 'month', label: 'Mes' },
  ];

  let view = $state<View>('home');
  // Sección (para la transición grande): las 3 vistas de calendario cuentan como una sola.
  const section = $derived(view === 'agenda' || view === 'week' || view === 'month' ? 'calendar' : view);
  // 1 = entra desde la derecha (abrir detalle), -1 = desde la izquierda (volver a Inicio).
  let direction = $state(1);

  // Solo transform + opacity (los resuelve la GPU) y solo animación de entrada: nunca hay dos vistas a la vez.
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PAGE_MS = reduceMotion ? 0 : 200;
  const TAB_MS = reduceMotion ? 0 : 150;
  let selected = $state<Selected | null>(null);
  let day = $state<Date | null>(null);
  let adding = $state<{ date: Date | null } | null>(null);

  // Volver al dashboard después de 2 minutos sin tocar la pantalla.
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  function poke() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (view !== 'home') go('home');
      selected = null;
      day = null;
      adding = null;
    }, 120_000);
  }

  const syncText = $derived.by(() => {
    if (!app.online) return 'Sin conexión';
    if (!app.lastSync) return 'Sincronizando…';
    return fmtTime(app.lastSync);
  });

  function go(v: View) {
    direction = v === 'home' ? -1 : 1;
    view = v;
  }
  const open = (s: Selected) => (selected = s);
  const openDay = (d: Date) => (day = d);
</script>

<svelte:window onpointerdown={poke} />

<div class="kiosk">
  <header>
    <div class="clock">{fmtTime(app.now)}</div>
    <div class="date">{fmtLongDate(app.now)}</div>
    <div class="sync" class:offline={!app.online} title="Última sincronización con Google">
      <span class="dot" style:background={app.online ? 'var(--ok)' : 'var(--danger)'}></span>
      {syncText}
    </div>
    <button class="add" onclick={() => (adding = { date: null })} aria-label="Agregar">+</button>
  </header>

  <main>
    {#key section}
      <div class="page" in:fly={{ x: direction * 40, duration: PAGE_MS, easing: cubicOut }}>
        {#if view === 'home'}
          <Dashboard {go} onselect={open} onday={openDay} />
        {:else}
          <DetailBar title={TITLES[view]} onback={() => go('home')}>
            {#if section === 'calendar'}
              <div class="seg">
                {#each CALENDAR_TABS as t (t.id)}
                  <button class:on={view === t.id} onclick={() => go(t.id)}>{t.label}</button>
                {/each}
              </div>
            {/if}
          </DetailBar>
          {#key view}
            <div class="detail" in:fade={{ duration: TAB_MS }}>
              {#if view === 'agenda'}
                <AgendaView onselect={open} onday={openDay} />
              {:else if view === 'week'}
                <WeekView onselect={open} onday={openDay} />
              {:else if view === 'month'}
                <MonthView onday={openDay} />
              {:else if view === 'reminders'}
                <div class="scroll fill"><RemindersView onselect={open} showFilters={false} /></div>
              {:else if view === 'weather'}
                <WeatherView />
              {/if}
            </div>
          {/key}
        {/if}
      </div>
    {/key}
  </main>
</div>

{#if day}
  <DayView
    {day}
    onclose={() => (day = null)}
    onselect={open}
    onadd={(d) => {
      day = null;
      adding = { date: d };
    }}
  />
{/if}

{#if selected}
  <ItemDetail {selected} onclose={() => (selected = null)} />
{/if}

{#if adding}
  <AddFlow initialDate={adding.date} onclose={() => (adding = null)} />
{/if}

<NightOverlay />
<Toast />

<style>
  .kiosk {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    user-select: none;
  }
  header {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 6px 12px 4px 16px;
    height: 58px;
    flex: none;
  }
  .clock {
    font-size: 36px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .date {
    font-size: 18px;
    color: var(--text-2);
    font-weight: 500;
  }
  .sync {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-3);
  }
  .sync .dot {
    width: 8px;
    height: 8px;
  }
  .sync.offline {
    color: var(--danger);
  }
  .add {
    width: 48px;
    height: 44px;
    border-radius: var(--radius-sm);
    background: var(--accent);
    color: var(--accent-text);
    font-size: 30px;
    font-weight: 300;
    line-height: 1;
  }
  main {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 2px 12px 12px;
  }
  .page,
  .detail {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .detail > :global(*) {
    flex: 1;
    min-height: 0;
  }
  .fill {
    height: 100%;
  }
  .seg {
    display: flex;
    background: var(--surface);
    border-radius: 999px;
    padding: 3px;
  }
  .seg button {
    min-width: 92px;
    min-height: 40px;
    border-radius: 999px;
    font-weight: 600;
    color: var(--text-2);
  }
  .seg .on {
    background: var(--border);
    color: var(--text);
  }
</style>
