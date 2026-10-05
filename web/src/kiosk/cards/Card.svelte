<script lang="ts">
  import type { Snippet } from 'svelte';

  /** Tarjeta del dashboard: título tocable (abre el detalle) + acciones opcionales a la derecha. */
  let {
    title,
    onopen,
    actions,
    children,
    grow = false,
  }: { title: string; onopen: () => void; actions?: Snippet; children: Snippet; grow?: boolean } = $props();
</script>

<section class="card" class:grow>
  <div class="head">
    <button class="title" onclick={onopen}>{title} <span class="chev">›</span></button>
    {@render actions?.()}
  </div>
  <div class="body">
    {@render children()}
  </div>
</section>

<style>
  .card {
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 6px 10px 10px;
    border-radius: var(--radius);
    background: var(--surface);
  }
  .grow {
    flex: 1;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 40px;
  }
  .title {
    flex: 1;
    text-align: left;
    min-height: 40px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .chev {
    font-size: 16px;
    margin-left: 2px;
  }
  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
</style>
