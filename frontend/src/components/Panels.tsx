import type { CSSProperties, ReactNode } from "react";
import type { Forecast, MonitorSnapshot, SiteSafety, Strike, StrikeFilter } from "../types.ts";
import type { MonitorSite } from "../locations.ts";
import WindAlertCard from "./WindAlertCard.tsx";

// ── Ícones vetoriais minimalistas (estilo dashboard/BI) ────────────────────
// Traço fino, monocromático. Herdam `currentColor` (ex.: a cor de status do CSS).
type IcoProps = { size?: number; style?: CSSProperties };

function Svg({ size = 15, style, children }: { size?: number; style?: CSSProperties; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ verticalAlign: "-2px", ...style }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

// Status indisponível / atenção — triângulo de alerta.
function WarnIcon({ size = 16, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M10.3 4.2 2 18.5a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.7v4.1" />
      <path d="M12 17.4h.01" />
    </Svg>
  );
}

// Status de perigo (parar atividades) — octógono de parada.
function StopIcon({ size = 16, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z" />
      <path d="M12 8v4.5" />
      <path d="M12 16h.01" />
    </Svg>
  );
}

// Status seguro — escudo com marca de verificação.
function ShieldCheckIcon({ size = 16, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M12 3l7 2.7v5.1c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V5.7z" />
      <path d="M9 12l2 2 4-4.2" />
    </Svg>
  );
}

// Botão de informação/guia — círculo com "i".
function InfoIcon({ size = 15, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.6h.01" />
    </Svg>
  );
}

// Raio nuvem-solo (CG — risco direto): relâmpago preenchido (símbolo-marca).
function BoltIcon({ size = 13, style }: IcoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ verticalAlign: "-2px", ...style }}
      fill="currentColor"
    >
      <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
    </svg>
  );
}

// Raio intra-nuvem (IC): nuvem (sem descarga ao solo).
function CloudIcon({ size = 13, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M6.5 16.5h10a3.5 3.5 0 0 0 .3-7A4.8 4.8 0 0 0 7.7 8 3.7 3.7 0 0 0 6.5 16.5z" />
    </Svg>
  );
}

// Probabilidade de chuva — gota.
function RainDropIcon({ size = 12, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M12 3.8c3.1 3.7 4.8 6.2 4.8 8.7a4.8 4.8 0 0 1-9.6 0c0-2.5 1.7-5 4.8-8.7z" />
    </Svg>
  );
}

export function fmtCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Compacto para chips/resumo: "28m" (arredonda p/ cima) ou "45s". */
export function fmtCountdownShort(sec: number): string {
  return sec >= 60 ? `${Math.ceil(sec / 60)}m` : `${sec}s`;
}

/**
 * Desconta ao vivo os segundos passados desde a última resposta do backend, para
 * o cronômetro descer suave entre os polls de 30s. Nunca abaixo de 0.
 */
export function liveAllClear(
  allClearInSec: number | null | undefined,
  fetchedAt: number,
  now: number
): number | null {
  if (allClearInSec == null) return null;
  const elapsed = Math.max(0, Math.floor((now - fetchedAt) / 1000));
  return Math.max(0, allClearInSec - elapsed);
}

const LEVEL_RANK: Record<string, number> = { safe: 0, alert: 1, danger: 2 };

/**
 * Nível MAIS severo entre dois — para não regredir a detecção espacial (dados de
 * toda a região) quando a contagem do backend (armazém ~120 km) não cobre um
 * local muito distante. Erra para o lado seguro: nunca rebaixa um alerta real.
 */
export function moreSevereLevel(
  a?: string,
  b?: string
): "safe" | "alert" | "danger" {
  const r = Math.max(LEVEL_RANK[a ?? "safe"] ?? 0, LEVEL_RANK[b ?? "safe"] ?? 0);
  return r === 2 ? "danger" : r === 1 ? "alert" : "safe";
}

