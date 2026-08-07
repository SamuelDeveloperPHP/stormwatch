import type { Forecast, MonitorSnapshot } from "../types.ts";
import HourlyForecastWidget from "./HourlyForecastWidget.tsx";

interface LandingPageProps {
  onOpenApp: () => void;
  onOpenTerms: (tab: "terms" | "privacy") => void;
  place?: string;
  snapshot?: MonitorSnapshot | null;
  forecast?: Forecast | null;
}

/** Emoji para uma condição climática (evita repetir o ternário no JSX). */
const conditionEmoji = (condition?: string): string => {
  switch (condition) {
    case "thunderstorm":
      return "⛈️";
    case "rain":
      return "🌧️";
    case "partly":
      return "⛅";
    case "clear":
      return "☀️";
    default:
      return "☁️";
  }
};

export default function LandingPage({
  onOpenApp,
  onOpenTerms,
  place,
  snapshot,
  forecast,
}: LandingPageProps) {
  const scrollToPricing = () => {
    const el = document.getElementById("pricing-section");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const current = forecast?.current;

  return (
    <div className="landing-container">
      {/* Top Navbar */}
      <nav className="landing-nav">
        <div className="brand">
          <span className="brand-dot" />
          StormWatch <span className="brand-badge">B2B & Live</span>
        </div>

        <div className="landing-nav-links">
          <a href="#weather-section">Previsão Tempo</a>
          <a href="#use-cases">Casos de Uso</a>
          <a href="#pricing-section">Planos & Preços</a>
          <button className="terms-trigger-btn" onClick={() => onOpenTerms("terms")}>
            Termos
          </button>
        </div>

        <button className="btn-primary-glow" onClick={onOpenApp}>
          ⚡ Abrir Monitor Ao Vivo
        </button>
      </nav>

      {/* Hero Section Header */}
      <header className="hero-section">
        <div className="hero-badge">
          <span className="hero-pulse" /> SATÉLITE NOAA GOES-19 EM TEMPO REAL
        </div>
        <h1 className="hero-title">
          Prevenção Meteorológica de <span className="text-gradient">Alta Precisão</span>
        </h1>
        <p className="hero-subtitle">
          Monitore descargas atmosféricas em tempo real, proteja suas equipes no campo,
          automatize alertas de paralisação e gere laudos de força maior para seguradoras.
        </p>
        <div className="hero-cta-group">
          <button className="btn-hero-primary" onClick={onOpenApp}>
            ⚡ Acessar Monitor Gratuito
          </button>
          <button className="btn-hero-secondary" onClick={scrollToPricing}>
            💼 Ver Planos B2B para Empresas
          </button>
        </div>
      </header>

      {/* Live Metrics Teaser Bar (Logo abaixo da Hero Section) */}
      <div className="hero-stats-bar-wrapper">
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
            <span className="stat-label">Conformidade Operacional</span>
          </div>
        </div>
      </div>

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
          {/* Barra Horizontal Responsiva: Todas as informações do Tempo Agora na Mesma Linha */}
          <div className="hero-weather-now-inline">
            <div className="now-inline-loc-badge">
              <span className="loc-pin" aria-hidden="true">📍</span>
              <div className="now-inline-loc-text">
                <strong>{place || snapshot?.location.label || "Curitiba, PR - Brasil"}</strong>
                <span className="now-subloc-tag">
                  {snapshot ? ` (${snapshot.location.lat.toFixed(2)}, ${snapshot.location.lon.toFixed(2)})` : ""}
                </span>
              </div>
              <span className="hero-weather-live-tag">TEMPO AGORA</span>

              {/* Badge de Alerta Operacional B2B */}
              <span
                className={`operational-status-pill ${
                  current?.condition === "thunderstorm" || current?.condition === "rain"
                    ? "status-risk"
                    : "status-safe"
                }`}
              >
                {current?.condition === "thunderstorm"
                  ? "🔴 Alerta NR-18: Risco de Raios / Paralisação"
                  : current?.condition === "rain"
                  ? "🟡 Atenção: Janela de Chuva no Campo"
                  : "🟢 Janela Operacional Segura"}
              </span>
            </div>

            {current ? (
              <div className="now-inline-weather-data">
                <div className="now-inline-temp-cond">
                  <span className="now-inline-icon">{conditionEmoji(current.condition)}</span>
                  <span className="now-inline-temp">{current.tempC}°C</span>
                  <span className="now-inline-cond">{current.conditionLabel}</span>
                </div>

                <div className="now-inline-pills-group">
                  <span className="weather-pill">🌡️ Sensação <strong>{current.feelsLikeC}°C</strong></span>
                  <span className="weather-pill">💧 Umidade <strong>{current.humidity}%</strong></span>
                  <span className="weather-pill">💨 Vento <strong>{current.windKmh} km/h</strong></span>
                </div>
              </div>
            ) : (
              <div className="muted" style={{ fontSize: 13 }}>Carregando dados meteorológicos em tempo real…</div>
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

                  <div className="daily-card-icon">{conditionEmoji(day.condition)}</div>
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
                      <span>🌧️ Chuva:</span>
                      <strong>{day.precipSumMm} mm ({day.precipProbMax}%)</strong>
                    </div>
                    <div className="daily-metric-row">
                      <span>💨 Vento Máx:</span>
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
            <div className="use-case-icon">🏗️</div>
            <h3>Construção Civil & Gruas</h3>
            <p>
              Alertas de paralisação automática para trabalhos em andaimes, estaiamento e operação de guindastes conforme norma NR-18.
            </p>
            <ul>
              <li>✓ Alertas por raio de aproximação (8 km / 15 km)</li>
              <li>✓ Medição de vento em altitude para gruas</li>
              <li>✓ Validação de janelas secas para concretagem</li>
            </ul>
          </div>

          <div className="use-case-card">
            <div className="use-case-icon">🎪</div>
            <h3>Shows & Eventos ao Ar Livre</h3>
            <p>
              Proteção de multidões, palcos e estruturas temporárias. Cronômetro "Tudo Limpo" para retomada segura da programação.
            </p>
            <ul>
              <li>✓ Cronômetro de liberação (All-Clear 30 min)</li>
              <li>✓ Alertas de rajadas repentinas de vento</li>
              <li>✓ Disparo de emergência para brigadistas</li>
            </ul>
          </div>

          <div className="use-case-card">
            <div className="use-case-icon">🏭</div>
            <h3>Mineração, Portos & Energia</h3>
            <p>
              Monitoramento de pátios de estocagem, linhas de transmissão de alta tensão e pátios de conteineres contra raios destrutivos.
            </p>
            <ul>
              <li>✓ Análise de pico de amperagem em kA</li>
              <li>✓ Separação de raios Nuvem-Solo (CG)</li>
              <li>✓ Laudos de paralisação por Força Maior</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing-section" className="landing-section pricing-bg">

        <div className="section-header">
          <h2>Escolha o Plano Ideal para a Sua Operação</h2>
          <p>Do acesso gratuito para cidadãos a soluções enterprise com emissão de laudos.</p>
        </div>

        <div className="pricing-grid">
          {/* Free Tier */}
          <div className="pricing-card">
            <div className="pricing-header">
              <span className="plan-badge plan-badge--free">Comunitário</span>
              <h3>Plano Gratuito</h3>
              <div className="price-box">
                <span className="price-currency">R$</span>
                <span className="price-amount">0</span>
                <span className="price-period">/ mês</span>
              </div>
              <p className="plan-desc">Acesso público para cidadãos e entusiastas da meteorologia.</p>
            </div>

            <ul className="plan-features">
              <li>✔️ Feed ao vivo NOAA GOES-19 GLM</li>
              <li>✔️ Mapa interativo de radar (120 km)</li>
              <li>✔️ Análise básica de amperagem (kA)</li>
              <li>✔️ Previsão do tempo Open-Meteo</li>
              <li className="disabled">❌ Alertas automáticos via WhatsApp/SMS</li>
              <li className="disabled">❌ Relatório em PDF por Força Maior</li>
            </ul>

            <button className="btn-plan-action btn-plan-action--free" onClick={onOpenApp}>
              Acessar Grátis Agora
            </button>
          </div>

          {/* B2B Pro Tier (Featured) */}
          <div className="pricing-card pricing-card--featured">
            <div className="featured-ribbon">MAIS POPULAR PARA OBRAS E EVENTOS</div>
            <div className="pricing-header">
              <span className="plan-badge plan-badge--pro">B2B Profissional</span>
              <h3>Obras & Eventos</h3>
              <div className="price-box">
                <span className="price-currency">R$</span>
                <span className="price-amount">299</span>
                <span className="price-period">/ mês por local</span>
              </div>
              <p className="plan-desc">Ideal para canteiros de obras, produtores de shows e arenas.</p>
            </div>

            <ul className="plan-features">
              <li>✔️ <strong>Tudo do Plano Gratuito +</strong></li>
              <li>✔️ Geofencing por Obra/Local (8 km e 15 km)</li>
              <li>✔️ <strong>Disparo no WhatsApp & SMS</strong> para equipes</li>
              <li>✔️ Cronômetro "Tudo Limpo" (30 min)</li>
              <li>✔️ Alertas de vento em altitude e rajadas</li>
              <li>✔️ Suporte técnico prioritário</li>
            </ul>

            <button className="btn-plan-action btn-plan-action--pro" onClick={onOpenApp}>
              Testar Grátis por 14 Dias
            </button>
          </div>

          {/* Enterprise Tier */}
          <div className="pricing-card">
            <div className="pricing-header">
              <span className="plan-badge plan-badge--enterprise">Enterprise</span>
              <h3>Multi-Sítios & Corporativo</h3>
              <div className="price-box">
                <span className="price-amount" style={{ fontSize: 28 }}>Sob Consulta</span>
              </div>
              <p className="plan-desc">Para grandes construtoras, concessionárias e multi-eventos.</p>
            </div>

            <ul className="plan-features">
              <li>✔️ <strong>Tudo do Plano B2B +</strong></li>
              <li>✔️ Monitoramento de múltiplos locais no mesmo painel</li>
              <li>✔️ <strong>Laudo em PDF de Força Maior</strong> para seguradoras</li>
              <li>✔️ API dedicada de integração (Webhooks/REST)</li>
              <li>✔️ Gerente de conta dedicado & SLA 24/7</li>
            </ul>

            <button className="btn-plan-action btn-plan-action--enterprise" onClick={() => alert("Entre em contato com nossa equipe comercial pelo e-mail: comercial@nexocore.com.br")}>
              Falar com Consultor
            </button>
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
        <span className="whatsapp-icon">💬</span>
        <span className="whatsapp-text">Falar com Consultor</span>
      </a>
    </div>
  );
}

