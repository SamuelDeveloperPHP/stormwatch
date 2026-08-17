import { Router } from "express";
import { config } from "../config/index.js";
import { getForecast } from "../services/forecast.js";
import { evaluateMonitor } from "../services/monitor.js";
import { getSafetyState } from "../services/safetyMonitor.js";
import { computeSiteSafety } from "../services/siteSafety.js";
import { recent as recentStrikes } from "../services/strikeStore.js";
import { getCollectorHealth } from "../services/strikeCollector.js";
import { requireApiKey, verifyInboundWebhook } from "../middleware/auth.js";

const MAX_BATCH_POINTS = 24; // geolocalização + locais salvos (folga bem acima do limite atual)

export const router = Router();

/** Lê lat/lon da query ou cai no ponto monitorado padrão. */
function resolvePoint(req) {
  const lat = req.query.lat !== undefined ? Number(req.query.lat) : config.monitor.lat;
  const lon = req.query.lon !== undefined ? Number(req.query.lon) : config.monitor.lon;
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    const e = new Error("lat/lon inválidos");
    e.status = 400;
    throw e;
  }
  return { lat, lon };
}

// Healthcheck público (sem auth) — usado por load balancer / uptime monitor.
router.get("/health", (_req, res) => {
  res.json({ ok: true, env: config.env, provider: config.lightningProvider });
});

// Previsão do tempo.
router.get("/forecast", requireApiKey, async (req, res, next) => {
  try {
    const { lat, lon } = resolvePoint(req);
    const data = await getForecast({ lat, lon, label: config.monitor.label });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Snapshot de raios + estado de segurança (autoritativo, vindo do monitor).
router.get("/lightning", requireApiKey, async (req, res, next) => {
  try {
    const { lat, lon } = resolvePoint(req);
    const data = await evaluateMonitor({ lat, lon });
    data.safety = getSafetyState();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Estado de segurança do canteiro (autoritativo: o mesmo que dispara os alertas).
router.get("/safety", requireApiKey, (_req, res) => {
  res.json(getSafetyState());
});

// Segurança + contagem regressiva de "tudo-limpo" para VÁRIOS locais de uma vez
// (geolocalização do usuário + locais salvos). Calcula por local a partir do
// MESMO armazém de 30 min do mapa — assim a contagem dos 30 min é correta por
// local (o feed ao vivo retém só ~15 min). Fail-safe: coletor sem sucesso
// recente => feedOk=false, e o front trata a área como insegura.
router.post("/safety/batch", requireApiKey, (req, res, next) => {
  try {
    const points = Array.isArray(req.body?.points) ? req.body.points : [];
    if (points.length > MAX_BATCH_POINTS) {
      const e = new Error(`Máximo de ${MAX_BATCH_POINTS} locais por chamada`);
      e.status = 400;
      throw e;
    }

    const now = Date.now();
    // Janela = a maior entre a do mapa e a de tudo-limpo (garante 30 min de histórico).
    const windowMin = Math.max(config.mapMarkerTtlMin, config.allClearMin);
    const strikes = recentStrikes(windowMin);
    const defaultCritical = config.alertRadiusKm + config.alertMarginKm;

    const results = {};
    for (const p of points) {
      if (!p || p.id == null) continue;
      const lat = Number(p.lat);
      const lon = Number(p.lon);
      if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
      const criticalRadiusKm =
        Number(p.criticalRadiusKm) > 0 ? Number(p.criticalRadiusKm) : defaultCritical;
      const alertRadiusKm =
        Number(p.alertRadiusKm) > 0 ? Number(p.alertRadiusKm) : criticalRadiusKm;
      results[String(p.id)] = computeSiteSafety(
        { lat, lon, criticalRadiusKm, alertRadiusKm },
        strikes,
        now
      );
    }

    const { feedOk, dataAgeSec } = getCollectorHealth();
    res.json({
      evaluatedAt: new Date(now).toISOString(),
      feedOk,
      dataAgeSec,
      allClearMin: config.allClearMin,
      results,
    });
  } catch (err) {
    next(err);
  }
});

// Webhook DE ENTRADA (opcional): um provider que faz push de strikes para nós.
// Protegido por assinatura HMAC, não por API key.
router.post("/webhooks/lightning", verifyInboundWebhook, async (req, res, next) => {
  try {
    // Aqui você normalizaria req.body e reavaliaria o monitor.
    // Mantido como ponto de extensão.
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});
