// Cliente mínimo de Google Calendar con Service Account (JWT firmado con WebCrypto).

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export interface GEventTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

export interface GEvent {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  updated?: string;
  start: GEventTime;
  end: GEventTime;
  creator?: { email?: string };
  extendedProperties?: { private?: Record<string, string> };
}

const API = 'https://www.googleapis.com/calendar/v3';
const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

let cached: { token: string; exp: number } | null = null;

function b64url(data: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function serviceAccount(): ServiceAccount {
  const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
  if (!raw) throw new Error('Falta el secret GOOGLE_SERVICE_ACCOUNT');
  // Acepta el JSON tal cual, en base64, o con las comillas escapadas (como lo deja `secrets set --env-file`).
  const value = raw.trim();
  const text = value.startsWith('{') ? value : new TextDecoder().decode(Uint8Array.from(atob(value), (c) => c.charCodeAt(0)));
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(JSON.parse(`"${text}"`));
  }
}

export function calendarId(): string {
  const id = Deno.env.get('GOOGLE_CALENDAR_ID');
  if (!id) throw new Error('Falta el secret GOOGLE_CALENDAR_ID');
  return id;
}

async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;

  const sa = serviceAccount();
  const tokenUri = sa.token_uri ?? 'https://oauth2.googleapis.com/token';
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: tokenUri, iat: now, exp: now + 3600 }),
  );
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) throw new Error(`Google auth falló: ${res.status} ${await res.text()}`);
  const json = await res.json();
  cached = { token: json.access_token, exp: now + json.expires_in };
  return cached.token;
}

async function gfetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json', ...init.headers },
  });
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    throw new Error(`Google Calendar ${init.method ?? 'GET'} ${path.split('?')[0]}: ${res.status} ${await res.text()}`);
  }
  return res;
}

const cal = (id: string) => `/calendars/${encodeURIComponent(id)}`;

/** Todas las instancias (recurrentes expandidas) entre timeMin y timeMax. */
export async function listEvents(calId: string, timeMin: Date, timeMax: Date): Promise<GEvent[]> {
  const out: GEvent[] = [];
  let pageToken: string | undefined;
  do {
    const q = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
    });
    if (pageToken) q.set('pageToken', pageToken);
    const json = await (await gfetch(`${cal(calId)}/events?${q}`)).json();
    out.push(...(json.items ?? []));
    pageToken = json.nextPageToken;
  } while (pageToken);
  return out.filter((e) => e.status !== 'cancelled');
}

export async function insertEvent(calId: string, event: Partial<GEvent>): Promise<GEvent> {
  return await (await gfetch(`${cal(calId)}/events`, { method: 'POST', body: JSON.stringify(event) })).json();
}

/** Borra el evento (o la instancia, si es de una serie). 404/410 = ya no existía. */
export async function deleteEvent(calId: string, eventId: string): Promise<void> {
  await gfetch(`${cal(calId)}/events/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
}

export interface Channel {
  id: string;
  resourceId: string;
  expiration: number;
}

/** Pide a Google que avise a `address` cuando cambie el calendario. */
export async function watch(calId: string, address: string, token: string, ttlSeconds: number): Promise<Channel> {
  const res = await gfetch(`${cal(calId)}/events/watch`, {
    method: 'POST',
    body: JSON.stringify({
      id: crypto.randomUUID(),
      type: 'web_hook',
      address,
      token,
      params: { ttl: String(ttlSeconds) },
    }),
  });
  const json = await res.json();
  return { id: json.id, resourceId: json.resourceId, expiration: Number(json.expiration) };
}

export async function stopChannel(ch: { id: string; resourceId: string }): Promise<void> {
  await gfetch('/channels/stop', { method: 'POST', body: JSON.stringify({ id: ch.id, resourceId: ch.resourceId }) });
}
