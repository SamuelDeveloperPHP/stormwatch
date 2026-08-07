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

type MetricTab = "temp" | "rain" | "wind" | "humidity" | "all";
type ViewMode = "graph" | "table";

export default function HourlyForecastWidget({ forecast, place }: HourlyForecastWidgetProps) {
  const [tab, setTab] = useState<MetricTab>("temp");
  const [viewMode, setViewMode] = useState<ViewMode>("graph");
  const [selectedHourIdx, setSelectedHourIdx] = useState<number | null>(null);

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

  // Converte ângulo em seta de direção do vento
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

  // Configurações por aba
  const getMetricConfig = () => {
    switch (tab) {
      case "temp":
        return {
          title: "Temperatura (°C)",
          unit: "°C",
          borderColor: "#dc2626",
          pointBgColor: "rgba(220, 38, 38, 0.45)",
          pointBorderColor: "#dc2626",
          fillBgColor: "rgba(220, 38, 38, 0.12)",
          data: points.map((p) => p.tempC),
        };
      case "rain":
        return {
          title: "Chuva (mm)",
          unit: " mm",
          borderColor: "#0284c7",
          pointBgColor: "rgba(2, 132, 199, 0.45)",
          pointBorderColor: "#0284c7",
          fillBgColor: "rgba(2, 132, 199, 0.12)",
          data: points.map((p) => p.precipMm ?? 0),
        };
      case "wind":
        return {
          title: "Vento (km/h)",
          unit: " km/h",
          borderColor: "#65a30d",
          pointBgColor: "rgba(101, 163, 13, 0.45)",
          pointBorderColor: "#65a30d",
          fillBgColor: "rgba(101, 163, 13, 0.12)",
          data: points.map((p) => p.windKmh ?? 0),
        };
      case "humidity":
        return {
          title: "Umidade (%)",
          unit: "%",
          borderColor: "#0369a1",
          pointBgColor: "rgba(3, 105, 161, 0.45)",
          pointBorderColor: "#0369a1",
          fillBgColor: "rgba(3, 105, 161, 0.12)",
          data: points.map((p) => p.humidity ?? 0),
        };
      default:
        return {
          title: "Temperatura (°C)",
          unit: "°C",
          borderColor: "#dc2626",
          pointBgColor: "rgba(220, 38, 38, 0.45)",
          pointBorderColor: "#dc2626",
          fillBgColor: "rgba(220, 38, 38, 0.12)",
          data: points.map((p) => p.tempC),
        };
    }
  };

  const cfg = getMetricConfig();

  // Dataset do Chart.js com DataLabels flutuantes e Point Styling oficial
  const singleDataset = {
    label: cfg.title,
    data: cfg.data,
    borderColor: cfg.borderColor,
    borderWidth: 3,
    tension: 0.38,
    fill: true,
    backgroundColor: cfg.fillBgColor,

    // Point Styling (Oficial Chart.js Sample)
    pointStyle: "circle",
    pointRadius: (ctx: any) => (ctx.dataIndex === selectedHourIdx ? 13 : 9),
    pointHoverRadius: 15,
    pointBackgroundColor: (ctx: any) =>
      ctx.dataIndex === selectedHourIdx ? cfg.borderColor : cfg.pointBgColor,
    pointBorderColor: cfg.pointBorderColor,
    pointBorderWidth: 2.5,
  };

  const multiDatasets = [
    {
      label: "Temperatura (°C)",
      data: points.map((p) => p.tempC),
      borderColor: "#dc2626",
      borderWidth: 3,
      tension: 0.35,
      pointStyle: "circle",
      pointRadius: 6,
      pointBackgroundColor: "rgba(220, 38, 38, 0.4)",
      pointBorderColor: "#dc2626",
      yAxisID: "y",
    },
    {
      label: "Chuva (mm)",
      data: points.map((p) => p.precipMm ?? 0),
      borderColor: "#0284c7",
      borderWidth: 2,
      tension: 0.35,
      pointStyle: "circle",
      pointRadius: 6,
      pointBackgroundColor: "rgba(2, 132, 199, 0.4)",
      pointBorderColor: "#0284c7",
      yAxisID: "y1",
    },
    {
      label: "Vento (km/h)",
      data: points.map((p) => p.windKmh ?? 0),
      borderColor: "#65a30d",
      borderWidth: 2,
      tension: 0.35,
      pointStyle: "circle",
      pointRadius: 6,
      pointBackgroundColor: "rgba(101, 163, 13, 0.4)",
      pointBorderColor: "#65a30d",
      yAxisID: "y",
    },
    {
      label: "Umidade (%)",
      data: points.map((p) => p.humidity ?? 0),
      borderColor: "#0369a1",
      borderWidth: 2,
      tension: 0.35,
      pointStyle: "circle",
      pointRadius: 6,
      pointBackgroundColor: "rgba(3, 105, 161, 0.4)",
      pointBorderColor: "#0369a1",
      yAxisID: "y",
    },
  ];

  const chartData = {
    labels,
    datasets: tab === "all" ? multiDatasets : [singleDataset],
  };

  // Opções Chart.js com DataLabels ativados acima de cada ponto
  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 28, // Espaço para os rótulos de dados flutuantes acima
        bottom: 10,
        left: 10,
        right: 10,
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
        display: tab !== "all",
        align: "top" as const,
        anchor: "end" as const,
        offset: 6,
        color: cfg.borderColor,
        font: { family: "Inter, system-ui, sans-serif", weight: "bold", size: 11 },
        formatter: (value, context) => {
          const idx = context.dataIndex;
          const p = points[idx];
          if (tab === "temp") return `${value}°`;
          if (tab === "rain") return value > 0 ? `${value}mm` : `${p.precipProb}%`;
          if (tab === "wind") return `${value}k/h`;
          if (tab === "humidity") return `${value}%`;
          return value;
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleFont: { size: 13, weight: "bold" },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          title: (items) => {
            if (!items.length) return "";
            const idx = items[0].dataIndex;
            const p = points[idx];
            return `📅 Previsão às ${p.hourLabel} — ${p.conditionLabel || p.condition}`;
          },
          label: (context) => {
            const idx = context.dataIndex;
            const p = points[idx];
            return [
              `🌡️ Temp: ${p.tempC}°C (Sensação ${p.feelsLikeC ?? p.tempC}°C)`,
              `🌧️ Chuva: ${p.precipMm ?? 0} mm (${p.precipProb}% de chance)`,
              `💨 Vento: ${p.windKmh ?? 0} km/h ${getWindArrow(p.windDirDeg)}`,
              `💧 Umidade: ${p.humidity ?? 0}%`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(150, 150, 150, 0.08)" },
        ticks: { font: { family: "Inter, system-ui, sans-serif", size: 11 } },
      },
      y: {
        display: tab !== "all",
        grid: { color: "rgba(150, 150, 150, 0.08)" },
        ticks: { font: { family: "Inter, system-ui, sans-serif", size: 11 } },
      },
      y1: {
        display: tab === "all",
        position: "right" as const,
        grid: { drawOnChartArea: false },
        ticks: { font: { family: "Inter, system-ui, sans-serif", size: 10 } },
      },
    },
  };

  return (
    <div className="hourly-widget-container">
      {/* Header com título e alternador Gráfico / Tabela */}
      <div className="hourly-widget-header">
        <div>
          <h3>Previsão hora a hora em <strong>{locationName}</strong></h3>
          <p className="hourly-widget-subtext">
            Clique nas abas ou passe o mouse nos pontos para inspecionar parâmetros em tempo real.
          </p>
        </div>

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

      {/* Abas das Métricas */}
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
        <button
          className={`hourly-tab-btn ${tab === "all" ? "tab-all-active" : ""}`}
          onClick={() => setTab("all")}
        >
          📊 Visão Completa
        </button>
      </div>

      {/* Carrossel de Cards com Informações Detalhadas Hora a Hora */}
      <div className="hourly-carousel-ribbon">
        {points.map((p, idx) => (
          <div
            key={p.time}
            className={`hourly-card-pill ${selectedHourIdx === idx ? "selected" : ""}`}
            onClick={() => setSelectedHourIdx(idx === selectedHourIdx ? null : idx)}
          >
            <span className="pill-time">{p.hourLabel}</span>
            <span className="pill-icon">{getConditionIcon(p.condition)}</span>
            <span className="pill-temp">{p.tempC}°C</span>
            
            <div className="pill-details">
              <span className="pill-rain" title="Volume e probabilidade de chuva">
                🌧️ {p.precipMm ?? 0}mm ({p.precipProb}%)
              </span>
              <span className="pill-wind" title="Velocidade e direção do vento">
                💨 {p.windKmh ?? 0}km/h {getWindArrow(p.windDirDeg)}
              </span>
              <span className="pill-hum" title="Umidade relativa">
                💧 {p.humidity ?? 0}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Conteúdo: Modo Gráfico Chart.js com DataLabels */}
      {viewMode === "graph" ? (
        <div className="hourly-chartjs-wrapper">
          <div className="hourly-chartjs-container" style={{ height: 280, position: "relative" }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      ) : (
        /* Conteúdo: Modo Tabela Detalhada */
        <div className="hourly-table-wrap">
          <table className="hourly-data-table">
            <thead>
              <tr>
                <th>Horário</th>
                <th>Condição</th>
                <th>Temperatura</th>
                <th>Sensação</th>
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
                  <td>{p.feelsLikeC ?? p.tempC}°C</td>
                  <td>
                    <span className="badge-rain">{p.precipMm ?? 0} mm</span> ({p.precipProb}%)
                  </td>
                  <td>{p.windKmh ?? 0} km/h <strong>{getWindArrow(p.windDirDeg)}</strong></td>
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
