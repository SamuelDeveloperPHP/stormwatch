import { config } from "../config/index.js";
import { logger } from "../middleware/logger.js";
import { getRecentStrikes } from "./lightning.js";
import { ingest, purge, size } from "./strikeStore.js";

/**
 * Coletor de raios em BACKGROUND.
 *
 * Roda independente de haver app aberto (como o monitor de segurança), buscando
 * os raios próximos do ponto monitorado e alimentando o armazém persistente.
 * É ele que garante:
 *   - o armazém acumule dados continuamente para a RETENÇÃO de 24 h;
 *   - a janela de 30 min do mapa esteja sempre populada.
 *
 * Respeita o LIGHTNING_PROVIDER (mock/goesglm/...), ao contrário do monitor de
 * segurança, que sempre usa o feed GLM cru.
 */

const site = config.monitor;

// Saúde do coletor — reflete o feed REAL que alimenta o armazém (respeita o
// LIGHTNING_PROVIDER). O endpoint /safety/batch usa isto para o fail-safe:
// coletor sem sucesso recente => tratar os locais como "monitoramento indisponível".
const health = { lastRunAt: 0, lastOkAt: 0, ok: false, error: null };

export function getCollectorHealth() {
  const now = Date.now();
  const dataAgeSec = health.lastOkAt ? Math.round((now - health.lastOkAt) / 1000) : null;
  const feedOk = health.ok && dataAgeSec != null && dataAgeSec <= config.glmStaleSec;
  return { feedOk, dataAgeSec, lastError: health.error };
}

async function collect() {
  health.lastRunAt = Date.now();
  try {
    const all = await getRecentStrikes({ lat: site.lat, lon: site.lon });
    const near = all.filter((s) => s.distanceKm <= config.maxDisplayKm);
    const added = ingest(near);
    const removed = purge();
    health.lastOkAt = Date.now();
    health.ok = true;
    health.error = null;
    if (added || removed) {
      logger.debug({ added, removed, total: size() }, "Armazém de raios atualizado");
    }
  } catch (err) {
    health.ok = false;
    health.error = err.message;
    logger.warn({ err: err.message }, "Coletor de raios falhou neste ciclo");
  }
}

export function startStrikeCollector() {
  collect(); // primeira coleta imediata (mapa já nasce populado)
  setInterval(collect, config.safetyTickSec * 1000).unref();
  logger.info(
    {
      intervaloSec: config.safetyTickSec,
      mapaMin: config.mapMarkerTtlMin,
      retencaoH: config.strikeRetentionHours,
    },
    "Coletor de raios iniciado (marca no mapa por 30 min · retém 24 h)"
  );
}
