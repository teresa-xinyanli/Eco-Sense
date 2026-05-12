
export interface EnvParams {
  species: string;
  temperature: number;
  humidity: number;
  light: number;
  environment: 'open' | 'enclosed';
  crownShape?: 'spherical' | 'conical' | 'spreading' | 'columnar' | 'vase' | 'palm';
  canopyProfile?: number[]; // Array of 8 floats (0.0 - 1.0) defining width from bottom to top
  trunkHeightRatio?: number; // 0.0 - 1.0 relative to total height
  foliageColor?: string; // Hex color extracted from image
}

export interface TreeState {
  emotionalStatus: string; // e.g., "Neutral", "Stressed", "Thriving"
  physiologicalState: string; // e.g., "Stable metabolic function."
  sonicResponse: string; // e.g., "Consistent, ambient white noise."
  visualSignal: string; // e.g., "Foliage color shifts to represent internal stress."
  reflection: string; // The first-person narrative
  isSimulation?: boolean; // Flag to indicate if data is simulated due to API quota
}

export interface SpatialMetrics {
  hasBuildingProximity: boolean; // Shade / Low PAR
  isStreetSide: boolean; // Pollution / PM / NO2
  hasPavement: boolean; // Soil Compaction / Root Stress
  isEnclosed: boolean; // Wind Tunnel / Ventilation
  scientificAnalysis: string; // Generated insight based on literature
}

export enum ViewMode {
  STYLIZED = 'STYLIZED',
  STREET = 'STREET',
  CAMERA = 'CAMERA'
}

export type VisualizationMode = 'SHADER' | 'SOUND' | 'LEAF' | 'TEXT' | 'LINKAGE' | 'POINTS';

export interface UserLocation {
  lat: number;
  lon: number;
}

export const TREE_SPECIES = [
  'Red Maple',
  'Ginkgo',
  'London Plane',
  'Honey Locust',
  'Pin Oak',
  'Littleleaf Linden'
];

export const EMOTION_COLORS: Record<string, string> = {
  "Tired": "#A6A6A6",
  "Calm": "#A8D5BA",
  "Anxious": "#F6B26B",
  "Content": "#C1E1C1",
  "Overheated": "#F4CCCC",
  "Healthy": "#A4C2F4",
  "Scorched": "#E06666",
  "Thriving": "#93C47D",
  "Surviving": "#FFD966",
  "Balanced": "#B6D7A8",
  "Withering": "#CC4125",
  "Flourishing": "#76D7C4",
  "Exhausted": "#7D7D7D",
  "Neutral": "#A8D5BA",
  "Strained": "#F6B26B",
  "Stressed": "#F6B26B",
  "Observant": "#B6D7A8",
  "Observing": "#B6D7A8"
};

export const getColorForEmotion = (status: string): string => {
  if (!status) return "#2d5a27";
  
  // 1. Exact/Case-insensitive match
  const exactKey = Object.keys(EMOTION_COLORS).find(k => k.toLowerCase() === status.toLowerCase());
  if (exactKey) return EMOTION_COLORS[exactKey];

  // 2. Keyword match
  const lower = status.toLowerCase();
  for (const [emotion, color] of Object.entries(EMOTION_COLORS)) {
      if (lower.includes(emotion.toLowerCase())) return color;
  }
  
  // 3. Default Fallback
  return "#2d5a27";
};
