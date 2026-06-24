import pino from "pino";
import { isProd } from "../config/index.js";

/**
 * Logger estruturado. Em dev, formato legível; em produção, JSON puro
 * (melhor para agregadores de log tipo Datadog, Loki, CloudWatch).
 */
export const logger = pino({
  level: isProd ? "info" : "debug",
  transport: isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true } },
  // Nunca logar segredos por acidente.
  redact: ["req.headers.authorization", "req.headers['x-api-key']"],
});
