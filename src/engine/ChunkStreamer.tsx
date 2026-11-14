import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ScenePrimitive } from './ScenePrimitive';
import type { ContinentalBiomeId } from '../core/types';
import {
  CHUNK_HALF,
  CHUNK_SIZE,
  type ContinentalChunkDef,
  getChunkCoordsAtWorldPos,
  getChunkDefinition,
  getChunkKey,
} from './continentalChunks';
import { getProceduralTerrainTexture } from './proceduralAssets';
import {
  createBiomeTerrainShaderMaterial,
  createWaterShaderMaterial,
  HD2D_FOG_DEFAULTS,
} from './shaders';

export { CHUNK_SIZE, CHUNK_HALF };
export const STREAM_RADIUS = 500;

export interface EngineTelemetry {
  drawCalls: number;
  triangles: number;
  activeChunks: number;
  chunkKeys: string[];
  activeBiomes: ContinentalBiomeId[];
  memoryChunksCached: number;
  fps: number;
  shadowMapSize: number;
  playerChunk: [number, number];
}

declare global {
  interface Window {
    __BOF2_TELEMETRY__?: EngineTelemetry;
  }
}

export const WORLD_LANDMARKS = {
  townshipPlot: [-26, 0, -18] as [number, number, number],
  coursairGate: [22, 0, -28] as [number, number, number],
  fishingDock: [-32, 0, 22] as [number, number, number],
  huntingTrail: [34, 0, 18] as [number, number, number],
  dragonShrine: [0, 0, -56] as [number, number, number],
} as const;

export interface ChunkStreamerProps {
  playerPosition: [number, number] | [number, number, number];
  townshipBuildings?: string[];
  shadowMapSize?: number;
  onTelemetry?: (telemetry: EngineTelemetry) => void;
}

interface InstanceTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color?: number;
}

interface ChunkPropData {
  key: string;
  cx: number;
  cz: number;
  trunks: InstanceTransform[];
  pineCrowns: InstanceTransform[];
  oakCrowns: InstanceTransform[];
  boulders: InstanceTransform[];
  fences: InstanceTransform[];
  lanternPosts: InstanceTransform[];
  lanternBulbs: InstanceTransform[];
  gateParts: InstanceTransform[];
  obelisks: InstanceTransform[];
  buildingWalls: InstanceTransform[];
  buildingRoofs: InstanceTransform[];
}

interface CachedChunkEntry {
  key: string;
  cx: number;
  cz: number;
  def: ContinentalChunkDef;
  props: ChunkPropData;
  terrainGeo: THREE.PlaneGeometry;
  terrainMat: THREE.ShaderMaterial;
  terrainMesh: THREE.Mesh;
}

function extractXZ(pos: [number, number] | [number, number, number]): [number, number] {
  return pos.length === 3 ? [pos[0], pos[2]] : [pos[0], pos[1]];
}

