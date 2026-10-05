<script lang="ts">
  import { app } from '../store.svelte';
  import { weatherIcon, type HourForecast } from '../weather.svelte';

  let { hours, large = false }: { hours: HourForecast[]; large?: boolean } = $props();

  let strip: HTMLDivElement | undefined = $state();

  const currentHour = $derived(app.now.getHours());
  const isToday = (h: HourForecast) => h.time.toDateString() === app.now.toDateString();

  // Hoy: se centra la hora actual. Otro día: arranca a las 8 h.
  $effect(() => {
    void currentHour;
    void hours;
    if (!strip) return;
    const now = strip.querySelector<HTMLElement>('[data-now]');
    if (now) {
      strip.scrollLeft = now.offsetLeft - strip.clientWidth / 2 + now.clientWidth / 2;
    } else {
      const morning = strip.querySelector<HTMLElement>('[data-h="8"]');
      strip.scrollLeft = morning ? morning.offsetLeft - strip.offsetLeft : 0;
    }
  });
</script>

<div class="strip scroll" class:large bind:this={strip}>
  {#each hours as h (h.time.getTime())}
    {@const now = isToday(h) && h.time.getHours() === currentHour}
    {@const past = isToday(h) && h.time.getHours() < currentHour}
    <div class="hour" class:now class:past data-now={now ? '' : undefined} data-h={h.time.getHours()}>
      <span class="time">{now ? 'Ahora' : `${String(h.time.getHours()).padStart(2, '0')}h`}</span>
      <span class="icon">{weatherIcon(h.code, h.isDay)}</span>
      <span class="temp">{Math.round(h.temp)}°</span>
      <span class="rain" class:wet={(h.rain ?? 0) >= 30}>{h.rain != null && h.rain > 0 ? `💧${h.rain}%` : ''}</span>
    </div>
  {/each}
</div>

<style>
  .strip {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-behavior: smooth;
    padding-bottom: 2px;
  }
  .hour {
    flex: none;
    width: 58px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 0;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .large .hour {
    width: 76px;
    padding: 10px 0;
    gap: 4px;
    justify-content: space-evenly;
  }
  .hour.now {
    background: color-mix(in srgb, var(--accent) 22%, var(--surface));
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  .hour.past {
    opacity: 0.4;
  }
  .time {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-2);
  }
  .now .time {
    color: var(--text);
  }
  .icon {
    font-size: 22px;
    line-height: 1.2;
  }
  .large .icon {
    font-size: 34px;
  }
  .temp {
    font-size: 16px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .large .temp {
    font-size: 22px;
  }
  .large .time,
  .large .rain {
    font-size: 13px;
  }
  .rain {
    font-size: 11px;
    color: var(--text-3);
    min-height: 14px;
    font-variant-numeric: tabular-nums;
  }
  .rain.wet {
    color: var(--accent);
    font-weight: 700;
  }
</style>
