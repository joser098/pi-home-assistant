<script lang="ts">
  import { eventTimeLabel } from '../dates';
  import { app } from '../store.svelte';
  import type { CalEvent } from '../types';

  let { event, onclick, compact = false }: { event: CalEvent; onclick?: () => void; compact?: boolean } = $props();
</script>

<button class="item" class:compact {onclick} style:--c={app.colorFor(event.ownerId)}>
  <span class="bar"></span>
  <span class="body">
    <span class="title">{event.title}</span>
    <span class="meta">
      {eventTimeLabel(event)}
      {#if event.location && !compact}· {event.location}{/if}
    </span>
  </span>
</button>

<style>
  .item {
    display: flex;
    align-items: stretch;
    gap: 12px;
    width: 100%;
    text-align: left;
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    background: var(--surface);
    min-height: 56px;
  }
  .item:active {
    background: var(--surface-2);
  }
  .bar {
    width: 5px;
    border-radius: 3px;
    background: var(--c);
    flex: none;
  }
  .body {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
  }
  .title {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta {
    font-size: 14px;
    color: var(--text-2);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .compact {
    min-height: 48px;
    padding: 8px 10px;
  }
</style>
