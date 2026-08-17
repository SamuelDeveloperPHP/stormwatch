import { useEffect, useRef, useState } from "react";
import { fetchForecast, fetchLightning, fetchSafetyBatch, type Coords, type SafetyPoint } from "./api.ts";
import type { Forecast, MonitorSnapshot, SiteSafety, StrikeFilter } from "./types.ts";
import StormMap from "./components/StormMap.tsx";
import { ForecastPanel, IntensitySummaryPanel, StatusPanel, StrikeList, AllLocationsSummaryPanel, calculateSiteSafety, liveAllClear, fmtCountdownShort, moreSevereLevel } from "./components/Panels.tsx";
import TermsModal from "./components/TermsModal.tsx";
import ConsentGate from "./components/ConsentGate.tsx";
import StrikeInfoModal from "./components/StrikeInfoModal.tsx";
import LandingPage from "./components/LandingPage.tsx";
import LocationsPanel from "./components/LocationsPanel.tsx";
import { generateLaudoPDF } from "./b2bModules.ts";
import {
  type MonitorSite,
  loadSites,
  saveSites,
  canGenerateReportToday,
  markReportGenerated,
} from "./locations.ts";
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

  // Segurança POR LOCAL (geolocalização "geo" + cada local salvo), calculada pelo
  // backend a partir do armazém de 30 min. Guardamos o instante da resposta para
  // descontar a contagem regressiva ao vivo entre os polls de 30s.
  const [safetyById, setSafetyById] = useState<Record<string, SiteSafety>>({});
  const [safetyMeta, setSafetyMeta] = useState<{ feedOk: boolean; fetchedAt: number } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  // Espelha a lista de locais para o tick de polling (criado uma vez) não ficar
  // preso à lista inicial.
  const sitesRef = useRef<MonitorSite[]>([]);

  // Estado para alternar entre Landing Page Comercial e o Monitor ao Vivo
  const [viewMode, setViewMode] = useState<"landing" | "monitor">("landing");

  // Estado para o tema Dark / Light
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("stormwatch_theme") as "dark" | "light") || "light";
  });

  // Estado para armazenar previsões de tempo de cada local monitorado
  const [siteForecasts, setSiteForecasts] = useState<Record<string, Forecast>>({});
  // Snapshot de raios por local monitorado (para "raios recentes" por cidade)
  const [siteSnapshots, setSiteSnapshots] = useState<Record<string, MonitorSnapshot>>({});

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

  // Aceite obrigatório dos Termos — exibido UMA VEZ POR SESSÃO (sessionStorage):
  // reaparece a cada nova visita/aba, mas não reincomoda ao recarregar em uso.
  const [consentAccepted, setConsentAccepted] = useState(() => {
    try {
      return sessionStorage.getItem("stormwatch_consent") === "1";
    } catch {
      return false;
    }
  });
  const acceptConsent = () => {
    try {
      sessionStorage.setItem("stormwatch_consent", "1");
    } catch {
      /* modo privado pode bloquear o storage — segue aceito nesta sessão */
    }
    setConsentAccepted(true);
  };

  // Enquanto o portão está aberto: trava a rolagem de fundo e esconde os botões
  // flutuantes (ex.: "Falar com Consultor"), pra nada ficar por cima do aceite.
  useEffect(() => {
    document.documentElement.classList.toggle("consent-locked", !consentAccepted);
    return () => document.documentElement.classList.remove("consent-locked");
  }, [consentAccepted]);

  async function tick() {
    try {
      const c = coordsRef.current;
      const [snap, fc] = await Promise.all([fetchLightning(c), fetchForecast(c)]);
      setSnapshot(snap);
      setForecast(fc);
      setError(null);

      // Segurança + contagem de tudo-limpo de todos os locais numa só chamada.
      // Vem DEPOIS do fetchLightning (que já alimentou o armazém com a área do
      // usuário). Uma falha aqui não derruba o resto da tela.
      try {
        const points: SafetyPoint[] = [
          { id: "geo", lat: snap.location.lat, lon: snap.location.lon },
          ...sitesRef.current.map((s) => ({
            id: s.id,
            lat: s.lat,
            lon: s.lon,
            criticalRadiusKm: s.criticalRadiusKm,
            alertRadiusKm: s.alertRadiusKm,
          })),
        ];
        const batch = await fetchSafetyBatch(points);
        setSafetyById(batch.results);
        setSafetyMeta({ feedOk: batch.feedOk, fetchedAt: Date.now() });
      } catch {
        /* mantém o último estado; a UI cai no fallback espacial por local */
      }
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

  // Tique de 1s só para a contagem regressiva descer suave entre os polls de 30s.
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
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

  const geoNote = GEO_NOTE[geo];

  // Locais de monitoramento (até 3, salvos localmente) + gaveta lateral
  const [sites, setSites] = useState<MonitorSite[]>(() => loadSites());
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [isLocationsOpen, setIsLocationsOpen] = useState(false);
  const [reportUsedToday, setReportUsedToday] = useState(() => !canGenerateReportToday());

  useEffect(() => {
    saveSites(sites);
    sitesRef.current = sites;
  }, [sites]);

  // Busca previsão + raios do local selecionado e mantém atualizado (mesmo passo
  // do polling) enquanto ele estiver selecionado — assim os "raios recentes"
  // refletem a cidade escolhida em tempo real.
  useEffect(() => {
    if (!selectedSiteId) return;
    const site = sites.find((s) => s.id === selectedSiteId);
    if (!site) return;

    let alive = true;
    const load = () => {
      fetchForecast({ lat: site.lat, lon: site.lon })
        .then((fc) => {
          if (alive) setSiteForecasts((prev) => ({ ...prev, [site.id]: fc }));
        })
        .catch(() => {});
      fetchLightning({ lat: site.lat, lon: site.lon })
        .then((snap) => {
          if (alive) setSiteSnapshots((prev) => ({ ...prev, [site.id]: snap }));
        })
        .catch(() => {});
    };

    load();
    const id = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [selectedSiteId, sites]);

  const handleGenerateReport = (site: MonitorSite | null) => {
    if (!canGenerateReportToday()) {
      setReportUsedToday(true);
      return;
    }
    generateLaudoPDF(snapshot, site ?? undefined);
    markReportGenerated();
    setReportUsedToday(true);
  };

  // Estado para controlar expansão / colapso do painel esquerdo de alertas
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);

  const toggleLeftPanel = () => {
    setIsLeftPanelOpen((prev) => !prev);
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 150);
  };

  // Estado para alternar entre Mapa e Painéis no celular (mobile)
  const [mobileTab, setMobileTab] = useState<"map" | "panels">("map");

  // Recalcula o mapa Leaflet sempre que a aba mobile mudo para mapa
  useEffect(() => {
    if (mobileTab === "map") {
      const t = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 150);
      return () => clearTimeout(t);
    }
  }, [mobileTab]);

  // Determina o local ativo para o painel esquerdo
  const activeSite = selectedSiteId ? sites.find((s) => s.id === selectedSiteId) : null;
  const activeForecast = activeSite ? (siteForecasts[activeSite.id] || null) : forecast;
  const activeSnapshot = activeSite ? (siteSnapshots[activeSite.id] || null) : snapshot;
  const activeName = activeSite ? `${activeSite.name} (${activeSite.category})` : (place || snapshot?.location.label || "Sua Geolocalização");

  // Segurança do local ativo: preferimos o cálculo do backend POR LOCAL (traz a
  // contagem de tudo-limpo). Enquanto o 1º batch não chega, caímos no cálculo
  // espacial local (locais salvos) ou no estado autoritativo do servidor (geo).
  const activeSafetyId = selectedSiteId ?? "geo";
  const activeBackendSafety = safetyById[activeSafetyId] ?? null;
  const activeSafety = activeBackendSafety
    ? activeBackendSafety
    : activeSite
    ? calculateSiteSafety(
        activeSite.lat,
        activeSite.lon,
        activeSite.criticalRadiusKm,
        activeSite.alertRadiusKm,
        snapshot?.strikes ?? [],
        snapshot?.regionStrikes ?? []
      )
    : snapshot?.safety
    ? {
        level:
          snapshot.safety.level === "init" || snapshot.safety.level === "degraded"
            ? ("degraded" as const)
            : (snapshot.safety.level as "safe" | "danger"),
        closestKm: snapshot.safety.closestKm,
        inZoneCount: snapshot.safety.inZoneCount,
        triggerKm: snapshot.safety.triggerKm,
      }
    : null;
  const activeAllClear = activeBackendSafety
    ? liveAllClear(activeBackendSafety.allClearInSec, safetyMeta?.fetchedAt ?? 0, nowMs)
    : null;

  // Fail-safe global: coletor sem sucesso recente, ou nossa última leitura de
  // segurança ficou obsoleta (> 90s) => "monitoramento indisponível".
  const safetyStale = !!safetyMeta && nowMs - safetyMeta.fetchedAt > 90_000;
  const degraded = !!error || (safetyMeta ? !safetyMeta.feedOk : false) || safetyStale;

  // Sufixo de contagem regressiva para os chips de local (só quando em perigo).
  const chipCountdown = (s: SiteSafety | undefined): string => {
    if (!s || s.level !== "danger") return "";
    const cd = liveAllClear(s.allClearInSec, safetyMeta?.fetchedAt ?? 0, nowMs);
    return cd != null && cd > 0 ? ` · ⏳ ${fmtCountdownShort(cd)}` : "";
  };

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
        {!consentAccepted && <ConsentGate onAccept={acceptConsent} onOpenTerms={openTerms} />}
        <TermsModal
          isOpen={isTermsOpen}
          onClose={() => setIsTermsOpen(false)}
          defaultTab={termsTab}
        />
      </>
    );
  }

  return (
    <div className={`app mobile-view-${mobileTab} ${!isLeftPanelOpen ? "left-collapsed" : ""}`}>
      <header className="topbar">
        <div className="brand" onClick={() => setViewMode("landing")} style={{ cursor: "pointer" }}>
          <span className="brand-dot" />
          StormWatch
          <span className="brand-badge">LIVE GOES-19</span>
        </div>

        <div className="topbar-loc">
          <span className="loc-pin" aria-hidden="true">📍</span>
          <strong>{activeName}</strong>
          {snapshot && (
            <span className="loc-coords">
              | {activeSite ? `lat.: ${activeSite.lat.toFixed(4)}, long.: ${activeSite.lon.toFixed(4)}` : `geolocalização lat.: ${snapshot.location.lat.toFixed(4)}, long.: ${snapshot.location.lon.toFixed(4)}`}
            </span>
          )}
        </div>

        <div className="topbar-actions">
          <button
            className="theme-toggle-btn"
            onClick={toggleLeftPanel}
            style={{ background: isLeftPanelOpen ? "#0284c7" : "#10b981", color: "#ffffff", border: "none", fontWeight: 700 }}
            title={isLeftPanelOpen ? "Ocultar Painel de Alertas" : "Exibir Painel de Alertas"}
          >
            ☰ {isLeftPanelOpen ? "Ocultar Painel" : "Exibir Painel"}
          </button>
          <button
            className="theme-toggle-btn"
            onClick={() => setIsLocationsOpen((v) => !v)}
            style={{ background: "var(--bg-elev)", color: "var(--ink)", border: "1px solid var(--line)", fontWeight: 700 }}
            title="Locais de monitoramento"
          >
            📍 Locais ({sites.length})
          </button>
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

      <aside className={`sidebar ${!isLeftPanelOpen ? "left-collapsed" : ""}`}>
        <div className="sidebar-col sidebar-col1">
          {error && <div className="error-banner">{error}</div>}
          {geoNote && <div className="geo-note">{geoNote}</div>}

          {/* Barra de Seleção de Localidades */}
          <div className="location-nav-header card">
            <div className="location-nav-label">
              <span>📍 LOCAL SELECIONADO:</span>
              <button className="location-manage-btn" onClick={() => setIsLocationsOpen(true)}>
                ☰ Gerenciar
              </button>
            </div>
            <div className="location-tabs-scroll">
              {(() => {
                const geo = safetyById["geo"];
                const dotColor = geo?.level === "danger" ? "red" : geo?.level === "alert" ? "yellow" : "green";
                return (
                  <button
                    className={`location-tab-chip ${selectedSiteId === null ? "active" : ""}`}
                    onClick={() => setSelectedSiteId(null)}
                  >
                    <span className={`tab-status-dot ${dotColor}`} />
                    🟢 Sua Geolocalização{chipCountdown(geo)}
                  </button>
                );
              })()}
              {sites.map((site) => {
                // Nível = o mais severo entre a detecção espacial regional e a do
                // backend (que traz a contagem). A contagem vem do backend (sv).
                const sv = safetyById[site.id];
                const spatial = calculateSiteSafety(
                  site.lat,
                  site.lon,
                  site.criticalRadiusKm,
                  site.alertRadiusKm,
                  snapshot?.strikes ?? [],
                  snapshot?.regionStrikes ?? []
                );
                const level = moreSevereLevel(sv?.level, spatial.level);
                const dotColor = level === "danger" ? "red" : level === "alert" ? "yellow" : "green";

                return (
                  <button
                    key={site.id}
                    className={`location-tab-chip ${selectedSiteId === site.id ? "active" : ""}`}
                    onClick={() => setSelectedSiteId(site.id)}
                  >
                    <span className={`tab-status-dot ${dotColor}`} />
                    📍 {site.name}{chipCountdown(sv)}
                  </button>
                );
              })}
            </div>
          </div>

          <StatusPanel
            safety={activeSafety}
            allClearInSec={activeAllClear}
            degraded={degraded}
            locationName={activeSite ? activeSite.name : undefined}
          />

          <IntensitySummaryPanel snapshot={activeSnapshot} onOpenInfo={() => setIsInfoOpen(true)} />

          <ForecastPanel forecast={activeForecast} place={activeName} />

          <AllLocationsSummaryPanel
            userPlace={place || snapshot?.location.label || "Sua Geolocalização"}
            userSafety={snapshot?.safety}
            userWeather={forecast?.current}
            sites={sites}
            strikes={snapshot?.strikes ?? []}
            regionStrikes={snapshot?.regionStrikes ?? []}
            selectedId={selectedSiteId}
            onSelectSite={setSelectedSiteId}
            onOpenAdd={() => setIsLocationsOpen(true)}
            safetyById={safetyById}
            safetyFetchedAt={safetyMeta?.fetchedAt ?? 0}
            nowMs={nowMs}
          />
        </div>

        <div className="sidebar-col sidebar-col2">
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className={`open-locations-btn ${!isLeftPanelOpen ? "collapsed" : ""}`}
              onClick={toggleLeftPanel}
              style={{ flex: 1, background: isLeftPanelOpen ? "#0284c7" : "#10b981" }}
              title={isLeftPanelOpen ? "Ocultar Painel Esquerdo" : "Exibir Painel Esquerdo"}
            >
              ☰ {isLeftPanelOpen ? "Ocultar Painel" : "Exibir Painel"}
            </button>
            <button
              className="open-locations-btn"
              onClick={() => setIsLocationsOpen(true)}
              style={{ background: "var(--bg-elev)", color: "var(--ink)", border: "1px solid var(--line)" }}
              title="Locais de Monitoramento & Relatório"
            >
              📍 Locais ({sites.length})
            </button>
          </div>

          <StrikeList
            snapshot={activeSnapshot}
            filter={strikeFilter}
            onFilterChange={setStrikeFilter}
            onOpenInfo={() => setIsInfoOpen(true)}
            activeSite={activeSite}
            userLocationName={place || snapshot?.location.label || "Sua Geolocalização"}
          />
          <p className="muted">
            Raios: NOAA GOES-19 GLM (tempo quase real, América do Sul). Previsão:
            Open-Meteo. Alertas saem por webhook genérico.
          </p>
          <p className="safety-disclaimer">
            ⚠️ Ferramenta de <strong>apoio à decisão</strong>. Não substitui os
            protocolos de segurança do local, os alertas oficiais da Defesa
            Civil/INMET nem a avaliação de profissional habilitado. Fonte única
            (GOES-19), incerteza de ~10&nbsp;km e latência de 1–2&nbsp;min. Parar ou
            retomar atividades é responsabilidade do usuário.
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

      <StormMap snapshot={snapshot} filter={strikeFilter} theme={theme} sites={sites} selectedSiteId={selectedSiteId} />

      {!consentAccepted && <ConsentGate onAccept={acceptConsent} onOpenTerms={openTerms} />}

      <TermsModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        defaultTab={termsTab}
      />

      <StrikeInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />

      <LocationsPanel
        isOpen={isLocationsOpen}
        onClose={() => setIsLocationsOpen(false)}
        sites={sites}
        onSitesChange={setSites}
        selectedId={selectedSiteId}
        onSelect={setSelectedSiteId}
        onGenerateReport={handleGenerateReport}
        reportAvailable={!reportUsedToday}
      />
    </div>
  );
}





