<script lang="ts">
  import { app } from '../store.svelte';
</script>

{#if app.toast}
  <div class="toast" class:error={app.toast.kind === 'error'} role="status">{app.toast.text}</div>
{/if}

<style>
  .toast {
    position: fixed;
    left: 50%;
    bottom: calc(88px + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    background: var(--text);
    color: var(--bg);
    padding: 12px 18px;
    border-radius: 999px;
    font-weight: 600;
    z-index: 100;
    max-width: calc(100% - 32px);
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.3);
  }
  .error {
    background: var(--danger);
    color: #fff;
  }
</style>
