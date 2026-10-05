import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import './app.css';
import App from './App.svelte';
import { kiosk } from './lib/data';

if (kiosk) document.documentElement.classList.add('kiosk');
// En la Pi se abre con ?nocursor=1 para ocultar el puntero sobre la pantalla táctil.
if (new URLSearchParams(location.search).has('nocursor')) document.documentElement.classList.add('nocursor');

// Se actualiza solo cuando hay una versión nueva (importante en el kiosko, que nadie recarga).
registerSW({
  immediate: true,
  onRegisteredSW(_url, reg) {
    if (reg) setInterval(() => void reg.update(), 60 * 60_000);
  },
});

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;
