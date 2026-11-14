import type { ContinentalBiomeId } from '../core/types';
import type { TerrainTextureId } from './proceduralAssets';

export const CHUNK_SIZE = 250;
export const CHUNK_HALF = CHUNK_SIZE / 2;

export type ContinentalHazardType =
  | 'none'
  | 'lava_fissure'
  | 'gust_vortex'
  | 'shock_turret'
  | 'toxic_mire'
  | 'sonic_geyser'
  | 'tremor_rift'
  | 'void_miasma';

export interface BiomePropTheme {
  treeCount: number;
  boulderCount: number;
  trunkColor: number;
  pineColors: [number, number];
  oakColors: [number, number];
  boulderColors: [number, number];
  obeliskColor: number;
  lanternColor: number;
  hasStructures?: boolean;
}

export interface ContinentalChunkDef {
  key: string;
  cx: number;
  cz: number;
  biomeId: ContinentalBiomeId;
  name: string;
  subtitle: string;
  terrainTexture: TerrainTextureId;
  primaryColor: string;
  secondaryColor: string;
  fogColor: string;
  hazardType: ContinentalHazardType;
  hazardLabel: string;
  hazardColor: string;
  hazardCenterOffset: [number, number];
  hazardRadius: number;
  hazardIntensity: number;
  propTheme: BiomePropTheme;
}

export interface HazardEvaluation {
  biomeId: ContinentalBiomeId;
  chunkKey: string;
  hazardType: ContinentalHazardType;
  hazardLabel: string;
  intensity: number;
  color: string;
  inZone: boolean;
  distanceFromCenter: number;
  hazardCenter: [number, number];
  hazardRadius: number;
}

