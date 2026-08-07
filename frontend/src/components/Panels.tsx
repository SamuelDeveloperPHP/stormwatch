import type { Forecast, MonitorSnapshot, StrikeFilter } from "../types.ts";

function fmtCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Painel de status dirigido pelo estado de SEGURANÇA (autoritativo, vindo do
 * monitor server-side). Fail-safe: se a busca falhar, o monitor estiver
 * degradado ou ainda inicializando, mostra "MONITORAMENTO INDISPONÍVEL" —
 * nunca "seguro" quando não há como confirmar.
 */
export function StatusPanel({
  snapshot,
  feedError,
}: {
  snapshot: MonitorSnapshot | null;
  feedError?: boolean;
}) {
  const safety = snapshot?.safety;
  const unavailable =
    feedError ||
    !safety ||
    safety.level === "init" ||
    safety.level === "degraded" ||
    safety.feedOk === false;

  if (unavailable) {
    return (
      <div className="status status--degraded">
        <div className="status-label">⚠️ Monitoramento indisponível</div>
        <div className="status-sub">
          Sem dados de raios atualizados. Trate a área como <strong>insegura</strong> e
          use o protocolo manual (trovão / observação visual).
        </div>
        {safety?.dataAgeSec != null && (
          <div className="status-sub" style={{ marginTop: 6 }}>
            Último dado há {safety.dataAgeSec}s.
          </div>
        )}
      </div>
    );
  }

  if (safety.level === "danger") {
    return (
      <div className="status status--danger">
        <div className="status-label">⛔ PARAR ATIVIDADES</div>
        <div className="status-sub">
          Raio a <strong>{safety.closestKm} km</strong> · {safety.inZoneCount} na zona de
          risco ({safety.triggerKm} km).
        </div>
        <div className="status-sub" style={{ marginTop: 6 }}>
          Suspender atividades externas e buscar abrigo.
          {safety.allClearInSec != null && (
            <> Liberação em {fmtCountdown(safety.allClearInSec)} se não houver novos raios.</>
          )}
        </div>
      </div>
    );
  }

  // safe
  return (
    <div className="status status--safe">
      <div className="status-label">Área segura</div>
      <div className="status-sub">
        Nenhum raio dentro de {safety.triggerKm} km da sua localização.
      </div>
      {safety.closestKm != null && (
        <div className="status-sub" style={{ marginTop: 8 }}>
          Raio mais próximo: <strong>{safety.closestKm} km</strong>
          {safety.dataAgeSec != null && <> · dado há {safety.dataAgeSec}s</>}
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
            <button className="info-guide-btn" onClick={onOpenInfo} title="Entenda como funcionam as métricas">
              ℹ️
            </button>
          )}
        </div>
        <span className={`severity-badge ${severityClass}`}>{severityLabel}</span>
      </div>

      <div className="intensity-grid">
        <div className="metric-box">
          <span className="metric-label">Pico Máximo</span>
          <span className="metric-value">{maxAmp > 0 ? `${maxAmp.toFixed(0)} kA` : "—"}</span>
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
    </div>
  );
}

import HourlyForecastWidget from "./HourlyForecastWidget.tsx";

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

      <HourlyForecastWidget forecast={forecast} place={place} />
    </div>
  );
}


export function StrikeList({
  snapshot,
  filter,
  onFilterChange,
  onOpenInfo,
}: {
  snapshot: MonitorSnapshot | null;
  filter: StrikeFilter;
  onFilterChange: (f: StrikeFilter) => void;
  onOpenInfo?: () => void;
}) {
  const strikes = snapshot?.strikes ?? [];

  const filteredStrikes = strikes.filter((s) => {
    if (filter === "cg") return s.type === "CG";
    if (filter === "high_intensity") return Math.abs(s.peakAmpKa || 0) >= 30;
    return true;
  });

  return (
    <div className="card">
      <div className="strike-list-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3>Raios recentes</h3>
          {onOpenInfo && (
            <button className="info-guide-btn" onClick={onOpenInfo} title="Como ler a lista e intensidade dos raios">
              ℹ️ Guia
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
          &gt; 30 kA
        </button>
      </div>

      {!snapshot || filteredStrikes.length === 0 ? (
        <p className="muted" style={{ marginTop: 10 }}>
          Nenhum raio encontrado com os filtros selecionados.
        </p>
      ) : (
        <div className="strike-list" style={{ marginTop: 10 }}>
          {filteredStrikes.map((s) => {
            const near = s.distanceKm <= (snapshot?.radiusKm ?? 8);
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
                className={`strike-row ${near ? "strike-row--near" : ""}`}
              >
                <span className="strike-dist">{s.distanceKm} km</span>
                <span className="strike-type">
                  {s.type === "CG" ? "⚡ nuvem-solo" : "☁️ intra-nuvem"} · {when}
                </span>
                {amp > 0 && (
                  <span className={`amp-badge ${ampClass}`}>{amp} kA</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

