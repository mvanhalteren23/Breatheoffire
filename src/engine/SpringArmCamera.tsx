import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type CameraMode = 'OVERWORLD' | 'COMBAT' | 'CUTSCENE' | 'MENU';

export interface SpringArmCameraProps {
  targetPosition: [number, number, number];
  mode?: CameraMode;
  combatAnchor?: [number, number, number];
  damping?: number;
}

export const OVERWORLD_CAMERA_POSE = {
  distance: 15,
  height: 11,
  lateralOffset: 0,
  fov: 45,
} as const;

export const COMBAT_CAMERA_POSE = {
  distance: 8.5,
  height: 4.8,
  lateralOffset: 3.2,
  fov: 40,
} as const;

export const SpringArmCamera: React.FC<SpringArmCameraProps> = ({
  targetPosition,
  mode = 'OVERWORLD',
  combatAnchor,
  damping = 6.5,
}) => {
  const { camera } = useThree();
  const initializedRef = useRef(false);

  const currentLookAt = useMemo(() => new THREE.Vector3(), []);
  const desiredLookAt = useMemo(() => new THREE.Vector3(), []);
  const desiredCamPos = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (initializedRef.current) return;
    const anchor = mode === 'COMBAT' && combatAnchor ? combatAnchor : targetPosition;
    const pose = mode === 'COMBAT' ? COMBAT_CAMERA_POSE : OVERWORLD_CAMERA_POSE;
    currentLookAt.set(anchor[0], anchor[1] + 1.0, anchor[2]);
    camera.position.set(
      anchor[0] + pose.lateralOffset,
      anchor[1] + pose.height,
      anchor[2] + pose.distance,
    );
    camera.lookAt(currentLookAt);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }
    initializedRef.current = true;
  }, [camera, combatAnchor, currentLookAt, mode, targetPosition]);

  useFrame((_, delta) => {
    const isCombat = mode === 'COMBAT';
    const pose = isCombat ? COMBAT_CAMERA_POSE : OVERWORLD_CAMERA_POSE;
    const anchor = isCombat && combatAnchor ? combatAnchor : targetPosition;

    const lookOffsetY = isCombat ? 1.15 : 0.9;
    desiredLookAt.set(anchor[0], anchor[1] + lookOffsetY, anchor[2]);
    desiredCamPos.set(
      anchor[0] + pose.lateralOffset,
      anchor[1] + pose.height,
      anchor[2] + pose.distance,
    );

    const alpha = 1 - Math.exp(-damping * Math.min(delta, 0.1));
    camera.position.lerp(desiredCamPos, alpha);
    currentLookAt.lerp(desiredLookAt, alpha);
    camera.lookAt(currentLookAt);

    if (camera instanceof THREE.PerspectiveCamera && Math.abs(camera.fov - pose.fov) > 0.05) {
      camera.fov = THREE.MathUtils.lerp(camera.fov, pose.fov, alpha);
      camera.updateProjectionMatrix();
    }
  });

  return null;
};
