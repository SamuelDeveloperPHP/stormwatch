import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  type ChartOptions,
  type ScriptableLineSegmentContext,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Line } from "react-chartjs-2";
import type { Forecast, HourlyPoint } from "../types.ts";
import { WindIcon } from "./ui-icons.tsx";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, ChartDataLabels);

// Limiares de vento (km/h) para trabalhos em altura / gruas / içamento. Ajustáveis.
const WIND_ATTENTION_KMH = 40;
const WIND_CRITICAL_KMH = 60;
const HORIZON_HOURS = 8; // horas exibidas no gráfico

type Level = "safe" | "attention" | "critical";

function classify(v: number): Level {
  if (v >= WIND_CRITICAL_KMH) return "critical";
  if (v >= WIND_ATTENTION_KMH) return "attention";
  return "safe";
}

const LEVEL_COLOR: Record<Level, string> = {
  safe: "#16a34a",
  attention: "#d97706",
  critical: "#dc2626",
};

// Pior caso de vento na hora (rajada e ventos em altitude são os que limitam
// gruas/andaimes/içamento). É o número que dirige o go/no-go de segurança.
function hourlyWorst(h: HourlyPoint): number {
  return Math.max(
    h.windGustKmh ?? 0,
    h.windAlt80Kmh ?? 0,
    h.windAlt120Kmh ?? 0,
    h.windAlt180Kmh ?? 0,
    h.windKmh ?? 0
  );
}

function thresholdDataset(label: string, y: number, n: number, color: string) {
  return {
    label,
    data: Array(n).fill(y),
    borderColor: color,
    borderWidth: 1,
    borderDash: [5, 4],
    pointRadius: 0,
    pointHitRadius: 0,
    fill: false,
    tension: 0,
    order: 1,
  };
}

/**
 * Card de "Alertas de vento em altitude e rajadas".
 * Mostra o pico de vento HORA A HORA (mesma visualização do gráfico de ventos),
 * com as faixas de atenção/crítico, para o usuário avaliar a RETOMADA das
 * atividades. Exibido no monitor, logo abaixo do "Tempo agora".
 */
export default function WindAlertCard({ forecast }: { forecast: Forecast }) {
  const current = forecast.current;
  const hours = (forecast.hourly ?? []).slice(0, HORIZON_HOURS);

  // "Agora" (observação atual) — pior caso entre rajada, altitude e superfície.
  const gust = current.windGustKmh ?? 0;
  const a80 = current.windAlt80Kmh ?? 0;
  const a120 = current.windAlt120Kmh ?? 0;
  const a180 = current.windAlt180Kmh ?? 0;
  const nowWorst = Math.max(gust, a80, a120, a180, current.windKmh);
  const level = classify(nowWorst);
  const badge = level === "critical" ? "⛔ Crítico" : level === "attention" ? "⚠️ Atenção" : "✓ Normal";

  const cols: { label: string; value: number }[] = [];
  if (current.windGustKmh != null) cols.push({ label: "Rajadas", value: gust });
  if (current.windAlt80Kmh != null) cols.push({ label: "80 m", value: a80 });
  if (current.windAlt120Kmh != null) cols.push({ label: "120 m", value: a120 });
  if (current.windAlt180Kmh != null) cols.push({ label: "180 m", value: a180 });
  if (cols.length === 0) cols.push({ label: "Vento", value: current.windKmh });

  // Série horária do pior caso, para avaliar quando o vento volta ao normal.
  const series = hours.map((h) => ({ label: h.hourLabel, value: hourlyWorst(h) }));
  const labels = series.map((p) => p.label);
  const values = series.map((p) => p.value);
  const n = values.length;

  // Mensagem informativa sobre a janela de vento (sem orientação de ação).
  let msg: string;
  if (level === "safe") {
    const peak = series.reduce(
      (mx, p) => (p.value > mx.value ? p : mx),
      { value: -1, label: "" }
    );
    msg =
      peak.value >= WIND_ATTENTION_KMH
        ? `Vento normal agora; sobe para ~${peak.value} km/h por volta das ${peak.label}.`
        : "Vento dentro da faixa normal nas próximas horas.";
  } else {
    const safeAgain = series.find((p) => p.value < WIND_ATTENTION_KMH);
    msg = safeAgain
      ? `Vento tende a cair abaixo de ${WIND_ATTENTION_KMH} km/h por volta das ${safeAgain.label}.`
      : `Vento forte previsto nas próximas ${n} h — acima de ${WIND_ATTENTION_KMH} km/h em todo o horizonte.`;
  }

  const suggestedMax = Math.max(70, (values.length ? Math.max(...values) : 0) + 8);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Pico de vento",
        data: values,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        backgroundColor: "rgba(148, 163, 184, 0.10)",
        borderColor: LEVEL_COLOR[level],
        segment: {
          borderColor: (ctx: ScriptableLineSegmentContext) =>
            LEVEL_COLOR[classify(ctx.p1.parsed.y ?? 0)],
        },
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: values.map((v) => LEVEL_COLOR[classify(v)]),
        pointBorderColor: "#ffffff",
        pointBorderWidth: 1.5,
        pointHitRadius: 14,
        order: 0,
      },
      thresholdDataset("Atenção", WIND_ATTENTION_KMH, n, "rgba(217, 119, 6, 0.55)"),
      thresholdDataset("Crítico", WIND_CRITICAL_KMH, n, "rgba(220, 38, 38, 0.55)"),
    ],
  };

  const AXIS = "#94a3b8";
  const GRID = "rgba(148, 163, 184, 0.16)";
  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 16, bottom: 0, left: 2, right: 8 } },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      datalabels: {
        display: (ctx) => ctx.datasetIndex === 0,
        align: "top",
        anchor: "end",
        offset: 2,
        color: (ctx) => LEVEL_COLOR[classify(values[ctx.dataIndex] ?? 0)],
        font: { weight: "bold", size: 10 },
        formatter: (v) => `${v}`,
      },
      tooltip: {
        filter: (item) => item.datasetIndex === 0,
        backgroundColor: "rgba(15, 23, 42, 0.94)",
        padding: 9,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (ctx) => `Pico de vento: ${ctx.raw} km/h`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: GRID },
        ticks: { color: AXIS, font: { size: 10 }, maxRotation: 0, autoSkipPadding: 8 },
      },
      y: {
        beginAtZero: true,
        suggestedMax,
        grid: { color: GRID, drawTicks: false },
        border: { display: false },
        ticks: { color: AXIS, font: { size: 10 }, padding: 6, maxTicksLimit: 5 },
      },
    },
  };

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

      {n > 0 && (
        <>
          <div className="wind-alert-chart-title">Pico de vento nas próximas {n} h</div>
          <div className="wind-alert-chart">
            <Line data={chartData} options={chartOptions} />
          </div>
          <div className="wind-alert-legend">
            <span><i className="wind-dash wind-dash--attention" />{WIND_ATTENTION_KMH} km/h atenção</span>
            <span><i className="wind-dash wind-dash--critical" />{WIND_CRITICAL_KMH} km/h crítico</span>
          </div>
        </>
      )}

      <p className="wind-alert-msg">{msg}</p>
    </div>
  );
}
