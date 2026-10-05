// Versículo del día de YouVersion, cacheado en daily_verse (una llamada a YouVersion por día).
// Lo pide la app (miembro logueado) y pg_cron a la madrugada (x-cron-secret), para tenerlo listo.
// La App Key de YouVersion queda solo acá, como secret.
//
// Secrets: YOUVERSION_APP_KEY (obligatorio), YOUVERSION_BIBLE_ID (opcional; si falta se elige
// una Biblia en español disponible para la key), HOUSEHOLD_TZ.
import { adminClient, corsHeaders, json, memberFromRequest, safeEqual } from '../_shared/supabase.ts';

const API = 'https://api.youversion.com/v1';
const TZ = Deno.env.get('HOUSEHOLD_TZ') ?? 'America/Argentina/Buenos_Aires';
/** Preferencias si hay que elegir una Biblia en español automáticamente. */
const PREFERRED = ['NVI', 'RVR1960', 'NBLA', 'RVC', 'NTV', 'RVES', 'DHH', 'TLA', 'PDT', 'RVR09'];

function key(): string {
  const k = Deno.env.get('YOUVERSION_APP_KEY');
  if (!k) throw new HttpError(503, 'Falta el secret YOUVERSION_APP_KEY');
  return k;
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

async function yv(path: string): Promise<Response> {
  return await fetch(`${API}${path}`, { headers: { 'X-YVP-App-Key': key(), accept: 'application/json' } });
}

async function yvJson(path: string): Promise<any> {
  const res = await yv(path);
  if (!res.ok) throw new HttpError(502, `YouVersion ${path.split('?')[0]}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return await res.json();
}

/** Fecha local de la casa (YYYY-MM-DD) y día del año (1-366). */
function today(): { date: string; dayOfYear: number } {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [y, m, d] = date.split('-').map(Number);
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000) + 1;
  return { date, dayOfYear };
}

async function passageIdFor(day: number): Promise<string> {
  // La documentación muestra las dos formas de la ruta; probamos ambas.
  for (const path of [`/verse_of_the_days/${day}`, `/verse-of-the-days/${day}`]) {
    const res = await yv(path);
    if (res.ok) {
      const j = await res.json();
      const id = j.passage_id ?? j.data?.passage_id;
      if (id) return id;
    } else if (res.status !== 404) {
      throw new HttpError(502, `YouVersion VOTD: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
  }
  throw new HttpError(502, 'YouVersion no devolvió el versículo del día');
}

async function bible(): Promise<{ id: string; abbreviation: string | null }> {
  const fixed = Deno.env.get('YOUVERSION_BIBLE_ID')?.trim();
  if (fixed) {
    const res = await yv(`/bibles/${encodeURIComponent(fixed)}`);
    if (res.ok) {
      const b = await res.json();
      return { id: fixed, abbreviation: (b.local_abbreviation ?? b.abbreviation ?? null)?.toUpperCase() ?? null };
    }
    // ID inexistente o no habilitado para la key: elegimos uno disponible.
    console.warn(`YOUVERSION_BIBLE_ID=${fixed} no disponible (${res.status}); se elige otra Biblia en español`);
  }
  const j = await yvJson('/bibles?language_ranges[]=spa');
  const list: { id: number | string; abbreviation?: string; local_abbreviation?: string }[] = j.data ?? j ?? [];
  if (!list.length) throw new HttpError(502, 'La App Key no tiene Biblias en español habilitadas');
  const abbr = (b: (typeof list)[number]) => (b.local_abbreviation ?? b.abbreviation ?? '').toUpperCase();
  const pick = PREFERRED.map((p) => list.find((b) => abbr(b) === p)).find(Boolean) ?? list[0];
  return { id: String(pick.id), abbreviation: abbr(pick) || null };
}

function clean(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = adminClient();
  const fromCron = safeEqual(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'));
  if (!fromCron && !(await memberFromRequest(admin, req))) return json({ error: 'no autorizado' }, 401);

  try {
    // Diagnóstico (solo cron/admin): ?list=spa lista las Biblias que habilita la App Key.
    const list = new URL(req.url).searchParams.get('list');
    if (fromCron && list) {
      const j = await yvJson(`/bibles?language_ranges[]=${encodeURIComponent(list)}`);
      const items = (j.data ?? j ?? []) as Record<string, unknown>[];
      return json(items.map((b) => ({ id: b.id, abbreviation: b.local_abbreviation ?? b.abbreviation, title: b.local_title ?? b.title })));
    }

    const { date, dayOfYear } = today();
    const { data: cached } = await admin.from('daily_verse').select('*').eq('day', date).maybeSingle();
    if (cached) return json(cached);

    const passageId = await passageIdFor(dayOfYear);
    const b = await bible();
    const p = await yvJson(`/bibles/${encodeURIComponent(b.id)}/passages/${encodeURIComponent(passageId)}?format=text`);
    const row = {
      day: date,
      passage_id: passageId,
      reference: p.reference ?? passageId,
      content: clean(p.content ?? ''),
      version: b.abbreviation,
    };
    if (!row.content) throw new HttpError(502, 'YouVersion devolvió el pasaje vacío');
    const { error } = await admin.from('daily_verse').upsert(row);
    if (error) throw error;
    return json(row);
  } catch (err) {
    console.error('verse-of-day', err);
    const status = err instanceof HttpError ? err.status : 500;
    return json({ error: err instanceof Error ? err.message : String(err) }, status);
  }
});