export const CONTINENTAL_CHUNKS: Record<string, ContinentalChunkDef> = {
  '0,0': {
    key: '0,0',
    cx: 0,
    cz: 0,
    biomeId: 'frontier',
    name: 'HomeTown / Coursair Frontier',
    subtitle: 'Temperate Grasslands & Township Crossroads',
    terrainTexture: 'grass_frontier',
    primaryColor: '#5c9449',
    secondaryColor: '#3f6e39',
    fogColor: '#b8d0e0',
    hazardType: 'none',
    hazardLabel: 'Wild Patrols',
    hazardColor: '#60a5fa',
    hazardCenterOffset: [0, 0],
    hazardRadius: 0,
    hazardIntensity: 0,
    propTheme: {
      treeCount: 46,
      boulderCount: 18,
      trunkColor: 0x5c3e26,
      pineColors: [0x2d6639, 0x377843],
      oakColors: [0x458540, 0x569648],
      boulderColors: [0x626973, 0x7b828c],
      obeliskColor: 0x4b7794,
      lanternColor: 0xffc857,
      hasStructures: true,
    },
  },
  '0,-1': {
    key: '0,-1',
    cx: 0,
    cz: -1,
    biomeId: 'gate',
    name: 'Gate',
    subtitle: 'Volcanic Basalt & Dragon Fissure',
    terrainTexture: 'shrine_stone',
    primaryColor: '#4f3b3a',
    secondaryColor: '#9c3419',
    fogColor: '#8c5347',
    hazardType: 'lava_fissure',
    hazardLabel: 'Dragon Lava Fissure',
    hazardColor: '#ff511a',
    hazardCenterOffset: [0, 0],
    hazardRadius: 48,
    hazardIntensity: 0.95,
    propTheme: {
      treeCount: 14,
      boulderCount: 34,
      trunkColor: 0x2f2524,
      pineColors: [0x59261b, 0x73321d],
      oakColors: [0x452b27, 0x613524],
      boulderColors: [0x332b2d, 0x4d3a36],
      obeliskColor: 0xc94218,
      lanternColor: 0xff6229,
    },
  },
  '-1,-1': {
    key: '-1,-1',
    cx: -1,
    cz: -1,
    biomeId: 'windia',
    name: 'Windia',
    subtitle: 'Sky Plateau & Winged Towers',
    terrainTexture: 'cobble_coursair',
    primaryColor: '#a8cbe0',
    secondaryColor: '#6999bd',
    fogColor: '#cde4f5',
    hazardType: 'gust_vortex',
    hazardLabel: 'Stratosphere Gust Vortex',
    hazardColor: '#5ce1ff',
    hazardCenterOffset: [0, 0],
    hazardRadius: 44,
    hazardIntensity: 0.78,
    propTheme: {
      treeCount: 24,
      boulderCount: 16,
      trunkColor: 0x877b6f,
      pineColors: [0x5ea3b5, 0x7ec2d1],
      oakColors: [0x82b8a5, 0xa8d4c0],
      boulderColors: [0x9eb2c2, 0xc7d4de],
      obeliskColor: 0x62b4d9,
      lanternColor: 0x99f0ff,
    },
  },
  '1,-1': {
    key: '1,-1',
    cx: 1,
    cz: -1,
    biomeId: 'highfort',
    name: 'Highfort',
    subtitle: 'Cliffside Clockwork Citadel',
    terrainTexture: 'cobble_coursair',
    primaryColor: '#7a756c',
    secondaryColor: '#4c525e',
    fogColor: '#9fb0bf',
    hazardType: 'shock_turret',
    hazardLabel: 'Clockwork Shock Turret',
    hazardColor: '#facc15',
    hazardCenterOffset: [0, 0],
    hazardRadius: 42,
    hazardIntensity: 0.85,
    propTheme: {
      treeCount: 16,
      boulderCount: 28,
      trunkColor: 0x52463a,
      pineColors: [0x475e4d, 0x5e7559],
      oakColors: [0x6e6949, 0x8a7d52],
      boulderColors: [0x595e66, 0x827866],
      obeliskColor: 0xc99c38,
      lanternColor: 0xffe054,
    },
  },
  '-1,0': {
    key: '-1,0',
    cx: -1,
    cz: 0,
    biomeId: 'simafort',
    name: 'SimaFort',
    subtitle: 'Misty River Fortress & Marsh',
    terrainTexture: 'grass_frontier',
    primaryColor: '#3d6654',
    secondaryColor: '#27453e',
    fogColor: '#8ba8a3',
    hazardType: 'toxic_mire',
    hazardLabel: 'Misty Toxic Mire',
    hazardColor: '#6ee755',
    hazardCenterOffset: [0, 0],
    hazardRadius: 46,
    hazardIntensity: 0.82,
    propTheme: {
      treeCount: 40,
      boulderCount: 18,
      trunkColor: 0x3b3529,
      pineColors: [0x264d42, 0x326351],
      oakColors: [0x3d6949, 0x4e7d53],
      boulderColors: [0x4b5c58, 0x5d7069],
      obeliskColor: 0x45876b,
      lanternColor: 0x8aff70,
    },
  },
  '1,0': {
    key: '1,0',
    cx: 1,
    cz: 0,
    biomeId: 'tunlan',
    name: 'Tunlan',
    subtitle: 'Coastal Music Terrace & Tidepools',
    terrainTexture: 'cobble_coursair',
    primaryColor: '#c9b385',
    secondaryColor: '#3f8fa6',
    fogColor: '#b5dced',
    hazardType: 'sonic_geyser',
    hazardLabel: 'Resonant Sonic Geyser',
    hazardColor: '#38bdf8',
    hazardCenterOffset: [0, 0],
    hazardRadius: 42,
    hazardIntensity: 0.72,
    propTheme: {
      treeCount: 28,
      boulderCount: 20,
      trunkColor: 0x7a5c3c,
      pineColors: [0x3c8a73, 0x52a88c],
      oakColors: [0x6ca65b, 0x8bc270],
      boulderColors: [0x8c877c, 0xa89f8d],
      obeliskColor: 0x3fa3c4,
      lanternColor: 0x70e4ff,
    },
  },
  '-1,1': {
    key: '-1,1',
    cx: -1,
    cz: 1,
    biomeId: 'capitan',
    name: 'Capitan',
    subtitle: 'Sun-Baked Harbor & St. Eva Catacomb Well',
    terrainTexture: 'cobble_coursair',
    primaryColor: '#c7975d',
    secondaryColor: '#8c5f3b',
    fogColor: '#d9c5a9',
    hazardType: 'tremor_rift',
    hazardLabel: 'Catacomb Tremor Rift',
    hazardColor: '#f59e0b',
    hazardCenterOffset: [0, 0],
    hazardRadius: 44,
    hazardIntensity: 0.8,
    propTheme: {
      treeCount: 20,
      boulderCount: 26,
      trunkColor: 0x6b4b32,
      pineColors: [0x597a41, 0x73914d],
      oakColors: [0x788f46, 0x94a656],
      boulderColors: [0x8f7458, 0xa88a68],
      obeliskColor: 0xb87633,
      lanternColor: 0xffb84d,
    },
  },
  '0,-2': {
    key: '0,-2',
    cx: 0,
    cz: -2,
    biomeId: 'infinity',
    name: 'Infinity',
    subtitle: 'Crystalline Void Abyss',
    terrainTexture: 'shrine_stone',
    primaryColor: '#2c1e4a',
    secondaryColor: '#5a2b82',
    fogColor: '#3f2c66',
    hazardType: 'void_miasma',
    hazardLabel: 'Deathevan Void Miasma',
    hazardColor: '#c084fc',
    hazardCenterOffset: [0, 0],
    hazardRadius: 54,
    hazardIntensity: 1.0,
    propTheme: {
      treeCount: 10,
      boulderCount: 30,
      trunkColor: 0x261a3b,
      pineColors: [0x582c8f, 0x7a42bd],
      oakColors: [0x452275, 0x6838a6],
      boulderColors: [0x352554, 0x523982],
      obeliskColor: 0xa855f7,
      lanternColor: 0xe879f9,
    },
  },
};

