<script lang="ts">
  import { app } from '../store.svelte';

  let email = $state('');
  let password = $state('');
  let busy = $state(false);
  let error = $state<string | null>(null);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    busy = true;
    error = null;
    try {
      await app.signIn(email.trim(), password);
    } catch (err) {
      error = err instanceof Error ? err.message : 'No se pudo entrar';
    }
    busy = false;
  }
</script>

<main>
  <form onsubmit={submit}>
    <h1>🏠 Casa</h1>
    <label>
      Email
      <input type="email" autocomplete="username" bind:value={email} required />
    </label>
    <label>
      Contraseña
      <input type="password" autocomplete="current-password" bind:value={password} required />
    </label>
    {#if error}<p class="error">{error}</p>{/if}
    <button class="btn primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
  </form>
</main>

<style>
  main {
    height: 100%;
    display: grid;
    place-items: center;
    padding: 24px;
  }
  form {
    width: 100%;
    max-width: 360px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  h1 {
    margin: 0 0 8px;
    text-align: center;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-weight: 600;
    font-size: 14px;
    color: var(--text-2);
  }
  input {
    min-height: 48px;
    padding: 0 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface);
    font-size: 16px;
    color: var(--text);
  }
  .error {
    color: var(--danger);
    margin: 0;
  }
</style>
