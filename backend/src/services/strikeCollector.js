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

async function collect() {
  try {
    const all = await getRecentStrikes({ lat: site.lat, lon: site.lon });
    const near = all.filter((s) => s.distanceKm <= config.maxDisplayKm);
    const added = ingest(near);
    const removed = purge();
    if (added || removed) {
      logger.debug({ added, removed, total: size() }, "Armazém de raios atualizado");
    }
  } catch (err) {
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
