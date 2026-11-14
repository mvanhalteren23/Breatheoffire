import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { BIOME_LANDMARKS, OVERWORLD_ENEMY_SPAWNS } from '../src/data/verticalSliceContent';
import {
  CHUNK_SIZE,
  CONTINENTAL_CHUNKS,
} from '../src/engine/continentalChunks';
import { estimateBiomeDrawCallBudget } from '../src/engine/ChunkStreamer';
import {
  clearProceduralAssetCache,
  getPackedSpriteAtlas,
  getProceduralTerrainTexture,
  getSpriteAtlasCellUv,
  getTextureAtlasCompressionReport,
  quantizeRgbaTo4444,
} from '../src/engine/proceduralAssets';
import {
  clearHapticHistory,
  getHapticHistory,
  initializeMobileDeviceShell,
  triggerFishingBiteHaptic,
} from '../src/systems/capacitorBridge';
import { useGameStore } from '../src/systems/gameStore';

const ROOT_DIR = path.resolve(process.cwd());
const VIEW_CULL_RADIUS = 165;

describe('Capacitor Mobile Shell & Native Configs', () => {
  it('configures landscape orientation lock, status bar hiding, and vibration permission on iOS & Android', async () => {
    const infoPlist = fs.readFileSync(
      path.join(ROOT_DIR, 'ios/App/App/Info.plist'),
      'utf-8',
    );
    expect(infoPlist).toContain('<string>UIInterfaceOrientationLandscapeLeft</string>');
    expect(infoPlist).toContain('<string>UIInterfaceOrientationLandscapeRight</string>');
    expect(infoPlist).not.toContain('<string>UIInterfaceOrientationPortrait</string>');
    expect(infoPlist).toContain('<key>UIStatusBarHidden</key>');
    expect(infoPlist).toContain('<key>UIViewControllerBasedStatusBarAppearance</key>');

    const manifest = fs.readFileSync(
      path.join(ROOT_DIR, 'android/app/src/main/AndroidManifest.xml'),
      'utf-8',
    );
    expect(manifest).toContain('android:screenOrientation="sensorLandscape"');
    expect(manifest).toContain('android.permission.VIBRATE');

    const status = await initializeMobileDeviceShell();
    expect(status.platform).toBe('web');
  });
});

describe('Haptic Feedback Triggers (Combat Hits, Shaman Fusions, Fishing Bites)', () => {
  beforeEach(() => {
    clearHapticHistory();
    useGameStore.getState().resetGame();
  });

  it('emits haptics on combat hits, shaman fusions, and fishing bites/catches', async () => {
    const store = useGameStore.getState();

    // 1. Shaman fusion & unfusion
    store.toggleShamanFusion('katt', 'sana');
    store.toggleShamanFusion('katt', 'sana');

    // 2. Combat turn resolving party attack hits
    store.startEncounter('harpy_scout', 'enemy_harpy_test');
    const combat = useGameStore.getState().combatState;
    expect(combat).not.toBeNull();
    const targetEnemyId = combat!.enemies[0].instanceId;
    store.submitCombatCommand('ryu', 'ryu_flame_edge', [targetEnemyId]);
    store.runCombatTurn(() => 0.5);

    // 3. Fishing bite cue & completed catch
    await triggerFishingBiteHaptic('bite');
    store.castFishingLine(0.95);

    await Promise.resolve();
    const kinds = getHapticHistory().map((h) => h.kind);
    expect(kinds).toContain('shaman_fuse');
    expect(kinds).toContain('shaman_unfuse');
    expect(
      kinds.includes('combat_hit') ||
        kinds.includes('combat_heavy') ||
        kinds.includes('combat_armor_break'),
    ).toBe(true);
    expect(kinds).toContain('fishing_bite');
    expect(kinds).toContain('fishing_catch');
  });
});

describe('Compressed Texture Atlases (16-bit RGBA4444)', () => {
  beforeEach(() => {
    clearProceduralAssetCache();
  });

  it('packs RGBA8 channels cleanly to RGBA4444 and achieves > 75% VRAM reduction', () => {
    const rgba = new Uint8ClampedArray([255, 0, 128, 255, 0, 255, 0, 17]);
    const packed = quantizeRgbaTo4444(rgba, 2, 1, false);
    expect(packed instanceof Uint16Array).toBe(true);
    expect(packed.length).toBe(2);
    // Pixel 0: R=15, G=0, B=8, A=15 -> 0xf08f
    expect(packed[0]).toBe(0xf08f);
    // Pixel 1: R=0, G=15, B=0, A=1 -> 0x0f01
    expect(packed[1]).toBe(0x0f01);

    const atlas = getPackedSpriteAtlas();
    expect(atlas.texture.format).toBe(THREE.RGBAFormat);
    expect(atlas.texture.type).toBe(THREE.UnsignedShort4444Type);
    expect(Object.keys(atlas.regions).length).toBe(19);

    const terrain = getProceduralTerrainTexture('grass_frontier', 1);
    expect(terrain.format).toBe(THREE.RGBAFormat);
    expect(terrain.type).toBe(THREE.UnsignedShort4444Type);

    const ryuCell = getSpriteAtlasCellUv('ryu', 0, 1);
    const bleuCell = getSpriteAtlasCellUv('bleu', 2, 3);
    expect(ryuCell.uOffset).toBeGreaterThanOrEqual(0);
    expect(ryuCell.uOffset + ryuCell.uScale).toBeLessThanOrEqual(1);
    expect(bleuCell.uOffset !== ryuCell.uOffset || bleuCell.vOffset !== ryuCell.vOffset).toBe(true);

    const report = getTextureAtlasCompressionReport();
    expect(report.savingsPercent).toBeGreaterThan(75);
    expect(report.textureBindsAfter).toBe(5);
    expect(report.textureBindsBefore).toBe(23);
  });
});

describe('Per-Biome Draw Call Budget Verification (< 150 Draw Calls Across All 8 Biomes)', () => {
  it('stays strictly below 150 draw calls (including directional shadow pass) across every biome chunk', () => {
    const chunks = Object.values(CONTINENTAL_CHUNKS);
    expect(chunks.length).toBe(8);

    const sampleNpcs: Array<[number, number]> = [
      [-2.5, -49],
      [-62, 44],
      [-8, 2],
      [54, 34],
    ];

    for (const def of chunks) {
      const px = def.cx * CHUNK_SIZE;
      const pz = def.cz * CHUNK_SIZE;

      const visibleMarkerCount = BIOME_LANDMARKS.filter(
        (lm) => Math.hypot(lm.position[0] - px, lm.position[2] - pz) <= VIEW_CULL_RADIUS,
      ).length;
      const visibleEnemyCount = OVERWORLD_ENEMY_SPAWNS.filter(
        (e) => Math.hypot(e.homePos[0] - px, e.homePos[2] - pz) <= VIEW_CULL_RADIUS,
      ).length;
      const visibleNpcCount = sampleNpcs.filter(
        ([nx, nz]) => Math.hypot(nx - px, nz - pz) <= VIEW_CULL_RADIUS,
      ).length;

      const breakdown = estimateBiomeDrawCallBudget({
        cx: def.cx,
        cz: def.cz,
        townshipBuildings: ['building_foundry', 'building_shrine', 'building_inn', 'building_apothecary'],
        visibleNpcCount,
        visibleEnemyCount,
        visibleMarkerCount,
        activePartyCount: 3,
        includeShadowPass: true,
      });

      expect(breakdown.totalCalls).toBeLessThan(150);
      expect(breakdown.withinMobileBudget).toBe(true);
    }
  });
});
