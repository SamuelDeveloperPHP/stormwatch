export type MonitorStatus = "safe" | "watch" | "alert";

export interface Strike {
  id: string;
  lat: number;
  lon: number;
  timestamp: number;
  type: "CG" | "IC";
  peakAmpKa: number;
  distanceKm: number;
}

export interface MonitorSnapshot {
  location: { lat: number; lon: number; label: string };
  evaluatedAt: string;
  radiusKm: number;
  status: MonitorStatus;
  closest: Strike | null;
  strikes: Strike[];
  /** Incidência regional (toda a América do Sul) — pares [lat, lon] p/ o mapa. */
  regionStrikes: [number, number][];
  regionCount: number;
  regionTruncated: boolean;
  inRadiusCount: number;
  safety?: SafetyState;
  alert: {
    sent: boolean;
    reason?: string;
    onCooldown: boolean;
    cooldownMin: number;
  };
}

export interface SafetyState {
  level: "init" | "safe" | "danger" | "degraded";
  location: string;
  closestKm: number | null;
  inZoneCount: number;
  safetyRadiusKm: number;
  marginKm: number;
  triggerKm: number;
  allClearMin: number;
  allClearInSec: number | null;
  dataAgeSec: number | null;
  feedOk: boolean;
  since: string;
}

export interface HourlyPoint {
  time: string;
  hourLabel: string;
  tempC: number;
  precipProb: number;
  condition: string;
  icon: string;
}

export interface Forecast {
  location: { lat: number; lon: number; label: string };
  observedAt: string;
  current: {
    tempC: number;
    feelsLikeC: number;
    humidity: number;
    windKmh: number;
    condition: string;
    conditionLabel: string;
    icon: string;
  };
  hourly: HourlyPoint[];
}
