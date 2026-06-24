import type { Forecast, MonitorSnapshot } from "../types.ts";

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
        Nenhum raio dentro de {safety.triggerKm} km do canteiro.
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

export function ForecastPanel({ forecast }: { forecast: Forecast | null }) {
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
      <h3>Tempo agora</h3>
      <div className="current">
        <div className="current-temp">{c.tempC}°</div>
        <div className="current-meta">
          <span>{c.conditionLabel}</span>
          <span>Sensação {c.feelsLikeC}° · Umidade {c.humidity}%</span>
          <span>Vento {c.windKmh} km/h</span>
        </div>
      </div>

      <div className="hourly" style={{ marginTop: 14 }}>
        {forecast.hourly.map((h) => (
          <div className="hour" key={h.time}>
            <div className="hour-label">{h.hourLabel}</div>
            <div className="hour-temp">{h.tempC}°</div>
            <div className="hour-precip">{h.precipProb}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StrikeList({ snapshot }: { snapshot: MonitorSnapshot | null }) {
  return (
    <div className="card">
      <h3>Raios recentes</h3>
      {!snapshot || snapshot.strikes.length === 0 ? (
        <p className="muted">Nenhum raio detectado nos últimos minutos.</p>
      ) : (
        <div className="strike-list">
          {snapshot.strikes.map((s) => {
            const near = s.distanceKm <= snapshot.radiusKm;
            const when = new Date(s.timestamp).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div
                key={s.id}
                className={`strike-row ${near ? "strike-row--near" : ""}`}
              >
                <span className="strike-dist">{s.distanceKm} km</span>
                <span className="strike-type">
                  {s.type === "CG" ? "nuvem-solo" : "intra-nuvem"} · {when}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
