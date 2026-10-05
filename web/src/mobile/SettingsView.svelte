<script lang="ts">
  import { data } from '../lib/data';
  import { fmtTime } from '../lib/dates';
  import { disablePush, enablePush, isIOS, pushStatus, type PushStatus } from '../lib/push';
  import { app } from '../lib/store.svelte';

  let status = $state<PushStatus | null>(null);
  let busy = $state(false);

  $effect(() => {
    void pushStatus().then((s) => (status = s));
  });

  async function toggle() {
    busy = true;
    if (status === 'on') await app.act(disablePush, 'Notificaciones desactivadas');
    else await app.act(enablePush, 'Notificaciones activadas');
    status = await pushStatus();
    busy = false;
  }
</script>

{#if app.me}
  <section class="card">
    <span class="dot big" style:background={app.me.color}></span>
    <div>
      <strong>{app.me.name}</strong>
      <p class="muted">{data.kind === 'mock' ? 'Modo demo (datos de ejemplo)' : 'Conectado'}</p>
    </div>
  </section>
{/if}

<h3 class="section-title">Notificaciones de recordatorios</h3>
<section class="card col">
  {#if status === 'needs-install'}
    <p>Para recibir avisos en iPhone, primero instalá la app:</p>
    <ol>
      <li>Tocá el botón <b>Compartir</b> (□↑) de Safari</li>
      <li>Elegí <b>“Agregar a inicio”</b></li>
      <li>Abrí la app desde el ícono nuevo y volvé a esta pantalla</li>
    </ol>
  {:else if status === 'unsupported'}
    <p>Este navegador no soporta notificaciones push.</p>
  {:else if status === 'denied'}
    <p>
      Las notificaciones están bloqueadas. Habilitalas en
      {isIOS() ? 'Ajustes → Notificaciones → Casa' : 'los ajustes del navegador para este sitio'}.
    </p>
  {:else if status}
    <p class="muted">Los eventos del calendario avisan por Google Calendar. Acá se activan los avisos de recordatorios.</p>
    <div class="row">
      <button class="btn" class:primary={status !== 'on'} disabled={busy} onclick={toggle}>
        {status === 'on' ? 'Desactivar en este celular' : 'Activar en este celular'}
      </button>
      {#if status === 'on'}
        <button class="btn" onclick={() => app.act(() => data.sendTestPush(), 'Enviada')}>Probar</button>
      {/if}
    </div>
  {/if}
</section>

<h3 class="section-title">Sincronización</h3>
<section class="card col">
  <p class="muted">
    Calendario de Google: {app.lastSync ? `última sync ${fmtTime(app.lastSync)}` : 'sin datos todavía'}
  </p>
  <button class="btn" onclick={() => app.act(() => app.refresh(), 'Actualizado')}>Actualizar ahora</button>
</section>

<button class="btn danger full" onclick={() => app.signOut()}>Cerrar sesión</button>

<style>
  .card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border-radius: var(--radius);
    background: var(--surface);
    margin-bottom: 20px;
  }
  .card.col {
    flex-direction: column;
    align-items: stretch;
  }
  .card p {
    margin: 0;
  }
  .card ol {
    margin: 0;
    padding-left: 20px;
    line-height: 1.7;
  }
  .big {
    width: 18px;
    height: 18px;
  }
  .row {
    display: flex;
    gap: 8px;
  }
  .row .btn:first-child {
    flex: 1;
  }
  .full {
    width: 100%;
  }
</style>
