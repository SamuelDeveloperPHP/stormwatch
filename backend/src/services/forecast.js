import { config } from "../config/index.js";

/**
 * Previsão do tempo (padrão Adapter, igual ao adapter de raios).
 *
 * Provider padrão: "openmeteo" — API gratuita, sem chave, ótima cobertura no
 * Brasil. Mantemos "mock" como fallback para desenvolvimento offline.
 * Selecione via FORECAST_PROVIDER no .env.
 *
 * Formato canônico devolvido (consumido pelo front em types.ts/Panels.tsx):
 *   {
 *     location: { lat, lon, label },
 *     observedAt: ISO,
 *     current: { tempC, feelsLikeC, humidity, windKmh, condition, conditionLabel, icon },
 *     hourly: [ { time, hourLabel, tempC, precipProb, condition, icon } ]
 *   }
 *
 * `condition` e `icon` ficam restritos ao vocabulário do app
 * (thunderstorm|rain|cloudy|partly|clear  /  storm|rain|cloud|partly|sun)
 * para não quebrar nada a jusante; `conditionLabel` é o texto exibido.
 */

const HOURS_AHEAD = 8;

// ---------- Tradução de códigos WMO (Open-Meteo) ----------
// https://open-meteo.com/en/docs  (seção "Weather variable documentation")
const WMO = {
  0: { condition: "clear", label: "Céu limpo", icon: "sun" },
  1: { condition: "clear", label: "Predominantemente limpo", icon: "sun" },
  2: { condition: "partly", label: "Parcialmente nublado", icon: "partly" },
  3: { condition: "cloudy", label: "Nublado", icon: "cloud" },
  45: { condition: "cloudy", label: "Nevoeiro", icon: "cloud" },
  48: { condition: "cloudy", label: "Nevoeiro com geada", icon: "cloud" },
  51: { condition: "rain", label: "Garoa fraca", icon: "rain" },
  53: { condition: "rain", label: "Garoa", icon: "rain" },
  55: { condition: "rain", label: "Garoa intensa", icon: "rain" },
  56: { condition: "rain", label: "Garoa congelante", icon: "rain" },
  57: { condition: "rain", label: "Garoa congelante intensa", icon: "rain" },
  61: { condition: "rain", label: "Chuva fraca", icon: "rain" },
  63: { condition: "rain", label: "Chuva", icon: "rain" },
  65: { condition: "rain", label: "Chuva forte", icon: "rain" },
  66: { condition: "rain", label: "Chuva congelante", icon: "rain" },
  67: { condition: "rain", label: "Chuva congelante forte", icon: "rain" },
  71: { condition: "cloudy", label: "Neve fraca", icon: "cloud" },
  73: { condition: "cloudy", label: "Neve", icon: "cloud" },
  75: { condition: "cloudy", label: "Neve forte", icon: "cloud" },
  77: { condition: "cloudy", label: "Grãos de neve", icon: "cloud" },
  80: { condition: "rain", label: "Pancadas de chuva fracas", icon: "rain" },
  81: { condition: "rain", label: "Pancadas de chuva", icon: "rain" },
  82: { condition: "rain", label: "Pancadas de chuva fortes", icon: "rain" },
  85: { condition: "cloudy", label: "Pancadas de neve", icon: "cloud" },
  86: { condition: "cloudy", label: "Pancadas de neve fortes", icon: "cloud" },
  95: { condition: "thunderstorm", label: "Tempestade", icon: "storm" },
  96: { condition: "thunderstorm", label: "Tempestade com granizo", icon: "storm" },
  99: { condition: "thunderstorm", label: "Tempestade com granizo forte", icon: "storm" },
};

function describe(code) {
  return WMO[code] ?? { condition: "cloudy", label: "Indefinido", icon: "cloud" };
}

/** "2026-06-23T15:00" -> "15h" (sem depender do fuso do servidor). */
function hourLabelFromIso(iso) {
  const m = /T(\d{2}):/.exec(iso ?? "");
  return m ? `${m[1]}h` : String(iso ?? "");
}

