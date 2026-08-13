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
      "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,wind_speed_80m,wind_speed_120m,wind_speed_180m",
    hourly:
      "temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_direction_10m,relative_humidity_2m,weather_code",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max",
    timezone: "auto", // horários no fuso local do ponto monitorado
    forecast_days: "5", // 5 dias completos
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

  // Monta as próximas 12 a 24 horas a partir da hora atual.
  const times = data.hourly?.time ?? [];
  const temps = data.hourly?.temperature_2m ?? [];
  const precProbs = data.hourly?.precipitation_probability ?? [];
  const precMms = data.hourly?.precipitation ?? [];
  const windSpeeds = data.hourly?.wind_speed_10m ?? [];
  const windDirs = data.hourly?.wind_direction_10m ?? [];
  const humidities = data.hourly?.relative_humidity_2m ?? [];
  const codes = data.hourly?.weather_code ?? [];

  // Primeira hora >= agora (comparação lexicográfica do prefixo "YYYY-MM-DDTHH").
  const nowPrefix = String(cur.time ?? "").slice(0, 13);
  let start = times.findIndex((t) => String(t).slice(0, 13) >= nowPrefix);
  if (start < 0) start = 0;

  const hourly = [];
  for (let i = start; i < times.length && hourly.length < 12; i++) {
    if (!Number.isFinite(temps[i])) continue;
    const d = describe(codes[i]);
    hourly.push({
      time: times[i],
      hourLabel: hourLabelFromIso(times[i]),
      tempC: Math.round(temps[i]),
      precipProb: Math.round(precProbs[i] ?? 0),
      precipMm: parseFloat((precMms[i] ?? 0).toFixed(1)),
      windKmh: Math.round(windSpeeds[i] ?? 0),
      windDirDeg: Math.round(windDirs[i] ?? 0),
      humidity: Math.round(humidities[i] ?? 0),
      condition: d.condition,
      conditionLabel: d.label,
      icon: d.icon,
    });
  }

  // Monta a previsão dos 5 Dias (daily)
  const dTimes = data.daily?.time ?? [];
  const dMaxTemps = data.daily?.temperature_2m_max ?? [];
  const dMinTemps = data.daily?.temperature_2m_min ?? [];
  const dPrecProbs = data.daily?.precipitation_probability_max ?? [];
  const dPrecSums = data.daily?.precipitation_sum ?? [];
  const dWindMaxs = data.daily?.wind_speed_10m_max ?? [];
  const dCodes = data.daily?.weather_code ?? [];

  const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const daily = [];
  for (let i = 0; i < dTimes.length && i < 5; i++) {
    const dDate = new Date(dTimes[i] + "T00:00:00");
    const todayStr = new Date().toISOString().slice(0, 10);
    let dayLabel = WEEKDAYS[dDate.getDay()];
    if (dTimes[i] === todayStr) dayLabel = "Hoje";

    const dDesc = describe(dCodes[i]);

    daily.push({
      date: dTimes[i],
      dayLabel,
      tempMaxC: Math.round(dMaxTemps[i] ?? 0),
      tempMinC: Math.round(dMinTemps[i] ?? 0),
      precipProbMax: Math.round(dPrecProbs[i] ?? 0),
      precipSumMm: parseFloat((dPrecSums[i] ?? 0).toFixed(1)),
      windKmhMax: Math.round(dWindMaxs[i] ?? 0),
      condition: dDesc.condition,
      conditionLabel: dDesc.label,
      icon: dDesc.icon,
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
      windGustKmh: Math.round(cur.wind_gusts_10m ?? 0),
      windAlt80Kmh: Math.round(cur.wind_speed_80m ?? 0),
      windAlt120Kmh: Math.round(cur.wind_speed_120m ?? 0),
      windAlt180Kmh: Math.round(cur.wind_speed_180m ?? 0),
      condition: curDesc.condition,
      conditionLabel: curDesc.label,
      icon: curDesc.icon,
    },
    hourly,
    daily,
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

  const hourly = Array.from({ length: 12 }, (_, i) => {
    const t = new Date(now.getTime() + i * 3600 * 1000);
    const c = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
    return {
      time: t.toISOString(),
      hourLabel: `${String(t.getHours()).padStart(2, "0")}h`,
      tempC: Math.round(15 + Math.random() * 10),
      precipProb: Math.round(Math.random() * 100),
      precipMm: parseFloat((Math.random() * 2).toFixed(1)),
      windKmh: Math.round(5 + Math.random() * 20),
      windDirDeg: Math.round(Math.random() * 360),
      humidity: Math.round(60 + Math.random() * 35),
      condition: c.code,
      conditionLabel: c.label,
      icon: c.icon,
    };
  });

  const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const daily = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(now.getTime() + i * 86400 * 1000);
    const c = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
    return {
      date: d.toISOString().slice(0, 10),
      dayLabel: i === 0 ? "Hoje" : WEEKDAYS[d.getDay()],
      tempMaxC: Math.round(20 + Math.random() * 6),
      tempMinC: Math.round(12 + Math.random() * 5),
      precipProbMax: Math.round(Math.random() * 100),
      precipSumMm: parseFloat((Math.random() * 5).toFixed(1)),
      windKmhMax: Math.round(10 + Math.random() * 20),
      condition: c.code,
      conditionLabel: c.label,
      icon: c.icon,
    };
  });

  // Vento base (10 m) e derivados em altitude/rajada — realistas para testar o card.
  const mWind = Math.round(8 + Math.random() * 50); // 8..58 km/h
  return {
    location: { lat, lon, label },
    observedAt: now.toISOString(),
    current: {
      tempC: Math.round(20 + Math.random() * 8),
      feelsLikeC: Math.round(20 + Math.random() * 8),
      humidity: Math.round(50 + Math.random() * 45),
      windKmh: mWind,
      windGustKmh: Math.round(mWind * 1.5),
      windAlt80Kmh: Math.round(mWind * 1.3),
      windAlt120Kmh: Math.round(mWind * 1.5),
      windAlt180Kmh: Math.round(mWind * 1.7),
      condition: pick.code,
      conditionLabel: pick.label,
      icon: pick.icon,
    },
    hourly,
    daily,
  };
}


const FORECAST_CACHE = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos de cache em memória

const PROVIDERS = {
  openmeteo: openMeteoForecast,
  mock: mockForecast,
};

export async function getForecast({ lat, lon, label }) {
  const cacheKey = `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
  const cached = FORECAST_CACHE.get(cacheKey);

  // Se houver cache válido nos últimos 15 minutos, retorna imediatamente (0ms, 0 erros)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const provider = PROVIDERS[config.forecastProvider] ?? openMeteoForecast;

  try {
    const data = await provider({ lat, lon, label });
    FORECAST_CACHE.set(cacheKey, { timestamp: Date.now(), data });
    return data;
  } catch (err) {
    console.warn(`[Forecast] Erro ao buscar previsão para (${lat}, ${lon}): ${err.message}. Usando fallback.`);
    // Se falhar o Open-Meteo, re-usa o cache expirado se existir ou gera fallback mock gracioso
    if (cached) {
      return cached.data;
    }
    const fallbackData = await mockForecast({ lat, lon, label });
    FORECAST_CACHE.set(cacheKey, { timestamp: Date.now(), data: fallbackData });
    return fallbackData;
  }
}
