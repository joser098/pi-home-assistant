<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { isNightHour } from '../lib/config';
  import { fmtLongDate, fmtTime } from '../lib/dates';
  import { app } from '../lib/store.svelte';
  import { verse } from '../lib/verse.svelte';
  import { weather, weatherIcon, weatherLabel } from '../lib/weather.svelte';

  /** Reposo después de 5 minutos sin tocar la pantalla. De noche manda el modo noche. */
  // En desarrollo, ?reposo=<segundos> acorta la espera para probar.
  const devIdle = import.meta.env.DEV ? Number(new URLSearchParams(location.search).get('reposo')) : 0;
  const IDLE_MS = devIdle > 0 ? devIdle * 1000 : 5 * 60_000;
  const CHECK_MS = devIdle > 0 ? 1_000 : 5_000;

  let lastTouch = Date.now();
  let active = $state(false);
  // Corrimiento lento del contenido para no dejar siempre los mismos píxeles fijos.
  let drift = $state({ x: 0, y: 0 });

  onMount(() => {
    verse.start();
    const touch = () => (lastTouch = Date.now());
    addEventListener('pointerdown', touch, { capture: true });
    let ticks = 0;
    const timer = setInterval(() => {
      if (!active && Date.now() - lastTouch > IDLE_MS && !isNightHour(new Date())) active = true;
      // Cada minuto, mover el contenido unos píxeles.
      if (active && ++ticks % 12 === 0) drift = { x: Math.round(Math.random() * 24 - 12), y: Math.round(Math.random() * 16 - 8) };
    }, CHECK_MS);
    return () => {
      removeEventListener('pointerdown', touch, { capture: true });
      clearInterval(timer);
    };
  });

  // Al entrar el modo noche, el reposo se apaga (lo reemplaza la pantalla negra).
  $effect(() => {
    if (active && isNightHour(app.now)) active = false;
  });

  // Se despierta con un toque. Se usa "click" (no pointerdown) para que el toque
  // termine sobre el reposo y no active lo que hay debajo.
  function wake(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    lastTouch = Date.now();
    active = false;
  }

  const size = $derived.by(() => {
    const n = verse.current?.content.length ?? 0;
    if (n > 260) return 20;
    if (n > 180) return 24;
    if (n > 110) return 28;
    return 32;
  });
</script>

{#if active}
  <button class="saver" onclick={wake} transition:fade={{ duration: 600 }} aria-label="Tocar para volver">
    <div class="inner" style:transform={`translate(${drift.x}px, ${drift.y}px)`}>
      <div class="top">
        <div>
          <div class="clock">{fmtTime(app.now)}</div>
          <div class="date">{fmtLongDate(app.now)}</div>
        </div>
        {#if weather.data && weather.today}
          {@const c = weather.data.current}
          <div class="wx">
            <span class="wi">{weatherIcon(c.code, c.isDay)}</span>
            <span>
              <b>{Math.round(c.temp)}°</b>
              <small>{weatherLabel(c.code)} · ↑{Math.round(weather.today.max)}° ↓{Math.round(weather.today.min)}°</small>
            </span>
          </div>
        {/if}
      </div>

      {#if verse.current}
        <figure>
          <blockquote style:font-size={`${size}px`}>“{verse.current.content}”</blockquote>
          <figcaption>
            {verse.current.reference}{#if verse.current.version}<span>&nbsp;· {verse.current.version}</span>{/if}
          </figcaption>
        </figure>
      {/if}

      <p class="hint">Tocá para volver</p>
    </div>
  </button>
{/if}

<style>
  .saver {
    position: fixed;
    inset: 0;
    z-index: 150;
    background: #07080b;
    color: #e9ecf2;
    text-align: left;
    cursor: default;
  }
  .inner {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 24px 40px 16px;
    transition: transform 4s ease-in-out;
  }
  .top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }
  .clock {
    font-size: 64px;
    font-weight: 200;
    line-height: 1;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .date {
    margin-top: 6px;
    font-size: 18px;
    color: #9aa3b5;
  }
  .wx {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .wi {
    font-size: 40px;
  }
  .wx b {
    display: block;
    font-size: 30px;
    font-weight: 300;
    font-variant-numeric: tabular-nums;
  }
  .wx small {
    font-size: 13px;
    color: #9aa3b5;
  }
  figure {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    margin: 0;
  }
  blockquote {
    margin: 0;
    font-family: Georgia, 'Noto Serif', 'DejaVu Serif', serif;
    font-weight: 400;
    line-height: 1.35;
    color: #f4f1ea;
  }
  figcaption {
    margin-top: 14px;
    font-size: 17px;
    font-weight: 600;
    color: #c9a96a;
  }
  figcaption span {
    font-weight: 400;
    color: #9aa3b5;
  }
  .hint {
    margin: 0;
    text-align: center;
    font-size: 12px;
    color: #4d5566;
  }
</style>
