import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ScenePrimitive } from './ScenePrimitive';
import type { TerrainTag } from '../core/types';
import { BillboardSprite } from './BillboardSprite';
import {
  ChunkStreamer,
  EngineTelemetry,
  WORLD_LANDMARKS,
} from './ChunkStreamer';
import {
  evaluateChunkHazardAtPos,
  getChunkCoordsAtWorldPos,
  getChunkDefinition,
} from './continentalChunks';
import { HD2D_FOG_DEFAULTS } from './shaders';
import { CameraMode, SpringArmCamera } from './SpringArmCamera';

export interface WorldEntityProp {
  id: string;
  spriteId: string;
  name?: string;
  position: [number, number, number];
  facingAngle?: number;
  isMoving?: boolean;
  scale?: number;
  auraColor?: string | null;
  auraIntensity?: number;
  hitFlash?: number;
}

export interface WorldInteractableProp {
  id: string;
  label: string;
  terrainTag: TerrainTag;
  position: [number, number, number];
  color?: string;
}

export interface WorldSceneProps {
  mode?: CameraMode;
  playerPosition?: [number, number, number];
  playerFacing?: number;
  playerIsMoving?: boolean;
  playerSpriteId?: string;
  playerAuraColor?: string | null;
  playerAuraIntensity?: number;
  playerHitFlash?: number;
  partyMembers?: WorldEntityProp[];
  enemies?: WorldEntityProp[];
  npcs?: WorldEntityProp[];
  interactables?: WorldInteractableProp[];
  townshipBuildings?: string[];
  activeCombatActorId?: string | null;
  combatAnchor?: [number, number, number];
  onEntityClick?: (id: string, kind: 'party' | 'npc' | 'enemy' | 'interactable') => void;
  onGroundClick?: (point: [number, number, number]) => void;
  onTelemetry?: (telemetry: EngineTelemetry) => void;
  mobileLowPower?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const DEFAULT_WORLD_NPCS: WorldEntityProp[] = [
  {
    id: 'npc_sana',
    spriteId: 'sana',
    name: 'Sana (Flame Shaman)',
    position: [-2.5, 0, -51],
    facingAngle: 0,
    auraColor: '#ff7029',
    auraIntensity: 0.75,
  },
  {
    id: 'npc_seso',
    spriteId: 'seso',
    name: 'Seso (Water Shaman)',
    position: [2.5, 0, -51],
    facingAngle: 0,
    auraColor: '#40c8ff',
    auraIntensity: 0.75,
  },
  {
    id: 'npc_hanz',
    spriteId: 'citizen',
    name: 'Hanz (Township Steward)',
    position: [-23, 0, -14],
    facingAngle: 0.35,
  },
  {
    id: 'npc_steva_investigator',
    spriteId: 'citizen',
    name: 'St. Eva Investigator',
    position: [19, 0, -23],
    facingAngle: -0.4,
  },
];

export const DEFAULT_WORLD_ENEMIES: WorldEntityProp[] = [
  {
    id: 'enemy_goblin_1',
    spriteId: 'k_goblin',
    name: 'K.Goblin',
    position: [31, 0, 14],
    facingAngle: -1.1,
    isMoving: true,
  },
  {
    id: 'enemy_harpy_1',
    spriteId: 'harpy',
    name: 'Harpy',
    position: [38, 0, 22],
    facingAngle: -2.2,
    isMoving: true,
  },
  {
    id: 'enemy_augus_1',
    spriteId: 'augus',
    name: 'Augus',
    position: [22, 0, -35],
    facingAngle: 0,
    scale: 2.25,
    auraColor: '#9c27b0',
    auraIntensity: 0.6,
  },
];

export const DEFAULT_WORLD_INTERACTABLES: WorldInteractableProp[] = [
  {
    id: 'marker_fishing_dock',
    label: 'Fishing Dock',
    terrainTag: 'FISHING_SPOT',
    position: WORLD_LANDMARKS.fishingDock,
    color: '#38bdf8',
  },
  {
    id: 'marker_hunting_trail',
    label: 'Hunting Trail',
    terrainTag: 'HUNTING_TRAIL',
    position: WORLD_LANDMARKS.huntingTrail,
    color: '#4ade80',
  },
  {
    id: 'marker_dragon_shrine',
    label: 'Dragon Shrine',
    terrainTag: 'DRAGON_SHRINE',
    position: WORLD_LANDMARKS.dragonShrine,
    color: '#facc15',
  },
  {
    id: 'marker_coursair_gate',
    label: 'Coursair Gate',
    terrainTag: 'COURSAIR_GATE',
    position: WORLD_LANDMARKS.coursairGate,
    color: '#fb923c',
  },
  {
    id: 'marker_township_plot',
    label: 'Township Plot',
    terrainTag: 'TOWNSHIP_PLOT',
    position: WORLD_LANDMARKS.townshipPlot,
    color: '#a78bfa',
  },
];

interface AtmosphereAndLightsProps {
  targetPosition: [number, number, number];
  shadowMapSize: number;
  fogColor?: string;
}

const AtmosphereAndLights: React.FC<AtmosphereAndLightsProps> = ({
  targetPosition,
  shadowMapSize,
  fogColor = HD2D_FOG_DEFAULTS.color,
}) => {
  const { scene } = useThree();

  const lights = useMemo(() => {
    const group = new THREE.Group();
    const hemi = new THREE.HemisphereLight('#d8ecff', '#4b593c', 0.85);
    const sun = new THREE.DirectionalLight('#fff4db', 1.75);
    sun.position.set(28, 42, 22);
    sun.castShadow = true;
    sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    sun.shadow.camera.near = 5;
    sun.shadow.camera.far = 130;
    sun.shadow.camera.left = -42;
    sun.shadow.camera.right = 42;
    sun.shadow.camera.top = 42;
    sun.shadow.camera.bottom = -42;
    sun.shadow.bias = -0.0005;

    group.add(hemi, sun, sun.target);
    return { group, sun };
  }, [shadowMapSize]);

  useEffect(() => {
    scene.background = new THREE.Color(fogColor);
    scene.fog = new THREE.Fog(
      fogColor,
      HD2D_FOG_DEFAULTS.near,
      HD2D_FOG_DEFAULTS.far,
    );
  }, [scene, fogColor]);

  useFrame(() => {
    const { sun } = lights;
    sun.target.position.set(targetPosition[0], 0, targetPosition[2]);
    sun.target.updateMatrixWorld();
    sun.position.set(targetPosition[0] + 28, 42, targetPosition[2] + 22);
  });

  return <ScenePrimitive object={lights.group} />;
};

const sharedHazardRingGeo = new THREE.RingGeometry(0.96, 1.0, 48);
const sharedHazardCoreGeo = new THREE.OctahedronGeometry(0.9, 0);

interface EnvironmentalHazardRingProps {
  center: [number, number];
  radius: number;
  color: string;
  intensity: number;
  inZone: boolean;
}

const EnvironmentalHazardRing: React.FC<EnvironmentalHazardRingProps> = ({
  center,
  radius,
  color,
  intensity,
  inZone,
}) => {
  const nodes = useMemo(() => {
    const group = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const coreMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.72,
      wireframe: true,
      depthWrite: false,
    });

    const ringMesh = new THREE.Mesh(sharedHazardRingGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(0, 0.08, 0);

    const coreMesh = new THREE.Mesh(sharedHazardCoreGeo, coreMat);
    coreMesh.position.set(0, 2.2, 0);

    group.add(ringMesh, coreMesh);
    return { group, ringMesh, coreMesh, ringMat, coreMat };
  }, [color]);

