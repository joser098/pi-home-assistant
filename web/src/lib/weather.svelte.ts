// Clima actual + pronóstico por hora y por día (7 días), desde Open-Meteo (gratis, sin API key).
import { config } from './config';

const CACHE_KEY = 'pihome.weather.v2';
const DAYS = 7;
const REFRESH_MS = 15 * 60_000;

export interface HourForecast {
  time: Date;
  temp: number;
  code: number;
  rain: number | null; // probabilidad de lluvia %
  isDay: boolean;
}

export interface Weather {
  fetchedAt: Date;
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    wind: number;
    code: number;
    isDay: boolean;
  };
  /** days[0] es hoy. */
  days: DayForecast[];
  /** Todas las horas de los 7 días. Usar hoursOn() para filtrar un día. */
  hours: HourForecast[];
}

export interface DayForecast {
  date: Date;
  code: number;
  max: number;
  min: number;
  rainMax: number | null;
  sunrise: Date;
  sunset: Date;
}

export function hoursOn(w: Weather, day: Date): HourForecast[] {
  const key = day.toDateString();
  return w.hours.filter((h) => h.time.toDateString() === key);
}

/** La hora actual y las `count` siguientes. */
export function nextHours(w: Weather, now: Date, count: number): HourForecast[] {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime();
  return w.hours.filter((h) => h.time.getTime() >= from).slice(0, count + 1);
}

interface Condition {
  label: string;
  day: string;
  night: string;
}

const CONDITIONS: [number[], Condition][] = [
  [[0], { label: 'Despejado', day: '☀️', night: '🌙' }],
  [[1], { label: 'Mayormente despejado', day: '🌤️', night: '🌙' }],
  [[2], { label: 'Parcialmente nublado', day: '⛅', night: '☁️' }],
  [[3], { label: 'Nublado', day: '☁️', night: '☁️' }],
  [[45, 48], { label: 'Niebla', day: '🌫️', night: '🌫️' }],
  [[51, 53, 55], { label: 'Llovizna', day: '🌦️', night: '🌧️' }],
  [[56, 57], { label: 'Llovizna helada', day: '🌧️', night: '🌧️' }],
  [[61], { label: 'Lluvia leve', day: '🌧️', night: '🌧️' }],
  [[63], { label: 'Lluvia', day: '🌧️', night: '🌧️' }],
  [[65], { label: 'Lluvia fuerte', day: '🌧️', night: '🌧️' }],
  [[66, 67], { label: 'Lluvia helada', day: '🌧️', night: '🌧️' }],
  [[71, 73, 75, 77], { label: 'Nieve', day: '❄️', night: '❄️' }],
  [[80, 81], { label: 'Chaparrones', day: '🌦️', night: '🌧️' }],
  [[82], { label: 'Chaparrones fuertes', day: '🌧️', night: '🌧️' }],
  [[85, 86], { label: 'Nevadas', day: '🌨️', night: '🌨️' }],
  [[95], { label: 'Tormenta', day: '⛈️', night: '⛈️' }],
  [[96, 99], { label: 'Tormenta con granizo', day: '⛈️', night: '⛈️' }],
];

function condition(code: number): Condition {
  return CONDITIONS.find(([codes]) => codes.includes(code))?.[1] ?? { label: '—', day: '🌡️', night: '🌡️' };
}

export function weatherIcon(code: number, isDay = true): string {
  const c = condition(code);
  return isDay ? c.day : c.night;
}

export function weatherLabel(code: number): string {
  return condition(code).label;
}

/** Open-Meteo devuelve horas locales sin zona ("2026-10-05T14:00"): se parsean como hora local. */
function localTime(s: string): Date {
  const [d, t] = s.split('T');
  const [y, m, day] = d.split('-').map(Number);
  const [h, min] = (t ?? '00:00').split(':').map(Number);
  return new Date(y, m - 1, day, h, min);
}

async function fetchWeather(): Promise<Weather> {
  const q = new URLSearchParams({
    latitude: String(config.weather.lat),
    longitude: String(config.weather.lon),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m',
    hourly: 'temperature_2m,weather_code,precipitation_probability,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
    timezone: 'auto',
    forecast_days: String(DAYS),
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${q}`);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const j = await res.json();
  const h = j.hourly;
  const d = j.daily;
  return {
    fetchedAt: new Date(),
    current: {
      temp: j.current.temperature_2m,
      feelsLike: j.current.apparent_temperature,
      humidity: j.current.relative_humidity_2m,
      wind: j.current.wind_speed_10m,
      code: j.current.weather_code,
      isDay: j.current.is_day === 1,
    },
    days: (d.time as string[]).map((t, i) => ({
      date: localTime(t),
      code: d.weather_code[i],
      max: d.temperature_2m_max[i],
      min: d.temperature_2m_min[i],
      rainMax: d.precipitation_probability_max?.[i] ?? null,
      sunrise: localTime(d.sunrise[i]),
      sunset: localTime(d.sunset[i]),
    })),
    hours: (h.time as string[]).map((t, i) => ({
      time: localTime(t),
      temp: h.temperature_2m[i],
      code: h.weather_code[i],
      rain: h.precipitation_probability?.[i] ?? null,
      isDay: h.is_day[i] === 1,
    })),
  };
}

function readCache(): Weather | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const w = JSON.parse(raw);
    return {
      ...w,
      fetchedAt: new Date(w.fetchedAt),
      days: w.days.map((x: DayForecast & { date: string; sunrise: string; sunset: string }) => ({
        ...x,
        date: new Date(x.date),
        sunrise: new Date(x.sunrise),
        sunset: new Date(x.sunset),
      })),
      hours: w.hours.map((x: HourForecast & { time: string }) => ({ ...x, time: new Date(x.time) })),
    };
  } catch {
    return null;
  }
}

class WeatherState {
  data = $state<Weather | null>(null);
  error = $state<string | null>(null);
  /** Pronóstico de hoy (days[0]) o null si todavía no hay datos. */
  today = $derived(this.data?.days[0] ?? null);
  private started = false;

  start() {
    if (this.started) return;
    this.started = true;
    const cached = readCache();
    // El cache sirve solo si es de hoy (si no, el pronóstico por hora sería de ayer).
    if (cached && cached.fetchedAt.toDateString() === new Date().toDateString()) this.data = cached;
    void this.refresh();
    setInterval(() => void this.refresh(), REFRESH_MS);
    addEventListener('online', () => void this.refresh());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.isStale()) void this.refresh();
    });
  }

  private isStale(): boolean {
    return !this.data || Date.now() - this.data.fetchedAt.getTime() > REFRESH_MS;
  }

  async refresh() {
    try {
      this.data = await fetchWeather();
      this.error = null;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(this.data));
      } catch {
        /* sin storage */
      }
    } catch (e) {
      console.warn('[pihome] clima', e);
      this.error = 'No se pudo actualizar el clima';
    }
  }
}

export const weather = new WeatherState();
