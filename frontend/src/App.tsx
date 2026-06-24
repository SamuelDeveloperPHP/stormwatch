import { useEffect, useRef, useState } from "react";
import { fetchForecast, fetchLightning, type Coords } from "./api.ts";
import type { Forecast, MonitorSnapshot } from "./types.ts";
import StormMap from "./components/StormMap.tsx";
import { ForecastPanel, StatusPanel, StrikeList } from "./components/Panels.tsx";

const POLL_MS = 15000; // a cada 15s

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
  const timer = useRef<number | null>(null);
  // Ref para que o intervalo de polling sempre use as coordenadas mais recentes
  // sem precisar reiniciar o setInterval quando a localização chega.
  const coordsRef = useRef<Coords | undefined>(undefined);

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

  const geoNote = GEO_NOTE[geo];

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          StormWatch
        </div>
        <div className="topbar-loc">
          {geo === "ok" ? "Minha localização" : snapshot?.location.label ?? "—"}
          {snapshot && (
            <> · atualizado {new Date(snapshot.evaluatedAt).toLocaleTimeString("pt-BR")}</>
          )}
        </div>
      </header>

      <aside className="sidebar">
        {error && <div className="error-banner">{error}</div>}
        {geoNote && <div className="geo-note">{geoNote}</div>}
        <StatusPanel snapshot={snapshot} feedError={!!error} />
        <ForecastPanel forecast={forecast} />
        <StrikeList snapshot={snapshot} />
        <p className="muted">
          Raios: NOAA GOES-19 GLM (tempo quase real, América do Sul). Previsão:
          Open-Meteo. Alertas saem por webhook genérico.
        </p>
      </aside>

      <StormMap snapshot={snapshot} />
    </div>
  );
}