  useEffect(() => {
    nodes.group.position.set(center[0], 0, center[1]);
    nodes.ringMesh.scale.set(radius, radius, 1);
  }, [nodes, center, radius]);

  useEffect(() => {
    return () => {
      nodes.ringMat.dispose();
      nodes.coreMat.dispose();
    };
  }, [nodes]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.8);
    const activeBoost = inZone ? 0.25 : 0;
    nodes.ringMat.opacity = Math.min(0.95, 0.35 + pulse * 0.32 * Math.max(0.4, intensity) + activeBoost);
    nodes.coreMat.opacity = Math.min(0.95, 0.45 + pulse * 0.35 + activeBoost);
    nodes.coreMesh.rotation.y = t * 1.1;
    nodes.coreMesh.position.y = 2.1 + Math.sin(t * 2.4) * 0.35;
  });

  return <ScenePrimitive object={nodes.group} />;
};

interface TerrainMarkerProps {
  marker: WorldInteractableProp;
  onClick?: () => void;
}

const sharedDiamondGeo = new THREE.OctahedronGeometry(0.42, 0);
const sharedMarkerRingGeo = new THREE.RingGeometry(0.9, 1.15, 24);

const TerrainMarker: React.FC<TerrainMarkerProps> = ({ marker, onClick }) => {
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;
  const color = marker.color ?? '#facc15';

  const nodes = useMemo(() => {
    const group = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const crystalMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.85,
      roughness: 0.25,
      metalness: 0.2,
    });

    const ringMesh = new THREE.Mesh(sharedMarkerRingGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(0, 0.06, 0);

    const crystalMesh = new THREE.Mesh(sharedDiamondGeo, crystalMat);
    crystalMesh.position.set(0, 1.65, 0);

    group.add(ringMesh, crystalMesh);
    return { group, ringMesh, crystalMesh, ringMat, crystalMat };
  }, [color]);

  useEffect(() => {
    nodes.group.position.set(marker.position[0], marker.position[1], marker.position[2]);
    const userData = {
      entityId: marker.id,
      entityKind: 'interactable' as const,
      onEntityClick: () => onClickRef.current?.(),
    };
    nodes.ringMesh.userData = userData;
    nodes.crystalMesh.userData = userData;
  }, [nodes, marker.id, marker.position]);

  useEffect(() => {
    return () => {
      nodes.ringMat.dispose();
      nodes.crystalMat.dispose();
    };
  }, [nodes]);

  useFrame((state) => {
    nodes.crystalMesh.position.y =
      1.65 + Math.sin(state.clock.elapsedTime * 2.6 + marker.position[0]) * 0.22;
    nodes.crystalMesh.rotation.y = state.clock.elapsedTime * 1.4;
  });

  return <ScenePrimitive object={nodes.group} />;
};

