import crypto from "node:crypto";
import { config } from "../config/index.js";

/**
 * Autenticação simples front <-> back por API key no header `x-api-key`.
 * Comparação em tempo constante para evitar timing attacks.
 *
 * Para um produto multiusuário real, troque isto por JWT/OAuth. Para um
 * painel interno (caso típico deste projeto), a API key já é adequada.
 */
function safeEqual(a, b) {
  const ba = Buffer.from(a ?? "", "utf8");
  const bb = Buffer.from(b ?? "", "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function requireApiKey(req, res, next) {
  const provided = req.get("x-api-key");
  if (!provided || !safeEqual(provided, config.appApiKey)) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

/**
 * Verifica a assinatura HMAC de um webhook DE ENTRADA (ex.: provider de raios
 * que faz push pra gente). O corpo BRUTO precisa estar em req.rawBody —
 * configuramos isso no express.json({ verify }).
 */
export function verifyInboundWebhook(req, res, next) {
  if (!config.inboundWebhookSecret) {
    return res.status(503).json({ error: "inbound_webhook_not_configured" });
  }
  const signature = req.get("x-signature") ?? "";
  const expected = crypto
    .createHmac("sha256", config.inboundWebhookSecret)
    .update(req.rawBody ?? "")
    .digest("hex");

  if (!safeEqual(signature, expected)) {
    return res.status(401).json({ error: "invalid_signature" });
  }
  next();
}
