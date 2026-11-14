import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ScenePrimitive } from './ScenePrimitive';
import {
  getPackedSpriteAtlas,
  getSpriteAtlasCellUv,
  SPRITE_COLS,
} from './proceduralAssets';
import { createBillboardSpriteMaterial, HD2D_FOG_DEFAULTS } from './shaders';

export interface BillboardSpriteProps {
  spriteId: string;
  position: [number, number, number];
  facingAngle?: number;
  isMoving?: boolean;
  inCombat?: boolean;
  scale?: number;
  auraColor?: string | null;
  auraIntensity?: number;
  hitFlash?: number;
  selected?: boolean;
  ringColor?: string;
  entityId?: string;
  entityKind?: 'party' | 'npc' | 'enemy' | 'interactable';
  onClick?: () => void;
}

const sharedPlaneGeo = new THREE.PlaneGeometry(1, 1);
const sharedShadowGeo = new THREE.CircleGeometry(0.46, 18);
const sharedRingGeo = new THREE.RingGeometry(0.54, 0.66, 24);
const sharedShadowMat = new THREE.MeshBasicMaterial({
  color: '#0b0e14',
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
});

function normalizeAngle(rad: number): number {
  let a = rad % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function resolveSpriteDirection(
  facingAngle: number,
  spriteWorldPos: THREE.Vector3,
  cameraPos: THREE.Vector3,
): { row: number; flipX: number } {
  const dx = cameraPos.x - spriteWorldPos.x;
  const dz = cameraPos.z - spriteWorldPos.z;
  const camAngle = Math.atan2(dx, dz);
  const rel = normalizeAngle(facingAngle - camAngle);
  const absRel = Math.abs(rel);

  if (absRel < Math.PI / 8) {
    return { row: 0, flipX: 0 };
  }
  if (absRel >= (7 * Math.PI) / 8) {
    return { row: 3, flipX: 0 };
  }
  const flipX = rel < 0 ? 1 : 0;
  if (absRel < (5 * Math.PI) / 8) {
    return { row: 1, flipX };
  }
  return { row: 2, flipX };
}

export const BillboardSprite: React.FC<BillboardSpriteProps> = ({
  spriteId,
  position,
  facingAngle = 0,
  isMoving = false,
  inCombat = false,
  scale = 1.9,
  auraColor = null,
  auraIntensity,
  hitFlash = 0,
  selected = false,
  ringColor = '#ffd166',
  entityId,
  entityKind,
  onClick,
}) => {
  const animClockRef = useRef(0);
  const worldPosVec = useMemo(() => new THREE.Vector3(), []);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  const atlasTexture = useMemo(() => getPackedSpriteAtlas().texture, []);

  const spriteMaterial = useMemo(() => {
    const mat = createBillboardSpriteMaterial(atlasTexture);
    mat.uniforms.uFogColor.value.set(HD2D_FOG_DEFAULTS.color);
    mat.uniforms.uFogNear.value = HD2D_FOG_DEFAULTS.near;
    mat.uniforms.uFogFar.value = HD2D_FOG_DEFAULTS.far;
    return mat;
  }, [atlasTexture]);

  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: ringColor,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    [ringColor],
  );

  const nodes = useMemo(() => {
    const group = new THREE.Group();

    const shadowMesh = new THREE.Mesh(sharedShadowGeo, sharedShadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, 0.03, 0);

    const ringMesh = new THREE.Mesh(sharedRingGeo, ringMaterial);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.set(0, 0.04, 0);

    const spriteMesh = new THREE.Mesh(sharedPlaneGeo, spriteMaterial);
    spriteMesh.castShadow = true;

    group.add(shadowMesh, ringMesh, spriteMesh);
    return { group, shadowMesh, ringMesh, spriteMesh };
  }, [ringMaterial, spriteMaterial]);

  useEffect(() => {
    return () => {
      spriteMaterial.dispose();
    };
  }, [spriteMaterial]);

  useEffect(() => {
    return () => {
      ringMaterial.dispose();
    };
  }, [ringMaterial]);

  useEffect(() => {
    nodes.group.position.set(position[0], position[1], position[2]);
    nodes.shadowMesh.scale.set(scale * 0.55, scale * 0.55, 1);
    nodes.ringMesh.scale.set(scale * 0.65, scale * 0.65, 1);
    nodes.ringMesh.visible = selected;
    nodes.spriteMesh.position.set(0, scale * 0.48, 0);
    nodes.spriteMesh.scale.set(scale, scale, 1);
    nodes.spriteMesh.userData = {
      entityId,
      entityKind,
      onEntityClick: () => onClickRef.current?.(),
    };
  }, [nodes, position, scale, selected, entityId, entityKind]);

  useFrame((state, delta) => {
    const { group, spriteMesh } = nodes;
    group.getWorldPosition(worldPosVec);
    const camPos = state.camera.position;
    const lookDx = camPos.x - worldPosVec.x;
    const lookDz = camPos.z - worldPosVec.z;
    const yaw = Math.atan2(lookDx, lookDz);
    spriteMesh.rotation.set(-0.18, yaw, 0);

    // Frame animation: 8 FPS when moving, 6 FPS in battle idle, 2 FPS subtle breath when still
    const fps = isMoving ? 8 : inCombat ? 6 : 2;
    animClockRef.current += delta * fps;
    const frame =
      isMoving || inCombat
        ? Math.floor(animClockRef.current) % SPRITE_COLS
        : Math.floor(animClockRef.current) % 2 === 0
          ? 0
          : 2;

    const { row, flipX } = resolveSpriteDirection(facingAngle, worldPosVec, camPos);
    const { uOffset, vOffset, uScale, vScale } = getSpriteAtlasCellUv(
      spriteId,
      row,
      frame,
    );

    spriteMaterial.uniforms.uUvRect.value.set(uOffset, vOffset, uScale, vScale);
    spriteMaterial.uniforms.uFlipX.value = flipX;
    spriteMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    spriteMaterial.uniforms.uHitFlash.value = hitFlash;

    const resolvedAura = auraIntensity ?? (auraColor ? 1.0 : 0.0);
    spriteMaterial.uniforms.uAuraIntensity.value = resolvedAura;
    if (auraColor) {
      spriteMaterial.uniforms.uAuraColor.value.set(auraColor);
    }
  });

  return <ScenePrimitive object={nodes.group} />;
};
