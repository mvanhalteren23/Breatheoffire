import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ThumbstickVector } from './hudTypes';

export interface VirtualThumbstickProps {
  /** Called whenever the normalized {-1..1} movement vector changes */
  onChange: (vector: ThumbstickVector) => void;
  /** Disable input (e.g., during modal overlays) */
  disabled?: boolean;
  /** Optional custom aria-label */
  ariaLabel?: string;
}

const OUTER_SIZE_PX = 112;
const KNOB_SIZE_PX = 48;
const MAX_TRAVEL_PX = (OUTER_SIZE_PX - KNOB_SIZE_PX) / 2; // 32px

function clampAndNormalize(dx: number, dy: number, maxRadius: number): {
  vector: ThumbstickVector;
  knobOffset: ThumbstickVector;
} {
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-4) {
    return {
      vector: { x: 0, y: 0 },
      knobOffset: { x: 0, y: 0 },
    };
  }
  const clampedDist = Math.min(dist, maxRadius);
  const scale = clampedDist / dist;
  const knobX = dx * scale;
  const knobY = dy * scale;

  const normMag = clampedDist / maxRadius;
  const nx = (dx / dist) * normMag;
  const ny = (dy / dist) * normMag;

  return {
    vector: {
      x: Number(Math.max(-1, Math.min(1, nx)).toFixed(4)),
      y: Number(Math.max(-1, Math.min(1, ny)).toFixed(4)),
    },
    knobOffset: {
      x: knobX,
      y: knobY,
    },
  };
}

function computeKeyboardVector(pressedKeys: Set<string>): ThumbstickVector {
  let x = 0;
  let y = 0;
  if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) x -= 1;
  if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) x += 1;
  if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) y -= 1;
  if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) y += 1;

  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const len = Math.hypot(x, y);
  return {
    x: Number((x / len).toFixed(4)),
    y: Number((y / len).toFixed(4)),
  };
}

const MOVEMENT_CODES = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

/**
 * Floating bottom-left Virtual Analog Stick (`112px x 112px` ring, `48px x 48px` knob).
 * Outputs normalized `{ x, y }` in `-1..1` (+x right, -y up) via PointerEvents,
 * TouchEvents, and WASD / Arrow keys fallback.
 */
