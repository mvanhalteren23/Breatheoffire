import { describe, expect, it } from 'vitest';
import type { ContinentalBiomeId } from '../src/core/types';
import {
  CHUNK_HALF,
  CHUNK_SIZE,
  CONTINENTAL_CHUNKS,
  evaluateChunkHazardAtPos,
  getChunkCoordsAtWorldPos,
  getChunkDefinition,
  getChunkKey,
  resolveBiomeAtWorldPos,
} from '../src/engine/continentalChunks';

const STREAM_RADIUS = 500;

function computeActiveWindowKeys(playerX: number, playerZ: number): string[] {
  const [pcx, pcz] = getChunkCoordsAtWorldPos(playerX, playerZ);
  const gridRadius = Math.ceil(STREAM_RADIUS / CHUNK_SIZE);
  const keys: string[] = [];

  for (let dz = -gridRadius; dz <= gridRadius; dz++) {
    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      const cx = pcx + dx;
      const cz = pcz + dz;
      const chunkCenterX = cx * CHUNK_SIZE;
      const chunkCenterZ = cz * CHUNK_SIZE;
      const clampedX = Math.max(chunkCenterX - CHUNK_HALF, Math.min(playerX, chunkCenterX + CHUNK_HALF));
      const clampedZ = Math.max(chunkCenterZ - CHUNK_HALF, Math.min(playerZ, chunkCenterZ + CHUNK_HALF));
      const dist = Math.hypot(clampedX - playerX, clampedZ - playerZ);
      if (dist <= STREAM_RADIUS) {
        keys.push(getChunkKey(cx, cz));
      }
    }
  }

  return keys;
}

describe('Continental Chunk Registry & Hazard Zones', () => {
  it('registers all 8 canonical continental biomes on the 250 m grid', () => {
    expect(CHUNK_SIZE).toBe(250);
    const expected: Array<[string, ContinentalBiomeId]> = [
      ['0,0', 'frontier'],
      ['0,-1', 'gate'],
      ['-1,-1', 'windia'],
      ['1,-1', 'highfort'],
      ['-1,0', 'simafort'],
      ['1,0', 'tunlan'],
      ['-1,1', 'capitan'],
      ['0,-2', 'infinity'],
    ];

    expect(Object.keys(CONTINENTAL_CHUNKS)).toHaveLength(expected.length);
    for (const [key, biomeId] of expected) {
      const def = CONTINENTAL_CHUNKS[key];
      expect(def).toBeDefined();
      expect(def.biomeId).toBe(biomeId);
    }
  });

  it('resolves world coordinates to the exact continental biome and hazard state', () => {
    const sampleCoords: Array<[number, number, ContinentalBiomeId]> = [
      [0, 0, 'frontier'],
      [0, -250, 'gate'],
      [-250, -250, 'windia'],
      [250, -250, 'highfort'],
      [-250, 0, 'simafort'],
      [250, 0, 'tunlan'],
      [-250, 250, 'capitan'],
      [0, -500, 'infinity'],
    ];

    for (const [wx, wz, expectedBiome] of sampleCoords) {
      expect(resolveBiomeAtWorldPos(wx, wz)).toBe(expectedBiome);
      const [cx, cz] = getChunkCoordsAtWorldPos(wx, wz);
      const def = getChunkDefinition(cx, cz);
      const hazardCenterX = def.cx * CHUNK_SIZE + def.hazardCenterOffset[0];
      const hazardCenterZ = def.cz * CHUNK_SIZE + def.hazardCenterOffset[1];
      const hazard = evaluateChunkHazardAtPos(hazardCenterX, hazardCenterZ);

      if (expectedBiome === 'frontier') {
        expect(hazard.hazardType).toBe('none');
        expect(hazard.inZone).toBe(false);
        expect(hazard.intensity).toBe(0);
      } else {
        expect(hazard.hazardType).not.toBe('none');
        expect(hazard.inZone).toBe(true);
        expect(hazard.intensity).toBeGreaterThan(0);
      }
    }
  });

  it('maintains a strictly bounded active chunk window within the 500 m streaming radius across continental traversal', () => {
    const routePoints: Array<[number, number]> = [
      [0, 0],
      [-250, 250],
      [-250, 0],
      [-250, -250],
      [0, -250],
      [250, -250],
      [250, 0],
      [0, -500],
      [900, 900],
    ];

    const simulatedCache = new Set<string>();
    for (const [x, z] of routePoints) {
      const activeKeys = computeActiveWindowKeys(x, z);
      expect(activeKeys.length).toBeGreaterThanOrEqual(9);
      expect(activeKeys.length).toBeLessThanOrEqual(25);

      const activeSet = new Set(activeKeys);
      for (const cached of [...simulatedCache]) {
        if (!activeSet.has(cached)) {
          simulatedCache.delete(cached);
        }
      }
      for (const key of activeKeys) {
        simulatedCache.add(key);
      }

      expect(simulatedCache.size).toBe(activeKeys.length);
      expect(simulatedCache.size).toBeLessThanOrEqual(25);
    }
  });
});
