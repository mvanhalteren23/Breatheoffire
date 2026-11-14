import React, { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type * as THREE from 'three';

export interface ScenePrimitiveProps {
  object: THREE.Object3D;
}

/**
 * Mounts an imperative Three.js Object3D onto the active R3F scene and cleans it up
 * on unmount, compatible with both standard @react-three/fiber and lightweight hosts.
 */
export const ScenePrimitive: React.FC<ScenePrimitiveProps> = ({ object }) => {
  const { scene } = useThree();

  useEffect(() => {
    scene.add(object);
    return () => {
      scene.remove(object);
    };
  }, [scene, object]);

  return null;
};
