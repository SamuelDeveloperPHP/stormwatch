import { MapContainer, TileLayer, Circle, CircleMarker, Marker, Popup, useMap } from "react-leaflet";
import { useEffect, useRef } from "react";
import L from "leaflet";
import type { MonitorSnapshot } from "../types.ts";

// Corrige o ícone padrão do Leaflet (quebra com bundlers se não apontarmos a URL).
const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

/**
 * Camada de incidência (toda a América do Sul) em UM ÚNICO canvas.
 *
 * Em vez de centenas/milhares de marcadores SVG animados (que travam o mapa),
 * desenhamos todos os pontos num canvas com um loop requestAnimationFrame:
 *  - a projeção lat/lon -> pixel é cacheada e só refeita quando o mapa move;
 *  - pontos fora da tela são descartados;
 *  - o pisca-pisca é só uma variação de alpha por frame (barato).
 * Acessibilidade: com prefers-reduced-motion, desenha estático (sem flash).
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
      zIndex: "450", // acima dos anéis (overlayPane 400), abaixo dos marcadores (600)
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
      map.on("zoomstart", hide); // evita ver pontos desalinhados durante o zoom
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

interface Props {
  snapshot: MonitorSnapshot | null;
}

export default function StormMap({ snapshot }: Props) {
  const center: [number, number] = snapshot
    ? [snapshot.location.lat, snapshot.location.lon]
    : [-25.5306, -49.2939];

  const radiusKm = snapshot?.radiusKm ?? 30;
  // Anéis de referência a cada 15 km, até 120 km (estilo "alvo" do WeatherBug).
  const RING_STEP_KM = 15;
  const RING_MAX_KM = 120;
  const rings = Array.from(
    { length: RING_MAX_KM / RING_STEP_KM },
    (_, i) => (i + 1) * RING_STEP_KM
  );

  return (
    <div className="map-wrap">
      <MapContainer center={center} zoom={7} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Incidência regional (toda a América do Sul): um único canvas animado
            (leve), em vez de milhares de marcadores SVG que travavam o mapa. */}
        <IncidenceFlashLayer points={snapshot?.regionStrikes ?? []} />

        {/* Ponto monitorado */}
        <Marker position={center} icon={markerIcon}>
          <Popup>{snapshot?.location.label ?? "Local monitorado"}</Popup>
        </Marker>

        {/* Anéis de referência a cada 15 km (azul mais visível, opacidade constante) */}
        {rings.map((km) => (
          <Circle
            key={`ref-${km}`}
            center={center}
            radius={km * 1000}
            pathOptions={{
              color: "#2563eb",
              weight: 1,
              opacity: 0.5,
              fill: false,
            }}
          />
        ))}
        {/* Raio crítico de alerta em destaque */}
        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{
            color: "#1d4ed8",
            weight: 2.5,
            opacity: 0.95,
            fill: true,
            fillColor: "#2563eb",
            fillOpacity: 0.06,
          }}
        />

        {/* Strikes */}
        {snapshot?.strikes.map((s) => {
          const near = s.distanceKm <= radiusKm;
          return (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lon]}
              radius={near ? 7 : 5}
              pathOptions={{
                color: near ? "#ef4444" : "#f59e0b",
                fillColor: near ? "#ef4444" : "#f59e0b",
                fillOpacity: 0.8,
                weight: 1,
              }}
            >
              <Popup>
                {s.distanceKm} km
                {s.peakAmpKa ? (
                  <>
                    <br />
                    {Math.abs(s.peakAmpKa)} kA
                  </>
                ) : null}
              </Popup>
            </CircleMarker>
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
            style={{ borderColor: "#1d4ed8", borderWidth: 2 }}
          />
          Raio crítico de alerta ({radiusKm} km)
        </div>
        <div className="legend-row">
          <span
            className="legend-ring"
            style={{ background: "#ef4444", borderColor: "#ef4444" }}
          />
          Raio dentro do limite crítico
        </div>
        <div className="legend-row">
          <span
            className="legend-ring"
            style={{ background: "#f59e0b", borderColor: "#f59e0b" }}
          />
          Raio distante
        </div>
        <div className="legend-row">
          <span
            className="legend-ring"
            style={{ background: "#f5009e", borderColor: "#111827" }}
          />
          Incidência GLM (América do Sul)
        </div>
      </div>
    </div>
  );
}
