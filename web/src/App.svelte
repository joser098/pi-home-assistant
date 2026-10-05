<script lang="ts">
  import KioskApp from './kiosk/KioskApp.svelte';
  import Login from './lib/components/Login.svelte';
  import { kiosk } from './lib/data';
  import { app } from './lib/store.svelte';
  import MobileApp from './mobile/MobileApp.svelte';

  void app.init();
</script>

{#if app.status === 'loading'}
  <div class="center muted">Cargando…</div>
{:else if app.status === 'login'}
  <Login />
{:else if app.status === 'error'}
  <div class="center">
    <p>⚠️ {app.error}</p>
    <button class="btn" onclick={() => location.reload()}>Reintentar</button>
    {#if app.me === null}
      <button class="btn" onclick={() => app.signOut()}>Cerrar sesión</button>
    {/if}
  </div>
{:else if kiosk}
  <KioskApp />
{:else}
  <MobileApp />
{/if}

<style>
  .center {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 24px;
    text-align: center;
  }
</style>
