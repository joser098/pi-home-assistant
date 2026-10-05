# Puesta en marcha

Orden: **1. Google → 2. Supabase → 3. Push → 4. Web → 5. Celulares → 6. Raspberry Pi**.
Para probar sin nada de esto: `cd web && npm install && npm run dev` (modo demo).

---

## 1. Google Calendar

### 1.1 Calendario compartido
1. En [calendar.google.com](https://calendar.google.com), una de las dos personas crea un calendario nuevo: **Otros calendarios → + → Crear calendario**, con el nombre **Casa**.
2. En **Configuración del calendario "Casa" → Compartir con personas específicas**, agregar el Gmail de la pareja con el permiso **Hacer cambios en eventos**.
3. En la misma pantalla, copiar el **ID del calendario** (algo como `abc123@group.calendar.google.com`). Ese valor es el `GOOGLE_CALENDAR_ID`.

### 1.2 Service Account (para que Supabase lea y escriba el calendario)
1. En [console.cloud.google.com](https://console.cloud.google.com), crear un proyecto (por ejemplo `pi-home`).
2. **APIs y servicios → Biblioteca → Google Calendar API → Habilitar**.
3. **IAM y administración → Cuentas de servicio → Crear**. Nombre `pihome`, sin roles.
4. Entrar a la cuenta creada, ir a **Claves → Agregar clave → JSON** y se descarga un archivo `.json`. **No lo subas a ningún lado**: va como secret en el paso 2.4.
5. Copiar el email de la cuenta de servicio (`pihome@<proyecto>.iam.gserviceaccount.com`).
6. Volver a la configuración del calendario **Casa → Compartir con personas específicas**, agregar ese email con **Hacer cambios en eventos**.

> No hace falta pantalla de consentimiento OAuth ni verificación de la app: la cuenta de servicio no vence.

---

## 2. Supabase

### 2.1 Proyecto
Crear un proyecto en [supabase.com](https://supabase.com) (el plan gratis alcanza). Anotar:
- `Project URL` → `https://<PROJECT_REF>.supabase.co`
- `anon` / publishable key

### 2.2 Base de datos
En **SQL Editor**, correr `supabase/migrations/20261005000000_init.sql`.
(Con la CLI: `supabase link --project-ref <REF>` y después `supabase db push`.)

### 2.3 Usuarios
1. **Authentication → Users → Add user** (con *Auto Confirm*), para crear 3 usuarios: las dos personas y `kiosk@...` (puede ser un email inventado).
2. **Authentication → Sign In / Providers**: desactivar **Allow new users to sign up**. Así nadie más puede registrarse.
3. En **SQL Editor**, registrar a cada usuario en la casa (listo para editar en `supabase/setup/members.sql`):

```sql
insert into public.members (id, name, color, role, google_email) values
  ((select id from auth.users where email = 'persona-a@gmail.com'), 'Nombre A', '#4f9cf9', 'person', 'persona-a@gmail.com'),
  ((select id from auth.users where email = 'persona-b@gmail.com'), 'Nombre B', '#f472b6', 'person', 'persona-b@gmail.com'),
  ((select id from auth.users where email = 'kiosk@casa.local'),    'Pantalla', '#a3a3a3', 'kiosk',  null);
```

`google_email` es el Gmail con el que cada uno usa Google Calendar. Sirve para colorear los eventos que crean desde el celular.

### 2.4 Secrets de las Edge Functions
**Edge Functions → Secrets** (o `supabase secrets set ...`):

| Secret | Valor |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT` | El **contenido completo** del `.json` de la cuenta de servicio |
| `GOOGLE_CALENDAR_ID` | El ID del calendario "Casa" |
| `CRON_SECRET` | Un texto aleatorio largo (`openssl rand -hex 32`) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Ver paso 3 |
| `VAPID_SUBJECT` | `mailto:tu-email@gmail.com` |
| `HOUSEHOLD_TZ` | `America/Argentina/Buenos_Aires` (opcional) |
| `ALL_DAY_REMINDER_HOUR` | Hora de aviso de los recordatorios sin hora, por defecto `9` (opcional) |
| `YOUVERSION_APP_KEY` | App Key de [YouVersion Platform](https://developers.youversion.com/) (versículo del día en el reposo) |
| `YOUVERSION_BIBLE_ID` | Opcional. Biblias en español del plan gratis: `147` Reina-Valera Antigua, `3365` Palabra de Dios para ti, `3291` Versión Biblia Libre |

### 2.5 Desplegar funciones
```bash
supabase functions deploy calendar-sync --no-verify-jwt
supabase functions deploy send-reminders --no-verify-jwt
supabase functions deploy calendar-events
supabase functions deploy verse-of-day --no-verify-jwt
```

### 2.6 Cron
En **SQL Editor**, correr `supabase/setup/cron.sql` después de reemplazar `<PROJECT_REF>` y el `CRON_SECRET`.
Al minuto, en **Table Editor → events_cache**, deberían aparecer los eventos de Google, y en `sync_state` el `last_sync`.
Si algo falla, el error queda en `sync_state.value.last_error` y en **Edge Functions → Logs**.

---

## 3. Llaves para Web Push (VAPID)
```bash
npx web-push generate-vapid-keys
```
- La **pública** va en `VAPID_PUBLIC_KEY` (secret) y en `VITE_VAPID_PUBLIC_KEY` (web).
- La **privada** va solo en `VAPID_PRIVATE_KEY` (secret). Nunca en la web.

---

## 4. Web (Vercel o Netlify)
1. Subir el repo a GitHub (privado).
2. En Vercel: **New Project**, elegir el repo y configurar **Root Directory** = `web`. Framework: Vite.
3. Variables de entorno (ver `web/.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`, y opcionalmente `VITE_NIGHT_START` / `VITE_NIGHT_END`.
4. Deploy. La app queda en `https://<algo>.vercel.app`.

Para desarrollo local con Supabase real: copiar `web/.env.example` a `web/.env.local` y completarlo.

---

## 5. Celulares

### iPhone (iOS 16.4 o más nuevo)
1. Abrir la URL en **Safari**, tocar **Compartir → Agregar a inicio**.
2. Abrir **Casa** desde el ícono nuevo e iniciar sesión.
3. **Ajustes → Activar en este celular** y aceptar el permiso. Después, **Probar**.
4. Para ver los eventos también en el Calendario de iOS: **Ajustes → Calendario → Cuentas → Agregar cuenta → Google** y activar el calendario "Casa".

### Android
1. Abrir la URL en **Chrome**, menú **⋮ → Instalar app**.
2. Iniciar sesión, ir a **Ajustes → Activar en este celular** y después **Probar**.
3. El calendario "Casa" aparece solo en Google Calendar (revisar que esté tildado).

> Los **eventos** avisan por Google Calendar: cada uno configura sus avisos por defecto en
> Google Calendar → Configuración → "Casa" → Notificaciones de eventos.
> Los **recordatorios** avisan por la app (Web Push).

---

## 6. Raspberry Pi 5
1. Instalar **Raspberry Pi OS (64-bit) con escritorio** (Bookworm o posterior) con Raspberry Pi Imager. Configurar WiFi y SSH ahí mismo.
2. Conectar la pantalla táctil y verificar que el touch funcione en el escritorio.
3. Copiar e instalar:
   ```bash
   scp -r deploy/pi pi@<ip-de-la-pi>:~/pihome
   ssh pi@<ip-de-la-pi>
   bash ~/pihome/install.sh https://<tu-app>.vercel.app
   sudo reboot
   ```
4. Primera vez: conectar un teclado USB e iniciar sesión con el usuario **kiosk**. La sesión queda guardada.

**Útil:**
- Salir del kiosko: teclado → `Alt+F4`.
- Rotar la pantalla: **Preferencias → Configuración de pantallas** (antes de instalar).
- La app se actualiza sola cuando se publica una versión nueva (se chequea cada hora).
- Modo noche: entre `VITE_NIGHT_START` y `VITE_NIGHT_END` la pantalla queda negra con la hora tenue; un toque la despierta por 2 minutos.
