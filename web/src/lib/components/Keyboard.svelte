<script lang="ts">
  /** Teclado en pantalla para el kiosko (el del sistema no es confiable en Chromium --kiosk). */
  let { value = $bindable(''), ondone, doneLabel = 'Listo' }: { value: string; ondone?: () => void; doneLabel?: string } = $props();

  const LETTERS = ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'];
  const SYMBOLS = ['1234567890', 'áéíóú-/:@&', '()¿?!¡"\''];

  let page = $state<'abc' | '123'>('abc');
  let shift = $state(false);

  // Mayúscula automática al empezar.
  const upper = $derived(shift || value.length === 0);
  const rows = $derived(page === 'abc' ? LETTERS : SYMBOLS);

  function type(ch: string) {
    value += upper && page === 'abc' ? ch.toUpperCase() : ch;
    shift = false;
  }

  function backspace() {
    value = value.slice(0, -1);
  }
</script>

<div class="kb">
  {#each rows as row, i (row)}
    <div class="row">
      {#if i === 2 && page === 'abc'}
        <button class="key wide" class:on={shift} onclick={() => (shift = !shift)} aria-label="Mayúsculas">⇧</button>
      {/if}
      {#each row.split('') as ch (ch)}
        <button class="key" onclick={() => type(ch)}>{upper && page === 'abc' ? ch.toUpperCase() : ch}</button>
      {/each}
      {#if i === 2}
        <button class="key wide" onclick={backspace} aria-label="Borrar">⌫</button>
      {/if}
    </div>
  {/each}
  <div class="row">
    <button class="key wide" onclick={() => (page = page === 'abc' ? '123' : 'abc')}>{page === 'abc' ? '123' : 'ABC'}</button>
    <button class="key" onclick={() => type(',')}>,</button>
    <button class="key space" onclick={() => (value += ' ')} aria-label="Espacio">espacio</button>
    <button class="key" onclick={() => type('.')}>.</button>
    <button class="key done" onclick={ondone} disabled={!value.trim()}>{doneLabel}</button>
  </div>
</div>

<style>
  .kb {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    background: var(--surface);
    user-select: none;
  }
  .row {
    display: flex;
    gap: 6px;
  }
  .key {
    flex: 1 1 0;
    height: 48px;
    border-radius: 8px;
    background: var(--surface-2);
    font-size: 20px;
    font-weight: 500;
  }
  .key:active {
    background: var(--border);
  }
  .wide {
    flex: 1.5 1 0;
    font-size: 17px;
  }
  .on {
    background: var(--text);
    color: var(--bg);
  }
  .space {
    flex: 5 1 0;
    font-size: 15px;
    color: var(--text-2);
  }
  .done {
    flex: 2 1 0;
    background: var(--accent);
    color: var(--accent-text);
    font-size: 17px;
    font-weight: 700;
  }
  .done:disabled {
    opacity: 0.4;
  }
</style>