function hashChunk(cx: number, cz: number, salt: number): () => number {
  let s = (cx * 73856093) ^ (cz * 19349663) ^ (salt * 83492791);
  if (s === 0) s = 1234567;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function isNearClearing(wx: number, wz: number): boolean {
  if (Math.abs(wx) < 12 && wz > -68 && wz < 28) return true;
  if (Math.abs(wz + 18) < 10 && Math.abs(wx) < 38) return true;
  const clearings: Array<[number, number, number]> = [
    [-26, -18, 22],
    [22, -28, 20],
    [-32, 24, 24],
    [34, 18, 16],
    [0, -56, 20],
  ];
  for (const [lx, lz, radius] of clearings) {
    const dx = wx - lx;
    const dz = wz - lz;
    if (dx * dx + dz * dz < radius * radius) return true;
  }
  return false;
}

function normalizeBuildingId(id: string): string {
  return id.toLowerCase().replace(/[^a-z]/g, '');
}

function computeChunkData(
  cx: number,
  cz: number,
  townshipBuildings: string[],
  def: ContinentalChunkDef,
): ChunkPropData {
  const key = getChunkKey(cx, cz);
  const originX = cx * CHUNK_SIZE;
  const originZ = cz * CHUNK_SIZE;
  const rand = hashChunk(cx, cz, 42);
  const { propTheme } = def;

  const trunks: InstanceTransform[] = [];
  const pineCrowns: InstanceTransform[] = [];
  const oakCrowns: InstanceTransform[] = [];
  const boulders: InstanceTransform[] = [];
  const fences: InstanceTransform[] = [];
  const lanternPosts: InstanceTransform[] = [];
  const lanternBulbs: InstanceTransform[] = [];
  const gateParts: InstanceTransform[] = [];
  const obelisks: InstanceTransform[] = [];
  const buildingWalls: InstanceTransform[] = [];
  const buildingRoofs: InstanceTransform[] = [];

  const hazardCx = originX + def.hazardCenterOffset[0];
  const hazardCz = originZ + def.hazardCenterOffset[1];
  const hazardClearRadius = def.hazardType !== 'none' ? Math.min(20, def.hazardRadius * 0.45) : 0;

  for (let i = 0; i < propTheme.treeCount; i++) {
    const lx = (rand() - 0.5) * (CHUNK_SIZE - 16);
    const lz = (rand() - 0.5) * (CHUNK_SIZE - 16);
    const wx = originX + lx;
    const wz = originZ + lz;
    if (cx === 0 && cz === 0 && isNearClearing(wx, wz)) continue;
    if (hazardClearRadius > 0 && Math.hypot(wx - hazardCx, wz - hazardCz) < hazardClearRadius) {
      continue;
    }

    const s = 0.85 + rand() * 0.7;
    const isPine = rand() > 0.42;
    trunks.push({
      position: [wx, 1.3 * s, wz],
      rotation: [0, rand() * Math.PI * 2, 0],
      scale: [0.42 * s, 2.6 * s, 0.42 * s],
      color: propTheme.trunkColor,
    });
    if (isPine) {
      pineCrowns.push({
        position: [wx, 3.6 * s, wz],
        rotation: [0, rand() * Math.PI, 0],
        scale: [1.85 * s, 3.4 * s, 1.85 * s],
        color: rand() > 0.5 ? propTheme.pineColors[0] : propTheme.pineColors[1],
      });
    } else {
      oakCrowns.push({
        position: [wx, 3.3 * s, wz],
        rotation: [rand() * 0.2, rand() * Math.PI, rand() * 0.2],
        scale: [2.1 * s, 1.9 * s, 2.1 * s],
        color: rand() > 0.5 ? propTheme.oakColors[0] : propTheme.oakColors[1],
      });
    }
  }

  for (let i = 0; i < propTheme.boulderCount; i++) {
    const wx = originX + (rand() - 0.5) * (CHUNK_SIZE - 20);
    const wz = originZ + (rand() - 0.5) * (CHUNK_SIZE - 20);
    if (cx === 0 && cz === 0 && isNearClearing(wx, wz)) continue;
    if (hazardClearRadius > 0 && Math.hypot(wx - hazardCx, wz - hazardCz) < hazardClearRadius * 0.65) {
      continue;
    }
    const isCliff = rand() > 0.72;
    const sx = isCliff ? 3.2 + rand() * 2.5 : 1.0 + rand() * 1.4;
    const sy = isCliff ? 2.8 + rand() * 2.4 : 0.75 + rand() * 0.9;
    const sz = isCliff ? 2.6 + rand() * 2.2 : 1.0 + rand() * 1.3;
    boulders.push({
      position: [wx, sy * 0.42, wz],
      rotation: [rand() * 0.3, rand() * Math.PI * 2, rand() * 0.3],
      scale: [sx, sy, sz],
      color: isCliff ? propTheme.boulderColors[0] : propTheme.boulderColors[1],
    });
  }

  if (cx === 0 && cz === 0) {
    gateParts.push(
      { position: [18.5, 3.0, -28], rotation: [0, 0, 0], scale: [1.6, 6.0, 1.6], color: 0x8f8376 },
      { position: [25.5, 3.0, -28], rotation: [0, 0, 0], scale: [1.6, 6.0, 1.6], color: 0x8f8376 },
      { position: [22.0, 6.4, -28], rotation: [0, 0, 0], scale: [9.4, 1.3, 2.0], color: 0xa69888 },
    );

    const fencePositions: Array<[number, number, number]> = [
      [10, -22, 0],
      [14, -22, 0],
      [26, -22, 0],
      [30, -22, 0],
      [28, 13, Math.PI / 2],
      [28, 17, Math.PI / 2],
      [-20, 18, 0],
      [-24, 18, 0],
    ];
    for (const [fx, fz, rotY] of fencePositions) {
      fences.push({
        position: [fx, 0.55, fz],
        rotation: [0, rotY, 0],
        scale: [3.2, 1.1, 0.25],
        color: 0x7d5333,
      });
    }

    const lanternCoords: Array<[number, number]> = [
      [-6, -12],
      [6, -12],
      [15, -24],
      [29, -24],
      [-18, -14],
      [-30, -14],
      [-22, 16],
      [-6, -46],
      [6, -46],
    ];
    for (const [lx, lz] of lanternCoords) {
      lanternPosts.push({
        position: [lx, 1.5, lz],
        rotation: [0, 0, 0],
        scale: [0.22, 3.0, 0.22],
        color: 0x45352b,
      });
      lanternBulbs.push({
        position: [lx, 3.15, lz],
        rotation: [0, 0, 0],
        scale: [0.46, 0.52, 0.46],
        color: propTheme.lanternColor,
      });
    }

    const obeliskOffsets: Array<[number, number]> = [
      [-6.5, -6.5],
      [6.5, -6.5],
      [-6.5, 6.5],
      [6.5, 6.5],
    ];
    for (const [ox, oz] of obeliskOffsets) {
      obelisks.push({
        position: [ox, 2.75, -56 + oz],
        rotation: [0, Math.PI / 4, 0],
        scale: [1.1, 5.5, 1.1],
        color: propTheme.obeliskColor,
      });
    }

    buildingWalls.push(
      {
        position: [-26, 0.22, -18],
        rotation: [0, 0, 0],
        scale: [10.0, 0.44, 8.0],
        color: 0x8a7d6f,
      },
      {
        position: [-26, 1.8, -21],
        rotation: [0, 0, 0],
        scale: [4.4, 3.0, 3.6],
        color: 0xd4be9c,
      },
    );
    buildingRoofs.push({
      position: [-26, 4.1, -21],
      rotation: [0, Math.PI / 4, 0],
      scale: [3.8, 2.0, 3.8],
      color: 0x9c4632,
    });

    const normalized = new Set(townshipBuildings.map(normalizeBuildingId));
    const buildingSlots: Array<{
      keys: string[];
      pos: [number, number];
      wallColor: number;
      roofColor: number;
      size: [number, number, number];
    }> = [
      {
        keys: ['foundry', 'blacksmith', 'forge'],
        pos: [-34, -15],
        wallColor: 0x706c75,
        roofColor: 0xb84a27,
        size: [4.8, 3.2, 4.2],
      },
      {
        keys: ['shamanshrine', 'shrine', 'shaman'],
        pos: [-34, -24],
        wallColor: 0xd9d2c5,
        roofColor: 0x3b6ea8,
        size: [4.2, 3.8, 4.2],
      },
      {
        keys: ['inn', 'tavern'],
        pos: [-18, -14],
        wallColor: 0xdec69e,
        roofColor: 0x7d3b2b,
        size: [5.4, 3.6, 4.4],
      },
      {
        keys: ['apothecary', 'herbshop', 'clinic'],
        pos: [-18, -24],
        wallColor: 0xc2d1b4,
        roofColor: 0x3f784c,
        size: [4.2, 3.0, 3.8],
      },
    ];

    for (const slot of buildingSlots) {
      const unlocked = slot.keys.some((k) =>
        Array.from(normalized).some((entry) => entry.includes(k)),
      );
      if (!unlocked) continue;
      const [bx, bz] = slot.pos;
      const [bw, bh, bd] = slot.size;
      buildingWalls.push({
        position: [bx, bh * 0.5, bz],
        rotation: [0, 0, 0],
        scale: [bw, bh, bd],
        color: slot.wallColor,
      });
      buildingRoofs.push({
        position: [bx, bh + 1.05, bz],
        rotation: [0, Math.PI / 4, 0],
        scale: [Math.max(bw, bd) * 0.85, 2.2, Math.max(bw, bd) * 0.85],
        color: slot.roofColor,
      });
    }
  } else {
    // Continental biome focal landmarks & hazard perimeter pylons
    if (def.hazardType !== 'none' && def.hazardRadius > 0) {
      const ringDist = Math.max(16, def.hazardRadius * 0.52);
      const pylonCount = 4;
      for (let i = 0; i < pylonCount; i++) {
        const angle = (i * Math.PI * 2) / pylonCount + Math.PI / 4;
        const px = hazardCx + Math.cos(angle) * ringDist;
        const pz = hazardCz + Math.sin(angle) * ringDist;
        obelisks.push({
          position: [px, 2.6, pz],
          rotation: [0, angle, 0],
          scale: [1.0, 5.2, 1.0],
          color: propTheme.obeliskColor,
        });
        lanternPosts.push({
          position: [px * 1.0, 1.5, pz * 1.0],
          rotation: [0, 0, 0],
          scale: [0.22, 3.0, 0.22],
          color: propTheme.trunkColor,
        });
        lanternBulbs.push({
          position: [px, 5.4, pz],
          rotation: [0, 0, 0],
          scale: [0.6, 0.6, 0.6],
          color: propTheme.lanternColor,
        });
      }
    }

    for (let i = 0; i < 3; i++) {
      const fx = originX + (rand() - 0.5) * 160;
      const fz = originZ + (rand() - 0.5) * 160;
      fences.push({
        position: [fx, 0.55, fz],
        rotation: [0, rand() * Math.PI, 0],
        scale: [3.2, 1.1, 0.25],
        color: propTheme.trunkColor,
      });
    }

    const lx = originX + (rand() - 0.5) * 120;
    const lz = originZ + (rand() - 0.5) * 120;
    lanternPosts.push({
      position: [lx, 1.5, lz],
      rotation: [0, 0, 0],
      scale: [0.22, 3.0, 0.22],
      color: 0x45352b,
    });
    lanternBulbs.push({
      position: [lx, 3.15, lz],
      rotation: [0, 0, 0],
      scale: [0.46, 0.52, 0.46],
      color: propTheme.lanternColor,
    });
  }

  return {
    key,
    cx,
    cz,
    trunks,
    pineCrowns,
    oakCrowns,
    boulders,
    fences,
    lanternPosts,
    lanternBulbs,
    gateParts,
    obelisks,
    buildingWalls,
    buildingRoofs,
  };
}

const sharedTerrainGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 1, 1);

