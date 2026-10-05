# 🏠 PI HOME

Asistente de casa: calendario y recordatorios compartidos en una **pantalla táctil de 5" (Raspberry Pi 5)**
y en los **celulares** (PWA).

- **Eventos** → Google Calendar (calendario compartido "Casa"), con notificaciones nativas de Google
- **Recordatorios** → Supabase, con notificaciones Web Push
- Una sola app web con dos layouts: kiosko (`?kiosk=1`) y mobile

```
web/          PWA en Svelte 5 + Vite (kiosko + mobile)
supabase/     migraciones, Edge Functions (calendar-sync, calendar-events, send-reminders), cron
deploy/pi/    instalación del kiosko en la Raspberry Pi
docs/         guía de puesta en marcha
PLAN.md       plan y decisiones de arquitectura
```

## Desarrollo
```bash
cd web
npm install
npm run dev          # sin .env.local → modo demo con datos de ejemplo
```
- Mobile: http://localhost:5173/?kiosk=0
- Kiosko: http://localhost:5173/?kiosk=1 (en DevTools, elegir un dispositivo de 800×480)

`npm run check` corre el chequeo de tipos y `npm run build` arma el build de producción.

## Puesta en marcha
Ver [docs/SETUP.md](docs/SETUP.md).
