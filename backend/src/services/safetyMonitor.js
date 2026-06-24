import { config } from "../config/index.js";
import { logger } from "../middleware/logger.js";
import { haversineKm } from "./geo.js";
import { postWebhook } from "./alerts.js";

/**
 * Monitor de segurança server-side (uso em obra).
 *
 * Roda continuamente (independente de haver app aberto), avalia a proximidade
 * de raios ao canteiro e dispara eventos por webhook nas TRANSIÇÕES de estado:
 *
 *   safe     -> danger   : "⛔ PARAR ATIVIDADES"
 *   danger   -> safe      : "✅ LIBERADO" (após ALL_CLEAR_MIN sem raio na zona)
 *   *        -> degraded  : "⚠️ MONITORAMENTO INDISPONÍVEL" (fail-safe)
 *
 * Princípios de segurança:
 *  - Gatilho = raio + margem (incerteza de posição do GLM ~10 km): erra para o
 *    lado seguro (alerta cedo, não perde raio próximo).
 *  - Fail-safe: dado velho ou serviço fora => "indisponível" (NUNCA "seguro" cego).
 *  - Tudo-limpo: só libera após ALL_CLEAR_MIN minutos sem raio na zona.
 */

const site = config.monitor; // { lat, lon, label }
const triggerKm = config.alertRadiusKm + config.alertMarginKm;
const allClearMs = config.allClearMin * 60 * 1000;
const staleMs = config.glmStaleSec * 1000;

const state = {
  level: "init", // init | safe | danger | degraded
  since: Date.now(),
  lastStrikeInZoneAt: 0,
  closestKm: null,
  inZoneCount: 0,
  dataAgeSec: null,
  feedOk: false,
};

export function getSafetyState() {
  let allClearInSec = null;
  if (state.level === "danger" && state.lastStrikeInZoneAt) {
    const remaining = allClearMs - (Date.now() - state.lastStrikeInZoneAt);
    allClearInSec = Math.max(0, Math.round(remaining / 1000));
  }
  return {
    level: state.level,
    location: site.label,
    closestKm: state.closestKm,
    inZoneCount: state.inZoneCount,
    safetyRadiusKm: config.alertRadiusKm,
    marginKm: config.alertMarginKm,
    triggerKm,
    allClearMin: config.allClearMin,
    allClearInSec,
    dataAgeSec: state.dataAgeSec,
    feedOk: state.feedOk,
    since: new Date(state.since).toISOString(),
  };
}

async function fetchFeed() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${config.glmServiceUrl}/flashes`, { signal: controller.signal });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return await res.json(); // { updatedAt, count, flashes }
  } finally {
    clearTimeout(timer);
  }
}

function dispatch(from, to) {
  const loc = site.label;
  const at = new Date().toISOString();
  if (to === "danger") {
    return postWebhook({
      type: "lightning_danger",
      severity: "critical",
      generatedAt: at,
      location: loc,
      closestKm: state.closestKm,
      count: state.inZoneCount,
      message:
        `⛔ PARAR ATIVIDADES — ${loc}\n` +
        `Raio a ${state.closestKm} km (zona de risco de ${triggerKm} km).\n` +
        `Suspender atividades externas imediatamente e buscar abrigo.`,
    });
  }
  if (to === "safe" && from === "danger") {
    return postWebhook({
      type: "lightning_all_clear",
      severity: "info",
      generatedAt: at,
      location: loc,
      message:
        `✅ LIBERADO — ${loc}\n` +
        `Sem raios na zona de risco há ${config.allClearMin} min. ` +
        `Atividades podem ser retomadas com atenção.`,
    });
  }
  if (to === "safe" && from === "degraded") {
    return postWebhook({
      type: "monitoring_restored",
      severity: "info",
      generatedAt: at,
      location: loc,
      message: `🟢 Monitoramento restabelecido — ${loc}. Área sem raios na zona de risco.`,
    });
  }
  if (to === "degraded") {
    return postWebhook({
      type: "monitoring_unavailable",
      severity: "warning",
      generatedAt: at,
      location: loc,
      message:
        `⚠️ MONITORAMENTO INDISPONÍVEL — ${loc}\n` +
        `Sem dados de raios atualizados. Trate a área como INSEGURA e use o ` +
        `protocolo manual (trovão/observação visual).`,
    });
  }
  return Promise.resolve();
}

function transition(level, reason) {
  if (state.level === level) return;
  const from = state.level;
  state.level = level;
  state.since = Date.now();
  logger.warn({ from, to: level, reason, closestKm: state.closestKm }, "Estado de segurança mudou");
  // init -> safe na partida não dispara webhook (evita "liberado" falso ao subir)
  if (!(from === "init" && level === "safe")) {
    dispatch(from, level);
  }
}

async function tick() {
  try {
    const feed = await fetchFeed();
    const updatedAt = feed?.updatedAt ? Date.parse(feed.updatedAt) : 0;
    const ageMs = updatedAt ? Date.now() - updatedAt : Infinity;
    state.dataAgeSec = Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : null;

    // Fail-safe: dado ausente/velho => indisponível.
    if (!updatedAt || ageMs > staleMs) {
      state.feedOk = false;
      transition("degraded", "dado_velho");
      return;
    }
    state.feedOk = true;

    let closest = Infinity;
    let inZone = 0;
    for (const f of feed.flashes ?? []) {
      const d = haversineKm(site.lat, site.lon, f[0], f[1]);
      if (d < closest) closest = d;
      if (d <= triggerKm) inZone++;
    }
    state.closestKm = Number.isFinite(closest) ? Number(closest.toFixed(1)) : null;
    state.inZoneCount = inZone;

    const now = Date.now();
    if (inZone > 0) {
      state.lastStrikeInZoneAt = now;
      transition("danger", "raio_na_zona");
    } else if (state.level === "danger") {
      // aguarda o tudo-limpo antes de liberar
      if (now - state.lastStrikeInZoneAt >= allClearMs) {
        transition("safe", "tudo_limpo");
      }
    } else {
      transition("safe", "sem_raio");
    }
  } catch (err) {
    state.feedOk = false;
    state.dataAgeSec = null;
    transition("degraded", `feed_inacessivel:${err.message}`);
  }
}

export function startSafetyMonitor() {
  if (!config.safetyEnabled) {
    logger.info("Monitor de segurança desativado (SAFETY_MONITOR=false)");
    return;
  }
  logger.info(
    { site: site.label, triggerKm, safetyRadiusKm: config.alertRadiusKm, allClearMin: config.allClearMin },
    "Monitor de segurança iniciado"
  );
  tick();
  setInterval(tick, config.safetyTickSec * 1000).unref();
}
