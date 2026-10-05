<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, onback, children }: { title: string; onback: () => void; children?: Snippet } = $props();
</script>

<div class="bar">
  <button class="back" onclick={onback}>‹ Inicio</button>
  <h2>{title}</h2>
  <div class="right">{@render children?.()}</div>
</div>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-bottom: 8px;
    flex: none;
  }
  .back {
    min-height: 44px;
    padding: 0 16px;
    border-radius: 999px;
    background: var(--surface);
    font-weight: 700;
    font-size: 16px;
  }
  .back:active {
    background: var(--surface-2);
  }
  h2 {
    margin: 0;
    font-size: 20px;
  }
  .right {
    margin-left: auto;
  }
</style>
