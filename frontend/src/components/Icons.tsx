import React from "react";
import holofotesImg from "../../assets/image/holofotes.png";

// 🏗️ Ícone de Construção Civil & Gruas (Grua de Torre com Carga)
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

// 🎪 Ícone de Shows & Eventos ao Ar Livre (Holofotes de Estágio / Iluminação de Shows)
export function StageEventsIcon({ size = 38 }: { size?: number; color?: string }) {
  return (
    <img
      src={holofotesImg}
      alt="Shows & Eventos"
      style={{ width: size, height: size, objectFit: "contain", display: "block" }}
    />
  );
}

// 🏭 Ícone de Mineração, Portos & Energia (Usina Industrial, Guindaste Portuário e Descarga)
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

// ☀️ Ícone Ensolarado (Céu Limpo)
export function SunIcon({ size = 24, color = "#f59e0b" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="5" fill={color} stroke={color} strokeWidth="1.5" />
      <path d="M12 2V4M12 20V22M2 12H4M20 12H22M4.93 4.93L6.34 6.34M17.66 17.66L19.07 19.07M4.93 19.07L6.34 17.66M17.66 6.34L19.07 4.93" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ⛅ Ícone Parcialmente Nublado
export function PartlyCloudyIcon({ size = 24, color = "#0284c7" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15.5 8C14.84 8 14.23 8.21 13.73 8.56C12.87 6.47 10.85 5 8.5 5C5.46 5 3 7.46 3 10.5C3 10.87 3.04 11.23 3.11 11.58C1.86 12.39 1 13.8 1 15.5C1 18.0 3.0 20 5.5 20H15.5C18.0 20 20 18.0 20 15.5C20 13.0 18.0 11 15.5 11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17" cy="6" r="3" fill="#f59e0b" />
    </svg>
  );
}

// ☁️ Ícone Nublado
export function CloudIcon({ size = 24, color = "#64748b" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.5 19C19.9853 19 22 16.9853 22 14.5C22 12.1564 20.206 10.2312 17.9002 10.0244C17.4116 6.5828 14.464 3.9 10.875 3.9C7.0392 3.9 3.8643 6.9458 3.5186 10.7493C1.5034 11.3958 0 13.2751 0 15.5C0 18.2614 2.2386 20.5 5 20.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 🌧️ Ícone de Chuva
export function RainIcon({ size = 24, color = "#0284c7" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 14C20.6569 14 22 12.6569 22 11C22 9.5 20.8 8.2 19.3 8C18.9 5.1 16.4 3 13.4 3C10.1 3 7.4 5.5 7.1 8.7C5.4 9.2 4.1 10.7 4.1 12.5C4.1 14.7 5.9 16.5 8.1 16.5H19" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M8 18L6 22M12 18L10 22M16 18L14 22" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ⛈️ Ícone de Tempestade / Raios
export function ThunderstormIcon({ size = 24, color = "#dc2626" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 12C20.6569 12 22 10.6569 22 9C22 7.5 20.8 6.2 19.3 6C18.9 3.1 16.4 1 13.4 1C10.1 1 7.4 3.5 7.1 6.7C5.4 7.2 4.1 8.7 4.1 10.5C4.1 12.7 5.9 14.5 8.1 14.5H19" stroke="#64748b" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 11L9 17H13L11 23L17 15H13L15 11Z" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// 🌡️ Ícone de Termômetro
export function ThermometerIcon({ size = 20, color = "#dc2626" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 14.76V5C14 3.34 12.66 2 11 2C9.34 2 8 3.34 8 5V14.76C6.77 15.7 6 17.25 6 19C6 21.76 8.24 24 11 24C13.76 24 16 21.76 16 19C16 17.25 15.23 15.7 14 14.76Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 11V18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 💧 Ícone de Pingo de Água / Umidade
export function DropletIcon({ size = 20, color = "#0284c7" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.69L17.18 8.56C19.03 10.66 20 12.78 20 14.92C20 19.33 16.42 22.92 12 22.92C7.58 22.92 4 19.33 4 14.92C4 12.78 4.97 10.66 6.82 8.56L12 2.69Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 💨 Ícone de Vento
export function WindIcon({ size = 20, color = "#65a30d" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.59 4.59A3 3 0 1 1 12 9H2M14.59 19.41A3 3 0 1 0 17 15H2M17.73 7.73A2.5 2.5 0 1 1 19.5 12H2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