function normalizeZero(n: number): number {
  return n === 0 ? 0 : n;
}

export function getChunkCoordsAtWorldPos(x: number, z: number): [number, number] {
  const cx = normalizeZero(Math.round(x / CHUNK_SIZE));
  const cz = normalizeZero(Math.round(z / CHUNK_SIZE));
  return [cx, cz];
}

export function getChunkKey(cx: number, cz: number): string {
  return `${normalizeZero(cx)},${normalizeZero(cz)}`;
}

function resolveNearestDefinedChunk(cx: number, cz: number): ContinentalChunkDef {
  let best = CONTINENTAL_CHUNKS['0,0'];
  let bestDist = Infinity;
  for (const def of Object.values(CONTINENTAL_CHUNKS)) {
    const d = Math.hypot(def.cx - cx, def.cz - cz);
    if (d < bestDist) {
      bestDist = d;
      best = def;
    }
  }
  return best;
}

/**
 * Returns the canonical continental chunk definition for `(cx, cz)`, or a
 * deterministic borderland extension inheriting the nearest named biome.
 */
export function getChunkDefinition(cx: number, cz: number): ContinentalChunkDef {
  const key = getChunkKey(cx, cz);
  const exact = CONTINENTAL_CHUNKS[key];
  if (exact) {
    return exact;
  }

  const nearest = resolveNearestDefinedChunk(cx, cz);
  return {
    ...nearest,
    key,
    cx: normalizeZero(cx),
    cz: normalizeZero(cz),
    name: `${nearest.name} Outskirts`,
    hazardType: 'none',
    hazardLabel: 'Borderland Frontier',
    hazardRadius: 0,
    hazardIntensity: 0,
    propTheme: {
      ...nearest.propTheme,
      hasStructures: false,
    },
  };
}

export function resolveBiomeAtWorldPos(x: number, z: number): ContinentalBiomeId {
  const [cx, cz] = getChunkCoordsAtWorldPos(x, z);
  return getChunkDefinition(cx, cz).biomeId;
}

/**
 * Evaluates active environmental hazard metadata at world position `(x, z)`.
 */
export function evaluateChunkHazardAtPos(x: number, z: number): HazardEvaluation {
  const [cx, cz] = getChunkCoordsAtWorldPos(x, z);
  const def = getChunkDefinition(cx, cz);
  const centerX = def.cx * CHUNK_SIZE + def.hazardCenterOffset[0];
  const centerZ = def.cz * CHUNK_SIZE + def.hazardCenterOffset[1];
  const distanceFromCenter = Math.hypot(x - centerX, z - centerZ);

  if (def.hazardType === 'none' || def.hazardRadius <= 0) {
    return {
      biomeId: def.biomeId,
      chunkKey: def.key,
      hazardType: 'none',
      hazardLabel: def.hazardLabel,
      intensity: 0,
      color: def.hazardColor,
      inZone: false,
      distanceFromCenter,
      hazardCenter: [centerX, centerZ],
      hazardRadius: 0,
    };
  }

  const inZone = distanceFromCenter <= def.hazardRadius;
  const falloff = inZone
    ? 1 - 0.55 * (distanceFromCenter / Math.max(1, def.hazardRadius))
    : 0;
  const intensity = Number((def.hazardIntensity * falloff).toFixed(3));

  return {
    biomeId: def.biomeId,
    chunkKey: def.key,
    hazardType: def.hazardType,
    hazardLabel: def.hazardLabel,
    intensity,
    color: def.hazardColor,
    inZone,
    distanceFromCenter,
    hazardCenter: [centerX, centerZ],
    hazardRadius: def.hazardRadius,
  };
}