interface WorldRaycasterProps {
  onEntityClick?: (id: string, kind: 'party' | 'npc' | 'enemy' | 'interactable') => void;
  onGroundClick?: (point: [number, number, number]) => void;
}

const WorldRaycaster: React.FC<WorldRaycasterProps> = ({
  onEntityClick,
  onGroundClick,
}) => {
  const { gl, scene, camera } = useThree();
  const entityClickRef = useRef(onEntityClick);
  const groundClickRef = useRef(onGroundClick);
  entityClickRef.current = onEntityClick;
  groundClickRef.current = onGroundClick;

  useEffect(() => {
    const dom = gl.domElement;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const handlePointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
      if (!entityClickRef.current && !groundClickRef.current) return;

      const rect = dom.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);

      for (const hit of hits) {
        const data = hit.object.userData as {
          entityId?: string;
          entityKind?: 'party' | 'npc' | 'enemy' | 'interactable';
          onEntityClick?: () => void;
          isGround?: boolean;
        };
        if (data?.entityId && data.entityKind) {
          data.onEntityClick?.();
          entityClickRef.current?.(data.entityId, data.entityKind);
          return;
        }
        if (data?.isGround) {
          groundClickRef.current?.([hit.point.x, hit.point.y, hit.point.z]);
          return;
        }
      }
    };

    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointerup', handlePointerUp);
    return () => {
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointerup', handlePointerUp);
    };
  }, [gl, scene, camera]);

  return null;
};

