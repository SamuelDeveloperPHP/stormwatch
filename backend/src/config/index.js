import dotenv from "dotenv";
dotenv.config();

/**
 * Configuração central. Lê do ambiente UMA vez, valida o essencial
 * e exporta um objeto imutável. Falhar cedo é melhor do que descobrir
 * uma variável faltando no meio de um alerta de tempestade.
 */

function required(name, fallback = undefined) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return v;
}

function num(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  if (Number.isNaN(n)) throw new Error(`Variável ${name} deve ser numérica`);
  return n;
}

export const config = Object.freeze({
  env: process.env.NODE_ENV ?? "development",
  port: num("PORT", 4000),
  corsOrigins: (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // Auth interna front <-> back
  appApiKey: required("APP_API_KEY"),
  inboundWebhookSecret: process.env.INBOUND_WEBHOOK_SECRET ?? "",

  // Fonte de raios
  lightningProvider: process.env.LIGHTNING_PROVIDER ?? "mock",
  // Fonte de previsão do tempo: "openmeteo" (real, gratuita, sem chave) | "mock"
  forecastProvider: process.env.FORECAST_PROVIDER ?? "openmeteo",
  // URL assinada do Spark (WeatherBug) capturada do navegador — APENAS p/ teste.
  weatherbugSparkUrl: process.env.WEATHERBUG_SPARK_URL ?? "",
  // Raio máximo (km) de descargas "próximas" (lista lateral + proximidade).
  maxDisplayKm: num("MAX_DISPLAY_KM", 120),
  // URL do serviço Python de ingestão GLM (GOES-19 / NOAA).
  glmServiceUrl: process.env.GLM_SERVICE_URL ?? "http://127.0.0.1:5055",
  xweather: {
    clientId: process.env.XWEATHER_CLIENT_ID ?? "",
    clientSecret: process.env.XWEATHER_CLIENT_SECRET ?? "",
  },
  openWeatherKey: process.env.OPENWEATHER_API_KEY ?? "",

  // Ponto monitorado + regras de alerta
  monitor: {
    lat: num("MONITOR_LAT", -25.5306),
    lon: num("MONITOR_LON", -49.2939),
    label: process.env.MONITOR_LABEL ?? "Local monitorado",
  },
  // Raio de SEGURANÇA: distância a partir da qual se considera risco (fiscal pediu 10 km).
  alertRadiusKm: num("ALERT_RADIUS_KM", 10),
  // Margem para a incerteza de posição do GLM (~10 km). Gatilho efetivo = raio + margem.
  // Lado seguro do erro: alerta cedo em vez de perder um raio que esteja realmente perto.
  alertMarginKm: num("ALERT_MARGIN_KM", 10),
  // "Tudo limpo": minutos sem raio na zona antes de liberar a retomada das atividades.
  allClearMin: num("ALL_CLEAR_MIN", 30),
  alertCooldownMin: num("ALERT_COOLDOWN_MIN", 10),

  // Fail-safe: dado de raios mais antigo que isto => "monitoramento indisponível".
  glmStaleSec: num("GLM_STALE_SEC", 180),
  // Loop de monitoramento server-side (alerta mesmo com o app fechado).
  safetyEnabled: (process.env.SAFETY_MONITOR ?? "true") !== "false",
  safetyTickSec: num("SAFETY_TICK_SEC", 30),

  // Saída de alerta
  alertWebhookUrl: process.env.ALERT_WEBHOOK_URL ?? "",
  alertWebhookSecret: process.env.ALERT_WEBHOOK_SECRET ?? "",
});

export const isProd = config.env === "production";