export const VirtualThumbstick: React.FC<VirtualThumbstickProps> = ({
  onChange,
  disabled = false,
  ariaLabel = 'Movement Virtual Thumbstick',
}) => {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const activeModeRef = useRef<'pointer' | 'touch' | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activeTouchIdRef = useRef<number | null>(null);
  const pressedKeysRef = useRef<Set<string>>(new Set());
  const lastEmittedRef = useRef<ThumbstickVector>({ x: 0, y: 0 });

  const [knobOffset, setKnobOffset] = useState<ThumbstickVector>({ x: 0, y: 0 });
  const [isEngaged, setIsEngaged] = useState(false);

  const emitVector = useCallback(
    (next: ThumbstickVector) => {
      if (
        Math.abs(next.x - lastEmittedRef.current.x) < 1e-4 &&
        Math.abs(next.y - lastEmittedRef.current.y) < 1e-4
      ) {
        return;
      }
      lastEmittedRef.current = next;
      onChange(next);
    },
    [onChange]
  );

  const updateFromClientCoords = useCallback(
    (clientX: number, clientY: number) => {
      const el = zoneRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const { vector, knobOffset: nextKnob } = clampAndNormalize(
        clientX - centerX,
        clientY - centerY,
        MAX_TRAVEL_PX
      );
      setKnobOffset(nextKnob);
      emitVector(vector);
    },
    [emitVector]
  );

  const resetStickToKeyboardOrZero = useCallback(() => {
    activeModeRef.current = null;
    activePointerIdRef.current = null;
    activeTouchIdRef.current = null;
    setIsEngaged(false);
    const kb = computeKeyboardVector(pressedKeysRef.current);
    setKnobOffset({ x: kb.x * MAX_TRAVEL_PX, y: kb.y * MAX_TRAVEL_PX });
    emitVector(kb);
  }, [emitVector]);

  useEffect(() => {
    if (disabled) {
      pressedKeysRef.current.clear();
      activeModeRef.current = null;
      activePointerIdRef.current = null;
      activeTouchIdRef.current = null;
      setIsEngaged(false);
      setKnobOffset({ x: 0, y: 0 });
      emitVector({ x: 0, y: 0 });
    }
  }, [disabled, emitVector]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || !MOVEMENT_CODES.has(e.code)) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (!pressedKeysRef.current.has(e.code)) {
        pressedKeysRef.current.add(e.code);
        if (activeModeRef.current === null) {
          const kb = computeKeyboardVector(pressedKeysRef.current);
          setKnobOffset({ x: kb.x * MAX_TRAVEL_PX, y: kb.y * MAX_TRAVEL_PX });
          emitVector(kb);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!MOVEMENT_CODES.has(e.code)) return;
      if (pressedKeysRef.current.delete(e.code)) {
        if (activeModeRef.current === null) {
          const kb = computeKeyboardVector(pressedKeysRef.current);
          setKnobOffset({ x: kb.x * MAX_TRAVEL_PX, y: kb.y * MAX_TRAVEL_PX });
          emitVector(kb);
        }
      }
    };

    const handleBlur = () => {
      if (pressedKeysRef.current.size > 0) {
        pressedKeysRef.current.clear();
        if (activeModeRef.current === null) {
          setKnobOffset({ x: 0, y: 0 });
          emitVector({ x: 0, y: 0 });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [disabled, emitVector]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (activeModeRef.current === 'touch') return;
    e.preventDefault();
    activeModeRef.current = 'pointer';
    activePointerIdRef.current = e.pointerId;
    setIsEngaged(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic PointerEvents in test environments may not support setPointerCapture
    }
    updateFromClientCoords(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (activeModeRef.current !== 'pointer' || activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateFromClientCoords(e.clientX, e.clientY);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeModeRef.current !== 'pointer' || activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore synthetic event cleanup errors
    }
    resetStickToKeyboardOrZero();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (activeModeRef.current === 'pointer') return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    e.preventDefault();
    activeModeRef.current = 'touch';
    activeTouchIdRef.current = touch.identifier;
    setIsEngaged(true);
    updateFromClientCoords(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disabled || activeModeRef.current !== 'touch') return;
    for (let i = 0; i < e.changedTouches.length; i += 1) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchIdRef.current) {
        e.preventDefault();
        updateFromClientCoords(touch.clientX, touch.clientY);
        return;
      }
    }
  };

  const handleTouchEndOrCancel = (e: React.TouchEvent<HTMLDivElement>) => {
    if (activeModeRef.current !== 'touch') return;
    for (let i = 0; i < e.changedTouches.length; i += 1) {
      if (e.changedTouches[i].identifier === activeTouchIdRef.current) {
        e.preventDefault();
        resetStickToKeyboardOrZero();
        return;
      }
    }
  };

  return (
    <div
      ref={zoneRef}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={-1}
      aria-valuemax={1}
      aria-valuenow={Math.round(Math.hypot(lastEmittedRef.current.x, lastEmittedRef.current.y) * 100) / 100}
      data-testid="virtual-thumbstick"
      className="bof-thumbstick-zone"
      style={{
        width: `${OUTER_SIZE_PX}px`,
        height: `${OUTER_SIZE_PX}px`,
        touchAction: 'none',
        opacity: disabled ? 0.45 : 1,
        borderColor: isEngaged ? 'rgba(253, 224, 71, 0.85)' : 'rgba(251, 191, 36, 0.45)',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEndOrCancel}
      onTouchCancel={handleTouchEndOrCancel}
    >
      <div className="bof-thumbstick-crosshair" />
      <div
        data-testid="virtual-thumbstick-knob"
        className="bof-thumbstick-knob"
        style={{
          width: `${KNOB_SIZE_PX}px`,
          height: `${KNOB_SIZE_PX}px`,
          transform: `translate3d(${knobOffset.x}px, ${knobOffset.y}px, 0)`,
        }}
      />
    </div>
  );
};
