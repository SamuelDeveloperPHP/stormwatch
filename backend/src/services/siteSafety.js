import { config } from "../config/index.js";
import { haversineKm } from "./geo.js";

/**
 * Segurança de UM local, calculada de forma STATELESS a partir da lista de raios
 * recentes do armazém (janela de 30 min). Espelha a lógica do monitor de
 * segurança server-side (safetyMonitor.js), mas para um ponto arbitrário — a
 * geolocalização do usuário ou um local salvo — o que permite a contagem
 * regressiva de "tudo-limpo" POR LOCAL na tela.
 *
 * Regra dos 30 min (prática NWS): a área fica em PERIGO desde o último raio na
 * zona crítica até passarem `allClearMin` sem novos raios. `allClearInSec` é
 * derivado do raio MAIS RECENTE na zona, então REINICIA a cada novo raio.
 *
 * Por que o armazém e não o feed ao vivo: o feed GLM só retém ~15 min, e a regra
 * é de 30 min. O armazém mantém a janela de 30 min sempre populada, então uma
 * contagem stateless calculada a partir dele fica correta até os 30 min.
 *
 * @param {{lat:number, lon:number, criticalRadiusKm:number, alertRadiusKm?:number}} site
 * @param {Array<{lat:number, lon:number, timestamp:number}>} strikes  Armazém recente (30 min).
 * @param {number} [now]  Epoch ms (injetável para teste).
 */
export function computeSiteSafety(site, strikes, now = Date.now()) {
  const triggerKm = site.criticalRadiusKm;
  const alertKm = site.alertRadiusKm ?? triggerKm;
  const allClearMs = config.allClearMin * 60 * 1000;

  let closestKm = Infinity;
  let inZoneCount = 0;
  let lastInZoneAt = 0;
  let lastInAlertAt = 0;

  for (const s of strikes) {
    const d = haversineKm(site.lat, site.lon, s.lat, s.lon);
    if (d < closestKm) closestKm = d;
    if (d <= triggerKm) {
      inZoneCount++;
      if (s.timestamp > lastInZoneAt) lastInZoneAt = s.timestamp;
    }
    if (d <= alertKm && s.timestamp > lastInAlertAt) lastInAlertAt = s.timestamp;
  }

  const sinceZone = lastInZoneAt ? now - lastInZoneAt : Infinity;
  const sinceAlert = lastInAlertAt ? now - lastInAlertAt : Infinity;

  // Nível: PERIGO enquanto o último raio na zona crítica estiver dentro da janela
  // de tudo-limpo; senão ATENÇÃO se houve raio recente no anel de alerta. Ambos
  // respeitam a janela de tudo-limpo: passado o prazo sem raios, volta a SEGURO.
  let level = "safe";
  let allClearInSec = null;
  if (sinceZone < allClearMs) {
    level = "danger";
    allClearInSec = Math.max(0, Math.round((allClearMs - sinceZone) / 1000));
  } else if (sinceAlert < allClearMs) {
    level = "alert";
  }

  return {
    level, // "safe" | "alert" | "danger"
    closestKm: Number.isFinite(closestKm) ? Math.round(closestKm * 10) / 10 : null,
    inZoneCount,
    triggerKm,
    alertRadiusKm: alertKm,
    allClearMin: config.allClearMin,
    allClearInSec,
    lastStrikeInZoneAt: lastInZoneAt || null,
  };
}
