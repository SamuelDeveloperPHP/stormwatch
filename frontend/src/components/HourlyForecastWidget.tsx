import { useState } from "react";
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

  const getConditionIcon = (cond?: string) => {
    if (cond === "thunderstorm") return "⛈️";
    if (cond === "rain") return "🌧️";
    if (cond === "partly") return "⛅";
    if (cond === "clear") return "☀️";
    return "☁️";
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
                <span className="col-icon" title={p.conditionLabel}>{getConditionIcon(p.condition)}</span>
                <span className="col-temp">{p.tempC}°C</span>
                <span className="col-rain" title="Volume e Probabilidade de Chuva">
                  🌧️ {p.precipMm ?? 0}mm ({p.precipProb}%)
                </span>
                <span className="col-wind" title="Velocidade e Direção do Vento">
                  💨 {p.windKmh ?? 0}k/h {getWindArrow(p.windDirDeg)}
                </span>
                <span className="col-hum" title="Umidade Relativa">
                  💧 {p.humidity ?? 0}%
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
                    <span style={{ marginRight: 6 }}>{getConditionIcon(p.condition)}</span>
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
