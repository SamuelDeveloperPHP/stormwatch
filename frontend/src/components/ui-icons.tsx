import type { CSSProperties, ReactNode } from "react";

// ── Sistema de ícones vetoriais minimalistas (estilo dashboard/BI) ─────────
// Traço fino, monocromático — herdam `currentColor`. Fonte única do app.
// Ícones ilustrativos de setor (grua, palco, indústria) ficam em Icons.tsx.

type IcoProps = { size?: number; style?: CSSProperties };

function Svg({ size = 15, style, children }: { size?: number; style?: CSSProperties; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ verticalAlign: "-2px", ...style }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/* ── Condições do tempo ─────────────────────────────────────────────────── */
export function SunIcon({ size = 15, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
    </Svg>
  );
}
export function PartlyCloudyIcon({ size = 15, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <circle cx="8.5" cy="7.5" r="2.7" />
      <path d="M8.5 2.6v1.5M3.4 7.5h1.5M4.9 4.9l1 1M13.1 4.9l-1 1" />
      <path d="M7 18.5h8.5a3 3 0 0 0 .2-6A4 4 0 0 0 8 12.4 3.2 3.2 0 0 0 7 18.5z" />
    </Svg>
  );
}
export function CloudIcon({ size = 15, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M6.5 16.5h10a3.5 3.5 0 0 0 .3-7A4.8 4.8 0 0 0 7.7 8 3.7 3.7 0 0 0 6.5 16.5z" />
    </Svg>
  );
}
export function RainIcon({ size = 15, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M6.5 14.5h9.8a3.3 3.3 0 0 0 .3-6.6A4.5 4.5 0 0 0 7.8 6.7 3.5 3.5 0 0 0 6.5 14.5z" />
      <path d="M9 17.5l-1 2.4M12.5 17.5l-1 2.4M16 17.5l-1 2.4" />
    </Svg>
  );
}
export function ThunderstormIcon({ size = 15, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M6.5 14h9.8a3.3 3.3 0 0 0 .3-6.6A4.5 4.5 0 0 0 7.8 6.2 3.5 3.5 0 0 0 6.5 14z" />
      <path d="M12.4 14.8l-2.9 4.2h2.2l-1 3.2 3.8-4.9h-2.5z" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Despacha a condição climática para o ícone certo (padrão: nublado). */
export function ConditionIcon({ condition, size = 15, style }: { condition?: string; size?: number; style?: CSSProperties }) {
  switch (condition) {
    case "clear":
      return <SunIcon size={size} style={style} />;
    case "partly":
      return <PartlyCloudyIcon size={size} style={style} />;
    case "rain":
      return <RainIcon size={size} style={style} />;
    case "thunderstorm":
      return <ThunderstormIcon size={size} style={style} />;
    default:
      return <CloudIcon size={size} style={style} />;
  }
}

/* ── Métricas ───────────────────────────────────────────────────────────── */
export function ThermometerIcon({ size = 13, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M14 14.9V5.6a2 2 0 1 0-4 0v9.3a3.6 3.6 0 1 0 4 0z" />
    </Svg>
  );
}
export function RainDropIcon({ size = 13, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M12 3.8c3.1 3.7 4.8 6.2 4.8 8.7a4.8 4.8 0 0 1-9.6 0c0-2.5 1.7-5 4.8-8.7z" />
    </Svg>
  );
}
export function WindIcon({ size = 13, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M3 8.5h9.5A2.3 2.3 0 1 0 10.2 6.2" />
      <path d="M3 12.5h13a2.3 2.3 0 1 1-2.3 2.3" />
      <path d="M3 16.5h6.5" />
    </Svg>
  );
}
export function HumidityIcon({ size = 13, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M12 3.8c3.1 3.7 4.8 6.2 4.8 8.7a4.8 4.8 0 0 1-9.6 0c0-2.5 1.7-5 4.8-8.7z" />
      <path d="M8.4 13.4h7.2" />
    </Svg>
  );
}

/* ── Status / segurança ─────────────────────────────────────────────────── */
export function WarnIcon({ size = 16, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M10.3 4.2 2 18.5a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.7v4.1" />
      <path d="M12 17.4h.01" />
    </Svg>
  );
}
export function StopIcon({ size = 16, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z" />
      <path d="M12 8v4.5" />
      <path d="M12 16h.01" />
    </Svg>
  );
}
export function ShieldCheckIcon({ size = 16, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M12 3l7 2.7v5.1c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V5.7z" />
      <path d="M9 12l2 2 4-4.2" />
    </Svg>
  );
}
export function InfoIcon({ size = 15, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.6h.01" />
    </Svg>
  );
}

/* ── Raios ──────────────────────────────────────────────────────────────── */
// Nuvem-solo (CG): relâmpago preenchido. Intra-nuvem (IC): usar CloudIcon.
export function BoltIcon({ size = 13, style }: IcoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ verticalAlign: "-2px", ...style }}
      fill="currentColor"
    >
      <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
    </svg>
  );
}

/* ── UI geral ───────────────────────────────────────────────────────────── */
export function HomeIcon({ size = 15, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M3 10.6 12 3.2l9 7.4" />
      <path d="M5.2 9.2V20.5h13.6V9.2" />
      <path d="M9.6 20.5v-6h4.8v6" />
    </Svg>
  );
}
export function MoonIcon({ size = 15, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M20 14.4A8 8 0 0 1 9.6 4 8 8 0 1 0 20 14.4z" />
    </Svg>
  );
}
export function LockIcon({ size = 15, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </Svg>
  );
}
export function DocumentIcon({ size = 15, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M8 3.5h5.5L18 8v11.5a1.5 1.5 0 0 1-1.5 1.5h-8.5A1.5 1.5 0 0 1 6.5 19.5V5A1.5 1.5 0 0 1 8 3.5z" />
      <path d="M13.5 3.5V8H18" />
      <path d="M9.5 12.5h5M9.5 16h4" />
    </Svg>
  );
}
export function CheckIcon({ size = 14, style }: IcoProps) {
  return (
    <Svg size={size} style={{ color: "#16a34a", verticalAlign: "-2px", marginRight: 7, ...style }}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}
export function XIcon({ size = 14, style }: IcoProps) {
  return (
    <Svg size={size} style={{ color: "#94a3b8", verticalAlign: "-2px", marginRight: 7, ...style }}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}
export function ChatIcon({ size = 20, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 20l1.4-4.8A7.5 7.5 0 1 1 20 11.5z" />
    </Svg>
  );
}
export function BriefcaseIcon({ size = 15, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
      <path d="M8 7.5V5.5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12.5h18" />
    </Svg>
  );
}

export function CloseIcon({ size = 16, style }: IcoProps) {
  return (
    <Svg size={size} style={style}>
      <path d="M18 6L6 18M6 6l12 12" />
    </Svg>
  );
}
