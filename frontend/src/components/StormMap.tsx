import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import L from "leaflet";
import type { MonitorSnapshot, Strike, StrikeFilter } from "../types.ts";
import type { MonitorSite } from "../locations.ts";
import { BoltIcon, CloudIcon } from "./ui-icons.tsx";

// Ícone de Marcador Padrão (Azul) para Canteiros / Locais cadastrados.
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Ícone VERDE vibrante exclusivo para a Geolocalização do Usuário
const userMarkerIcon = L.divIcon({
  className: "user-green-marker",
  html: `<svg viewBox="0 0 24 36" width="28" height="42" aria-hidden="true" style="filter: drop-shadow(0 2px 8px rgba(16,185,129,0.7));">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12zm0 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="#10b981" stroke="#047857" stroke-width="1.2"/>
    <circle cx="12" cy="12" r="4" fill="#ffffff"/>
  </svg>`,
  iconSize: [28, 42],
  iconAnchor: [14, 42],
  popupAnchor: [0, -38],
});

// Função utilitária para distância Haversine em km
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Ícone de RELÂMPAGO para cada raio (marcação no mapa).
// Raios dentro dos canteiros/locais cadastrados assumem a cor AMARELA (#facc15).
const BOLT_PATH = "M7 2v11h3v9l7-12h-4l4-8z";
function boltIcon(near: boolean, ampKa: number, isSiteStrike: boolean = false) {
  const amp = Math.abs(ampKa || 0);
  let color = isSiteStrike ? "#facc15" : near ? "#ef4444" : "#f59e0b"; // Amarelo vívido para raios em canteiros cadastrados
  if (!isSiteStrike && amp >= 40) {
    color = "#dc2626";
  }

  const scale = isSiteStrike ? 22 : amp >= 40 ? 24 : amp >= 20 ? 20 : 16;
  const anchor = Math.round(scale / 2);

  return L.divIcon({
    className: "bolt-marker",
    html: `<svg viewBox="0 0 24 24" width="${scale}" height="${scale}" aria-hidden="true"><path d="${BOLT_PATH}" fill="${color}" stroke="#111827" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
    iconSize: [scale, scale],
    iconAnchor: [anchor, scale - 1],
  });
}

/** Glifo de relâmpago usado na legenda. */
function BoltGlyph({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" style={{ flex: "none" }}>
      <path d={BOLT_PATH} fill={color} stroke="#111827" strokeWidth={1.2} strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Camada de incidência (toda a América do Sul) em UM ÚNICO canvas.
 */
function IncidenceFlashLayer({ points }: { points: [number, number][] }) {
  const map = useMap();
  const pointsRef = useRef<[number, number][]>(points);
  const dirtyRef = useRef(true);

  useEffect(() => {
    pointsRef.current = points;
    dirtyRef.current = true;
  }, [points]);

  useEffect(() => {
    const container = map.getContainer();
    const canvas = L.DomUtil.create("canvas", "incidence-flash") as HTMLCanvasElement;
    Object.assign(canvas.style, {
      position: "absolute",
      top: "0",
      left: "0",
      zIndex: "450",
      pointerEvents: "none",
    });
    container.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let dpr = 1;
    let projected: { x: number; y: number; ph: number }[] = [];

    function resize() {
      const size = map.getSize();
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(size.x * dpr);
      canvas.height = Math.round(size.y * dpr);
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
      dirtyRef.current = true;
    }

    function project() {
      const size = map.getSize();
      const pts = pointsRef.current;
      const out: { x: number; y: number; ph: number }[] = [];
      for (let i = 0; i < pts.length; i++) {
        const cp = map.latLngToContainerPoint(pts[i]);
        if (cp.x < -8 || cp.y < -8 || cp.x > size.x + 8 || cp.y > size.y + 8) continue;
        out.push({ x: cp.x, y: cp.y, ph: (i % 3) * 0.3 });
      }
      projected = out;
      dirtyRef.current = false;
    }

    function draw(tsec: number) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let k = 0; k < projected.length; k++) {
        const p = projected[k];
        const a = reduceMotion
          ? 1
          : 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(((tsec + p.ph) / 0.9) * Math.PI * 2));
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#f5009e";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#111827";
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    resize();
    project();

    let raf = 0;
    let detach = () => {};

    if (reduceMotion) {
      const redraw = () => {
        if (dirtyRef.current) project();
        draw(0);
      };
      redraw();
      map.on("move zoom viewreset resize", redraw);
      detach = () => map.off("move zoom viewreset resize", redraw);
    } else {
      const markDirty = () => {
        dirtyRef.current = true;
      };
      const onResize = () => resize();
      const hide = () => {
        canvas.style.visibility = "hidden";
      };
      const show = () => {
        canvas.style.visibility = "visible";
        dirtyRef.current = true;
      };
      map.on("move viewreset", markDirty);
      map.on("resize", onResize);
      map.on("zoomstart", hide);
      map.on("zoomend", show);
      const loop = (now: number) => {
        if (dirtyRef.current) project();
        draw(now / 1000);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      detach = () => {
        map.off("move viewreset", markDirty);
        map.off("resize", onResize);
        map.off("zoomstart", hide);
        map.off("zoomend", show);
      };
    }

    return () => {
      cancelAnimationFrame(raf);
      detach();
      container.removeChild(canvas);
    };
  }, [map]);

  return null;
}

/**
 * Varredura de RADAR/SONAR.
 */
function RadarSweepLayer({
  center,
  strikes,
  radiusKm,
}: {
  center: [number, number];
  strikes: Strike[];
  radiusKm: number;
}) {
  const map = useMap();
  const centerRef = useRef(center);
  const strikesRef = useRef(strikes);
  const radiusRef = useRef(radiusKm);
  useEffect(() => {
    centerRef.current = center;
  }, [center]);
  useEffect(() => {
    strikesRef.current = strikes;
  }, [strikes]);
  useEffect(() => {
    radiusRef.current = radiusKm;
  }, [radiusKm]);

  useEffect(() => {
    const MAX_KM = 120;
    const PERIOD_MS = 5200;
    const container = map.getContainer();
    const canvas = L.DomUtil.create("canvas", "radar-sweep") as HTMLCanvasElement;
    Object.assign(canvas.style, {
      position: "absolute",
      top: "0",
      left: "0",
      zIndex: "445",
      pointerEvents: "none",
    });
    container.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let dpr = 1;
    function resize() {
      const size = map.getSize();
      dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(size.x * dpr);
      canvas.height = Math.round(size.y * dpr);
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
    }
    resize();

    function draw(now: number) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const [lat, lon] = centerRef.current;
      const c = map.latLngToContainerPoint([lat, lon]);
      // Limita o comprimento da linha de radar ao raio específico do local (radiusKm)
      const currentRadiusKm = radiusRef.current || 8;
      const north = map.latLngToContainerPoint([lat + currentRadiusKm / 111, lon]);
      const rPx = Math.hypot(north.x - c.x, north.y - c.y);

      const theta = reduceMotion ? -Math.PI / 4 : ((now % PERIOD_MS) / PERIOD_MS) * Math.PI * 2;
      const tx = (a: number) => c.x + rPx * Math.sin(a);
      const ty = (a: number) => c.y - rPx * Math.cos(a);

      if (!reduceMotion) {
        const N = 26;
        const SPREAD = Math.PI * 0.4;
        ctx.lineWidth = 3;
        for (let k = N; k >= 1; k--) {
          const a = theta - (k / N) * SPREAD;
          ctx.strokeStyle = `rgba(37, 99, 235, ${0.14 * (1 - k / N)})`;
          ctx.beginPath();
          ctx.moveTo(c.x, c.y);
          ctx.lineTo(tx(a), ty(a));
          ctx.stroke();
        }
      }

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#38bdf8";
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(tx(theta), ty(theta));
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#2563eb";
      ctx.fill();

      if (!reduceMotion) {
        const FADE = Math.PI * 0.5;
        const cosLat = Math.cos((lat * Math.PI) / 180);
        const radius = radiusRef.current;
        for (const s of strikesRef.current) {
          const beta = Math.atan2((s.lon - lon) * cosLat, s.lat - lat);
          let phase = (theta - beta) % (Math.PI * 2);
          if (phase < 0) phase += Math.PI * 2;
          const intensity = 1 - phase / FADE;
          if (intensity <= 0.02) continue;
          const p = map.latLngToContainerPoint([s.lat, s.lon]);
          const rgb = s.distanceKm <= radius ? "239, 68, 68" : "245, 158, 11";
          const rad = 5 + 16 * intensity;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
          g.addColorStop(0, `rgba(${rgb}, ${0.6 * intensity})`);
          g.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    let raf = 0;
    const onResize = () => resize();
    const hide = () => {
      canvas.style.visibility = "hidden";
    };
    const show = () => {
      canvas.style.visibility = "visible";
    };
    map.on("resize", onResize);
    map.on("zoomstart", hide);
    map.on("zoomend", show);

    if (reduceMotion) {
      const redraw = () => draw(0);
      redraw();
      map.on("move zoom viewreset resize", redraw);
      return () => {
        map.off("resize", onResize);
        map.off("zoomstart", hide);
        map.off("zoomend", show);
        map.off("move zoom viewreset resize", redraw);
        container.removeChild(canvas);
      };
    }

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      map.off("resize", onResize);
      map.off("zoomstart", hide);
      map.off("zoomend", show);
      container.removeChild(canvas);
    };
  }, [map]);

  return null;
}

function RecenterMap({ selectedSiteId, sites }: { selectedSiteId?: string | null; sites: MonitorSite[] }) {
  const map = useMap();
  const lastSelectedRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Voo de recenteamento do mapa EXCLUSIVAMENTE quando o usuario seleciona um novo local
    if (selectedSiteId && selectedSiteId !== lastSelectedRef.current) {
      const site = sites.find((s) => s.id === selectedSiteId);
      if (site) {
        map.flyTo([site.lat, site.lon], Math.max(map.getZoom(), 9), { duration: 1.2 });
      }
    }
    lastSelectedRef.current = selectedSiteId;
  }, [selectedSiteId, sites, map]);

  return null;
}

interface Props {
  snapshot: MonitorSnapshot | null;
  filter?: StrikeFilter;
  theme?: "dark" | "light";
  sites?: MonitorSite[];
  selectedSiteId?: string | null;
}

export default function StormMap({ snapshot, filter = "all", theme = "dark", sites = [], selectedSiteId }: Props) {
  const defaultCenter: [number, number] = snapshot
    ? [snapshot.location.lat, snapshot.location.lon]
    : [-25.5306, -49.2939];

  const selectedSite = sites.find((s) => s.id === selectedSiteId);
  const initialCenter: [number, number] = selectedSite
    ? [selectedSite.lat, selectedSite.lon]
    : defaultCenter;

  const radiusKm = snapshot?.radiusKm ?? 8;
  const RING_STEP_KM = 15;
  const RING_MAX_KM = 120;
  const rings = Array.from(
    { length: RING_MAX_KM / RING_STEP_KM },
    (_, i) => (i + 1) * RING_STEP_KM
  );

  const strikes = snapshot?.strikes ?? [];
  const filteredStrikes = strikes.filter((s) => {
    if (filter === "cg") return s.type === "CG";
    if (filter === "high_intensity") return Math.abs(s.peakAmpKa || 0) >= 30;
    return true;
  });

  const isLight = theme === "light";
  const tileUrl = isLight
    ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

  const tileAttribution = isLight
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

  const ringColor = isLight ? "#2563eb" : "#38bdf8";

  return (
    <div className="map-wrap">
      <MapContainer center={initialCenter} zoom={7} scrollWheelZoom>
        <RecenterMap selectedSiteId={selectedSiteId} sites={sites} />
        <TileLayer
          key={theme}
          attribution={tileAttribution}
          url={tileUrl}
        />

        <IncidenceFlashLayer points={snapshot?.regionStrikes ?? []} />

        {/* Varredura por Radar Sonar rotativo na Geolocalização do Usuário (linha limitada ao raio de alerta) */}
        <RadarSweepLayer center={defaultCenter} strikes={filteredStrikes} radiusKm={Math.max(radiusKm, 15)} />

        {/* Pino VERDE vibrante para a Geolocalização do Usuário */}
        <Marker position={defaultCenter} icon={userMarkerIcon}>
          <Popup>
            <div style={{ padding: 4 }}>
              <strong>🟢 {snapshot?.location.label ?? "Sua Geolocalização Atual"}</strong>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                🔴 Raio Crítico: <strong>{radiusKm} km</strong> | 🟠 Alerta: <strong>{Math.max(radiusKm, 15)} km</strong>
              </div>
            </div>
          </Popup>
        </Marker>

        {/* 🔴 Raio Crítico da Geolocalização do Usuário */}
        <Circle
          center={defaultCenter}
          radius={radiusKm * 1000}
          pathOptions={{
            color: "#ef4444",
            fillColor: "#ef4444",
            fillOpacity: 0.12,
            weight: 2,
          }}
        />

        {/* 🟠 Raio de Alerta da Geolocalização do Usuário */}
        <Circle
          center={defaultCenter}
          radius={Math.max(radiusKm, 15) * 1000}
          pathOptions={{
            color: "#f59e0b",
            fillColor: "#f59e0b",
            fillOpacity: 0.05,
            weight: 1.5,
            dashArray: "4, 6",
          }}
        />

        {/* Marcadores, Círculos dos 2 Raios e Linha de Radar Independente para cada local cadastrado */}
        {sites.map((site) => (
          <div key={site.id}>
            <Marker position={[site.lat, site.lon]} icon={markerIcon}>
              <Popup>
                <div style={{ padding: 4 }}>
                  <strong>📍 {site.name}</strong> ({site.category || "Obra"})
                  {site.address && <div style={{ fontSize: 11, color: "#64748b" }}>{site.address}</div>}
                  <div style={{ fontSize: 11, marginTop: 4 }}>
                    🔴 Raio Crítico: <strong>{site.criticalRadiusKm} km</strong> | 🟠 Alerta: <strong>{site.alertRadiusKm} km</strong>
                  </div>
                  {site.responsibleName && (
                    <div style={{ fontSize: 11, marginTop: 2 }}>
                      👤 Responsável: <strong>{site.responsibleName}</strong> {site.managerPhone && `(${site.managerPhone})`}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>

            {/* Varredura de Radar Sonar INDEPENDENTE por Local (linha limitada ao raio de alerta) */}
            <RadarSweepLayer
              center={[site.lat, site.lon]}
              strikes={filteredStrikes}
              radiusKm={site.alertRadiusKm}
            />

            {/* Círculo de Raio Crítico (Vermelho) */}
            <Circle
              center={[site.lat, site.lon]}
              radius={site.criticalRadiusKm * 1000}
              pathOptions={{
                color: "#ef4444",
                fillColor: "#ef4444",
                fillOpacity: 0.12,
                weight: 2,
              }}
            />

            {/* Círculo de Raio de Alerta (Laranja Pontilhado) */}
            <Circle
              center={[site.lat, site.lon]}
              radius={site.alertRadiusKm * 1000}
              pathOptions={{
                color: "#f59e0b",
                fillColor: "#f59e0b",
                fillOpacity: 0.05,
                weight: 1.5,
                dashArray: "4, 6",
              }}
            />
          </div>
        ))}

        {/* Renderização de Raios no Mapa */}
        {filteredStrikes.map((s) => {
          const near = s.distanceKm <= radiusKm;
          // Verifica se o raio caiu dentro do raio de alerta de algum canteiro/local cadastrado
          const isSiteStrike = sites.some(
            (site) => getDistanceKm(s.lat, s.lon, site.lat, site.lon) <= Math.max(site.alertRadiusKm, site.criticalRadiusKm)
          );
          const when = new Date(s.timestamp).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const amp = Math.abs(s.peakAmpKa || 0);

          return (
            <Marker key={s.id} position={[s.lat, s.lon]} icon={boltIcon(near, amp, isSiteStrike)}>
              <Popup>
                <strong>{s.distanceKm} km</strong> · {when}
                {isSiteStrike && <div style={{ color: "#eab308", fontWeight: 700, fontSize: 11 }}>⚡ Raio detectado no raio do local cadastrado!</div>}
                <br />
                Tipo:{" "}
                {s.type === "CG" ? (
                  <><BoltIcon size={13} style={{ marginRight: 3 }} />nuvem-solo (CG)</>
                ) : (
                  <><CloudIcon size={13} style={{ marginRight: 3 }} />intra-nuvem (IC)</>
                )}
                {amp > 0 ? <> <br />Intensidade (est.): <strong>~{amp} kA</strong></> : null}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Tabela de Legendas Atualizada */}
      <div className="legend">
        <div className="legend-row">
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#10b981", border: "2px solid #047857", flex: "none" }} />
          <strong>🟢 Geolocalização Atual do Usuário</strong>
        </div>
        <div className="legend-row">
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#0284c7", border: "2px solid #0369a1", flex: "none" }} />
          <strong>📍 Canteiro / Local Monitorado</strong>
        </div>
        <div className="legend-row">
          <span
            className="legend-ring"
            style={{ borderColor: "#ef4444", borderWidth: 2, background: "rgba(239, 68, 68, 0.15)" }}
          />
          🔴 Raio Crítico (Segurança Operacional)
        </div>
        <div className="legend-row">
          <span
            className="legend-ring"
            style={{ borderColor: "#f59e0b", borderWidth: 1.5, borderStyle: "dashed" }}
          />
          🟠 Raio de Alerta (Atenção)
        </div>
        <div className="legend-row">
          <span
            style={{
              display: "inline-block",
              width: 14,
              height: 2,
              background: "#38bdf8",
              flex: "none",
            }}
          />
          📡 Varredura de Radar (Sentido Horário)
        </div>
        <div className="legend-row">
          <BoltGlyph color="#facc15" /> ⚡ Raio em Local Monitorado (Amarelo)
        </div>
        <div className="legend-row">
          <BoltGlyph color="#ef4444" /> Raio Próximo / Crítico (Vermelho)
        </div>
        <div className="legend-row">
          <span
            className="legend-ring"
            style={{ background: "#f5009e", borderColor: "#111827" }}
          />
          Raios GOES-19 GLM (América do Sul)
        </div>
      </div>
    </div>
  );
}

