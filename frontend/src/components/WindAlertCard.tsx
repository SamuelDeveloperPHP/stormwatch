import type { Forecast } from "../types.ts";
import { WindIcon } from "./ui-icons.tsx";

// Limiares de vento (km/h) para trabalhos em altura / gruas. Ajustáveis.
const WIND_ATTENTION_KMH = 40;
const WIND_CRITICAL_KMH = 60;

/**
 * Card de "Alertas de vento em altitude e rajadas".
 * Usa o vento a 80/120/180 m e as rajadas (Open-Meteo) para classificar o risco
 * em içamento/gruas/andaimes. Exibido no monitor, logo abaixo do "Tempo agora".
 */
export default function WindAlertCard({ current }: { current: Forecast["current"] }) {
  const gust = current.windGustKmh ?? 0;
  const a80 = current.windAlt80Kmh ?? 0;
  const a120 = current.windAlt120Kmh ?? 0;
  const a180 = current.windAlt180Kmh ?? 0;
  const worst = Math.max(gust, a80, a120, a180, current.windKmh);

  let level: "safe" | "attention" | "critical" = "safe";
  if (worst >= WIND_CRITICAL_KMH) level = "critical";
  else if (worst >= WIND_ATTENTION_KMH) level = "attention";

  const badge = level === "critical" ? "⛔ Crítico" : level === "attention" ? "⚠️ Atenção" : "✓ Normal";
  const msg =
    level === "critical"
      ? `Vento/rajadas ≥ ${WIND_CRITICAL_KMH} km/h em altitude — sugerir suspender gruas, içamento e trabalhos em altura.`
      : level === "attention"
      ? `Vento forte em altitude (≥ ${WIND_ATTENTION_KMH} km/h) — cautela com gruas, andaimes e içamento.`
      : "Vento dentro do normal para trabalhos em altura.";

  const cols: { label: string; value: number }[] = [];
  if (current.windGustKmh != null) cols.push({ label: "Rajadas", value: gust });
  if (current.windAlt80Kmh != null) cols.push({ label: "80 m", value: a80 });
  if (current.windAlt120Kmh != null) cols.push({ label: "120 m", value: a120 });
  if (current.windAlt180Kmh != null) cols.push({ label: "180 m", value: a180 });
  if (cols.length === 0) cols.push({ label: "Vento", value: current.windKmh });

  return (
    <div className={`wind-alert wind-alert--${level}`}>
      <div className="wind-alert-head">
        <span className="wind-alert-title">
          <WindIcon size={14} style={{ marginRight: 6 }} />Vento em altitude &amp; rajadas
        </span>
        <span className="wind-alert-badge">{badge}</span>
      </div>
      <div className="wind-alert-grid">
        {cols.map((col) => (
          <div className="wind-alert-metric" key={col.label}>
            <span>{col.label}</span>
            <strong>{col.value} km/h</strong>
          </div>
        ))}
      </div>
      <p className="wind-alert-msg">{msg}</p>
    </div>
  );
}