function createCachedChunkEntry(
  cx: number,
  cz: number,
  townshipBuildings: string[],
  fogColor: string,
): CachedChunkEntry {
  const def = getChunkDefinition(cx, cz);
  const props = computeChunkData(cx, cz, townshipBuildings, def);
  const terrainGeo = sharedTerrainGeo;
  const baseTex = getProceduralTerrainTexture(def.terrainTexture, 1);
  const hazardCenter: [number, number] = [
    cx * CHUNK_SIZE + def.hazardCenterOffset[0],
    cz * CHUNK_SIZE + def.hazardCenterOffset[1],
  ];

  const terrainMat = createBiomeTerrainShaderMaterial({
    map: baseTex,
    primaryColor: def.primaryColor,
    secondaryColor: def.secondaryColor,
    hazardCenter,
    hazardRadius: def.hazardRadius,
    hazardColor: def.hazardColor,
    hazardIntensity: def.hazardIntensity,
    fogColor,
    fogNear: HD2D_FOG_DEFAULTS.near,
    fogFar: HD2D_FOG_DEFAULTS.far,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.rotation.x = -Math.PI / 2;
  terrainMesh.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
  terrainMesh.receiveShadow = true;
  terrainMesh.userData = {
    isGround: true,
    chunkKey: def.key,
    biomeId: def.biomeId,
  };

  return {
    key: def.key,
    cx,
    cz,
    def,
    props,
    terrainGeo,
    terrainMat,
    terrainMesh,
  };
}

function disposeCachedChunkEntry(
  entry: CachedChunkEntry,
  terrainGroup: THREE.Group,
): void {
  terrainGroup.remove(entry.terrainMesh);
  // sharedTerrainGeo is reused across all streamed chunks; dispose per-chunk shader material only
  entry.terrainMat.dispose();
}

export interface DrawCallBudgetBreakdown {
  chunkKey: string;
  biomeId: ContinentalBiomeId;
  activeChunksInRadius: number;
  instancedBatchCalls: number;
  frontierLandmarkCalls: number;
  hazardCalls: number;
  spriteAndShadowCalls: number;
  markerCalls: number;
  mainPassCalls: number;
  shadowPassCalls: number;
  totalCalls: number;
  withinMobileBudget: boolean;
}

/**
 * Computes exact upper-bound WebGL draw calls at biome chunk `(cx, cz)` across all
 * active 500m-radius terrain tiles, non-empty pooled InstancedMeshes, culled sprites,
 * terrain markers, and directional shadow pass.
 */
export function estimateBiomeDrawCallBudget(options: {
  cx: number;
  cz: number;
  townshipBuildings?: string[];
  visibleNpcCount: number;
  visibleEnemyCount: number;
  visibleMarkerCount: number;
  activePartyCount?: number;
  includeShadowPass?: boolean;
}): DrawCallBudgetBreakdown {
  const {
    cx,
    cz,
    townshipBuildings = [],
    visibleNpcCount,
    visibleEnemyCount,
    visibleMarkerCount,
    activePartyCount = 3,
    includeShadowPass = true,
  } = options;

  const px = cx * CHUNK_SIZE;
  const pz = cz * CHUNK_SIZE;
  const maxOffset = Math.ceil(STREAM_RADIUS / CHUNK_SIZE);
  const activeDefs: ContinentalChunkDef[] = [];

  for (let dx = -maxOffset; dx <= maxOffset; dx++) {
    for (let dz = -maxOffset; dz <= maxOffset; dz++) {
      const ncx = cx + dx;
      const ncz = cz + dz;
      const centerDist = Math.hypot(ncx * CHUNK_SIZE - px, ncz * CHUNK_SIZE - pz);
      if (centerDist <= STREAM_RADIUS || (dx === 0 && dz === 0)) {
        activeDefs.push(getChunkDefinition(ncx, ncz));
      }
    }
  }

  let hasTrunks = false;
  let hasPines = false;
  let hasOaks = false;
  let hasBoulders = false;
  let hasFences = false;
  let hasPosts = false;
  let hasBulbs = false;
  let hasGates = false;
  let hasObelisks = false;
  let hasWalls = false;
  let hasRoofs = false;
  let hasFrontierLandmarks = false;

  for (const def of activeDefs) {
    if (def.cx === 0 && def.cz === 0) {
      hasFrontierLandmarks = true;
    }
    const p = computeChunkData(def.cx, def.cz, townshipBuildings, def);
    if (p.trunks.length > 0) hasTrunks = true;
    if (p.pineCrowns.length > 0) hasPines = true;
    if (p.oakCrowns.length > 0) hasOaks = true;
    if (p.boulders.length > 0) hasBoulders = true;
    if (p.fences.length > 0) hasFences = true;
    if (p.lanternPosts.length > 0) hasPosts = true;
    if (p.lanternBulbs.length > 0) hasBulbs = true;
    if (p.gateParts.length > 0) hasGates = true;
    if (p.obelisks.length > 0) hasObelisks = true;
    if (p.buildingWalls.length > 0) hasWalls = true;
    if (p.buildingRoofs.length > 0) hasRoofs = true;
  }

  const instancedBatchCalls = [
    hasTrunks,
    hasPines,
    hasOaks,
    hasBoulders,
    hasFences,
    hasPosts,
    hasBulbs,
    hasGates,
    hasObelisks,
    hasWalls,
    hasRoofs,
  ].filter(Boolean).length;

  const instancedShadowCasters = [
    hasTrunks,
    hasPines,
    hasOaks,
    hasBoulders,
    hasFences,
    hasPosts,
    hasGates,
    hasObelisks,
    hasWalls,
    hasRoofs,
  ].filter(Boolean).length;

  const standingDef = getChunkDefinition(cx, cz);
  const frontierLandmarkCalls = hasFrontierLandmarks ? 6 : 0;
  const frontierLandmarkShadowCalls = hasFrontierLandmarks ? 2 : 0;
  const hazardCalls = standingDef.hazardType !== 'none' && standingDef.hazardRadius > 0 ? 2 : 0;

  const billboardCount = activePartyCount + visibleNpcCount + visibleEnemyCount;
  // Each BillboardSprite draws billboard plane + shadow disc (+ optional active selection ring)
  const spriteAndShadowCalls = billboardCount * 2 + 1;
  const markerCalls = visibleMarkerCount * 2;

  const mainPassCalls =
    activeDefs.length +
    instancedBatchCalls +
    frontierLandmarkCalls +
    hazardCalls +
    spriteAndShadowCalls +
    markerCalls;

  const shadowPassCalls = includeShadowPass
    ? instancedShadowCasters + frontierLandmarkShadowCalls + billboardCount
    : 0;

  const totalCalls = mainPassCalls + shadowPassCalls;

  return {
    chunkKey: standingDef.key,
    biomeId: standingDef.biomeId,
    activeChunksInRadius: activeDefs.length,
    instancedBatchCalls,
    frontierLandmarkCalls,
    hazardCalls,
    spriteAndShadowCalls,
    markerCalls,
    mainPassCalls,
    shadowPassCalls,
    totalCalls,
    withinMobileBudget: totalCalls < 150,
  };
}

const MAX_TRUNKS = 768;
const MAX_CROWNS = 640;
const MAX_BOULDERS = 512;
const MAX_FENCES = 128;
const MAX_LANTERNS = 96;
const MAX_STRUCTURES = 128;

const tempObj = new THREE.Object3D();
const tempColor = new THREE.Color();

function applyInstances(
  mesh: THREE.InstancedMesh,
  items: InstanceTransform[],
): void {
  const count = Math.min(items.length, mesh.instanceMatrix.count);
  mesh.count = count;
  for (let i = 0; i < count; i++) {
    const it = items[i];
    tempObj.position.set(it.position[0], it.position[1], it.position[2]);
    tempObj.rotation.set(it.rotation[0], it.rotation[1], it.rotation[2]);
    tempObj.scale.set(it.scale[0], it.scale[1], it.scale[2]);
    tempObj.updateMatrix();
    mesh.setMatrixAt(i, tempObj.matrix);
    if (it.color !== undefined) {
      tempColor.setHex(it.color);
      mesh.setColorAt(i, tempColor);
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }
}

export const ChunkStreamer: React.FC<ChunkStreamerProps> = ({
  playerPosition,
  townshipBuildings = [],
  shadowMapSize = 2048,
  onTelemetry,
}) => {
  const { gl } = useThree();
  const [px, pz] = extractXZ(playerPosition);
  const [pcx, pcz] = getChunkCoordsAtWorldPos(px, pz);
  const currentChunkDef = getChunkDefinition(pcx, pcz);

  const waterMaterial = useMemo(
    () =>
      createWaterShaderMaterial({
        fogColor: HD2D_FOG_DEFAULTS.color,
        fogNear: HD2D_FOG_DEFAULTS.near,
        fogFar: HD2D_FOG_DEFAULTS.far,
      }),
    [],
  );

  const sceneNodes = useMemo(() => {
    const root = new THREE.Group();
    const terrainGroup = new THREE.Group();
    const frontierLandmarksGroup = new THREE.Group();

    const cobbleTex = getProceduralTerrainTexture('cobble_coursair', 8);
    const shrineTex = getProceduralTerrainTexture('shrine_stone', 4);

    const geos = {
      cylinder: new THREE.CylinderGeometry(0.45, 0.65, 1, 7),
      cone: new THREE.ConeGeometry(1, 1, 7),
      dodeca: new THREE.DodecahedronGeometry(0.85, 0),
      box: new THREE.BoxGeometry(1, 1, 1),
      roof: new THREE.ConeGeometry(1, 1, 4),
      plaza: new THREE.PlaneGeometry(34, 34),
      roadNS: new THREE.PlaneGeometry(8, 86),
      roadEW: new THREE.PlaneGeometry(58, 7),
      shrineDais: new THREE.BoxGeometry(18, 0.35, 18),
      water: new THREE.PlaneGeometry(34, 28, 24, 20),
      dock: new THREE.BoxGeometry(4.2, 0.22, 8.5),
    };

    const mats = {
      cobble: new THREE.MeshStandardMaterial({ map: cobbleTex, roughness: 0.88 }),
      shrine: new THREE.MeshStandardMaterial({ map: shrineTex, roughness: 0.78 }),
      dock: new THREE.MeshStandardMaterial({ color: '#7d5634', roughness: 0.9 }),
      wood: new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.05 }),
      foliage: new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }),
      stone: new THREE.MeshStandardMaterial({ roughness: 0.92, flatShading: true }),
      lanternGlow: new THREE.MeshBasicMaterial({ color: '#ffd56b' }),
      obelisk: new THREE.MeshStandardMaterial({
        roughness: 0.45,
        metalness: 0.25,
        emissive: new THREE.Color('#19384d'),
        emissiveIntensity: 0.55,
      }),
      wall: new THREE.MeshStandardMaterial({ roughness: 0.82 }),
      roof: new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true }),
    };

    const plazaMesh = new THREE.Mesh(geos.plaza, mats.cobble);
    plazaMesh.rotation.x = -Math.PI / 2;
    plazaMesh.position.set(22, 0.02, -24);
    plazaMesh.receiveShadow = true;

    const roadNSMesh = new THREE.Mesh(geos.roadNS, mats.cobble);
    roadNSMesh.rotation.x = -Math.PI / 2;
    roadNSMesh.position.set(0, 0.015, -14);
    roadNSMesh.receiveShadow = true;

    const roadEWMesh = new THREE.Mesh(geos.roadEW, mats.cobble);
    roadEWMesh.rotation.x = -Math.PI / 2;
    roadEWMesh.position.set(-2, 0.018, -18);
    roadEWMesh.receiveShadow = true;

    const shrineDaisMesh = new THREE.Mesh(geos.shrineDais, mats.shrine);
    shrineDaisMesh.position.set(0, 0.175, -56);
    shrineDaisMesh.receiveShadow = true;
    shrineDaisMesh.castShadow = true;

    const waterMesh = new THREE.Mesh(geos.water, waterMaterial);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(-32, 0.06, 26);

    const dockMesh = new THREE.Mesh(geos.dock, mats.dock);
    dockMesh.position.set(-32, 0.22, 16.5);
    dockMesh.castShadow = true;
    dockMesh.receiveShadow = true;

    frontierLandmarksGroup.add(
      plazaMesh,
      roadNSMesh,
      roadEWMesh,
      shrineDaisMesh,
      waterMesh,
      dockMesh,
    );

    const makeInstanced = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      maxCount: number,
      castShadow: boolean,
      receiveShadow: boolean,
    ) => {
      const m = new THREE.InstancedMesh(geo, mat, maxCount);
      m.castShadow = castShadow;
      m.receiveShadow = receiveShadow;
      m.frustumCulled = false;
      m.count = 0;
      return m;
    };

    const instanced = {
      trunks: makeInstanced(geos.cylinder, mats.wood, MAX_TRUNKS, true, true),
      pines: makeInstanced(geos.cone, mats.foliage, MAX_CROWNS, true, true),
      oaks: makeInstanced(geos.dodeca, mats.foliage, MAX_CROWNS, true, true),
      boulders: makeInstanced(geos.dodeca, mats.stone, MAX_BOULDERS, true, true),
      fences: makeInstanced(geos.box, mats.wood, MAX_FENCES, true, true),
      lanternPosts: makeInstanced(geos.cylinder, mats.wood, MAX_LANTERNS, true, false),
      lanternBulbs: makeInstanced(geos.box, mats.lanternGlow, MAX_LANTERNS, false, false),
      gates: makeInstanced(geos.box, mats.stone, MAX_STRUCTURES, true, true),
      obelisks: makeInstanced(geos.cylinder, mats.obelisk, MAX_STRUCTURES, true, true),
      walls: makeInstanced(geos.box, mats.wall, MAX_STRUCTURES, true, true),
      roofs: makeInstanced(geos.roof, mats.roof, MAX_STRUCTURES, true, true),
    };

    root.add(
      terrainGroup,
      frontierLandmarksGroup,
      instanced.trunks,
      instanced.pines,
      instanced.oaks,
      instanced.boulders,
      instanced.fences,
      instanced.lanternPosts,
      instanced.lanternBulbs,
      instanced.gates,
      instanced.obelisks,
      instanced.walls,
      instanced.roofs,
    );

    return { root, terrainGroup, frontierLandmarksGroup, instanced, geos, mats };
  }, [waterMaterial]);

  const chunkCacheRef = useRef<Map<string, CachedChunkEntry>>(new Map());
  const [chunkRevision, setChunkRevision] = useState(0);
  const buildingsKey = townshipBuildings.join('|');

  // Synchronously seed the standing chunk on first mount so frame 1 always renders terrain
  if (chunkCacheRef.current.size === 0) {
    const seedEntry = createCachedChunkEntry(
      pcx,
      pcz,
      townshipBuildings,
      currentChunkDef.fogColor,
    );
    sceneNodes.terrainGroup.add(seedEntry.terrainMesh);
    chunkCacheRef.current.set(seedEntry.key, seedEntry);
  }

  // Stream chunks within STREAM_RADIUS (500m) and evict + dispose unloaded chunks
  useEffect(() => {
    let cancelled = false;

    const maxOffset = Math.ceil(STREAM_RADIUS / CHUNK_SIZE);
    const targetCoords: Array<[number, number]> = [];
    for (let dx = -maxOffset; dx <= maxOffset; dx++) {
      for (let dz = -maxOffset; dz <= maxOffset; dz++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const centerDist = Math.hypot(cx * CHUNK_SIZE - px, cz * CHUNK_SIZE - pz);
        if (centerDist <= STREAM_RADIUS || (cx === pcx && cz === pcz)) {
          targetCoords.push([cx, cz]);
        }
      }
    }

    const targetKeys = new Set(targetCoords.map(([cx, cz]) => getChunkKey(cx, cz)));

    const syncStreamedChunks = () => {
      if (cancelled) return;
      const cache = chunkCacheRef.current;
      let changed = false;

      // Evict chunks outside STREAM_RADIUS and explicitly dispose WebGL buffers/materials
      for (const [key, entry] of Array.from(cache.entries())) {
        if (!targetKeys.has(key)) {
          disposeCachedChunkEntry(entry, sceneNodes.terrainGroup);
          cache.delete(key);
          changed = true;
        }
      }

      // Stream in newly entering chunks
      for (const [cx, cz] of targetCoords) {
        const key = getChunkKey(cx, cz);
        const existing = cache.get(key);
        if (!existing) {
          const entry = createCachedChunkEntry(
            cx,
            cz,
            townshipBuildings,
            currentChunkDef.fogColor,
          );
          sceneNodes.terrainGroup.add(entry.terrainMesh);
          cache.set(key, entry);
          changed = true;
        } else if (key === '0,0') {
          existing.props = computeChunkData(0, 0, townshipBuildings, existing.def);
          changed = true;
        }
      }

      // Keep fog color synchronized across active chunk materials to avoid horizon seams
      for (const entry of cache.values()) {
        entry.terrainMat.uniforms.uFogColor.value.set(currentChunkDef.fogColor);
      }
      waterMaterial.uniforms.uFogColor.value.set(currentChunkDef.fogColor);

      if (changed) {
        setChunkRevision((r) => r + 1);
      }
    };

    const timerId = window.setTimeout(syncStreamedChunks, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [
    pcx,
    pcz,
    px,
    pz,
    buildingsKey,
    townshipBuildings,
    currentChunkDef.fogColor,
    sceneNodes,
    waterMaterial,
  ]);

  // Apply batched instanced prop transforms across all active cached chunks
  useEffect(() => {
    const cache = chunkCacheRef.current;
    sceneNodes.frontierLandmarksGroup.visible = cache.has('0,0');

    const trunks: InstanceTransform[] = [];
    const pines: InstanceTransform[] = [];
    const oaks: InstanceTransform[] = [];
    const boulders: InstanceTransform[] = [];
    const fences: InstanceTransform[] = [];
    const posts: InstanceTransform[] = [];
    const bulbs: InstanceTransform[] = [];
    const gates: InstanceTransform[] = [];
    const obelisks: InstanceTransform[] = [];
    const walls: InstanceTransform[] = [];
    const roofs: InstanceTransform[] = [];

    for (const entry of cache.values()) {
      const c = entry.props;
      trunks.push(...c.trunks);
      pines.push(...c.pineCrowns);
      oaks.push(...c.oakCrowns);
      boulders.push(...c.boulders);
      fences.push(...c.fences);
      posts.push(...c.lanternPosts);
      bulbs.push(...c.lanternBulbs);
      gates.push(...c.gateParts);
      obelisks.push(...c.obelisks);
      walls.push(...c.buildingWalls);
      roofs.push(...c.buildingRoofs);
    }

    const { instanced } = sceneNodes;
    applyInstances(instanced.trunks, trunks);
    applyInstances(instanced.pines, pines);
    applyInstances(instanced.oaks, oaks);
    applyInstances(instanced.boulders, boulders);
    applyInstances(instanced.fences, fences);
    applyInstances(instanced.lanternPosts, posts);
    applyInstances(instanced.lanternBulbs, bulbs);
    applyInstances(instanced.gates, gates);
    applyInstances(instanced.obelisks, obelisks);
    applyInstances(instanced.walls, walls);
    applyInstances(instanced.roofs, roofs);
  }, [chunkRevision, sceneNodes]);

  // Explicit disposal of all cached chunk meshes, instanced meshes, geometries, and materials on unmount
  useEffect(() => {
    const cache = chunkCacheRef.current;
    return () => {
      for (const entry of cache.values()) {
        disposeCachedChunkEntry(entry, sceneNodes.terrainGroup);
      }
      cache.clear();
      Object.values(sceneNodes.instanced).forEach((m) => m.dispose());
      Object.values(sceneNodes.geos).forEach((g) => g.dispose());
      Object.values(sceneNodes.mats).forEach((m) => m.dispose());
      waterMaterial.dispose();
    };
  }, [sceneNodes, waterMaterial]);

  const fpsSmoothRef = useRef(60);
  const lastReportRef = useRef(0);

  const { activeChunkKeys, activeBiomes, memoryChunksCached } = useMemo(() => {
    const entries = Array.from(chunkCacheRef.current.values());
    const keys = entries.map((e) => e.key);
    const biomes = Array.from(new Set(entries.map((e) => e.def.biomeId)));
    return {
      activeChunkKeys: keys,
      activeBiomes: biomes,
      memoryChunksCached: entries.length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunkRevision]);

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime;
    waterMaterial.uniforms.uTime.value = elapsed;

    for (const entry of chunkCacheRef.current.values()) {
      entry.terrainMat.uniforms.uTime.value = elapsed;
    }

    if (delta > 0) {
      const instantFps = Math.min(120, 1 / delta);
      fpsSmoothRef.current = fpsSmoothRef.current * 0.9 + instantFps * 0.1;
    }

    const telemetry: EngineTelemetry = {
      drawCalls: gl.info.render.calls,
      triangles: gl.info.render.triangles,
      activeChunks: activeChunkKeys.length,
      chunkKeys: activeChunkKeys,
      activeBiomes,
      memoryChunksCached,
      fps: Math.round(fpsSmoothRef.current),
      shadowMapSize,
      playerChunk: [pcx, pcz],
    };
    window.__BOF2_TELEMETRY__ = telemetry;

    if (onTelemetry && elapsed - lastReportRef.current > 0.25) {
      lastReportRef.current = elapsed;
      onTelemetry(telemetry);
    }
  });

  return <ScenePrimitive object={sceneNodes.root} />;
};
