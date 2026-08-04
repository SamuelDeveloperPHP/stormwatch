import { config } from "../config/index.js";
import { getRecentStrikes } from "./lightning.js";
import { isOnCooldown } from "./alerts.js";
import { ingest, recent as recentStrikes } from "./strikeStore.js";
import { haversineKm } from "./geo.js";

/**
 * Núcleo da lógica de monitoramento:
 *  1. busca strikes recentes (mock ou API real)
 *  2. calcula o status (seguro / atenção / crítico) pela distância do mais próximo
 *  3. se o mais próximo entrou no raio crítico, tenta disparar o alerta
 *
 * Retorna um snapshot consumível pelo front-end.
 */
const REGION_CAP = 5000; // teto de pontos de incidência regional (proteção de payload)

export async function evaluateMonitor({ lat, lon }) {
  // `all` traz TODAS as descargas da fonte (p/ GLM = toda a América do Sul),
  // já com distanceKm e ordenadas da mais próxima para a mais distante.
  const all = await getRecentStrikes({ lat, lon });
  const radius = config.alertRadiusKm;

  // Alimenta o armazém persistente com os raios próximos deste ciclo (dedup por
  // id). O coletor em background faz o mesmo; aqui garante resposta imediata ao
  // abrir o app. Retenção de 24 h e limpeza ficam a cargo do armazém/coletor.
  ingest(all.filter((s) => s.distanceKm <= config.maxDisplayKm));

  // Descargas dos últimos `mapMarkerTtlMin` minutos (padrão dos EUA: 30 min),
  // vindas do armazém, com a distância recalculada em relação ao ponto consultado.
  const inWindow = recentStrikes(config.mapMarkerTtlMin)
    .map((s) => ({
      ...s,
      distanceKm: Number(haversineKm(lat, lon, s.lat, s.lon).toFixed(2)),
    }))
    .filter((s) => s.distanceKm <= config.maxDisplayKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  // MARCADORES do mapa: até `mapMaxMarkers` descargas ESPALHADAS pela distância
  // (do mais próximo ao mais distante), para cobrir todo o raio de exibição em
  // vez de amontoar no centro. Mantém o mapa limpo e o radar cobrindo a área.
  const cap = config.mapMaxMarkers;
  const strikes =
    inWindow.length <= cap
      ? inWindow
      : Array.from(
          { length: cap },
          (_, i) => inWindow[Math.floor((i * inWindow.length) / cap)]
        );

  const closest = inWindow[0] ?? null;

  let status = "safe"; // safe | watch | alert
  if (closest) {
    if (closest.distanceKm <= radius) status = "alert";
    else if (closest.distanceKm <= radius * 2) status = "watch";
  }

  const inRadiusCount = inWindow.filter((s) => s.distanceKm <= radius).length;

  // Incidência REGIONAL (mapa): todos os flashes AO VIVO, compactados em [lat, lon].
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
