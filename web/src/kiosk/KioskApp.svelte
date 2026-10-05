<script lang="ts">
  import ItemDetail from '../lib/components/ItemDetail.svelte';
  import Toast from '../lib/components/Toast.svelte';
  import { fmtLongDate, fmtTime } from '../lib/dates';
  import { app } from '../lib/store.svelte';
  import type { Selected } from '../lib/types';
  import AddFlow from './AddFlow.svelte';
  import DayView from './DayView.svelte';
  import MonthView from './MonthView.svelte';
  import NightOverlay from './NightOverlay.svelte';
  import TodayView from './TodayView.svelte';
  import WeekView from './WeekView.svelte';

  type Tab = 'today' | 'week' | 'month';
  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'today', label: 'Hoy', icon: '☀' },
    { id: 'week', label: 'Semana', icon: '▦' },
    { id: 'month', label: 'Mes', icon: '▤' },
  ];

  let tab = $state<Tab>('today');
  let selected = $state<Selected | null>(null);
  let day = $state<Date | null>(null);
  let adding = $state<{ date: Date | null } | null>(null);

  // Volver a "Hoy" después de 2 minutos sin tocar la pantalla.
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  function poke() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      tab = 'today';
      selected = null;
      day = null;
      adding = null;
    }, 120_000);
  }

  const syncText = $derived.by(() => {
    if (!app.online) return 'Sin conexión';
    if (!app.lastSync) return 'Sincronizando…';
    return `Actualizado ${fmtTime(app.lastSync)}`;
  });

  const open = (s: Selected) => (selected = s);
  const openDay = (d: Date) => (day = d);
</script>

<svelte:window onpointerdown={poke} />

<div class="kiosk">
  <nav>
    {#each TABS as t (t.id)}
      <button class="tab" class:active={tab === t.id} onclick={() => (tab = t.id)}>
        <span class="icon">{t.icon}</span>
        <span>{t.label}</span>
      </button>
    {/each}
    <button class="add" onclick={() => (adding = { date: null })} aria-label="Agregar">+</button>
  </nav>

  <section>
    <header>
      <div class="clock">{fmtTime(app.now)}</div>
      <div class="date">{fmtLongDate(app.now)}</div>
      <div class="sync" class:offline={!app.online}>
        <span class="dot" style:background={app.online ? 'var(--ok)' : 'var(--danger)'}></span>
        {syncText}
      </div>
    </header>
    <div class="content">
      {#if tab === 'today'}
        <TodayView onselect={open} />
      {:else if tab === 'week'}
        <WeekView onselect={open} onday={openDay} />
      {:else}
        <MonthView onday={openDay} />
      {/if}
    </div>
  </section>
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
    height: 100vh;
    overflow: hidden;
    user-select: none;
  }
  nav {
    width: 92px;
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: var(--surface);
  }
  .tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-2);
  }
  .tab .icon {
    font-size: 22px;
  }
  .tab.active {
    background: var(--surface-2);
    color: var(--text);
  }
  .add {
    flex: 1.1;
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--accent-text);
    font-size: 40px;
    font-weight: 300;
  }
  section {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 14px;
    padding: 8px 16px 4px;
    height: 58px;
    flex: none;
  }
  .clock {
    font-size: 38px;
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
  .content {
    flex: 1;
    min-height: 0;
    padding: 4px 12px 12px;
  }
</style>
