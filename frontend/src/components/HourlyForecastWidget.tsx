import { useState } from "react";
import type { Forecast } from "../types.ts";

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

  // Helpers para min/max para escalar gráficos SVG
  const values = points.map((p) => {
    if (tab === "temp") return p.tempC;
    if (tab === "rain") return p.precipMm ?? 0;
    if (tab === "wind") return p.windKmh ?? 0;
    return p.humidity ?? 0;
  });

  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, tab === "temp" ? 30 : tab === "rain" ? 10 : tab === "wind" ? 50 : 100);
  const range = maxVal - minVal || 1;

  // Converte ângulo em seta de direção do vento
  const getWindArrow = (deg?: number) => {
    if (deg == null) return "↑";
    const directions = ["↓", "↙", "←", "↖", "↑", "↗", "→", "↘"];
    return directions[Math.round(deg / 45) % 8];
  };

  const getTabColor = () => {
    if (tab === "temp") return "#dc2626";
    if (tab === "rain") return "#0284c7";
    if (tab === "wind") return "#65a30d";
    return "#0369a1";
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
          🌧️ Chuva
        </button>
        <button
          className={`hourly-tab-btn ${tab === "wind" ? "tab-wind-active" : ""}`}
          onClick={() => setTab("wind")}
        >
          💨 Vento
        </button>
        <button
          className={`hourly-tab-btn ${tab === "humidity" ? "tab-hum-active" : ""}`}
          onClick={() => setTab("humidity")}
        >
          💧 Umidade
        </button>
      </div>

      {/* Conteúdo: Modo Gráfico */}
      {viewMode === "graph" ? (
        <div className="hourly-graph-wrap">
          <svg className="hourly-svg-chart" viewBox="0 0 700 180" preserveAspectRatio="none">
            {/* Linha do gráfico SVG */}
            <path
              d={points
                .map((_, idx) => {
                  const val = values[idx];
                  const x = (idx / (points.length - 1)) * 660 + 20;
                  const y = 140 - ((val - minVal) / range) * 90;
                  return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
                })
                .join(" ")}
              fill="none"
              stroke={getTabColor()}
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Pontos no gráfico */}
            {points.map((p, idx) => {
              const val = values[idx];
              const x = (idx / (points.length - 1)) * 660 + 20;
              const y = 140 - ((val - minVal) / range) * 90;
              return (
                <g key={p.time}>
                  <circle cx={x} cy={y} r="4" fill={getTabColor()} stroke="#ffffff" strokeWidth="2" />
                </g>
              );
            })}
          </svg>

          {/* Rótulos dos valores acima da linha */}
          <div className="hourly-graph-labels">
            {points.map((p) => {
              return (
                <div key={p.time} className="hourly-point-label">

                  {tab === "temp" && (
                    <>
                      <span className="point-icon">
                        {p.condition === "thunderstorm"
                          ? "⛈️"
                          : p.condition === "rain"
                          ? "🌧️"
                          : p.condition === "partly"
                          ? "⛅"
                          : p.condition === "clear"
                          ? "☀️"
                          : "☁️"}
                      </span>
                      <strong style={{ color: getTabColor() }}>{p.tempC}°C</strong>
                    </>
                  )}
                  {tab === "rain" && (
                    <strong style={{ color: getTabColor() }}>
                      {p.precipMm ?? 0}mm <small style={{ display: "block", fontSize: 9 }}>({p.precipProb}%)</small>
                    </strong>
                  )}
                  {tab === "wind" && (
                    <>
                      <span className="wind-arrow">{getWindArrow(p.windDirDeg)}</span>
                      <strong style={{ color: getTabColor() }}>{p.windKmh ?? 0}km/h</strong>
                    </>
                  )}
                  {tab === "humidity" && <strong style={{ color: getTabColor() }}>{p.humidity ?? 0}%</strong>}

                  <span className="point-time">{p.hourLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Conteúdo: Modo Tabela */
        <div className="hourly-table-wrap">
          <table className="hourly-data-table">
            <thead>
              <tr>
                <th>Horário</th>
                <th>Condição</th>
                <th>Temperatura</th>
                <th>Chuva (mm / %)</th>
                <th>Vento</th>
                <th>Umidade</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.time}>
                  <td><strong>{p.hourLabel}</strong></td>
                  <td>{p.conditionLabel || p.condition}</td>
                  <td>{p.tempC}°C</td>
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
