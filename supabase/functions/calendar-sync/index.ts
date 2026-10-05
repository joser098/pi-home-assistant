// Sincroniza Google Calendar → events_cache.
// La llaman:
//   - Google (webhook push) con el header X-Goog-Channel-Token
//   - pg_cron cada 2 min con el header x-cron-secret (además renueva el canal de Google)
//   - un miembro logueado (botón "Actualizar ahora")
// Se despliega con verify_jwt = false: la autenticación se hace acá.
import { ensureWatch, recordError, syncCalendar } from '../_shared/calendar.ts';
import { adminClient, corsHeaders, cronSecret, json, memberFromRequest, safeEqual } from '../_shared/supabase.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = adminClient();
  const secret = cronSecret();
  const fromGoogle = req.headers.has('x-goog-channel-id');
  const fromCron = safeEqual(req.headers.get('x-cron-secret'), secret);

  if (fromGoogle) {
    if (!safeEqual(req.headers.get('x-goog-channel-token'), secret)) return json({ error: 'token inválido' }, 403);
    // El primer mensaje ("sync") solo confirma el canal.
    if (req.headers.get('x-goog-resource-state') === 'sync') return json({ ok: true });
  } else if (!fromCron && !(await memberFromRequest(admin, req))) {
    return json({ error: 'no autorizado' }, 401);
  }

  try {
    const result = await syncCalendar(admin);
    const watch = fromCron ? await ensureWatch(admin) : undefined;
    return json({ ok: true, ...result, watch });
  } catch (err) {
    console.error('calendar-sync', err);
    await recordError(admin, err);
    return json({ error: String(err) }, 500);
  }
});
