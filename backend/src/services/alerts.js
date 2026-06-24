import crypto from "node:crypto";
import { config } from "../config/index.js";
import { logger } from "../middleware/logger.js";

/**
 * Disparo de alertas via WEBHOOK GENÉRICO.
 *
 * Em vez de acoplar a um provedor de WhatsApp específico, mandamos um POST
 * para ALERT_WEBHOOK_URL. Você liga a outra ponta ao que quiser depois:
 * n8n/Make/Zapier, WhatsApp Cloud API (Meta) ou Twilio.
 *
 * Segurança: assinamos o corpo com HMAC-SHA256 (header `x-signature`) para que
 * o receptor possa verificar que o alerta veio mesmo de nós.
 *
 * Anti-spam: respeitamos um cooldown — não reenviamos alerta antes de
 * ALERT_COOLDOWN_MIN minutos, evitando inundar o grupo durante uma tempestade.
 */

let lastAlertAt = 0;

export function isOnCooldown() {
  const elapsedMin = (Date.now() - lastAlertAt) / 60000;
  return elapsedMin < config.alertCooldownMin;
}

function sign(body) {
  if (!config.alertWebhookSecret) return null;
  return crypto
    .createHmac("sha256", config.alertWebhookSecret)
    .update(body)
    .digest("hex");
}

/**
 * POST assinado genérico para o webhook de alerta. Usado pelo monitor de
 * segurança (eventos de transição: PARAR / LIBERADO / MONITORAMENTO INDISPONÍVEL).
 * Sem cooldown: as transições de estado já são naturalmente desduplicadas.
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
export async function postWebhook(payload) {
  if (!config.alertWebhookUrl) {
    logger.warn({ payload }, "ALERT_WEBHOOK_URL não configurada — evento apenas logado");
    return { sent: false, reason: "no_webhook_url" };
  }
  const body = JSON.stringify(payload);
  const signature = sign(body);
  try {
    const res = await fetch(config.alertWebhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(signature ? { "x-signature": signature } : {}),
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      logger.error({ status: res.status, type: payload.type }, "Webhook respondeu com erro");
      return { sent: false, reason: `webhook_status_${res.status}` };
    }
    logger.info({ type: payload.type }, "Evento de segurança despachado");
    return { sent: true };
  } catch (err) {
    logger.error({ err: err.message, type: payload.type }, "Falha ao despachar evento");
    return { sent: false, reason: "webhook_error" };
  }
}

/**
 * @param {object} alert  Dados do alerta (strike mais próximo, distância, etc.)
 * @returns {Promise<{sent: boolean, reason?: string}>}
 */
export async function dispatchAlert(alert) {
  if (isOnCooldown()) {
    logger.info({ alert }, "Alerta suprimido (cooldown ativo)");
    return { sent: false, reason: "cooldown" };
  }

  const payload = {
    type: "lightning_alert",
    generatedAt: new Date().toISOString(),
    location: config.monitor.label,
    radiusKm: config.alertRadiusKm,
    closest: alert.closest,
    count: alert.count,
    // Mensagem pronta para colar no WhatsApp do outro lado do webhook.
    message:
      `⚡ ALERTA DE RAIO — ${config.monitor.label}\n` +
      `Raio detectado a ${alert.closest.distanceKm} km ` +
      `(dentro do raio crítico de ${config.alertRadiusKm} km).\n` +
      `${alert.count} descarga(s) próxima(s) nos últimos minutos.\n` +
      `Recomenda-se suspender atividades externas.`,
  };

  if (!config.alertWebhookUrl) {
    // Em dev, sem URL configurada: só loga (não falha).
    logger.warn({ payload }, "ALERT_WEBHOOK_URL não configurada — alerta apenas logado");
    lastAlertAt = Date.now();
    return { sent: false, reason: "no_webhook_url" };
  }

  const body = JSON.stringify(payload);
  const signature = sign(body);

  try {
    const res = await fetch(config.alertWebhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(signature ? { "x-signature": signature } : {}),
      },
      body,
      // timeout defensivo
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      logger.error({ status: res.status }, "Webhook de alerta respondeu com erro");
      return { sent: false, reason: `webhook_status_${res.status}` };
    }

    lastAlertAt = Date.now();
    logger.info("Alerta despachado com sucesso");
    return { sent: true };
  } catch (err) {
    logger.error({ err: err.message }, "Falha ao despachar alerta");
    return { sent: false, reason: "webhook_error" };
  }
}
