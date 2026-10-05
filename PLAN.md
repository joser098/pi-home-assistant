# PI HOME — Plan

Asistente de casa: kiosko táctil de 5" en una Raspberry Pi 5 + PWA en los celulares (iPhone y Android).
Módulo 1: **calendario y recordatorios compartidos** de la pareja.

## Modelo combinado

| Qué | Fuente de verdad | Notificaciones |
|---|---|---|
| **Eventos** (turnos, cumpleaños, salidas) | Google Calendar, calendario compartido **"Casa"** | Nativas de Google en los celulares |
| **Recordatorios** (y en el futuro tareas, compras…) | Supabase, tabla `reminders` | Web Push (PWA) |

Una sola app (PWA) muestra todo junto, con dos layouts: **kiosko** (800×480 táctil) y **mobile**.

```
 Google Calendar "Casa" ◄── crear/editar/borrar ── Edge Fn `calendar-events` ◄── app
   │  push "algo cambió"                                     
   ▼                                                          
 Edge Fn `calendar-sync` ── upsert ──► Supabase `events_cache` ── Realtime ──► app
   ▲ pg_cron cada 2 min (respaldo + renovación del canal)

 app ── insert/update ──► Supabase `reminders` ── Realtime ──► app
 pg_cron cada 1 min ──► Edge Fn `send-reminders` ── Web Push ──► celulares
```

### Decisiones
- **Google es la verdad para los eventos.** `events_cache` es una copia de solo lectura: la app nunca la edita directo, siempre pasa por Google. Así no hay conflictos.
- **Service Account** para acceder a Google: no hay login de Google, y no hay tokens que venzan cada 7 días.
- **Sync por ventana:** cada sync trae de Google `[hoy-30d, hoy+365d]` (`singleEvents=true`), hace upsert y borra lo que ya no existe en esa ventana. Es simple y no rompe con eventos recurrentes.
- **Todo corre en la nube** (Supabase + hosting estático). La Pi solo abre Chromium en kiosko. Si la Pi se apaga, los celulares siguen funcionando.
- **Offline en el kiosko:** el service worker cachea la app y los últimos datos quedan en `localStorage`.
- **Auth:** Supabase Auth con email y contraseña. Hay 3 usuarios: las dos personas y un usuario `kiosk`. Solo los usuarios de la tabla `members` ven datos (RLS).
- **Push en iPhone:** requiere iOS ≥ 16.4 y la PWA instalada con "Agregar a inicio".

## Stack
- **Web:** Svelte 5 + Vite + TypeScript + `vite-plugin-pwa` (service worker propio para push)
- **Backend:** Supabase (Postgres, Auth, Realtime, Edge Functions en Deno, `pg_cron`, `pg_net`)
- **Hosting de la web:** Vercel o Netlify (gratis)
- **Pi:** Raspberry Pi OS Bookworm + Chromium `--kiosk` (labwc), sin servidor propio

## Estructura
```
pi-home/
├── web/                     # PWA (kiosko + mobile)
│   └── src/
│       ├── lib/data/        # capa de datos: supabase | mock
│       ├── lib/components/  # teclado en pantalla, selector de hora…
│       ├── kiosk/           # vistas Hoy, Semana, Mes, Agregar
│       ├── mobile/          # Agenda, Recordatorios, Agregar, Ajustes
│       └── sw.ts            # service worker (cache + push)
├── supabase/
│   ├── migrations/          # tablas, RLS, realtime
│   ├── functions/           # calendar-sync, calendar-events, send-reminders
│   └── setup/cron.sql       # pg_cron (se corre una vez con la URL del proyecto)
├── deploy/pi/               # install.sh, autostart del kiosko, modo noche
└── docs/                    # guías: Google, Supabase, celulares
```

## Modelo de datos
- `members`: id (auth user), nombre, color, google_email, rol (`person` | `kiosk`)
- `events_cache`: evento de Google (id, título, inicio/fin, todo el día, dueño, creador, …)
- `reminders`: título, notas, `due_at`, asignado a (null = ambos), repetición, hecho por/cuándo, `notified_at`
- `push_subscriptions`: suscripciones Web Push por miembro
- `sync_state`: estado del sync y del canal de webhook de Google

"Dueño" de un evento: lo que se eligió en la app (`extendedProperties.private.owner`), o si no, se deduce del email del creador en Google.

## Fases
1. ✅ **Scaffold + modo mock**: la app completa con datos de ejemplo en la PC
2. ✅ **Supabase** (proyecto "PI Assistant", ref `ttsunyvqfyeemrgtruas`): migraciones, funciones, cron, usuarios y secrets
3. ✅ **Google**: proyecto `pi-home-510721`, Service Account `pihome@…`, calendario compartido **"Home"**
4. **Push**: llaves VAPID, suscripción en los celulares y cron de recordatorios
5. 🟡 **Deploy**: web en Vercel o Netlify, Pi en kiosko (`deploy/pi/install.sh` listo)
6. **Después**: lista de compras, clima, calendarios personales en solo lectura, bot de Telegram, Home Assistant

## Datos pendientes (por ahora son placeholders en config)
- Nombres y colores de los dos
- Zona horaria (default `America/Argentina/Buenos_Aires`)
- Resolución de la pantalla (default 800×480)
- Horario nocturno (default 23:00–07:00)
- Cuenta de Supabase existente, o crear un proyecto nuevo
