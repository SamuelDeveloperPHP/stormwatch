/**
 * Locais de monitoramento (uso geral) — Parte 1 do B2B enxuto.
 *
 * Regras:
 * - Até 3 locais salvos apenas neste navegador (localStorage).
 * - Limpeza automática toda segunda-feira às 01:00 (client-side).
 * - Export/import em .json para o usuário guardar/restaurar.
 * - Relatório PDF: 1 por dia por máquina.
 */

export interface MonitorSite {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  criticalRadiusKm: number;
  alertRadiusKm: number;
  peopleCount: number;
  category?: "Aeroporto" | "Obra" | "Evento" | "Porto / Indústria" | "Escritório" | "Outro";
  responsibleName?: string;
  managerPhone?: string;
}

export const MAX_SITES = 3;

const SITES_KEY = "stormwatch_sites";
const REPORT_KEY = "stormwatch_report_date";

interface StoredSites {
  savedAt: number;
  sites: MonitorSite[];
}

/** Segunda-feira 01:00 mais recente que já passou (fronteira de limpeza). */
function mostRecentReset(now: Date = new Date()): Date {
  const diffToMon = (now.getDay() + 6) % 7; // dias desde a última segunda (0=dom)
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMon);
  monday.setHours(1, 0, 0, 0);
  if (monday.getTime() > now.getTime()) monday.setDate(monday.getDate() - 7);
  return monday;
}

/** Próxima segunda-feira 01:00 (para exibir ao usuário quando os dados serão apagados). */
export function nextWipeDate(now: Date = new Date()): Date {
  const next = new Date(mostRecentReset(now));
  next.setDate(next.getDate() + 7);
  return next;
}

export function loadSites(): MonitorSite[] {
  try {
    const raw = localStorage.getItem(SITES_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as StoredSites;
    // Limpeza semanal: dados salvos antes da última segunda 01:00 são descartados.
    if (!data.savedAt || data.savedAt < mostRecentReset().getTime()) {
      localStorage.removeItem(SITES_KEY);
      return [];
    }
    return Array.isArray(data.sites) ? data.sites.slice(0, MAX_SITES) : [];
  } catch {
    return [];
  }
}

export function saveSites(sites: MonitorSite[]): void {
  const data: StoredSites = { savedAt: Date.now(), sites: sites.slice(0, MAX_SITES) };
  localStorage.setItem(SITES_KEY, JSON.stringify(data));
}

/** Baixa os locais como arquivo .json. */
export function exportSitesJson(sites: MonitorSite[]): void {
  const payload = { exportedAt: new Date().toISOString(), sites };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stormwatch-locais-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Lê um .json exportado e devolve locais válidos (até MAX_SITES). */
export function parseSitesJson(text: string): MonitorSite[] {
  const parsed = JSON.parse(text);
  const arr = Array.isArray(parsed) ? parsed : parsed?.sites;
  if (!Array.isArray(arr)) throw new Error("Formato de arquivo inválido.");
  return arr.slice(0, MAX_SITES).map((s: Partial<MonitorSite>, i: number) => ({
    id: s.id || `site-${Date.now()}-${i}`,
    name: String(s.name || "Local sem nome"),
    address: String(s.address || ""),
    lat: Number(s.lat) || 0,
    lon: Number(s.lon) || 0,
    criticalRadiusKm: Number(s.criticalRadiusKm) || 8,
    alertRadiusKm: Number(s.alertRadiusKm) || 15,
    peopleCount: Number(s.peopleCount) || 0,
    category: s.category || "Obra",
    responsibleName: s.responsibleName || "",
    managerPhone: s.managerPhone || "",
  }));
}

// ---------- Limite de 1 relatório PDF por dia (por máquina) ----------
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function canGenerateReportToday(): boolean {
  return localStorage.getItem(REPORT_KEY) !== today();
}

export function markReportGenerated(): void {
  localStorage.setItem(REPORT_KEY, today());
}
