import type { Forecast, MonitorSnapshot } from "./types.ts";

const BASE = import.meta.env.VITE_API_BASE ?? "";
const API_KEY = import.meta.env.VITE_APP_API_KEY ?? "";

/**
 * Observação de segurança: este `VITE_APP_API_KEY` fica embutido no bundle
 * do front-end e, portanto, NÃO é um segredo forte contra usuários do site.
 * Ele serve para barrar tráfego casual/automatizado. Os segredos de verdade
 * (chaves das APIs de raios, do WhatsApp) ficam SÓ no backend.
 * Para um app público, proteja o backend também por rate-limit + domínio (CORS),
 * que já estão configurados.
 */
export interface Coords {
  lat: number;
  lon: number;
}

/** Monta a querystring de localização; sem coords, o backend usa o ponto padrão. */
function coordQuery(coords?: Coords): string {
  if (!coords) return "";
  return `?lat=${encodeURIComponent(coords.lat)}&lon=${encodeURIComponent(coords.lon)}`;
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "x-api-key": API_KEY },
  });
  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao chamar ${path}`);
  }
  return res.json() as Promise<T>;
}

export function fetchLightning(coords?: Coords): Promise<MonitorSnapshot> {
  return request<MonitorSnapshot>(`/lightning${coordQuery(coords)}`);
}

export function fetchForecast(coords?: Coords): Promise<Forecast> {
  return request<Forecast>(`/forecast${coordQuery(coords)}`);
}
