// Envía Web Push de los recordatorios vencidos.
//   - pg_cron cada minuto con el header x-cron-secret
//   - un miembro logueado con { test: true } para probar sus notificaciones
// Se despliega con verify_jwt = false: la autenticación se hace acá.
import webpush from 'npm:web-push@3.6.7';
import { adminClient, corsHeaders, cronSecret, json, memberFromRequest, safeEqual } from '../_shared/supabase.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const TZ = Deno.env.get('HOUSEHOLD_TZ') ?? 'America/Argentina/Buenos_Aires';
/** Hora a la que avisan los recordatorios "sin hora". */
const ALL_DAY_HOUR = Number(Deno.env.get('ALL_DAY_REMINDER_HOUR') ?? '9');
/** No avisar recordatorios más viejos que esto (por ejemplo, si el cron estuvo caído). */
const MAX_LATE_MS = 2 * 86_400_000;

let vapidReady = false;
function initVapid() {
  if (vapidReady) return;
  const pub = Deno.env.get('VAPID_PUBLIC_KEY');
  const priv = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!pub || !priv) throw new Error('Faltan los secrets VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com', pub, priv);
  vapidReady = true;
}

interface Sub {
  id: string;
  member_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface Payload {
  title: string;
  body?: string;
  tag?: string;
  url?: string;
}

/** Hora y minuto locales de la casa para un instante dado. */
function localHM(d: Date): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
  return { h: Number(parts.find((p) => p.type === 'hour')!.value), m: Number(parts.find((p) => p.type === 'minute')!.value) };
}

/** Momento en que hay que avisar: la hora exacta, o ALL_DAY_HOUR si es "sin hora" (00:00 local). */
function notifyAt(due: Date): Date {
  const { h, m } = localHM(due);
  return h === 0 && m === 0 ? new Date(due.getTime() + ALL_DAY_HOUR * 3_600_000) : due;
}

async function send(admin: SupabaseClient, subs: Sub[], payload: Payload): Promise<number> {
  if (!subs.length) return 0;
  initVapid();
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), {
          TTL: 6 * 3600,
          urgency: 'high',
        });
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410: el celular dio de baja la suscripción.
        if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', s.id);
        else console.error('push falló', status, err);
      }
    }),
  );
  return sent;
}

async function processDue(admin: SupabaseClient) {
  const now = new Date();
  const { data: reminders, error } = await admin
    .from('reminders')
    .select('id, title, notes, due_at, assigned_to')
    .is('done_at', null)
    .is('notified_at', null)
    .lte('due_at', now.toISOString())
    .gte('due_at', new Date(now.getTime() - MAX_LATE_MS).toISOString());
  if (error) throw error;

  const due = (reminders ?? []).filter((r) => notifyAt(new Date(r.due_at)) <= now);
  if (!due.length) return { due: 0, sent: 0 };

  const [{ data: members }, { data: subs }] = await Promise.all([
    admin.from('members').select('id, name, role'),
    admin.from('push_subscriptions').select('*'),
  ]);
  const people = (members ?? []).filter((m) => m.role === 'person');
  const nameOf = (id: string | null) => people.find((m) => m.id === id)?.name;

  let sent = 0;
  for (const r of due) {
    const targets = r.assigned_to ? [r.assigned_to] : people.map((m) => m.id);
    const recipientSubs = (subs ?? []).filter((s: Sub) => targets.includes(s.member_id));
    const who = r.assigned_to ? `Para ${nameOf(r.assigned_to) ?? 'vos'}` : 'Para los dos';
    sent += await send(admin, recipientSubs, {
      title: `⏰ ${r.title}`,
      body: r.notes ? `${who} · ${r.notes}` : who,
      tag: r.id,
      url: '/',
    });
    // Se marca aunque no haya suscripciones, para no reintentar para siempre.
    await admin.from('reminders').update({ notified_at: now.toISOString() }).eq('id', r.id);
  }
  return { due: due.length, sent };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = adminClient();

  try {
    if (safeEqual(req.headers.get('x-cron-secret'), cronSecret())) {
      return json({ ok: true, ...(await processDue(admin)) });
    }

    const member = await memberFromRequest(admin, req);
    if (!member) return json({ error: 'no autorizado' }, 401);
    const body = await req.json().catch(() => ({}));
    if (!body.test) return json({ error: 'Acción desconocida' }, 400);

    const { data: subs } = await admin.from('push_subscriptions').select('*').eq('member_id', member.id);
    const sent = await send(admin, subs ?? [], { title: '🏠 Casa', body: `¡Hola ${member.name}! Las notificaciones funcionan.`, tag: 'test' });
    if (!sent) return json({ error: 'No hay suscripciones activas en este usuario' }, 400);
    return json({ ok: true, sent });
  } catch (err) {
    console.error('send-reminders', err);
    return json({ error: String(err) }, 500);
  }
});
