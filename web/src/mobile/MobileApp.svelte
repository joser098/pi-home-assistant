<script lang="ts">
  import ItemDetail from '../lib/components/ItemDetail.svelte';
  import Toast from '../lib/components/Toast.svelte';
  import { app } from '../lib/store.svelte';
  import type { Selected } from '../lib/types';
  import AddForm from './AddForm.svelte';
  import AgendaView from './AgendaView.svelte';
  import RemindersView from './RemindersView.svelte';
  import SettingsView from './SettingsView.svelte';

  type Tab = 'agenda' | 'reminders' | 'settings';
  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'agenda', label: 'Agenda', icon: '📅' },
    { id: 'reminders', label: 'Recordatorios', icon: '✓' },
    { id: 'settings', label: 'Ajustes', icon: '⚙' },
  ];

  let tab = $state<Tab>('agenda');
  let selected = $state<Selected | null>(null);
  let adding = $state<'event' | 'reminder' | null>(null);

  const pendingCount = $derived(app.pendingReminders.length);
</script>

<div class="mobile">
  <header>
    <h1>{TABS.find((t) => t.id === tab)?.label}</h1>
    {#if !app.online}<span class="offline">Sin conexión</span>{/if}
  </header>

  <main class="scroll">
    {#if tab === 'agenda'}
      <AgendaView onselect={(s) => (selected = s)} />
    {:else if tab === 'reminders'}
      <RemindersView onselect={(s) => (selected = s)} />
    {:else}
      <SettingsView />
    {/if}
  </main>

  {#if tab !== 'settings'}
    <button class="fab" onclick={() => (adding = tab === 'reminders' ? 'reminder' : 'event')} aria-label="Agregar">+</button>
  {/if}

  <nav>
    {#each TABS as t (t.id)}
      <button class:active={tab === t.id} onclick={() => (tab = t.id)}>
        <span class="icon">
          {t.icon}
          {#if t.id === 'reminders' && pendingCount > 0}<span class="badge">{pendingCount}</span>{/if}
        </span>
        <span>{t.label}</span>
      </button>
    {/each}
  </nav>
</div>

{#if selected}
  <ItemDetail {selected} onclose={() => (selected = null)} />
{/if}

{#if adding}
  <AddForm initialKind={adding} onclose={() => (adding = null)} />
{/if}

<Toast />

<style>
  .mobile {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-width: 640px;
    margin: 0 auto;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: calc(12px + env(safe-area-inset-top)) 16px 8px;
  }
  h1 {
    margin: 0;
    font-size: 28px;
  }
  .offline {
    font-size: 13px;
    color: var(--danger);
    font-weight: 600;
  }
  main {
    flex: 1;
    min-height: 0;
    padding: 0 16px 96px;
  }
  .fab {
    position: fixed;
    right: max(20px, calc(50% - 300px));
    bottom: calc(84px + env(safe-area-inset-bottom));
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-text);
    font-size: 34px;
    font-weight: 300;
    box-shadow: 0 6px 20px rgb(0 0 0 / 0.35);
    z-index: 10;
  }
  nav {
    display: flex;
    border-top: 1px solid var(--border);
    background: var(--surface);
    padding-bottom: env(safe-area-inset-bottom);
  }
  nav button {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 0;
    min-height: 60px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-3);
  }
  nav button.active {
    color: var(--accent);
  }
  .icon {
    position: relative;
    font-size: 20px;
  }
  .badge {
    position: absolute;
    top: -4px;
    right: -14px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--danger);
    color: #fff;
    font-size: 11px;
    line-height: 18px;
    text-align: center;
  }
</style>
