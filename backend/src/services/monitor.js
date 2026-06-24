import { config } from "../config/index.js";
import { getRecentStrikes } from "./lightning.js";
import { isOnCooldown } from "./alerts.js";

/**
 * Núcleo da lógica de monitoramento:
 *  1. busca strikes recentes (mock ou API real)
 *  2. calcula o status (seguro / atenção / crítico) pela distância do mais próximo
 *  3. se o mais próximo entrou no raio crítico, tenta disparar o alerta
 *
 * Retorna um snapshot consumível pelo front-end.
 */
const REGION_CAP = 5000; // teto de pontos enviados ao mapa (proteção de payload)

export async function evaluateMonitor({ lat, lon }) {
  // `all` traz TODAS as descargas da fonte (p/ GLM = toda a América do Sul),
  // já com distanceKm e ordenadas da mais próxima para a mais distante.
  const all = await getRecentStrikes({ lat, lon });
  const closest = all[0] ?? null;
  const radius = config.alertRadiusKm;

  let status = "safe"; // safe | watch | alert
  if (closest) {
    if (closest.distanceKm <= radius) status = "alert";
    else if (closest.distanceKm <= radius * 2) status = "watch";
  }

  const inRadiusCount = all.filter((s) => s.distanceKm <= radius).length;

  // Descargas PRÓXIMAS (lista lateral + popups): limitadas ao raio de exibição.
  const strikes = all.filter((s) => s.distanceKm <= config.maxDisplayKm);

  // Incidência REGIONAL (mapa): todos os flashes, compactados em [lat, lon].
  const region = all.slice(0, REGION_CAP).map((s) => [s.lat, s.lon]);
  const regionTruncated = all.length > REGION_CAP;

  // O disparo de alertas é feito pelo monitor de segurança server-side
  // (safetyMonitor.js), não aqui — esta função é só leitura para a tela.
  const dispatch = { sent: false, reason: "handled_by_safety_monitor" };

  return {
    location: { lat, lon, label: config.monitor.label },
    evaluatedAt: new Date().toISOString(),
    radiusKm: radius,
    status,
    closest,
    strikes,
    regionStrikes: region,
    regionCount: all.length,
    regionTruncated,
    inRadiusCount,
    alert: {
      ...dispatch,
      onCooldown: isOnCooldown(),
      cooldownMin: config.alertCooldownMin,
    },
  };
}
