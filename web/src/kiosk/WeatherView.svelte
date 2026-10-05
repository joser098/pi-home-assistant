<script lang="ts">
  import HourlyStrip from '../lib/components/HourlyStrip.svelte';
  import { config } from '../lib/config';
  import { dayLabel, fmtTime } from '../lib/dates';
  import { app } from '../lib/store.svelte';
  import { hoursOn, weather, weatherIcon, weatherLabel } from '../lib/weather.svelte';

  let index = $state(0);

  const days = $derived(weather.data?.days ?? []);
  const day = $derived(days[Math.min(index, days.length - 1)]);
  const isToday = $derived(index === 0);
</script>

{#if weather.data && day}
  {@const w = weather.data}
  <div class="view">
    <div class="days">
      {#each days as d, i (d.date.getTime())}
        <button class="dchip" class:on={i === index} onclick={() => (index = i)}>
          <span class="dl">{dayLabel(d.date, app.now)}</span>
          <span class="di">{weatherIcon(d.code)}</span>
          <span class="dt"><b>{Math.round(d.max)}°</b> {Math.round(d.min)}°</span>
        </button>
      {/each}
    </div>

    <div class="summary">
      {#if isToday}
        <span class="icon">{weatherIcon(w.current.code, w.current.isDay)}</span>
        <div class="main">
          <span class="temp">{Math.round(w.current.temp)}°</span>
          <span class="label">{weatherLabel(w.current.code)} · {config.weather.place}</span>
        </div>
        <dl class="facts">
          <div><dt>Máx / Mín</dt><dd>{Math.round(day.max)}° / {Math.round(day.min)}°</dd></div>
          <div><dt>Sensación</dt><dd>{Math.round(w.current.feelsLike)}°</dd></div>
          <div><dt>Lluvia</dt><dd>{day.rainMax ?? 0}%</dd></div>
          <div><dt>Humedad</dt><dd>{w.current.humidity}%</dd></div>
          <div><dt>Viento</dt><dd>{Math.round(w.current.wind)} km/h</dd></div>
          <div><dt>Sol</dt><dd>{fmtTime(day.sunrise)} – {fmtTime(day.sunset)}</dd></div>
        </dl>
      {:else}
        <span class="icon">{weatherIcon(day.code)}</span>
        <div class="main">
          <span class="temp">{Math.round(day.max)}°<small> / {Math.round(day.min)}°</small></span>
          <span class="label">{weatherLabel(day.code)} · {config.weather.place}</span>
        </div>
        <dl class="facts two">
          <div><dt>Lluvia</dt><dd>{day.rainMax ?? 0}%</dd></div>
          <div><dt>Sol</dt><dd>{fmtTime(day.sunrise)} – {fmtTime(day.sunset)}</dd></div>
        </dl>
      {/if}
    </div>

    <div class="hourly">
      <HourlyStrip hours={hoursOn(w, day.date)} large />
    </div>
    {#if weather.error}<p class="stale">⚠ {weather.error} · datos de las {fmtTime(w.fetchedAt)}</p>{/if}
  </div>
{:else if weather.error}
  <p class="empty">{weather.error}</p>
{:else}
  <p class="empty">Cargando clima…</p>
{/if}

<style>
  .view {
    display: flex;
    flex-direction: column;
    gap: 8px;
    height: 100%;
  }
  .days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    flex: none;
  }
  .dchip {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 0;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .dchip.on {
    background: color-mix(in srgb, var(--accent) 22%, var(--surface));
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .dl {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-2);
    white-space: nowrap;
  }
  .on .dl {
    color: var(--text);
  }
  .di {
    font-size: 20px;
    line-height: 1.3;
  }
  .dt {
    font-size: 13px;
    color: var(--text-3);
    font-variant-numeric: tabular-nums;
  }
  .dt b {
    color: var(--text);
  }
  .summary {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 8px 14px;
    border-radius: var(--radius);
    background: var(--surface);
    flex: none;
  }
  .icon {
    font-size: 48px;
    line-height: 1;
  }
  .main {
    display: flex;
    flex-direction: column;
    min-width: 140px;
  }
  .temp {
    font-size: 42px;
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .temp small {
    font-size: 24px;
    color: var(--text-3);
  }
  .label {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-2);
    margin-top: 2px;
  }
  .facts {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px 12px;
    margin: 0;
  }
  .facts.two {
    grid-template-columns: repeat(2, 1fr);
  }
  .facts div {
    display: flex;
    flex-direction: column;
  }
  dt {
    font-size: 11px;
    color: var(--text-3);
    font-weight: 600;
  }
  dd {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .hourly {
    flex: 1;
    min-height: 0;
    display: flex;
  }
  .hourly :global(.strip) {
    flex: 1;
  }
  .stale {
    margin: 0;
    font-size: 13px;
    color: var(--warn);
  }
</style>
