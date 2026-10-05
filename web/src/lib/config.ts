const env = import.meta.env;

function hour(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : fallback;
}

export const config = {
  supabaseUrl: env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY as string | undefined,
  vapidPublicKey: env.VITE_VAPID_PUBLIC_KEY as string | undefined,
  /** Sin Supabase configurado, o con VITE_MOCK=1, se usan datos de ejemplo. */
  mock: env.VITE_MOCK === '1' || !env.VITE_SUPABASE_URL,
  nightStart: hour(env.VITE_NIGHT_START, 23),
  nightEnd: hour(env.VITE_NIGHT_END, 7),
  locale: 'es-AR',
  weather: {
    lat: num(env.VITE_WEATHER_LAT, -34.6037),
    lon: num(env.VITE_WEATHER_LON, -58.3816),
    place: (env.VITE_WEATHER_PLACE as string | undefined) || 'Buenos Aires',
  },
};

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return value && Number.isFinite(n) ? n : fallback;
}

/** ¿Es horario nocturno (modo noche del kiosko)? Soporta rangos que cruzan medianoche. */
export function isNightHour(d: Date): boolean {
  const h = d.getHours();
  const { nightStart: s, nightEnd: e } = config;
  return s > e ? h >= s || h < e : h >= s && h < e;
}

const KIOSK_KEY = 'pihome.kiosk';

/** El kiosko se activa una vez con ?kiosk=1 (o se desactiva con ?kiosk=0) y queda recordado. */
export function isKioskMode(): boolean {
  const param = new URLSearchParams(location.search).get('kiosk');
  try {
    if (param === '1') localStorage.setItem(KIOSK_KEY, '1');
    if (param === '0') localStorage.removeItem(KIOSK_KEY);
    return localStorage.getItem(KIOSK_KEY) === '1';
  } catch {
    return param === '1';
  }
}
