import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Line } from "react-chartjs-2";
import type { Forecast } from "../types.ts";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

interface HourlyForecastWidgetProps {
  forecast: Forecast | null;
  place?: string;
}

type MetricTab = "temp" | "rain" | "wind" | "humidity";
type ViewMode = "graph" | "table";

// ── Ícones vetoriais minimalistas (estilo dashboard/BI) ────────────────────
// Traço fino, monocromático (herda `currentColor`), sem preenchimento sólido.
function Svg({ size = 15, style, children }: { size?: number; style?: CSSProperties; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      style={style}
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

// Ícone da condição do tempo — tom neutro (herda a cor do texto), sóbrio.
function ConditionIcon({ cond, size = 15, style }: { cond?: string; size?: number; style?: CSSProperties }) {
  switch (cond) {
    case "clear":
      return (
        <Svg size={size} style={style}>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
        </Svg>
      );
    case "partly":
      return (
        <Svg size={size} style={style}>
          <circle cx="8.5" cy="7.5" r="2.7" />
          <path d="M8.5 2.6v1.5M3.4 7.5h1.5M4.9 4.9l1 1M13.1 4.9l-1 1" />
          <path d="M7 18.5h8.5a3 3 0 0 0 .2-6A4 4 0 0 0 8 12.4 3.2 3.2 0 0 0 7 18.5z" />
        </Svg>
      );
    case "rain":
      return (
        <Svg size={size} style={style}>
          <path d="M6.5 14.5h9.8a3.3 3.3 0 0 0 .3-6.6A4.5 4.5 0 0 0 7.8 6.7 3.5 3.5 0 0 0 6.5 14.5z" />
          <path d="M9 17.5l-1 2.4M12.5 17.5l-1 2.4M16 17.5l-1 2.4" />
        </Svg>
      );
    case "thunderstorm":
      return (
        <Svg size={size} style={style}>
          <path d="M6.5 14h9.8a3.3 3.3 0 0 0 .3-6.6A4.5 4.5 0 0 0 7.8 6.2 3.5 3.5 0 0 0 6.5 14z" />
          <path d="M12.4 14.8l-2.9 4.2h2.2l-1 3.2 3.8-4.9h-2.5z" fill="currentColor" stroke="none" />
        </Svg>
      );
    default:
      return (
        <Svg size={size} style={style}>
          <path d="M6.5 16.5h10a3.5 3.5 0 0 0 .3-7A4.8 4.8 0 0 0 7.7 8 3.7 3.7 0 0 0 6.5 16.5z" />
        </Svg>
      );
  }
}

// Micro-ícones das 4 métricas — cada um carrega a cor da sua aba (via `style`).
function TempIcon({ style }: { style?: CSSProperties }) {
  return (
    <Svg size={13} style={style}>
      <path d="M14 14.9V5.6a2 2 0 1 0-4 0v9.3a3.6 3.6 0 1 0 4 0z" />
    </Svg>
  );
}
function RainDropIcon({ style }: { style?: CSSProperties }) {
  return (
    <Svg size={13} style={style}>
      <path d="M12 3.8c3.1 3.7 4.8 6.2 4.8 8.7a4.8 4.8 0 0 1-9.6 0c0-2.5 1.7-5 4.8-8.7z" />
    </Svg>
  );
}
function WindIcon({ style }: { style?: CSSProperties }) {
  return (
    <Svg size={13} style={style}>
      <path d="M3 8.5h9.5A2.3 2.3 0 1 0 10.2 6.2" />
      <path d="M3 12.5h13a2.3 2.3 0 1 1-2.3 2.3" />
      <path d="M3 16.5h6.5" />
    </Svg>
  );
}
function HumidityIcon({ style }: { style?: CSSProperties }) {
  return (
    <Svg size={13} style={style}>
      <path d="M12 3.8c3.1 3.7 4.8 6.2 4.8 8.7a4.8 4.8 0 0 1-9.6 0c0-2.5 1.7-5 4.8-8.7z" />
      <path d="M8.4 13.4h7.2" />
    </Svg>
  );
}
const mIco = (color: string): CSSProperties => ({ color, verticalAlign: "-2px", marginRight: 3 });

export default function HourlyForecastWidget({ forecast, place }: HourlyForecastWidgetProps) {
  const [tab, setTab] = useState<MetricTab>("temp");
  const [viewMode, setViewMode] = useState<ViewMode>("graph");

  if (!forecast || !forecast.hourly || forecast.hourly.length === 0) {
    return (
      <div className="hourly-widget-container">
        <div className="muted" style={{ padding: 20, textAlign: "center" }}>
          Carregando gráficos de previsão hora a hora…
        </div>
      </div>
    );
  }

  const points = forecast.hourly;
  const locationName = place || forecast.location.label || "Sua Localização";
  const labels = points.map((p) => p.hourLabel);

  // Helper para seta de direção do vento
  const getWindArrow = (deg?: number) => {
    if (deg == null) return "↑";
    const directions = ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"];
    return directions[Math.round(deg / 45) % 8];
  };

  // Cor sóbria e coesa por métrica (paleta BI validada — temp/chuva/vento/umidade).
  const getTabConfig = () => {
    switch (tab) {
      case "temp":
        return {
          title: "Temperatura",
          unit: "°C",
          unitTick: "°",
          borderColor: "#d95926",
          fillBgColor: "rgba(217, 89, 38, 0.08)",
          data: points.map((p) => p.tempC),
        };
      case "rain":
        return {
          title: "Chuva",
          unit: " mm",
          unitTick: "",
          borderColor: "#3987e5",
          fillBgColor: "rgba(57, 135, 229, 0.08)",
          data: points.map((p) => p.precipMm ?? 0),
        };
      case "wind":
        return {
          title: "Vento",
          unit: " km/h",
          unitTick: "",
          borderColor: "#199e70",
          fillBgColor: "rgba(25, 158, 112, 0.08)",
          data: points.map((p) => p.windKmh ?? 0),
        };
      case "humidity":
        return {
          title: "Umidade",
          unit: "%",
          unitTick: "%",
          borderColor: "#9085e9",
          fillBgColor: "rgba(144, 133, 233, 0.1)",
          data: points.map((p) => p.humidity ?? 0),
        };
    }
  };

  const cfg = getTabConfig();

  // Linha fina e limpa; ponto aparece só no hover (estilo dashboard/BI).
  const chartData = {
    labels,
    datasets: [
      {
        label: cfg.title,
        data: cfg.data,
        borderColor: cfg.borderColor,
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        backgroundColor: cfg.fillBgColor,
        pointStyle: "circle",
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: cfg.borderColor,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 1.5,
        pointHitRadius: 14,
      },
    ],
  };

  // Config enxuta estilo dashboard/BI: sem legenda (série única), sem rótulo em
  // cada ponto, sem títulos de eixo redundantes; grid discreto e eixos neutros.
  const AXIS = "#94a3b8";
  const GRID = "rgba(148, 163, 184, 0.16)";
  const FONT = "Inter, system-ui, sans-serif";
  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 24, bottom: 2, left: 2, right: 10 } },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      datalabels: {
        display: true,
        align: "top" as const,
        anchor: "end" as const,
        offset: 4,
        color: cfg.borderColor,
        font: { family: FONT, weight: "bold", size: 11 },
        formatter: (value, context) => {
          const idx = context.dataIndex;
          const p = points[idx];
          if (tab === "temp") return `${value}°C`;
          if (tab === "rain") return value > 0 ? `${value}mm` : `${p.precipProb}%`;
          if (tab === "wind") return `${value}k/h`;
          if (tab === "humidity") return `${value}%`;
          return value;
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.94)",
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        titleFont: { family: FONT, size: 12, weight: "bold" },
        bodyFont: { family: FONT, size: 12 },
        callbacks: {
          label: (context) => {
            const idx = context.dataIndex;
            const p = points[idx];
            let extra = "";
            if (tab === "rain") extra = ` · prob. ${p.precipProb}%`;
            return `${cfg.title}: ${context.raw}${cfg.unit}${extra}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { color: GRID },
        ticks: {
          color: AXIS,
          font: { family: FONT, size: 11 },
          maxRotation: 0,
          autoSkipPadding: 14,
        },
      },
      y: {
        grid: { color: GRID, drawTicks: false },
        border: { display: false },
        ticks: {
          color: AXIS,
          font: { family: FONT, size: 11 },
          padding: 8,
          maxTicksLimit: 6,
          callback: (val) => `${val}${cfg.unitTick}`,
        },
      },
    },
  };

  return (
    <div className="hourly-widget-container">
      {/* Header com título e alternador Gráfico / Tabela */}
      <div className="hourly-widget-header">
        <h3>Previsão hora a hora em <strong>{locationName}</strong></h3>
        <div className="hourly-view-toggle">
          <button
            className={`view-btn ${viewMode === "graph" ? "active" : ""}`}
            onClick={() => setViewMode("graph")}
          >
            Gráfico
          </button>
          <button
            className={`view-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            Tabela
          </button>
        </div>
      </div>

      {/* Abas das 4 Métricas principais */}
      <div className="hourly-tabs-bar">
        <button
          className={`hourly-tab-btn ${tab === "temp" ? "tab-temp-active" : ""}`}
          onClick={() => setTab("temp")}
        >
          <span className="tab-dot" style={{ background: "#d95926" }} />
          Temperatura
        </button>
        <button
          className={`hourly-tab-btn ${tab === "rain" ? "tab-rain-active" : ""}`}
          onClick={() => setTab("rain")}
        >
          <span className="tab-dot" style={{ background: "#3987e5" }} />
          Chuva
        </button>
        <button
          className={`hourly-tab-btn ${tab === "wind" ? "tab-wind-active" : ""}`}
          onClick={() => setTab("wind")}
        >
          <span className="tab-dot" style={{ background: "#199e70" }} />
          Vento
        </button>
        <button
          className={`hourly-tab-btn ${tab === "humidity" ? "tab-hum-active" : ""}`}
          onClick={() => setTab("humidity")}
        >
          <span className="tab-dot" style={{ background: "#9085e9" }} />
          Umidade
        </button>
      </div>

      {/* Modo Gráfico Chart.js com DataLabels + Títulos dos Eixos X e Y + Faixa de Informações por Hora */}
      {viewMode === "graph" ? (
        <div className="hourly-graph-area">
          <div className="hourly-chartjs-container" style={{ height: 270, position: "relative", marginTop: 10 }}>
            <Line data={chartData} options={chartOptions} />
          </div>

          {/* Faixa Horizontal com Todas as Informações (Clima, Temp, Chuva, Vento e Umidade por Hora) */}
          <div className="hourly-chart-info-ribbon">
            {points.map((p) => (
              <div className="info-col-item" key={p.time}>
                <span className="col-hour">{p.hourLabel}</span>
                <span className="col-icon" title={p.conditionLabel}>
                  <ConditionIcon cond={p.condition} />
                </span>
                <span className="col-temp">
                  <TempIcon style={mIco("#d95926")} />{p.tempC}°C
                </span>
                <span className="col-rain" title="Volume e Probabilidade de Chuva">
                  <RainDropIcon style={mIco("#3987e5")} />{p.precipMm ?? 0}mm ({p.precipProb}%)
                </span>
                <span className="col-wind" title="Velocidade e Direção do Vento">
                  <WindIcon style={mIco("#199e70")} />{p.windKmh ?? 0}k/h {getWindArrow(p.windDirDeg)}
                </span>
                <span className="col-hum" title="Umidade Relativa">
                  <HumidityIcon style={mIco("#9085e9")} />{p.humidity ?? 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Modo Tabela */
        <div className="hourly-table-wrap">
          <table className="hourly-data-table">
            <thead>
              <tr>
                <th>Horário</th>
                <th>Condição</th>
                <th>Temperatura</th>
                <th>Chuva (mm / %)</th>
                <th>Vento (km/h & Direção)</th>
                <th>Umidade</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.time}>
                  <td><strong>{p.hourLabel}</strong></td>
                  <td>
                    <span style={{ marginRight: 6, verticalAlign: "-3px", display: "inline-block" }}>
                      <ConditionIcon cond={p.condition} size={16} />
                    </span>
                    {p.conditionLabel || p.condition}
                  </td>
                  <td><strong>{p.tempC}°C</strong></td>
                  <td>{p.precipMm ?? 0} mm ({p.precipProb}%)</td>
                  <td>{p.windKmh ?? 0} km/h {getWindArrow(p.windDirDeg)}</td>
                  <td>{p.humidity ?? 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
