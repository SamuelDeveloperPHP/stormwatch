/**
 * Ilustração "storm-night" do hero da landing: satélite NOAA GOES-19 emitindo
 * sinal sobre um canteiro com geofencing (raio crítico 8 km / alerta 15 km),
 * tempestade com raios e o pino do local monitorado. Reaproveita a arte da
 * capa do post. IDs prefixados com "hs" para não colidir com outros SVGs.
 */
export default function HeroStormArt() {
  return (
    <svg
      className="hero-storm-svg"
      viewBox="755 100 400 410"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Satélite NOAA GOES-19 monitorando raios sobre um canteiro com geofencing de 8 e 15 km"
    >
      <defs>
        <linearGradient id="hsCone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hsPanel" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="hsSatBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eef2f7" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="hsBolt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#7dd3fc" />
        </linearGradient>
        <radialGradient id="hsGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
        </radialGradient>
        <filter id="hsSoftGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="hsBoltGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* brilho de fundo atrás do local */}
      <ellipse cx="930" cy="440" rx="205" ry="92" fill="url(#hsGlow)" />

      {/* cone de sinal */}
      <polygon points="930,168 1052,432 808,432" fill="url(#hsCone)" />

      {/* nuvem de tempestade */}
      <g opacity="0.9">
        <ellipse cx="1000" cy="252" rx="42" ry="20" fill="#334155" />
        <ellipse cx="1032" cy="246" rx="30" ry="18" fill="#3b4a63" />
        <ellipse cx="972" cy="248" rx="26" ry="16" fill="#2b3850" />
        <rect x="958" y="250" width="86" height="16" rx="8" fill="#293548" />
        <ellipse cx="1000" cy="262" rx="46" ry="12" fill="#1e293b" />
      </g>

      {/* raios */}
      <polygon
        points="1004,268 984,316 999,316 974,372 1008,308 993,308 1010,270"
        fill="url(#hsBolt)"
        filter="url(#hsBoltGlow)"
      />
      <polygon
        points="874,296 862,326 872,326 866,356 886,318 876,318 884,296"
        fill="url(#hsBolt)"
        filter="url(#hsBoltGlow)"
        opacity="0.75"
      />

      {/* satélite */}
      <g>
        <rect x="850" y="118" width="42" height="36" rx="3" fill="url(#hsPanel)" stroke="#38bdf8" strokeWidth="1" />
        <line x1="864" y1="118" x2="864" y2="154" stroke="#0b1e4d" strokeWidth="1" />
        <line x1="878" y1="118" x2="878" y2="154" stroke="#0b1e4d" strokeWidth="1" />
        <line x1="850" y1="136" x2="892" y2="136" stroke="#0b1e4d" strokeWidth="1" />
        <rect x="968" y="118" width="42" height="36" rx="3" fill="url(#hsPanel)" stroke="#38bdf8" strokeWidth="1" />
        <line x1="982" y1="118" x2="982" y2="154" stroke="#0b1e4d" strokeWidth="1" />
        <line x1="996" y1="118" x2="996" y2="154" stroke="#0b1e4d" strokeWidth="1" />
        <line x1="968" y1="136" x2="1010" y2="136" stroke="#0b1e4d" strokeWidth="1" />
        <line x1="892" y1="137" x2="908" y2="137" stroke="#94a3b8" strokeWidth="3" />
        <line x1="968" y1="137" x2="952" y2="137" stroke="#94a3b8" strokeWidth="3" />
        <rect x="908" y="112" width="44" height="50" rx="7" fill="url(#hsSatBody)" stroke="#e2e8f0" strokeWidth="1" />
        <rect x="908" y="131" width="44" height="8" fill="#0ea5e9" opacity="0.85" />
        <line x1="930" y1="150" x2="930" y2="164" stroke="#cbd5e1" strokeWidth="2" />
        <ellipse cx="930" cy="167" rx="15" ry="7" fill="#e2e8f0" stroke="#64748b" strokeWidth="1" />
        <circle cx="930" cy="150" r="2.4" fill="#ffffff" />
      </g>

      {/* chevrons de sinal descendo */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M916 180 L930 190 L944 180" stroke="#7dd3fc" strokeWidth="2.6" />
        <path d="M907 189 L930 202 L953 189" stroke="#38bdf8" strokeWidth="2.6" opacity="0.6" />
        <path d="M898 198 L930 214 L962 198" stroke="#38bdf8" strokeWidth="2.6" opacity="0.35" />
      </g>

      {/* geofencing */}
      <ellipse
        cx="930" cy="438" rx="158" ry="50"
        fill="#f59e0b" fillOpacity="0.06"
        stroke="#f59e0b" strokeWidth="2" strokeDasharray="9 7"
      />
      <ellipse
        cx="930" cy="438" rx="94" ry="30"
        fill="#ef4444" fillOpacity="0.10"
        stroke="#ef4444" strokeWidth="2"
      />

      {/* descargas registradas */}
      <g filter="url(#hsSoftGlow)">
        <circle cx="976" cy="452" r="4" fill="#ef4444" />
        <circle cx="900" cy="455" r="3.5" fill="#f59e0b" />
        <circle cx="955" cy="420" r="3" fill="#fbbf24" />
        <circle cx="1006" cy="448" r="3" fill="#f59e0b" />
      </g>

      {/* pino do local */}
      <path
        d="M930 414 C920 414 913 422 913 431 C913 442 930 457 930 457 C930 457 947 442 947 431 C947 422 940 414 930 414 Z"
        fill="#22d3ee" stroke="#0e7490" strokeWidth="1"
      />
      <circle cx="930" cy="430" r="5" fill="#06263a" />

      {/* rótulos dos raios */}
      <text x="1094" y="443" fontSize="13" fontWeight="700" fill="#fcd34d" fontFamily="'Space Grotesk', system-ui, sans-serif">15 km</text>
      <text x="1024" y="431" fontSize="13" fontWeight="700" fill="#fca5a5" fontFamily="'Space Grotesk', system-ui, sans-serif">8 km</text>
    </svg>
  );
}