function fail(message, status) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// ---------- PROVIDER REAL: Open-Meteo ----------
async function openMeteoForecast({ lat, lon, label }) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    timezone: "auto", // horários no fuso local do ponto monitorado
    forecast_days: "2", // suficiente para as próximas horas, mesmo perto da meia-noite
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;

  // Timeout defensivo: não deixar uma chamada lenta travar a rota.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  let data;
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw fail(`Open-Meteo respondeu ${res.status}`, 502);
    data = await res.json();
  } catch (err) {
    if (err.name === "AbortError") throw fail("Open-Meteo: tempo limite excedido", 504);
    if (!err.status) err.status = 502;
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const cur = data.current ?? {};
  if (!Number.isFinite(cur.temperature_2m)) {
    throw fail("Open-Meteo: resposta sem dados atuais", 502);
  }
  const curDesc = describe(cur.weather_code);

  // Monta as próximas horas a partir da hora atual.
  const times = data.hourly?.time ?? [];
  const temps = data.hourly?.temperature_2m ?? [];
  const precs = data.hourly?.precipitation_probability ?? [];
  const codes = data.hourly?.weather_code ?? [];

  // Primeira hora >= agora (comparação lexicográfica do prefixo "YYYY-MM-DDTHH").
  const nowPrefix = String(cur.time ?? "").slice(0, 13);
  let start = times.findIndex((t) => String(t).slice(0, 13) >= nowPrefix);
  if (start < 0) start = 0;

  const hourly = [];
  for (let i = start; i < times.length && hourly.length < HOURS_AHEAD; i++) {
    if (!Number.isFinite(temps[i])) continue;
    const d = describe(codes[i]);
    hourly.push({
      time: times[i],
      hourLabel: hourLabelFromIso(times[i]),
      tempC: Math.round(temps[i]),
      precipProb: Math.round(precs[i] ?? 0),
      condition: d.condition,
      icon: d.icon,
    });
  }

  return {
    location: { lat, lon, label },
    observedAt: cur.time ?? new Date().toISOString(),
    current: {
      tempC: Math.round(cur.temperature_2m),
      feelsLikeC: Math.round(cur.apparent_temperature ?? cur.temperature_2m),
      humidity: Math.round(cur.relative_humidity_2m ?? 0),
      windKmh: Math.round(cur.wind_speed_10m ?? 0),
      condition: curDesc.condition,
      conditionLabel: curDesc.label,
      icon: curDesc.icon,
    },
    hourly,
  };
}

// ---------- PROVIDER MOCK (fallback offline) ----------
const CONDITIONS = [
  { code: "thunderstorm", label: "Tempestade", icon: "storm" },
  { code: "rain", label: "Chuva", icon: "rain" },
  { code: "cloudy", label: "Nublado", icon: "cloud" },
  { code: "partly", label: "Parcialmente nublado", icon: "partly" },
  { code: "clear", label: "Céu limpo", icon: "sun" },
];

async function mockForecast({ lat, lon, label }) {
  const now = new Date();
  const pick = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];

  const hourly = Array.from({ length: HOURS_AHEAD }, (_, i) => {
    const t = new Date(now.getTime() + i * 3600 * 1000);
    const c = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
    return {
      time: t.toISOString(),
      hourLabel: `${String(t.getHours()).padStart(2, "0")}h`,
      tempC: Math.round(18 + Math.random() * 12),
      precipProb: Math.round(Math.random() * 100),
      condition: c.code,
      icon: c.icon,
    };
  });

  return {
    location: { lat, lon, label },
    observedAt: now.toISOString(),
    current: {
      tempC: Math.round(20 + Math.random() * 8),
      feelsLikeC: Math.round(20 + Math.random() * 8),
      humidity: Math.round(50 + Math.random() * 45),
      windKmh: Math.round(Math.random() * 30),
      condition: pick.code,
      conditionLabel: pick.label,
      icon: pick.icon,
    },
    hourly,
  };
}

const PROVIDERS = {
  openmeteo: openMeteoForecast,
  mock: mockForecast,
};

export async function getForecast({ lat, lon, label }) {
  const provider = PROVIDERS[config.forecastProvider];
  if (!provider) {
    throw fail(`Provider de previsão desconhecido: ${config.forecastProvider}`, 500);
  }
  return provider({ lat, lon, label });
}
