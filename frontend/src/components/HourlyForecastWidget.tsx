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

  // Configurações por aba (Cores e Point Styling oficiais Chart.js)
  const getTabConfig = () => {
    switch (tab) {
      case "temp":
        return {
          title: "Temperatura (°C)",
          unit: "°C",
          borderColor: "#dc2626",
          pointBgColor: "rgba(220, 38, 38, 0.4)",
          pointBorderColor: "#dc2626",
          fillBgColor: "rgba(220, 38, 38, 0.08)",
          data: points.map((p) => p.tempC),
        };
      case "rain":
        return {
          title: "Chuva (mm)",
          unit: " mm",
          borderColor: "#0284c7",
          pointBgColor: "rgba(2, 132, 199, 0.4)",
          pointBorderColor: "#0284c7",
          fillBgColor: "rgba(2, 132, 199, 0.08)",
          data: points.map((p) => p.precipMm ?? 0),
        };
      case "wind":
        return {
          title: "Vento (km/h)",
          unit: " km/h",
          borderColor: "#65a30d",
          pointBgColor: "rgba(101, 163, 13, 0.4)",
          pointBorderColor: "#65a30d",
          fillBgColor: "rgba(101, 163, 13, 0.08)",
          data: points.map((p) => p.windKmh ?? 0),
        };
      case "humidity":
        return {
          title: "Umidade (%)",
          unit: "%",
          borderColor: "#0369a1",
          pointBgColor: "rgba(3, 105, 161, 0.4)",
          pointBorderColor: "#0369a1",
          fillBgColor: "rgba(3, 105, 161, 0.08)",
          data: points.map((p) => p.humidity ?? 0),
        };
    }
  };

  const cfg = getTabConfig();

  // Dados do Chart.js com Point Styling oficial
  const chartData = {
    labels,
    datasets: [
      {
        label: cfg.title,
        data: cfg.data,
        borderColor: cfg.borderColor,
        borderWidth: 3,
        tension: 0.35,
        fill: true,
        backgroundColor: cfg.fillBgColor,
        pointStyle: "circle",
        pointRadius: 9,
        pointHoverRadius: 15,
        pointBackgroundColor: cfg.pointBgColor,
        pointBorderColor: cfg.pointBorderColor,
        pointBorderWidth: 2.5,
      },
    ],
  };

  // Opções do Chart.js com DataLabels ativados flutuando sobre os pontos
  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 26, // Espaço extra no topo do gráfico para os números não cortarem
        bottom: 8,
      },
    },
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          font: { family: "Inter, system-ui, sans-serif", size: 12, weight: 600 },
        },
      },
      datalabels: {
        display: true,
        align: "top" as const,
        anchor: "end" as const,
        offset: 5,
        color: cfg.borderColor,
        font: { family: "Inter, system-ui, sans-serif", weight: "bold", size: 12 },
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
        callbacks: {
          label: (context) => {
            const idx = context.dataIndex;
            const p = points[idx];
            let extra = "";
            if (tab === "rain") extra = ` (Prob. ${p.precipProb}%)`;
            return `${cfg.title}: ${context.raw}${cfg.unit}${extra}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(150, 150, 150, 0.1)" },
        ticks: { font: { family: "Inter, system-ui, sans-serif", size: 11, weight: "bold" } },
      },
      y: {
        grid: { color: "rgba(150, 150, 150, 0.1)" },
        ticks: { font: { family: "Inter, system-ui, sans-serif", size: 11 } },
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
            📈 Gráfico
          </button>
          <button
            className={`view-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
          >
            📑 Tabela
          </button>
        </div>
      </div>

      {/* Abas das 4 Métricas principais */}
      <div className="hourly-tabs-bar">
        <button
          className={`hourly-tab-btn ${tab === "temp" ? "tab-temp-active" : ""}`}
          onClick={() => setTab("temp")}
        >
          🌡️ Temperatura
        </button>
        <button
          className={`hourly-tab-btn ${tab === "rain" ? "tab-rain-active" : ""}`}
          onClick={() => setTab("rain")}
        >
          🌧️ Chuva (mm & %)
        </button>
        <button
          className={`hourly-tab-btn ${tab === "wind" ? "tab-wind-active" : ""}`}
          onClick={() => setTab("wind")}
        >
          💨 Vento (km/h & Direção)
        </button>
        <button
          className={`hourly-tab-btn ${tab === "humidity" ? "tab-hum-active" : ""}`}
          onClick={() => setTab("humidity")}
        >
          💧 Umidade (%)
        </button>
      </div>

      {/* Modo Gráfico Chart.js com DataLabels + Faixa de Informações por Hora */}
      {viewMode === "graph" ? (
        <div className="hourly-graph-area">
          <div className="hourly-chartjs-container" style={{ height: 250, position: "relative", marginTop: 10 }}>
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
