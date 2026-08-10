import holofotesImg from "../../assets/image/holofotes.png";

// Ilustracoes de setor (cards "Setores de Alto Risco" da landing page).
// Icones de clima/metricas/UI ficam em ui-icons.tsx (conjunto minimalista BI).

// Construcao Civil & Gruas (grua de torre com carga).
export function CraneIcon({ size = 36, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 21H20" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M7 21V4L19 4L21 8H7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 8H19" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
      <path d="M10 21L7 16" stroke={color} strokeWidth="1.5" />
      <path d="M15 4V13" stroke={color} strokeWidth="1.5" />
      <rect x="13" y="13" width="4" height="4" rx="0.5" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// Shows & Eventos ao Ar Livre (holofotes de palco — imagem oficial).
export function StageEventsIcon({ size = 38 }: { size?: number; color?: string }) {
  return (
    <img
      src={holofotesImg}
      alt="Shows & Eventos"
      style={{ width: size, height: size, objectFit: "contain", display: "block" }}
    />
  );
}

// Mineracao, Portos & Energia (usina industrial e guindaste portuario).
export function IndustryPortIcon({ size = 36, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 21H22" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M4 21V11L9 15V11L14 15V8L20 12V21H4Z" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M17 4L15 8H19L17 4Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 3L11 6H13L12 3Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
