import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config/index.js";
import { logger } from "../middleware/logger.js";

/**
 * Armazém de raios (strikes) com DUAS janelas de tempo:
 *
 *  - MAPA:     os raios dos últimos `mapMarkerTtlMin` (padrão 30 min) são os que
 *              ficam MARCADOS no mapa (ícone de relâmpago). Ver `recent()`.
 *  - RETENÇÃO: TODOS os raios ficam armazenados por `strikeRetentionHours`
 *              (padrão 24 h) e então são apagados da aplicação. Ver `purge()`.
 *
 * Guarda apenas raios PRÓXIMOS do ponto monitorado (até `maxDisplayKm`), para
 * manter o volume limitado, e persiste em JSON no disco para sobreviver a
 * reinícios (dev com --watch, redeploy, etc.).
 *
 * Formato guardado (SEM distância — ela é recalculada por ponto de referência):
 *   { id, lat, lon, timestamp, type, peakAmpKa }
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");
const STORE_FILE = path.join(DATA_DIR, "strikes.json");

const RETENTION_MS = config.strikeRetentionHours * 60 * 60 * 1000;

/** id -> strike */
const strikes = new Map();

function load() {
  try {
    const arr = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    const cutoff = Date.now() - RETENTION_MS;
    for (const s of arr) {
      if (s && typeof s.timestamp === "number" && s.timestamp >= cutoff) {
        strikes.set(s.id, s);
      }
    }
    logger.info({ carregados: strikes.size }, "Armazém de raios carregado do disco");
  } catch (err) {
    if (err.code !== "ENOENT") {
      logger.warn({ err: err.message }, "Não foi possível carregar o armazém de raios");
    }
  }
}

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(save, 1000);
  saveTimer.unref?.();
}

function save() {
  saveTimer = null;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify([...strikes.values()]));
  } catch (err) {
    logger.warn({ err: err.message }, "Falha ao salvar o armazém de raios");
  }
}

/** Adiciona/atualiza raios (dedup por id). Retorna quantos eram novos. */
export function ingest(list) {
  let added = 0;
  for (const s of list) {
    if (!strikes.has(s.id)) added++;
    strikes.set(s.id, {
      id: s.id,
      lat: s.lat,
      lon: s.lon,
      timestamp: s.timestamp,
      type: s.type ?? "CG",
      peakAmpKa: s.peakAmpKa ?? 0,
    });
  }
  if (added) scheduleSave();
  return added;
}

/** Remove os raios mais antigos que a retenção (24 h). Retorna quantos saíram. */
export function purge() {
  const cutoff = Date.now() - RETENTION_MS;
  let removed = 0;
  for (const [id, s] of strikes) {
    if (s.timestamp < cutoff) {
      strikes.delete(id);
      removed++;
    }
  }
  if (removed) scheduleSave();
  return removed;
}

/** Raios marcados no mapa: os dos últimos `windowMin` minutos (padrão 30). */
export function recent(windowMin = config.mapMarkerTtlMin) {
  const cutoff = Date.now() - windowMin * 60 * 1000;
  const out = [];
  for (const s of strikes.values()) {
    if (s.timestamp >= cutoff) out.push(s);
  }
  return out;
}

export function size() {
  return strikes.size;
}

/** Salva imediatamente (usar no encerramento gracioso). */
export function flush() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  save();
}

load();