/**
 * Painel de status dirigido pelo estado de SEGURANÇA.
 * Suporta o status autoritativo do usuário ou a análise por localidade selecionada.
 */

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateSiteSafety(
  siteLat: number,
  siteLon: number,
  criticalRadiusKm: number,
  alertRadiusKm: number,
  strikes: Strike[],
  regionStrikes: [number, number][]
) {
  let closestKm = Infinity;
  let inZoneCount = 0;

  for (const s of strikes) {
    const d = getDistanceKm(siteLat, siteLon, s.lat, s.lon);
    if (d < closestKm) closestKm = d;
    if (d <= criticalRadiusKm) inZoneCount++;
  }

  for (const [rLat, rLon] of regionStrikes) {
    const d = getDistanceKm(siteLat, siteLon, rLat, rLon);
    if (d < closestKm) closestKm = d;
    if (d <= criticalRadiusKm) inZoneCount++;
  }

  const isDanger = inZoneCount > 0;
  const isAlert = !isDanger && closestKm <= alertRadiusKm;

  return {
    level: isDanger ? ("danger" as const) : isAlert ? ("alert" as const) : ("safe" as const),
    closestKm: closestKm === Infinity ? null : Math.round(closestKm * 10) / 10,
    inZoneCount,
    triggerKm: criticalRadiusKm,
    alertRadiusKm,
  };
}

/**
 * Painel de status dirigido pelo estado de SEGURANÇA do local ativo.
 * Recebe a segurança JÁ resolvida (backend por local) + a contagem regressiva
 * ao vivo. `degraded` cobre feed indisponível/velho (fail-safe: área insegura).
 */
