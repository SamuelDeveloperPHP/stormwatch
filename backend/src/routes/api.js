import { Router } from "express";
import { config } from "../config/index.js";
import { getForecast } from "../services/forecast.js";
import { evaluateMonitor } from "../services/monitor.js";
import { getSafetyState } from "../services/safetyMonitor.js";
import { requireApiKey, verifyInboundWebhook } from "../middleware/auth.js";

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
