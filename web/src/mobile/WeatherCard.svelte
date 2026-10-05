<script lang="ts">
  import HourlyStrip from '../lib/components/HourlyStrip.svelte';
  import { config } from '../lib/config';
  import { app } from '../lib/store.svelte';
  import { hoursOn, weather, weatherIcon, weatherLabel } from '../lib/weather.svelte';
</script>

{#if weather.data && weather.today}
  {@const w = weather.data}
  {@const today = weather.today}
  <section class="card">
    <div class="now">
      <span class="icon">{weatherIcon(w.current.code, w.current.isDay)}</span>
      <div class="main">
        <span class="temp">{Math.round(w.current.temp)}°</span>
        <span class="label">{weatherLabel(w.current.code)}</span>
      </div>
      <div class="side">
        <span>↑ {Math.round(today.max)}° ↓ {Math.round(today.min)}°</span>
        <span class="muted">💧 {today.rainMax ?? 0}% · {config.weather.place}</span>
      </div>
    </div>
    <HourlyStrip hours={hoursOn(w, app.now)} />
  </section>
{/if}

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    margin-bottom: 20px;
    border-radius: var(--radius);
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
  .main {
    display: flex;
    flex-direction: column;
  }
  .temp {
    font-size: 30px;
    font-weight: 700;
    line-height: 1;
  }
  .label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-2);
  }
  .side {
    margin-left: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 14px;
    font-weight: 600;
  }
  .side .muted {
    font-size: 12px;
    font-weight: 500;
  }
  .card :global(.hour) {
    background: var(--surface);
  }
</style>
