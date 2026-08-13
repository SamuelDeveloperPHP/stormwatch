import { useState } from "react";
import type { Forecast, MonitorSnapshot } from "../types.ts";
import HourlyForecastWidget from "./HourlyForecastWidget.tsx";
import HeroStormArt from "./HeroStormArt.tsx";
import { CraneIcon, StageEventsIcon, IndustryPortIcon } from "./Icons.tsx";
import {
  ConditionIcon,
  BoltIcon,
  BriefcaseIcon,
  StopIcon,
  WarnIcon,
  ShieldCheckIcon,
  ThermometerIcon,
  HumidityIcon,
  WindIcon,
  RainDropIcon,
  CheckIcon,
  ChatIcon,
} from "./ui-icons.tsx";

interface LandingPageProps {
  onOpenApp: () => void;
  onOpenTerms: (tab: "terms" | "privacy") => void;
  place?: string;
  snapshot?: MonitorSnapshot | null;
  forecast?: Forecast | null;
}

export default function LandingPage({
  onOpenApp,
  onOpenTerms,
  place,
  snapshot,
  forecast,
}: LandingPageProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToPricing = () => {
    const el = document.getElementById("pricing-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const current = forecast?.current;

  return (
    <div className="landing-container">
      {/* Top Navbar */}
      <nav className="landing-nav">
        <div className="landing-nav-header">
          <div className="brand">
            <span className="brand-dot" />
            StormWatch <span className="brand-badge">B2B & Live</span>
          </div>

          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Alternar Menu"
          >
            {isMobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        <div className={`landing-nav-links ${isMobileMenuOpen ? "mobile-open" : ""}`}>
          <a href="#weather-section" onClick={() => setIsMobileMenuOpen(false)}>Previsão Tempo</a>
          <a href="#use-cases" onClick={() => setIsMobileMenuOpen(false)}>Casos de Uso</a>
          <a href="#pricing-section" onClick={() => setIsMobileMenuOpen(false)}>Planos & Preços</a>
          <button className="terms-trigger-btn" onClick={() => { setIsMobileMenuOpen(false); onOpenTerms("terms"); }}>
            Termos
          </button>
          <button className="btn-primary-glow mobile-nav-cta" onClick={() => { setIsMobileMenuOpen(false); onOpenApp(); }}>
            <BoltIcon size={14} style={{ marginRight: 6 }} />Abrir Monitor Ao Vivo
          </button>
        </div>

        <button className="btn-primary-glow desktop-nav-cta" onClick={onOpenApp}>
          <BoltIcon size={14} style={{ marginRight: 6 }} />Abrir Monitor Ao Vivo
        </button>
      </nav>

      {/* Hero Section Header — banner storm-night (visual da capa) */}
      <header className="hero-section">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-badge">
              <span className="hero-pulse" /> SATÉLITE NOAA GOES-19 EM TEMPO REAL
            </div>
            <h1 className="hero-title">
              Prevenção meteorológica de <span className="text-gradient">alta precisão</span>
            </h1>
            <p className="hero-subtitle">
              Monitore descargas atmosféricas em tempo real, proteja suas equipes no
              campo, automatize alertas de paralisação e gere relatórios de telemetria.
            </p>
            <div className="hero-cta-group">
              <button className="btn-hero-primary" onClick={onOpenApp}>
                <BoltIcon size={15} style={{ marginRight: 6 }} />Acessar Monitor Gratuito
              </button>
              <button className="btn-hero-secondary" onClick={scrollToPricing}>
                <BriefcaseIcon size={15} style={{ marginRight: 7 }} />Ver planos
              </button>
            </div>

            <div className="hero-feature-chips">
              <span className="hero-chip"><span className="chip-dot" style={{ background: "#38bdf8" }} />NOAA GOES-19</span>
              <span className="hero-chip"><span className="chip-dot" style={{ background: "#22c55e" }} />Alertas WhatsApp</span>
              <span className="hero-chip"><span className="chip-dot" style={{ background: "#f59e0b" }} />NR-18</span>
              <span className="hero-chip"><span className="chip-dot" style={{ background: "#a78bfa" }} />Relatório PDF</span>
            </div>

            <div className="hero-status-pills">
              <span className="hero-pill hero-pill--stop">
                <StopIcon size={14} style={{ marginRight: 6 }} />PARAR · raio ≤ 8 km
              </span>
              <span className="hero-pill hero-pill--clear">
                <ShieldCheckIcon size={14} style={{ marginRight: 6 }} />LIBERADO · tudo limpo 30 min
              </span>
            </div>
          </div>

          <div className="hero-illustration">
            <HeroStormArt />
          </div>
        </div>

        {/* Live Metrics Teaser Bar (Integrada elegantemente ao Hero) */}
        <div className="hero-stats-bar">
          <div className="stat-item">
            <span className="stat-value">NOAA GOES-19</span>
            <span className="stat-label">Feed Orbital Oficial</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">&lt; 30s</span>
            <span className="stat-label">Latência de Atualização</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">América do Sul</span>
            <span className="stat-label">Cobertura de Satélite</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-value">NR-18 & Defesa Civil</span>
            <span className="stat-label">Apoio à Conformidade</span>
          </div>
        </div>
      </header>

      {/* Seção Principal de Clima (Logo após o Título & CTAs da Hero) */}
      <section id="weather-section" className="landing-section weather-showcase-section">
        {/* Card 1: Tempo Agora + Widget Graficos Hora a Hora */}
        <div
          className={`weather-now-card-full ${
            current?.condition === "thunderstorm"
              ? "card-mood-thunderstorm"
              : current?.condition === "rain"
              ? "card-mood-rain"
              : "card-mood-clear"
          }`}
        >
          {/* Header Estruturado em 2 Níveis para Zero Poluição Visual */}
          <div className="hero-weather-now-container">
            {/* Nível 1: Localização & Status Operacional */}
            <div className="now-card-top-bar">
              <div className="now-loc-info">
                <span className="loc-pin" aria-hidden="true">📍</span>
                <strong className="loc-name">{place || snapshot?.location.label || "Curitiba, PR - Brasil"}</strong>
                {snapshot && (
                  <span className="now-subloc-coords">
                    ({snapshot.location.lat.toFixed(2)}, {snapshot.location.lon.toFixed(2)})
                  </span>
                )}
              </div>

              <div className="now-status-group">
                <span className="hero-weather-live-tag">TEMPO AGORA</span>
                <span
                  className={`operational-status-pill ${
                    current?.condition === "thunderstorm" || current?.condition === "rain"
                      ? "status-risk"
                      : "status-safe"
                  }`}
                >
                  {current?.condition === "thunderstorm" ? (
                    <><StopIcon size={14} style={{ marginRight: 6 }} />Risco de Raios — sugerir paralisação</>
                  ) : current?.condition === "rain" ? (
                    <><WarnIcon size={14} style={{ marginRight: 6 }} />Atenção: Janela de Chuva</>
                  ) : (
                    <><ShieldCheckIcon size={14} style={{ marginRight: 6 }} />Janela Operacional Segura</>
                  )}
                </span>
              </div>
            </div>

            {/* Nível 2: Temperatura Principal & Metadados da Cidade */}
            {current ? (
              <div className="now-card-main-bar">
                <div className="now-temp-block">
                  <span className="now-inline-icon"><ConditionIcon condition={current.condition} size={40} /></span>
                  <div className="now-temp-text">
                    <span className="now-big-temp">{current.tempC}°C</span>
                    <span className="now-cond-desc">{current.conditionLabel}</span>
                  </div>
                </div>

                <div className="now-metrics-cluster">
                  <div className="weather-pill-card">
                    <span className="pill-icon"><ThermometerIcon size={18} style={{ color: "#d95926" }} /></span>
                    <div className="pill-content">
                      <span className="pill-label">Sensação</span>
                      <strong>{current.feelsLikeC}°C</strong>
                    </div>
                  </div>

                  <div className="weather-pill-card">
                    <span className="pill-icon"><HumidityIcon size={18} style={{ color: "#9085e9" }} /></span>
                    <div className="pill-content">
                      <span className="pill-label">Umidade</span>
                      <strong>{current.humidity}%</strong>
                    </div>
                  </div>

                  <div className="weather-pill-card">
                    <span className="pill-icon"><WindIcon size={18} style={{ color: "#199e70" }} /></span>
                    <div className="pill-content">
                      <span className="pill-label">Vento</span>
                      <strong>{current.windKmh} km/h</strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="muted" style={{ fontSize: 13, padding: "10px 0" }}>
                Carregando dados meteorológicos em tempo real…
              </div>
            )}
          </div>

          {/* Gráficos hora a hora com as 4 abas (Temperatura, Chuva mm, Vento, Umidade) */}
          <HourlyForecastWidget forecast={forecast ?? null} place={place} />
        </div>

        {/* Card 2: Previsão para os Próximos 5 Dias */}
        <div className="five-day-card-full" id="5day-forecast" style={{ marginTop: 40 }}>
          <div className="section-header" style={{ marginBottom: 24 }}>
            <h2>Previsão para os Próximos 5 Dias em <strong>{place || snapshot?.location.label || "sua região"}</strong></h2>
            <p>Planejamento de janelas operacionais com precipitação, vento e variação térmica.</p>
          </div>

          <div className="daily-forecast-grid">
            {forecast?.daily && forecast.daily.length > 0 ? (
              forecast.daily.map((day) => (
                <div className="daily-card" key={day.date}>
                  <div className="daily-card-header">
                    <strong>{day.dayLabel}</strong>
                    <span className="daily-card-date">
                      {new Date(day.date + "T00:00:00").toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="daily-card-icon"><ConditionIcon condition={day.condition} size={34} /></div>
                  <div className="daily-card-cond">{day.conditionLabel}</div>

                  <div className="daily-temp-range">
                    <span className="temp-max" title="Temperatura Máxima">
                      ↑ {day.tempMaxC}°C
                    </span>
                    <span className="temp-min" title="Temperatura Mínima">
                      ↓ {day.tempMinC}°C
                    </span>
                  </div>

                  <div className="daily-metrics">
                    <div className="daily-metric-row">
                      <span><RainDropIcon size={13} style={{ marginRight: 5, color: "#3987e5" }} />Chuva:</span>
                      <strong>{day.precipSumMm} mm ({day.precipProbMax}%)</strong>
                    </div>
                    <div className="daily-metric-row">
                      <span><WindIcon size={13} style={{ marginRight: 5, color: "#199e70" }} />Vento Máx:</span>
                      <strong>{day.windKmhMax} km/h</strong>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="muted" style={{ gridColumn: "1 / -1", textAlign: "center", padding: 20 }}>
                Buscando dados de previsão estendida para 5 dias…
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="landing-section">
        <div className="section-header">
          <h2>Soluções Especializadas para Setores de Alto Risco</h2>
          <p>Desenvolvido para gerentes que não podem correr riscos climáticos no campo.</p>
        </div>

        <div className="use-cases-grid">
          <div className="use-case-card">
            <div className="use-case-icon">
              <CraneIcon size={38} color="#0284c7" />
            </div>
            <h3>Construção Civil & Gruas</h3>
            <p>
              Alertas de paralisação para trabalhos em andaimes, estaiamento e operação de guindastes, em apoio à NR-18.
            </p>
            <ul>
              <li><CheckIcon />Alertas por raio de aproximação (8 km / 15 km)</li>
              <li><CheckIcon />Medição de vento em altitude para gruas</li>
              <li><CheckIcon />Validação de janelas secas para concretagem</li>
            </ul>
          </div>

          <div className="use-case-card">
            <div className="use-case-icon">
              <StageEventsIcon size={38} color="#ec4899" />
            </div>
            <h3>Shows & Eventos ao Ar Livre</h3>
            <p>
              Proteção de multidões, palcos e estruturas temporárias. Cronômetro "Tudo Limpo" para retomada segura da programação.
            </p>
            <ul>
              <li><CheckIcon />Cronômetro de liberação (All-Clear 30 min)</li>
              <li><CheckIcon />Alertas de rajadas repentinas de vento</li>
              <li><CheckIcon />Disparo de emergência para brigadistas</li>
            </ul>
          </div>

          <div className="use-case-card">
            <div className="use-case-icon">
              <IndustryPortIcon size={38} color="#f59e0b" />
            </div>
            <h3>Mineração, Portos & Energia</h3>
            <p>
              Monitoramento de pátios de estocagem, linhas de transmissão de alta tensão e pátios de conteineres contra raios destrutivos.
            </p>
            <ul>
              <li><CheckIcon />Densidade e proximidade das descargas</li>
              <li><CheckIcon />Detecção de raio total via satélite (GLM)</li>
              <li><CheckIcon />Relatórios de telemetria de paralisação</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing-section" className="landing-section pricing-bg">

        <div className="section-header">
          <h2>Planos do StormWatch</h2>
          <p>Comece no plano Gratuito — completo para monitorar até 3 locais. Migre para o Pago quando precisar de histórico em banco, relatórios periódicos e integração.</p>
        </div>

        <div className="pricing-grid pricing-grid--two">
          {/* Plano Gratuito */}
          <div className="pricing-card">
            <div className="pricing-header">
              <span className="plan-badge plan-badge--free">Gratuito</span>
              <h3>Plano Gratuito</h3>
              <p className="plan-desc">Tudo para monitorar raios em até 3 locais, sem custo.</p>
            </div>

            <ul className="plan-features">
              <li><CheckIcon />Feed ao vivo NOAA GOES-19 GLM</li>
              <li><CheckIcon />Mapa interativo de radar (você define o raio de cobertura)</li>
              <li><CheckIcon />Contagem e proximidade das descargas</li>
              <li><CheckIcon />Previsão do tempo Open-Meteo</li>
              <li><CheckIcon />Geofencing por local (8 km e 15 km)</li>
              <li><CheckIcon />Cronômetro "Tudo Limpo" (30 min)</li>
              <li><CheckIcon />Alertas de vento em altitude e rajadas</li>
              <li><CheckIcon />Adicionar até 3 localizações</li>
              <li>
                <CheckIcon />Relatório de telemetria em PDF
                <span className="plan-note">
                  Documento meramente informativo. Para valor legal (força maior, seguradoras,
                  fiscalização), requer assinatura de Engenheiro de Segurança do Trabalho com
                  CREA/ART ativo.
                </span>
              </li>
              <li>
                <CheckIcon />Dados guardados por 1 semana
                <span className="plan-note">
                  Salvos apenas no seu navegador e limpos automaticamente toda segunda-feira.
                </span>
              </li>
            </ul>

            <button className="btn-plan-action btn-plan-action--free" onClick={onOpenApp}>
              Acessar Grátis Agora
            </button>
          </div>

          {/* Plano Pago (destaque) */}
          <div className="pricing-card pricing-card--featured">
            <div className="featured-ribbon">MAIS COMPLETO</div>
            <div className="pricing-header">
              <span className="plan-badge plan-badge--pro">Pago</span>
              <h3>Plano Pago</h3>
              <p className="plan-desc">Para operações que precisam de histórico, múltiplos locais e integração.</p>
            </div>

            <ul className="plan-features">
              <li><CheckIcon /><strong>Tudo do plano Gratuito +</strong></li>
              <li>
                <CheckIcon />Relatórios de telemetria em PDF — semanal, mensal e anual
                <span className="plan-note">
                  Meramente informativos. Mesma validação legal por Engenheiro de Segurança do
                  Trabalho com CREA/ART ativo.
                </span>
              </li>
              <li><CheckIcon />Dados armazenados em banco de dados</li>
              <li><CheckIcon />Monitoramento de múltiplos locais no mesmo painel</li>
              <li><CheckIcon /><strong>Relatório de telemetria (força maior)</strong> para seguradoras</li>
              <li><CheckIcon />API dedicada de integração (Webhooks/REST)</li>
              <li><CheckIcon />Gerente de conta dedicado &amp; SLA 24/7</li>
            </ul>

            <a
              href="https://wa.me/5541988885871?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20o%20Plano%20Pago%20do%20StormWatch"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-plan-action btn-plan-action--pro"
              style={{ textDecoration: "none", display: "inline-flex", justifyContent: "center", alignItems: "center" }}
            >
              Falar com Consultor
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="brand">
            <span className="brand-dot" />
            StormWatch Technologies
          </div>
          <p className="muted">
            Sistemas avançados de monitoramento de descargas atmosféricas e segurança climática para empresas, obras e eventos.
          </p>
          <div className="footer-links">
            <button className="terms-trigger-btn" onClick={() => onOpenTerms("terms")}>
              Termos de Uso e Responsabilidade
            </button>
            {" · "}
            <button className="terms-trigger-btn" onClick={() => onOpenTerms("privacy")}>
              Política de Privacidade (LGPD)
            </button>
          </div>
          <p className="copyright">
            © {new Date().getFullYear()} NexoCore Tecnologia LTDA. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/5541988885871?text=Ol%C3%A1%2C%20gostaria%20de%20obter%20mais%20informa%C3%A7%C3%B5es%20sobre%20a%20aplica%C3%A7%C3%A3o%20StormWatch"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float-btn"
        title="Fale conosco no WhatsApp"
      >
        <span className="whatsapp-icon"><ChatIcon size={20} /></span>
        <span className="whatsapp-text">Falar com Consultor</span>
      </a>
    </div>
  );
}

