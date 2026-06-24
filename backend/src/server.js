import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";

import { config, isProd } from "./config/index.js";
import { logger } from "./middleware/logger.js";
import { router } from "./routes/api.js";
import { startSafetyMonitor } from "./services/safetyMonitor.js";

const app = express();

// Atrás de proxy/reverse-proxy (Nginx, Render, Railway): confia no X-Forwarded-*
// para que rate-limit e logs vejam o IP real do cliente.
app.set("trust proxy", 1);

// --- Segurança de cabeçalhos HTTP ---
app.use(helmet());

// --- CORS restrito à(s) origem(ns) do front-end ---
app.use(
  cors({
    origin(origin, cb) {
      // Permite ferramentas sem origin (curl, health checks) e as origens da allowlist.
      if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Origem não permitida pelo CORS"));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "x-api-key", "x-signature"],
  })
);

// --- Body parser guardando o corpo bruto (necessário p/ validar HMAC do webhook) ---
app.use(
  express.json({
    limit: "256kb",
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  })
);

// --- Logging de requisições ---
app.use(pinoHttp({ logger }));

// --- Rate limiting (anti-abuso/DoS leve) ---
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120, // 120 req/min por IP
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// --- Rotas ---
app.use("/api", router);

// --- 404 ---
app.use((_req, res) => res.status(404).json({ error: "not_found" }));

// --- Error handler central ---
// Não vaza stack trace em produção.
app.use((err, req, res, _next) => {
  const status = err.status ?? 500;
  req.log?.error({ err: err.message }, "Erro na requisição");
  res.status(status).json({
    error: status === 500 ? "internal_error" : err.message,
    ...(isProd ? {} : { detail: err.message }),
  });
});

const server = app.listen(config.port, () => {
  logger.info(
    `StormWatch backend ouvindo em :${config.port} [${config.env}] provider=${config.lightningProvider}`
  );
  startSafetyMonitor();
});

// --- Encerramento gracioso ---
function shutdown(signal) {
  logger.info(`Recebido ${signal}, encerrando...`);
  server.close(() => {
    logger.info("Servidor encerrado.");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
