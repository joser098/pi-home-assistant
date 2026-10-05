<script lang="ts">
  import { app } from '../../lib/store.svelte';
  import { nextHours, weather, weatherIcon, weatherLabel } from '../../lib/weather.svelte';

  let { onopen }: { onopen: () => void } = $props();

  // Hora actual + las 4 siguientes.
  const hours = $derived(weather.data ? nextHours(weather.data, app.now, 4) : []);
</script>

<!-- Toda la tarjeta abre el detalle del clima. -->
<button class="card" onclick={onopen}>
  {#if weather.data && weather.today}
    {@const c = weather.data.current}
    <div class="now">
      <span class="icon">{weatherIcon(c.code, c.isDay)}</span>
      <span class="temp">{Math.round(c.temp)}°</span>
      <span class="info">
        <span class="label">{weatherLabel(c.code)}</span>
        <span class="muted">↑{Math.round(weather.today.max)}° ↓{Math.round(weather.today.min)}° · 💧{weather.today.rainMax ?? 0}%</span>
      </span>
      <span class="chev">›</span>
    </div>
    <div class="hours">
      {#each hours as h, i (h.time.getTime())}
        <span class="hour" class:first={i === 0}>
          <span class="t">{i === 0 ? 'Ahora' : `${String(h.time.getHours()).padStart(2, '0')}h`}</span>
          <span class="i">{weatherIcon(h.code, h.isDay)}</span>
          <span class="v">{Math.round(h.temp)}°</span>
          <span class="r" class:wet={(h.rain ?? 0) >= 30}>{h.rain ? `${h.rain}%` : ''}</span>
        </span>
      {/each}
    </div>
  {:else}
    <span class="muted">{weather.error ?? 'Cargando clima…'}</span>
  {/if}
</button>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 12px;
    border-radius: var(--radius);
    background: var(--surface);
    text-align: left;
    flex: none;
  }
  .card:active {
    background: var(--surface-2);
  }
  .now {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .icon {
    font-size: 40px;
    line-height: 1;
  }
  .temp {
    font-size: 40px;
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .label {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .info .muted {
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .chev {
    margin-left: auto;
    font-size: 22px;
    color: var(--text-3);
  }
  .hours {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
  }
  .hour {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 0;
    border-radius: var(--radius-sm);
    background: var(--surface-2);
  }
  .hour.first {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .t {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-2);
  }
  .i {
    font-size: 20px;
    line-height: 1.25;
  }
  .v {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .r {
    font-size: 11px;
    min-height: 13px;
    color: var(--text-3);
  }
  .r.wet {
    color: var(--accent);
    font-weight: 700;
  }
</style>
