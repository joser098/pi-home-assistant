<script lang="ts">
  import type { Snippet } from 'svelte';

  let { onclose, children, full = false }: { onclose: () => void; children: Snippet; full?: boolean } = $props();
</script>

<div class="backdrop" role="presentation" onclick={onclose}>
  <div class="sheet" class:full role="dialog" aria-modal="true" tabindex="-1" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && onclose()}>
    {@render children()}
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 0.55);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 50;
    animation: fade 0.15s ease;
  }
  .sheet {
    width: 100%;
    max-width: 560px;
    max-height: 92%;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--surface);
    border-radius: 20px 20px 0 0;
    padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
    animation: up 0.2s ease;
  }
  .sheet.full {
    max-width: none;
    height: 100%;
    max-height: none;
    border-radius: 0;
    padding: 0;
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @keyframes up {
    from {
      transform: translateY(24px);
      opacity: 0;
    }
  }
</style>
