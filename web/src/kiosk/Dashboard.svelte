<script lang="ts">
  import type { Selected } from '../lib/types';
  import EventsCard from './cards/EventsCard.svelte';
  import RemindersCard from './cards/RemindersCard.svelte';
  import WeatherCard from './cards/WeatherCard.svelte';
  import type { View } from './views';

  let { go, onselect, onday }: { go: (v: View) => void; onselect: (s: Selected) => void; onday: (d: Date) => void } =
    $props();
</script>

<!-- Dashboard: todo a primera vista. Cada tarjeta abre su vista de detalle. -->
<div class="grid">
  <EventsCard {go} {onselect} {onday} />
  <div class="col">
    <WeatherCard onopen={() => go('weather')} />
    <RemindersCard onopen={() => go('reminders')} {onselect} />
  </div>
</div>

<style>
  .grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 10px;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
  }
</style>
