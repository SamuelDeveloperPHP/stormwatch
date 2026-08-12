import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import L from "leaflet";
import type { MonitorSnapshot, Strike, StrikeFilter } from "../types.ts";
import type { MonitorSite } from "../locations.ts";
import { BoltIcon, CloudIcon } from "./ui-icons.tsx";

// Corrige o ícone padrão do Leaflet (quebra com bundlers se não apontarmos a URL).
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Ícone de RELÂMPAGO para cada raio (marcação no mapa).
// Cor e escala ajustadas dinamicamente de acordo com a intensidade (kA) e distância.
const BOLT_PATH = "M7 2v11h3v9l7-12h-4l4-8z";
function boltIcon(near: boolean, ampKa: number) {
  const amp = Math.abs(ampKa || 0);
  let color = near ? "#ef4444" : "#f59e0b"; // Vermelho perto, Âmbar longe
  if (amp >= 40) {
    color = "#dc2626"; // Vermelho forte/púrpura para alta energia
  } else if (amp >= 20) {
    color = near ? "#ea580c" : "#d97706";
  }

  const scale = amp >= 40 ? 24 : amp >= 20 ? 20 : 16;
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
      const north = map.latLngToContainerPoint([lat + MAX_KM / 111, lon]);
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

      const grad = ctx.createLinearGradient(c.x, c.y, tx(theta), ty(theta));
      grad.addColorStop(0, "rgba(37, 99, 235, 0.95)");
      grad.addColorStop(1, "rgba(37, 99, 235, 0.12)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
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

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, Math.max(map.getZoom(), 8), { duration: 1.2 });
  }, [center, map]);
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
  const activeCenter: [number, number] = selectedSite
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
      <MapContainer center={activeCenter} zoom={7} scrollWheelZoom>
        <RecenterMap center={activeCenter} />
        <TileLayer
          key={theme}
          attribution={tileAttribution}
          url={tileUrl}
        />

        <IncidenceFlashLayer points={snapshot?.regionStrikes ?? []} />

        {/* Varredura por Radar Sonar rotativo no centro ativo */}
        <RadarSweepLayer center={activeCenter} strikes={filteredStrikes} radiusKm={radiusKm} />

        <Marker position={defaultCenter} icon={markerIcon}>
          <Popup>{snapshot?.location.label ?? "Sua Geolocalização Atual"}</Popup>
        </Marker>

        {/* Marcadores, Círculos de Geofencing e Anéis de Radar Sonar para cada local cadastrado */}
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

            {/* Anéis Concentricos de Radar Sonar por Local */}
            {rings.map((km) => (
              <Circle
                key={`site-ring-${site.id}-${km}`}
                center={[site.lat, site.lon]}
                radius={km * 1000}
                pathOptions={{
                  color: site.id === selectedSiteId ? "#0284c7" : ringColor,
                  weight: site.id === selectedSiteId ? 1.5 : 0.8,
                  opacity: site.id === selectedSiteId ? 0.6 : (isLight ? 0.3 : 0.2),
                  fill: false,
                }}
              />
            ))}

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

        {/* Anéis de Radar Sonar da Geolocalização Padrão */}
        {rings.map((km) => (
          <Circle
            key={`ref-${km}`}
            center={defaultCenter}
            radius={km * 1000}
            pathOptions={{
              color: ringColor,
              weight: 1,
              opacity: isLight ? 0.45 : 0.35,
              fill: false,
            }}
          />
        ))}

        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{
            color: ringColor,
            weight: 2,
            opacity: 0.9,
            fill: true,
            fillColor: isLight ? "#2563eb" : "#0ea5e9",
            fillOpacity: isLight ? 0.08 : 0.12,
          }}
        />


        {filteredStrikes.map((s) => {
          const near = s.distanceKm <= radiusKm;
          const when = new Date(s.timestamp).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const amp = Math.abs(s.peakAmpKa || 0);

          return (
            <Marker key={s.id} position={[s.lat, s.lon]} icon={boltIcon(near, amp)}>
              <Popup>
                <strong>{s.distanceKm} km</strong> · {when}
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

      <div className="legend">
        <div className="legend-row">
          <span className="legend-ring" /> Anéis a cada {RING_STEP_KM} km (até {RING_MAX_KM} km)
        </div>
        <div className="legend-row">
          <span
            className="legend-ring"
            style={{ borderColor: "#38bdf8", borderWidth: 2 }}
          />
          Raio crítico de alerta ({radiusKm} km)
        </div>
        <div className="legend-row">
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 2,
              background: "#38bdf8",
              flex: "none",
            }}
          />
          Varredura de radar (gira até 120 km)
        </div>
        <div className="legend-row">
          <BoltGlyph color="#ef4444" />
          Raio crítico (próximo do local)
        </div>
        <div className="legend-row">
          <BoltGlyph color="#f59e0b" />
          Raio externo (&gt; {radiusKm} km)
        </div>
        <div className="legend-row">
          <span
            className="legend-ring"
            style={{ background: "#f5009e", borderColor: "#111827" }}
          />
          Raios América do Sul (satélite ao vivo)
        </div>
        <div className="legend-row" style={{ color: "var(--ink-mute)", fontSize: 11 }}>
          O tamanho do marcador segue a intensidade (kA). Intensidade e tipo (CG/IC) são estimativas ilustrativas — não medidas pelo GLM.
        </div>
      </div>
    </div>
  );
}