export function StatusPanel({
  safety,
  allClearInSec,
  degraded,
  locationName,
}: {
  safety: {
    level: "safe" | "danger" | "alert" | "degraded";
    closestKm: number | null;
    inZoneCount: number;
    triggerKm: number;
    alertRadiusKm?: number;
  } | null;
  allClearInSec?: number | null;
  degraded?: boolean;
  locationName?: string;
}) {
  const locLabel = locationName || "sua localização";
  const unavailable = degraded || !safety || safety.level === "degraded";

  if (unavailable) {
    return (
      <div className="status status--degraded">
        <div className="status-label">
          <WarnIcon size={17} style={{ marginRight: 7, verticalAlign: "-3px" }} />
          Monitoramento indisponível
        </div>
        <div className="status-sub">
          Sem dados de raios atualizados para {locLabel}. Trate a área como <strong>insegura</strong>.
        </div>
      </div>
    );
  }

  if (safety.level === "danger") {
    return (
      <div className="status status--danger">
        <div className="status-label">
          <StopIcon size={17} style={{ marginRight: 7, verticalAlign: "-3px" }} />
          PARAR ATIVIDADES {locationName ? `EM ${locationName.toUpperCase()}` : ""}
        </div>
        <div className="status-sub">
          Raio a <strong>{safety.closestKm} km</strong> · {safety.inZoneCount} na zona de
          risco crítica ({safety.triggerKm} km).
        </div>
        <div className="status-sub" style={{ marginTop: 6 }}>
          Suspender atividades externas no local e buscar abrigo seguro imediatamente.
        </div>
        {allClearInSec != null && (
          <div
            className="status-countdown"
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid rgba(255,255,255,0.28)",
              fontSize: 13,
              fontWeight: 700,
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            {allClearInSec > 0 ? (
              <>
                <span aria-hidden="true">⏳</span>
                <span>
                  Liberação em <strong style={{ fontVariantNumeric: "tabular-nums" }}>{fmtCountdown(allClearInSec)}</strong>
                </span>
                <span style={{ fontWeight: 500, opacity: 0.85 }}>
                  — reinicia a cada novo raio na zona.
                </span>
              </>
            ) : (
              <>
                <span aria-hidden="true">✓</span>
                <span>Sem novos raios — confirmando liberação…</span>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  if (safety.level === "alert") {
    return (
      <div className="status status--warning" style={{ background: "#fef3c7", borderColor: "#f59e0b", color: "#92400e", padding: 14, borderRadius: 14 }}>
        <div className="status-label" style={{ color: "#b45309", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center" }}>
          <WarnIcon size={17} style={{ marginRight: 7 }} />
          ATENÇÃO {locationName ? `EM ${locationName.toUpperCase()}` : ""}
        </div>
        <div className="status-sub" style={{ marginTop: 4, color: "#78350f" }}>
          Raio detectado no Raio de Alerta: <strong>{safety.closestKm} km</strong> do local.
        </div>
        <div className="status-sub" style={{ marginTop: 4, color: "#78350f", fontSize: 11 }}>
          Monitore o radar com atenção. Equipes de prontidão.
        </div>
      </div>
    );
  }

  // safe
  return (
    <div className="status status--safe">
      <div className="status-label">
        <ShieldCheckIcon size={17} style={{ marginRight: 7, verticalAlign: "-3px" }} />
        Área segura
      </div>
      <div className="status-sub">
        Nenhum raio dentro do raio de alerta em {locLabel}.
      </div>
      {safety.closestKm != null && (
        <div className="status-sub" style={{ marginTop: 8 }}>
          Raio mais próximo: <strong>{safety.closestKm} km</strong>
        </div>
      )}
    </div>
  );
}

/**
 * Painel estatístico de Análise de Intensidade (kA) e Risco de Solo (CG vs IC)
 */
export function IntensitySummaryPanel({
  snapshot,
  onOpenInfo,
}: {
  snapshot: MonitorSnapshot | null;
  onOpenInfo?: () => void;
}) {
  if (!snapshot || snapshot.strikes.length === 0) {
    return null;
  }

  const strikes = snapshot.strikes;
  const total = strikes.length;

  // Descarga com pico de amperagem máximo (kA)
  const maxAmp = Math.max(...strikes.map((s) => Math.abs(s.peakAmpKa || 0)));

  // Contagem de raios Nuvem-Solo (CG - Risco Direto) vs Intra-Nuvem (IC)
  const cgCount = strikes.filter((s) => s.type === "CG").length;
  const icCount = total - cgCount;
  const cgPercent = Math.round((cgCount / total) * 100);

  // Estimativa de Frequência (Raios/minuto na janela de 30 min)
  const ratePerMin = (total / 30).toFixed(1);

  // Determina nível de severidade da tempestade
  let severityLabel = "Moderada";
  let severityClass = "severity--moderate";
  if (maxAmp > 50 || cgPercent > 60) {
    severityLabel = "Severa / Extrema";
    severityClass = "severity--extreme";
  } else if (maxAmp < 20 && cgPercent < 30) {
    severityLabel = "Leve";
    severityClass = "severity--light";
  }

  return (
    <div className="card intensity-panel">
      <div className="intensity-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3>Análise da Tempestade</h3>
          {onOpenInfo && (
            <button
              className="info-guide-btn"
              onClick={onOpenInfo}
              title="Entenda como funcionam as métricas"
              aria-label="Entenda como funcionam as métricas"
            >
              <InfoIcon size={16} />
            </button>
          )}
        </div>
        <span className={`severity-badge ${severityClass}`}>{severityLabel}</span>
      </div>

      <div className="intensity-grid">
        <div className="metric-box">
          <span className="metric-label">Pico Máx. (est.)</span>
          <span className="metric-value">{maxAmp > 0 ? `~${maxAmp.toFixed(0)} kA` : "—"}</span>
        </div>
        <div className="metric-box">
          <span className="metric-label">Frequência</span>
          <span className="metric-value">{ratePerMin} <small>raios/min</small></span>
        </div>
      </div>

      <div className="cg-ic-bar-wrap" style={{ marginTop: 12 }}>
        <div className="cg-ic-labels">
          <span>Nuvem-Solo (CG): <strong>{cgCount} ({cgPercent}%)</strong></span>
          <span>Intra-Nuvem (IC): <strong>{icCount}</strong></span>
        </div>
        <div className="cg-ic-bar">
          <div className="cg-ic-fill-cg" style={{ width: `${cgPercent}%` }} />
        </div>
      </div>

      <p className="estimate-note">
        Amperagem (kA) e classificação CG/IC são <strong>estimativas ilustrativas</strong> — não medidas pelo GLM. Frequência e contagem são dados reais.
      </p>
    </div>
  );
}

export function ForecastPanel({ forecast, place }: { forecast: Forecast | null; place?: string }) {
  if (!forecast) {
    return (
      <div className="card">
        <h3>Previsão</h3>
        <p className="muted">Carregando…</p>
      </div>
    );
  }
  const c = forecast.current;
  const hourly = forecast.hourly ?? [];
  return (
    <div className="card">
      <h3>Tempo agora em {place || forecast.location.label}</h3>
      <div className="current">
        <div className="current-temp">{c.tempC}°</div>
        <div className="current-meta">
          <span>{c.conditionLabel}</span>
          <span>Sensação {c.feelsLikeC}° · Umidade {c.humidity}%</span>
          <span>Vento {c.windKmh} km/h</span>
        </div>
      </div>

      <WindAlertCard forecast={forecast} />

      <div
        className="hourly-title"
        style={{
          marginTop: 12,
          marginBottom: 8,
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--ink-soft)",
        }}
      >
        Previsão Próximas Horas
      </div>
      <div className="hourly">
        {hourly.slice(0, 8).map((h) => (
          <div className="hour-item" key={h.time}>
            <span className="hour-time">{h.hourLabel}</span>
            <span className="hour-temp">{h.tempC}°</span>
            <span className="hour-precip" style={{ fontSize: 10, color: "#0284c7", fontWeight: 700 }}>
              <RainDropIcon size={11} style={{ marginRight: 3 }} />{h.precipProb}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AllLocationsSummaryPanel({
  userPlace,
  userSafety,
  userWeather,
  sites,
  strikes,
  regionStrikes,
  selectedId,
  onSelectSite,
  onOpenAdd,
  safetyById,
  safetyFetchedAt,
  nowMs,
}: {
  userPlace: string;
  userSafety: any;
  userWeather: any;
  sites: MonitorSite[];
  strikes: Strike[];
  regionStrikes: [number, number][];
  selectedId: string | null;
  onSelectSite: (id: string | null) => void;
  onOpenAdd: () => void;
  safetyById: Record<string, SiteSafety>;
  safetyFetchedAt: number;
  nowMs: number;
}) {
  if (sites.length === 0) return null;

  // Selo de status com a contagem regressiva ao vivo (só no perigo).
  const statusBadge = (level: string | undefined, allClearInSec: number | null | undefined) => {
    const isDanger = level === "danger";
    const isAlert = level === "alert";
    const cd = isDanger ? liveAllClear(allClearInSec, safetyFetchedAt, nowMs) : null;
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          padding: "2px 6px",
          borderRadius: 4,
          whiteSpace: "nowrap",
          background: isDanger ? "#fee2e2" : isAlert ? "#fef3c7" : "#d1fae5",
          color: isDanger ? "#dc2626" : isAlert ? "#b45309" : "#047857",
        }}
      >
        {isDanger ? "🔴 Perigo" : isAlert ? "⚡ Alerta" : "🟢 Seguro"}
        {cd != null && cd > 0 ? ` · ${fmtCountdownShort(cd)}` : ""}
      </span>
    );
  };

  const geoSafety = safetyById["geo"];
  const geoLevel = geoSafety?.level ?? userSafety?.level;

  return (
    <div className="card all-sites-summary-card" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-soft)" }}>
          📍 Resumo dos Locais ({sites.length + 1})
        </h3>
        <button
          onClick={onOpenAdd}
          style={{ background: "none", border: "none", color: "#0284c7", fontWeight: 700, fontSize: 11, cursor: "pointer", padding: 0 }}
        >
          + Gerenciar
        </button>
      </div>

      <div className="sites-summary-list" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {/* User Geolocation Item */}
        <div
          className={`site-summary-item ${selectedId === null ? "active" : ""}`}
          onClick={() => onSelectSite(null)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 10px",
            borderRadius: 8,
            background: selectedId === null ? "rgba(16, 185, 129, 0.12)" : "var(--bg-elev)",
            border: selectedId === null ? "1px solid #10b981" : "1px solid var(--line)",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🟢</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                {userPlace || "Sua Geolocalização"}
              </div>
              <div style={{ fontSize: 10, color: "var(--ink-soft)" }}>
                {userWeather ? `${userWeather.tempC}°C · ${userWeather.conditionLabel}` : "Localização Atual"}
              </div>
            </div>
          </div>
          {statusBadge(geoLevel, geoSafety?.allClearInSec)}
        </div>

        {/* Registered Sites List */}
        {sites.map((site) => {
          // Nível = o MAIS severo entre a detecção espacial regional (dados de toda
          // a região, sem contagem) e a do backend (armazém, com contagem). A
          // contagem regressiva vem sempre do backend.
          const backendSafety = safetyById[site.id];
          const spatial = calculateSiteSafety(
            site.lat,
            site.lon,
            site.criticalRadiusKm,
            site.alertRadiusKm,
            strikes,
            regionStrikes
          );
          const level = moreSevereLevel(backendSafety?.level, spatial.level);

          const isSelected = selectedId === site.id;

          return (
            <div
              key={site.id}
              className={`site-summary-item ${isSelected ? "active" : ""}`}
              onClick={() => onSelectSite(site.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 8,
                background: isSelected ? "rgba(2, 132, 199, 0.12)" : "var(--bg-elev)",
                border: isSelected ? "1px solid #0284c7" : "1px solid var(--line)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>📍</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{site.name}</div>
                  <div style={{ fontSize: 10, color: "var(--ink-soft)" }}>
                    {site.category} · Raios: {site.criticalRadiusKm}/{site.alertRadiusKm} km
                  </div>
                </div>
              </div>

              {statusBadge(level, backendSafety?.allClearInSec)}
            </div>
          );
        })}
      </div>
    </div>
  );
}


export function StrikeList({
  snapshot,
  filter,
  onFilterChange,
  onOpenInfo,
  activeSite,
  userLocationName,
}: {
  snapshot: MonitorSnapshot | null;
  filter: StrikeFilter;
  onFilterChange: (f: StrikeFilter) => void;
  onOpenInfo?: () => void;
  activeSite?: MonitorSite | null;
  userLocationName?: string;
}) {
  const strikes = snapshot?.strikes ?? [];

  const refLat = activeSite ? activeSite.lat : (snapshot?.location.lat ?? -25.5306);
  const refLon = activeSite ? activeSite.lon : (snapshot?.location.lon ?? -49.2939);
  const locationTitle = activeSite ? activeSite.name : (userLocationName || "Sua Geolocalização");
  const criticalRadius = activeSite ? activeSite.criticalRadiusKm : (snapshot?.radiusKm ?? 8);
  const alertRadius = activeSite ? activeSite.alertRadiusKm : Math.max(snapshot?.radiusKm ?? 15, 15);

  // Recalcula distâncias e ordena em relação às coordenadas da localidade selecionada
  const strikesWithDistance = strikes.map((s) => ({
    ...s,
    distanceKm: Math.round(getDistanceKm(refLat, refLon, s.lat, s.lon) * 100) / 100,
  })).sort((a, b) => a.distanceKm - b.distanceKm);

  const filteredStrikes = strikesWithDistance.filter((s) => {
    if (filter === "cg") return s.type === "CG";
    if (filter === "high_intensity") return Math.abs(s.peakAmpKa || 0) >= 30;
    return true;
  });

  return (
    <div className="card">
      <div className="strike-list-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ fontSize: 13, textTransform: "uppercase" }}>
            Raios recentes <small style={{ color: "#0284c7", textTransform: "none", fontWeight: 700 }}>· {locationTitle}</small>
          </h3>
          {onOpenInfo && (
            <button className="info-guide-btn" onClick={onOpenInfo} title="Como ler a lista e intensidade dos raios">
              <InfoIcon size={14} style={{ marginRight: 4 }} />Guia
            </button>
          )}
        </div>
        <span className="strike-count">{filteredStrikes.length}</span>
      </div>

      <div className="filter-chips">
        <button
          className={`filter-chip ${filter === "all" ? "filter-chip--active" : ""}`}
          onClick={() => onFilterChange("all")}
        >
          Todos ({strikes.length})
        </button>
        <button
          className={`filter-chip ${filter === "cg" ? "filter-chip--active" : ""}`}
          onClick={() => onFilterChange("cg")}
        >
          Solo (CG)
        </button>
        <button
          className={`filter-chip ${filter === "high_intensity" ? "filter-chip--active" : ""}`}
          onClick={() => onFilterChange("high_intensity")}
        >
          &gt; 30 kA (est.)
        </button>
      </div>

      {!snapshot ? (
        <p className="muted" style={{ marginTop: 10 }}>
          Carregando raios de {locationTitle}…
        </p>
      ) : filteredStrikes.length === 0 ? (
        <p className="muted" style={{ marginTop: 10 }}>
          Nenhum raio encontrado com os filtros selecionados.
        </p>
      ) : (
        <div className="strike-list" style={{ marginTop: 10 }}>
          {filteredStrikes.map((s) => {
            const isCritical = s.distanceKm <= criticalRadius;
            const isAlert = !isCritical && s.distanceKm <= alertRadius;
            const when = new Date(s.timestamp).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const amp = Math.abs(s.peakAmpKa || 0);
            let ampClass = "amp-badge--low";
            if (amp >= 40) ampClass = "amp-badge--high";
            else if (amp >= 20) ampClass = "amp-badge--med";

            return (
              <div
                key={s.id}
                className={`strike-row ${isCritical ? "strike-row--near" : ""}`}
                style={{
                  borderLeft: isCritical
                    ? "3px solid #ef4444"
                    : isAlert
                    ? "3px solid #facc15"
                    : undefined,
                }}
              >
                <span className="strike-dist">{s.distanceKm} km</span>
                <span className="strike-type">
                  {s.type === "CG" ? (
                    <><BoltIcon size={13} style={{ marginRight: 3 }} />nuvem-solo</>
                  ) : (
                    <><CloudIcon size={13} style={{ marginRight: 3 }} />intra-nuvem</>
                  )} · {when}
                </span>
                {amp > 0 && (
                  <span className={`amp-badge ${ampClass}`} title="Estimativa ilustrativa — não medida pelo GLM">~{amp} kA</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

