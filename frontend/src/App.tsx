import { useEffect, useRef, useState } from "react";
import { fetchForecast, fetchLightning, type Coords } from "./api.ts";
import type { Forecast, MonitorSnapshot, StrikeFilter } from "./types.ts";
import StormMap from "./components/StormMap.tsx";
import { ForecastPanel, IntensitySummaryPanel, StatusPanel, StrikeList } from "./components/Panels.tsx";
import TermsModal from "./components/TermsModal.tsx";
import StrikeInfoModal from "./components/StrikeInfoModal.tsx";

import LandingPage from "./components/LandingPage.tsx";
import { HomeIcon, SunIcon, MoonIcon } from "./components/ui-icons.tsx";

const POLL_MS = 30000; // a cada 30s (casa com o polling da NOAA no ingestor)

type GeoState = "pending" | "ok" | "denied" | "unsupported";

const GEO_NOTE: Record<GeoState, string | null> = {
  pending: "Obtendo sua localização…",
  ok: null,
  denied: "Localização negada — usando o local padrão do servidor.",
  unsupported: "Geolocalização indisponível — usando o local padrão do servidor.",
};

export default function App() {
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeoState>("pending");
  // Cidade/estado derivados das coordenadas (reverse geocoding).
  const [place, setPlace] = useState<string>("");
  const timer = useRef<number | null>(null);
  // Ref para que o intervalo de polling sempre use as coordenadas mais recentes
  // sem precisar reiniciar o setInterval quando a localização chega.
  const coordsRef = useRef<Coords | undefined>(undefined);

  // Estado para alternar entre Landing Page Comercial e o Monitor ao Vivo
  const [viewMode, setViewMode] = useState<"landing" | "monitor">("landing");

  // Estado para o tema Dark / Light
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("stormwatch_theme") as "dark" | "light") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("stormwatch_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // Estado para filtro de exibição de raios no mapa e lista
  const [strikeFilter, setStrikeFilter] = useState<StrikeFilter>("all");

  // Estado para controle do modal de Termos de Uso e Privacidade
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [termsTab, setTermsTab] = useState<"terms" | "privacy">("terms");

  // Estado para controle do modal educativo "Guia de Raios"
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const openTerms = (tab: "terms" | "privacy" = "terms") => {
    setTermsTab(tab);
    setIsTermsOpen(true);
  };

  async function tick() {
    try {
      const c = coordsRef.current;
      const [snap, fc] = await Promise.all([fetchLightning(c), fetchForecast(c)]);
      setSnapshot(snap);
      setForecast(fc);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao buscar dados");
    }
  }

  // Captura a geolocalização do usuário uma vez. Em localhost/HTTPS o navegador
  // pede permissão; se negada/indisponível, seguimos com o ponto padrão do backend.
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeo("unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coordsRef.current = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setGeo("ok");
        tick(); // refaz a busca imediatamente já com a localização do usuário
      },
      (err) => {
        setGeo(err.code === err.PERMISSION_DENIED ? "denied" : "unsupported");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  // Polling: começa de imediato (com o local padrão) e segue a cada POLL_MS.
  useEffect(() => {
    tick();
    timer.current = window.setInterval(tick, POLL_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  // Reverse geocoding: transforma lat/lon em "Cidade, UF" (API gratuita, sem chave).
  // Só refaz quando as coordenadas mudam (não a cada polling).
  const lat = snapshot?.location.lat;
  const lon = snapshot?.location.lon;
  useEffect(() => {
    if (lat == null || lon == null) return;
    const ctrl = new AbortController();
    fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`,
      { signal: ctrl.signal }
    )
      .then((r) => r.json())
      .then((d) => {
        const adm = d.localityInfo?.administrative || [];
        // Município (adminLevel 8 no Brasil) é a "cidade"; cai para locality/city.
        const city =
          adm.find((a: { adminLevel: number; name: string }) => a.adminLevel === 8)
            ?.name ||
          d.locality ||
          d.city ||
          "";
        const uf =
          (d.principalSubdivisionCode || "").split("-").pop() ||
          d.principalSubdivision ||
          "";
        const country = d.countryName || "";
        const cityUf = [city, uf].filter(Boolean).join(", ");
        setPlace([cityUf, country].filter(Boolean).join(" - "));
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [lat, lon]);

  // Estado para alternar entre Mapa e Painéis no celular (mobile)
  const [mobileTab, setMobileTab] = useState<"map" | "panels">("map");

  if (viewMode === "landing") {
    return (
      <>
        <LandingPage
          onOpenApp={() => setViewMode("monitor")}
          onOpenTerms={openTerms}
          place={place}
          snapshot={snapshot}
          forecast={forecast}
        />
        <TermsModal
          isOpen={isTermsOpen}
          onClose={() => setIsTermsOpen(false)}
          defaultTab={termsTab}
        />
      </>
    );
  }

  return (
    <div className={`app mobile-view-${mobileTab}`}>
      <header className="topbar">
        <div className="brand" onClick={() => setViewMode("landing")} style={{ cursor: "pointer" }}>
          <span className="brand-dot" />
          StormWatch
          <span className="brand-badge">LIVE GOES-19</span>
        </div>

        <div className="topbar-loc">
          <span className="loc-pin" aria-hidden="true">📍</span>
          <strong>{place || snapshot?.location.label || "—"}</strong>
          {snapshot && (
            <span className="loc-coords">
              | geolocalização lat.:{" "}
              {snapshot.location.lat.toFixed(4)}, long.: {snapshot.location.lon.toFixed(4)}
            </span>
          )}
        </div>

        <div className="topbar-actions">
          <button
            className="theme-toggle-btn"
            onClick={() => setViewMode("landing")}
            title="Voltar para a página inicial"
          >
            <HomeIcon size={15} style={{ marginRight: 6 }} />Início / Planos
          </button>
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title="Alternar entre tema escuro e claro"
          >
            {theme === "dark" ? (
              <><SunIcon size={15} style={{ marginRight: 6 }} />Modo Claro</>
            ) : (
              <><MoonIcon size={15} style={{ marginRight: 6 }} />Modo Escuro</>
            )}
          </button>
          <div className="topbar-time">
            {snapshot && (
              <>
                <span className="topbar-time-value">
                  {new Date(snapshot.evaluatedAt).toLocaleTimeString("pt-BR")}
                </span>
                <span className="topbar-time-note">
                  Atualizado a cada 30s
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Seletor de Abas para Celular (Mobile) */}
      <div className="mobile-app-tabs">
        <button
          className={`mobile-tab-btn ${mobileTab === "map" ? "active" : ""}`}
          onClick={() => setMobileTab("map")}
        >
          🗺️ Mapa de Raios Ao Vivo
        </button>
        <button
          className={`mobile-tab-btn ${mobileTab === "panels" ? "active" : ""}`}
          onClick={() => setMobileTab("panels")}
        >
          ⚡ Alertas & Previsão
        </button>
      </div>

      <aside className="sidebar">
        <div className="sidebar-col sidebar-col1">
          {error && <div className="error-banner">{error}</div>}
          {geoNote && <div className="geo-note">{geoNote}</div>}
          <StatusPanel snapshot={snapshot} feedError={!!error} />
          <IntensitySummaryPanel snapshot={snapshot} onOpenInfo={() => setIsInfoOpen(true)} />
          <ForecastPanel forecast={forecast} />
        </div>

        <div className="sidebar-col sidebar-col2">
          <StrikeList
            snapshot={snapshot}
            filter={strikeFilter}
            onFilterChange={setStrikeFilter}
            onOpenInfo={() => setIsInfoOpen(true)}
          />
          <p className="muted">
            Raios: NOAA GOES-19 GLM (tempo quase real, América do Sul). Previsão:
            Open-Meteo. Alertas saem por webhook genérico.
          </p>
          <details className="terms">
            <summary>Termos de uso e responsabilidade</summary>
            <p>
              Este serviço é fornecido gratuitamente “como está”, apenas como apoio informativo,
              sem garantia de precisão, disponibilidade ou tempo real. As decisões de
              segurança são de <strong>responsabilidade exclusiva do usuário</strong> e não
              substituem protocolos oficiais da Defesa Civil.
            </p>
            <p style={{ marginTop: 8 }}>
              <button className="terms-trigger-btn" onClick={() => openTerms("terms")}>
                Ver Termos de Uso
              </button>
              {" · "}
              <button className="terms-trigger-btn" onClick={() => openTerms("privacy")}>
                Política de Privacidade
              </button>
            </p>
          </details>
          <p className="copyright">
            © {new Date().getFullYear()} NexoCore Tecnologia LTDA. Todos os direitos
            reservados.
          </p>
        </div>
      </aside>

      <StormMap snapshot={snapshot} filter={strikeFilter} theme={theme} />

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        defaultTab={termsTab}
      />

      <StrikeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />
    </div>
  );
}





