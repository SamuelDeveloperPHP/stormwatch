/**
 * Distância em quilômetros entre dois pontos (lat/lon) pela fórmula de Haversine.
 * Usada para decidir se um raio caiu dentro do raio crítico de alerta.
 */
const R_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(a));
}

export function kmToMiles(km) {
  return km * 0.621371;
}