interface WorldSceneContentProps extends WorldSceneProps {
  shadowMapSize: number;
}

const OVERWORLD_VIEW_CULL_RADIUS = 165;

function isWithinOverworldView(
  playerPos: [number, number, number],
  targetPos: [number, number, number],
): boolean {
  const dx = targetPos[0] - playerPos[0];
  const dz = targetPos[2] - playerPos[2];
  return dx * dx + dz * dz <= OVERWORLD_VIEW_CULL_RADIUS * OVERWORLD_VIEW_CULL_RADIUS;
}

const WorldSceneContent: React.FC<WorldSceneContentProps> = ({
  mode = 'OVERWORLD',
  playerPosition = [0, 0, 0],
  playerFacing = 0,
  playerIsMoving = false,
  playerSpriteId = 'ryu',
  playerAuraColor = null,
  playerAuraIntensity,
  playerHitFlash = 0,
  partyMembers,
  enemies = DEFAULT_WORLD_ENEMIES,
  npcs = DEFAULT_WORLD_NPCS,
  interactables = DEFAULT_WORLD_INTERACTABLES,
  townshipBuildings = [],
  activeCombatActorId = null,
  combatAnchor,
  onEntityClick,
  onGroundClick,
  onTelemetry,
  shadowMapSize,
}) => {
  const inCombat = mode === 'COMBAT';
  const [pcx, pcz] = getChunkCoordsAtWorldPos(playerPosition[0], playerPosition[2]);
  const currentChunkDef = getChunkDefinition(pcx, pcz);
  const hazardEval = evaluateChunkHazardAtPos(playerPosition[0], playerPosition[2]);

  const visibleNpcs = useMemo(
    () =>
      inCombat
        ? []
        : npcs.filter((n) => isWithinOverworldView(playerPosition, n.position)),
    [inCombat, npcs, playerPosition],
  );

  const visibleEnemies = useMemo(
    () =>
      inCombat
        ? enemies
        : enemies.filter((e) => isWithinOverworldView(playerPosition, e.position)),
    [inCombat, enemies, playerPosition],
  );

  const visibleInteractables = useMemo(
    () =>
      inCombat
        ? []
        : interactables.filter((m) => isWithinOverworldView(playerPosition, m.position)),
    [inCombat, interactables, playerPosition],
  );

  const resolvedParty = useMemo<WorldEntityProp[]>(() => {
    if (partyMembers && partyMembers.length > 0) {
      return partyMembers;
    }
    return [
      {
        id: 'bow',
        spriteId: 'bow',
        name: 'Bow',
        position: [playerPosition[0] - 2.1, playerPosition[1], playerPosition[2] + 1.6],
        facingAngle: playerFacing,
        isMoving: playerIsMoving,
      },
      {
        id: 'katt',
        spriteId: 'katt',
        name: 'Katt',
        position: [playerPosition[0] + 2.1, playerPosition[1], playerPosition[2] + 1.6],
        facingAngle: playerFacing,
        isMoving: playerIsMoving,
      },
    ];
  }, [partyMembers, playerFacing, playerIsMoving, playerPosition]);

  return (
    <>
      <AtmosphereAndLights
        targetPosition={playerPosition}
        shadowMapSize={shadowMapSize}
        fogColor={currentChunkDef.fogColor}
      />

      <SpringArmCamera
        targetPosition={playerPosition}
        mode={mode}
        combatAnchor={combatAnchor}
      />

      <WorldRaycaster
        onEntityClick={onEntityClick}
        onGroundClick={onGroundClick}
      />

      <ChunkStreamer
        playerPosition={playerPosition}
        townshipBuildings={townshipBuildings}
        shadowMapSize={shadowMapSize}
        onTelemetry={onTelemetry}
      />

      {currentChunkDef.hazardType !== 'none' && currentChunkDef.hazardRadius > 0 && (
        <EnvironmentalHazardRing
          center={hazardEval.hazardCenter}
          radius={currentChunkDef.hazardRadius}
          color={currentChunkDef.hazardColor}
          intensity={hazardEval.inZone ? hazardEval.intensity : currentChunkDef.hazardIntensity * 0.6}
          inZone={hazardEval.inZone}
        />
      )}

      {/* Player Leader (Ryu / Dragon Form) */}
      <BillboardSprite
        spriteId={playerSpriteId}
        position={playerPosition}
        facingAngle={playerFacing}
        isMoving={playerIsMoving}
        inCombat={inCombat}
        auraColor={playerAuraColor}
        auraIntensity={playerAuraIntensity}
        hitFlash={playerHitFlash}
        selected={activeCombatActorId === 'ryu'}
        ringColor="#60a5fa"
        entityId="ryu"
        entityKind="party"
      />

      {/* Party Followers / Combat Allies */}
      {resolvedParty.map((ally) => (
        <BillboardSprite
          key={ally.id}
          spriteId={ally.spriteId}
          position={ally.position}
          facingAngle={ally.facingAngle ?? playerFacing}
          isMoving={ally.isMoving ?? playerIsMoving}
          inCombat={inCombat}
          scale={ally.scale ?? 1.85}
          auraColor={ally.auraColor}
          auraIntensity={ally.auraIntensity}
          hitFlash={ally.hitFlash}
          selected={activeCombatActorId === ally.id}
          ringColor="#60a5fa"
          entityId={ally.id}
          entityKind="party"
        />
      ))}

      {/* World NPCs (culled to 165m overworld view radius to keep draw calls < 150) */}
      {visibleNpcs.map((npc) => (
        <BillboardSprite
          key={npc.id}
          spriteId={npc.spriteId}
          position={npc.position}
          facingAngle={npc.facingAngle ?? 0}
          isMoving={npc.isMoving ?? false}
          inCombat={false}
          scale={npc.scale ?? 1.85}
          auraColor={npc.auraColor}
          auraIntensity={npc.auraIntensity}
          hitFlash={npc.hitFlash}
          entityId={npc.id}
          entityKind="npc"
        />
      ))}

      {/* Enemy Patrols & Combat Foes */}
      {visibleEnemies.map((enemy) => (
        <BillboardSprite
          key={enemy.id}
          spriteId={enemy.spriteId}
          position={enemy.position}
          facingAngle={enemy.facingAngle ?? 0}
          isMoving={enemy.isMoving ?? false}
          inCombat={inCombat}
          scale={enemy.scale ?? 1.95}
          auraColor={enemy.auraColor}
          auraIntensity={enemy.auraIntensity}
          hitFlash={enemy.hitFlash}
          selected={activeCombatActorId === enemy.id}
          ringColor="#f87171"
          entityId={enemy.id}
          entityKind="enemy"
        />
      ))}

      {/* Interactive Terrain Markers */}
      {visibleInteractables.map((marker) => (
        <TerrainMarker key={marker.id} marker={marker} />
      ))}
    </>
  );
};

export const WorldCanvas: React.FC<WorldSceneProps> = (props) => {
  const isMobileBudget =
    props.mobileLowPower ??
    (typeof window !== 'undefined' && window.innerWidth < 768);
  const shadowMapSize = isMobileBudget ? 1024 : 2048;

  return (
    <Canvas
      shadows="soft"
      dpr={isMobileBudget ? [1, 1.5] : [1, 2]}
      camera={{ fov: 45, near: 0.5, far: 320, position: [0, 11, 15] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      className={props.className}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        touchAction: 'none',
        ...props.style,
      }}
    >
      <WorldSceneContent {...props} shadowMapSize={shadowMapSize} />
    </Canvas>
  );
};
