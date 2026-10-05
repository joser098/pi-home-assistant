<script lang="ts">
  import { isNightHour } from '../lib/config';
  import { fmtTime } from '../lib/dates';
  import { app } from '../lib/store.svelte';

  const WAKE_MS = 2 * 60_000;

  let wokeAt = $state(0);

  const asleep = $derived(isNightHour(app.now) && app.now.getTime() - wokeAt > WAKE_MS);
</script>

{#if asleep}
  <button class="night" onclick={() => (wokeAt = Date.now())} aria-label="Despertar pantalla">
    <span>{fmtTime(app.now)}</span>
  </button>
{/if}

<style>
  .night {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: #000;
    display: grid;
    place-items: center;
    cursor: default;
  }
  span {
    font-size: 96px;
    font-weight: 200;
    color: #fff;
    opacity: 0.18;
    font-variant-numeric: tabular-nums;
  }
</style>
