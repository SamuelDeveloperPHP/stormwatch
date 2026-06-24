import { config } from "../config/index.js";
import { haversineKm } from "./geo.js";

/**
 * Camada de acesso a dados de raios (padrão Adapter).
 *
 * O resto do app NÃO sabe de onde vêm os dados — só chama `getRecentStrikes()`.
 * Hoje devolve dados simulados; para produção, troque LIGHTNING_PROVIDER no .env
 * e implemente o fetch real no adapter correspondente (stubs abaixo).
 *
 * Formato canônico de um strike (normalizamos todo provider para isto):
 *   { id, lat, lon, timestamp (ms), type: "CG"|"IC", peakAmpKa, distanceKm }
 */

// ---------- MOCK ----------
// Simula uma tempestade que se aproxima e depois se afasta do ponto monitorado.
let mockClock = 0;

function mockProvider({ lat, lon }) {
  mockClock += 1;
  const now = Date.now();

  // A "tempestade" oscila a distância base entre ~60km e ~8km num ciclo.
  const phase = (mockClock % 40) / 40; // 0..1
  const baseDistanceKm = 8 + Math.abs(Math.sin(phase * Math.PI)) * 0 + (1 - Math.sin(phase * Math.PI)) * 55;

  const count = 3 + Math.floor(Math.random() * 6);
  const strikes = [];

  for (let i = 0; i < count; i++) {
    // Espalha os strikes em torno de uma distância-base, com ruído.
    const jitterKm = (Math.random() - 0.5) * 24;
    const distanceKm = Math.max(0.5, baseDistanceKm + jitterKm);
    const bearing = Math.random() * 2 * Math.PI;

    // Converte distância+rumo em deslocamento aproximado de lat/lon.
    const dLat = (distanceKm / 111) * Math.cos(bearing);
    const dLon =
      (distanceKm / (111 * Math.cos((lat * Math.PI) / 180))) * Math.sin(bearing);

    strikes.push({
      id: `mock-${now}-${i}`,
      lat: lat + dLat,
      lon: lon + dLon,
      timestamp: now - Math.floor(Math.random() * 5 * 60 * 1000),
      type: Math.random() > 0.6 ? "CG" : "IC",
      peakAmpKa: Math.round((Math.random() * 60 + 5) * (Math.random() > 0.5 ? 1 : -1)),
    });
  }
  return strikes;
}

// ---------- STUBS DE APIs REAIS ----------
// Implemente o fetch quando contratar o provider. As chaves vêm do config
// (lado servidor) e NUNCA são expostas ao front-end.

async function xweatherProvider({ lat, lon }) {
  // Exemplo de chamada (ajuste params conforme o plano contratado):
  // const url = `https://data.api.xweather.com/lightning/${lat},${lon}` +
  //   `?format=json&radius=100km&client_id=${config.xweather.clientId}` +
  //   `&client_secret=${config.xweather.clientSecret}`;
  // const res = await fetch(url);
  // const data = await res.json();
  // return (data.response ?? []).map(normalizeXweather);
  throw new Error("Provider 'xweather' ainda não implementado. Veja o stub.");
}

async function openWeatherProvider({ lat, lon }) {
  // const end = new Date().toISOString();
  // const start = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  // const url = `https://api.openweathermap.org/lightning/1.0/data` +
  //   `?lat=${lat}&lon=${lon}&radius=50&start_date=${start}&end_date=${end}` +
  //   `&apikey=${config.openWeatherKey}`;
  // const res = await fetch(url);
  // const data = await res.json();
  // return (data.lightnings ?? []).map(normalizeOpenWeather);
  throw new Error("Provider 'openweather' ainda não implementado. Veja o stub.");
}

// ---------- WeatherBug "Spark" (TESTE — feed não-oficial, requer URL assinada) ----------
// Consumimos a URL EXATAMENTE como capturada no navegador (com timestamp+hash).
// Não geramos a assinatura: quando o hash expirar, recapture a URL no navegador.
// ⚠️ Uso fora do app oficial provavelmente viola os Termos do WeatherBug — só p/ teste.

/** Remove o invólucro JSONP `callback({...})` e devolve o objeto. */
function stripJsonp(text) {
  const open = text.indexOf("(");
  const close = text.lastIndexOf(")");
  const body = open >= 0 && close > open ? text.slice(open + 1, close) : text;
  return JSON.parse(body);
}

async function weatherbugProvider({ lat, lon }) {
  const url = config.weatherbugSparkUrl;
  if (!url) {
    throw new Error(
      "WEATHERBUG_SPARK_URL não configurada — cole no .env a URL assinada do Spark."
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let text;
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`WeatherBug respondeu ${res.status}`);
    text = await res.text();
  } catch (err) {
    if (err.name === "AbortError") throw new Error("WeatherBug: tempo limite excedido");
    throw err;
  } finally {
    clearTimeout(timer);
  }

  const json = stripJsonp(text);
  if (json.e) throw new Error(`WeatherBug retornou erro: ${JSON.stringify(json.e)}`);

  // `plg` é um feed GLOBAL [{ la, lo, t }]; filtramos pelo raio de exibição.
  // O modo não-verbose não traz tipo (CG/IC) nem amperagem — usamos defaults.
  const points = json?.r?.plg ?? [];
  return points
    .filter((p) => haversineKm(lat, lon, p.la, p.lo) <= config.maxDisplayKm)
    .map((p, i) => ({
      id: `wb-${p.t}-${i}`,
      lat: p.la,
      lon: p.lo,
      timestamp: (p.t ?? 0) * 1000, // epoch (s) -> ms
      type: "CG",
      peakAmpKa: 0,
    }));
}

// ---------- NOAA GOES-19 GLM (via serviço Python de ingestão) ----------
// Dado público (domínio público / NOAA Big Data). O serviço Python faz o
// polling do S3 e o parse netCDF4; aqui só consumimos o JSON enxuto dele.
async function goesGlmProvider() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let json;
  try {
    const res = await fetch(`${config.glmServiceUrl}/flashes`, { signal: controller.signal });
    if (!res.ok) throw new Error(`Serviço GLM respondeu ${res.status}`);
    json = await res.json();
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Serviço GLM: tempo limite excedido");
    if (err?.cause?.code === "ECONNREFUSED") {
      throw new Error("Serviço GLM offline — inicie ingestor/glm_service.py");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  // flashes: [[lat, lon, t_ms], ...] cobrindo toda a América do Sul.
  // GLM é "raio total" (não separa CG/IC) e não traz amperagem.
  return (json?.flashes ?? []).map(([la, lo, t], i) => ({
    id: `glm-${t}-${i}`,
    lat: la,
    lon: lo,
    timestamp: t,
    type: "CG",
    peakAmpKa: 0,
  }));
}

const PROVIDERS = {
  mock: mockProvider,
  xweather: xweatherProvider,
  openweather: openWeatherProvider,
  weatherbug: weatherbugProvider,
  goesglm: goesGlmProvider,
};

/**
 * Retorna os strikes recentes JÁ com a distância até o ponto monitorado,
 * ordenados do mais próximo ao mais distante.
 */
export async function getRecentStrikes({ lat, lon }) {
  const provider = PROVIDERS[config.lightningProvider];
  if (!provider) {
    throw new Error(`Provider desconhecido: ${config.lightningProvider}`);
  }

  const raw = await provider({ lat, lon });

  return raw
    .map((s) => ({
      ...s,
      distanceKm: Number(haversineKm(lat, lon, s.lat, s.lon).toFixed(2)),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
