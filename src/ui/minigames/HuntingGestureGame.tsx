import React, { useCallback, useMemo, useRef, useState } from 'react';

export interface HuntCompletionResult {
  approachAngle: number;
  distance: number;
  stealthScore: number;
}

export interface HuntingGestureGameProps {
  windDirection: string;
  windAngle?: number;
  scentIntensity: string;
  available?: boolean;
  lastCatch?: string | null;
  onCompleteHunt: (result: HuntCompletionResult) => void;
}

const PAD_SIZE_PX = 216;
const PAD_RADIUS_PX = PAD_SIZE_PX / 2;
const MAX_HUNT_DISTANCE = 26;
const MIN_HUNT_DISTANCE = 2;

function resolveWindAngleFromLabel(windDirection: string, explicitAngle?: number): number {
  if (typeof explicitAngle === 'number' && Number.isFinite(explicitAngle)) {
    return explicitAngle;
  }
  const lower = windDirection.toLowerCase();
  if (lower.includes('eastward') || lower.includes('east')) return Math.PI * 0.5;
  if (lower.includes('south-west') || lower.includes('south')) return Math.PI;
  if (lower.includes('westward') || lower.includes('west')) return Math.PI * 1.5;
  return 0;
}

export function computeHuntStealthMetrics(
  windAngle: number,
  approachAngle: number,
  distance: number
): {
  stealthScore: number;
  windStealthRatio: number;
  windAlignmentLabel: string;
  tierLabel: string;
} {
  const safeDistance = Math.max(0, distance);
  const cosDiff = Math.cos(approachAngle - windAngle);
  const windStealthRatio = (1 - cosDiff) * 0.5;

  let distanceRatio = 1;
  if (safeDistance < 4) {
    distanceRatio = 0.35 + (safeDistance / 4) * 0.45;
  } else if (safeDistance > 20) {
    distanceRatio = Math.max(0.15, 1 - (safeDistance - 20) / 25);
  }

  const rawScore = windStealthRatio * 70 + distanceRatio * 30;
  const stealthScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  const windAlignmentLabel =
    windStealthRatio >= 0.75
      ? 'Downwind Concealed'
      : windStealthRatio >= 0.4
        ? 'Crosswind Neutral'
        : 'Upwind Scent Exposed';

  const tierLabel =
    stealthScore >= 80
      ? 'Perfect Downwind (2x Boar + Fowl)'
      : stealthScore >= 55
        ? 'Clean Stalk (1x Boar + Fowl)'
        : stealthScore >= 35
          ? 'Wind Alert (1x Fowl)'
          : 'Startled (No Drop)';

  return {
    stealthScore,
    windStealthRatio,
    windAlignmentLabel,
    tierLabel,
  };
}

function polarSectorPath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const x1 = cx + Math.cos(startAngle) * radius;
  const y1 = cy + Math.sin(startAngle) * radius;
  const x2 = cx + Math.cos(endAngle) * radius;
  const y2 = cy + Math.sin(endAngle) * radius;
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

/**
 * Touch & pointer gesture-based Wind/Scent Hunting mini-game.
 * Displays wind vector arrow, 180° opposite downwind stealth zone,
 * interactive drag/swipe stalk pad, and >= 48px Strike release trigger.
 */
export const HuntingGestureGame: React.FC<HuntingGestureGameProps> = ({
  windDirection,
  windAngle: explicitWindAngle,
  scentIntensity,
  available = true,
  lastCatch,
  onCompleteHunt,
}) => {
  const windAngle = resolveWindAngleFromLabel(windDirection, explicitWindAngle);
  const downwindAngle = windAngle + Math.PI;

  const padRef = useRef<HTMLDivElement | null>(null);
  const activeModeRef = useRef<'pointer' | 'touch' | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activeTouchIdRef = useRef<number | null>(null);

  const [approachAngle, setApproachAngle] = useState<number>(() => windAngle + Math.PI * 0.55);
  const [distance, setDistance] = useState<number>(13);
  const [isStalking, setIsStalking] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<HuntCompletionResult | null>(null);

  const metrics = useMemo(
    () => computeHuntStealthMetrics(windAngle, approachAngle, distance),
    [windAngle, approachAngle, distance]
  );

  const updateStalkFromClientCoords = useCallback((clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const rawDistPx = Math.hypot(dx, dy);
    const clampedRatio = Math.max(0.08, Math.min(1, rawDistPx / (rect.width / 2)));
    const mappedDistance = Number(
      (MIN_HUNT_DISTANCE + clampedRatio * (MAX_HUNT_DISTANCE - MIN_HUNT_DISTANCE)).toFixed(1)
    );
    const angle = rawDistPx > 1 ? Math.atan2(dy, dx) : approachAngle;
    setApproachAngle(angle);
    setDistance(mappedDistance);
  }, [approachAngle]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!available || activeModeRef.current === 'touch') return;
    e.preventDefault();
    activeModeRef.current = 'pointer';
    activePointerIdRef.current = e.pointerId;
    setIsStalking(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic PointerEvents in tests may not support capture
    }
    updateStalkFromClientCoords(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!available || activeModeRef.current !== 'pointer' || activePointerIdRef.current !== e.pointerId) {
      return;
    }
    e.preventDefault();
    updateStalkFromClientCoords(e.clientX, e.clientY);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeModeRef.current !== 'pointer' || activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore synthetic cleanup
    }
    activeModeRef.current = null;
    activePointerIdRef.current = null;
    setIsStalking(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!available || activeModeRef.current === 'pointer') return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    e.preventDefault();
    activeModeRef.current = 'touch';
    activeTouchIdRef.current = touch.identifier;
    setIsStalking(true);
    updateStalkFromClientCoords(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!available || activeModeRef.current !== 'touch') return;
    for (let i = 0; i < e.changedTouches.length; i += 1) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchIdRef.current) {
        e.preventDefault();
        updateStalkFromClientCoords(touch.clientX, touch.clientY);
        return;
      }
    }
  };

  const handleTouchEndOrCancel = (e: React.TouchEvent<HTMLDivElement>) => {
    if (activeModeRef.current !== 'touch') return;
    for (let i = 0; i < e.changedTouches.length; i += 1) {
      if (e.changedTouches[i].identifier === activeTouchIdRef.current) {
        e.preventDefault();
        activeModeRef.current = null;
        activeTouchIdRef.current = null;
        setIsStalking(false);
        return;
      }
    }
  };

  const handleStrike = () => {
    if (!available) return;
    const payload: HuntCompletionResult = {
      approachAngle,
      distance,
      stealthScore: metrics.stealthScore,
    };
    setLastSubmission(payload);
    onCompleteHunt(payload);
  };

  const hunterRatio =
    (distance - MIN_HUNT_DISTANCE) / (MAX_HUNT_DISTANCE - MIN_HUNT_DISTANCE);
  const hunterRadiusPx = Math.max(12, Math.min(PAD_RADIUS_PX - 14, hunterRatio * (PAD_RADIUS_PX - 12)));
  const hunterX = PAD_RADIUS_PX + Math.cos(approachAngle) * hunterRadiusPx;
  const hunterY = PAD_RADIUS_PX + Math.sin(approachAngle) * hunterRadiusPx;

  const windArrowLen = 78;
  const windTipX = PAD_RADIUS_PX + Math.cos(windAngle) * windArrowLen;
  const windTipY = PAD_RADIUS_PX + Math.sin(windAngle) * windArrowLen;
  const windTailX = PAD_RADIUS_PX - Math.cos(windAngle) * 32;
  const windTailY = PAD_RADIUS_PX - Math.sin(windAngle) * 32;

  const downwindArc = polarSectorPath(
    PAD_RADIUS_PX,
    PAD_RADIUS_PX,
    PAD_RADIUS_PX - 10,
    downwindAngle - Math.PI / 5,
    downwindAngle + Math.PI / 5
  );

  const scoreColor =
    metrics.stealthScore >= 80
      ? '#4ade80'
      : metrics.stealthScore >= 55
        ? '#facc15'
        : '#f87171';

  const approachDeg = Math.round((((approachAngle * 180) / Math.PI) + 360) % 360);
  const windDeg = Math.round((((windAngle * 180) / Math.PI) + 360) % 360);

  return (
    <div
      data-testid="hunting-gesture-game"
      className="bof-panel"
      style={{
        padding: '12px',
        borderRadius: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#fca5a5' }}>
            🏹 Wind / Scent Stalk Radar
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
            Drag onto the <strong>180° opposite downwind zone</strong> (4–20m ring), then Strike!
          </div>
        </div>
        <div
          data-testid="hunt-wind-readout"
          style={{
            padding: '4px 10px',
            borderRadius: '9999px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            fontSize: '11px',
            color: '#7dd3fc',
            fontWeight: 700,
          }}
        >
          💨 {windDirection} ({windDeg}°) · {scentIntensity}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
        }}
      >
        {/* Interactive Touch / Pointer Stalk Pad */}
        <div
          ref={padRef}
          role="application"
          aria-label="Wind and Scent Stalk Radar Pad"
          data-testid="hunting-stalk-pad"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEndOrCancel}
          onTouchCancel={handleTouchEndOrCancel}
          style={{
            position: 'relative',
            width: `${PAD_SIZE_PX}px`,
            height: `${PAD_SIZE_PX}px`,
            borderRadius: '9999px',
            border: `2px solid ${isStalking ? '#fde047' : 'rgba(148, 163, 184, 0.4)'}`,
            background:
              'radial-gradient(circle, rgba(20, 83, 45, 0.25) 0%, rgba(15, 23, 42, 0.92) 72%)',
            touchAction: 'none',
            cursor: available ? 'crosshair' : 'not-allowed',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          <svg
            width={PAD_SIZE_PX}
            height={PAD_SIZE_PX}
            viewBox={`0 0 ${PAD_SIZE_PX} ${PAD_SIZE_PX}`}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {/* Optimal 4-20m stealth ring */}
            <circle
              cx={PAD_RADIUS_PX}
              cy={PAD_RADIUS_PX}
              r={PAD_RADIUS_PX * 0.74}
              fill="none"
              stroke="rgba(74, 222, 128, 0.28)"
              strokeDasharray="4 4"
              strokeWidth="1.5"
            />
            <circle
              cx={PAD_RADIUS_PX}
              cy={PAD_RADIUS_PX}
              r={PAD_RADIUS_PX * 0.22}
              fill="none"
              stroke="rgba(248, 113, 113, 0.35)"
              strokeWidth="1"
            />

            {/* 180° Opposite Downwind Stealth Zone */}
            <path
              d={downwindArc}
              fill="rgba(34, 197, 94, 0.24)"
              stroke="rgba(74, 222, 128, 0.72)"
              strokeWidth="1.5"
            />

            {/* Wind Vector Arrow */}
            <defs>
              <marker
                id="bof-wind-arrowhead"
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="4"
                orient="auto"
              >
                <path d="M 0 1 L 7 4 L 0 7 Z" fill="#38bdf8" />
              </marker>
            </defs>
            <line
              x1={windTailX}
              y1={windTailY}
              x2={windTipX}
              y2={windTipY}
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray="5 3"
              markerEnd="url(#bof-wind-arrowhead)"
            />

            {/* Hunter Stalk Line */}
            <line
              x1={hunterX}
              y1={hunterY}
              x2={PAD_RADIUS_PX}
              y2={PAD_RADIUS_PX}
              stroke={scoreColor}
              strokeWidth="2"
              strokeDasharray="3 3"
            />
          </svg>

          {/* Center Prey Marker */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '20px',
              pointerEvents: 'none',
            }}
            title="Wild Prey"
          >
            🐗
          </div>

          {/* Downwind Label */}
          <div
            style={{
              position: 'absolute',
              left: `${PAD_RADIUS_PX + Math.cos(downwindAngle) * (PAD_RADIUS_PX * 0.62)}px`,
              top: `${PAD_RADIUS_PX + Math.sin(downwindAngle) * (PAD_RADIUS_PX * 0.62)}px`,
              transform: 'translate(-50%, -50%)',
              fontSize: '9px',
              fontWeight: 800,
              color: '#86efac',
              background: 'rgba(5, 46, 22, 0.8)',
              padding: '1px 5px',
              borderRadius: '9999px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            180° STEALTH
          </div>

          {/* Hunter Stalk Marker */}
          <div
            data-testid="hunt-stalk-cursor"
            style={{
              position: 'absolute',
              left: `${hunterX}px`,
              top: `${hunterY}px`,
              width: '32px',
              height: '32px',
              transform: 'translate(-50%, -50%)',
              borderRadius: '9999px',
              background: 'rgba(15, 23, 42, 0.92)',
              border: `2px solid ${scoreColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              boxShadow: `0 0 12px ${scoreColor}66`,
              pointerEvents: 'none',
            }}
          >
            🏹
          </div>
        </div>

        {/* Live Telemetry & Strike Trigger */}
        <div
          style={{
            flex: '1 1 220px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            className="bof-panel"
            style={{ padding: '10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
              <span>Stealth Rating</span>
              <span data-testid="hunt-stealth-score" style={{ color: scoreColor }}>
                {metrics.stealthScore} / 100
              </span>
            </div>
            <div className="bof-bar-track" style={{ height: '8px' }}>
              <div
                className="bof-bar-fill"
                style={{ width: `${metrics.stealthScore}%`, background: scoreColor }}
              />
            </div>
            <div style={{ fontSize: '11px', color: scoreColor, fontWeight: 700 }}>
              {metrics.windAlignmentLabel}
            </div>
            <div style={{ fontSize: '11px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
              Approach: <strong>{approachDeg}°</strong> · Distance: <strong>{distance.toFixed(1)}m</strong>
            </div>
            <div style={{ fontSize: '11px', color: '#fde68a' }}>
              Projected Yield: {metrics.tierLabel}
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-hunt-strike"
            className="bof-touch-btn bof-touch-btn--primary"
            style={{ minHeight: '52px', minWidth: '160px', width: '100%', fontSize: '13px' }}
            disabled={!available}
            onClick={handleStrike}
          >
            {available ? `🎯 Strike Downwind (${metrics.stealthScore}%)` : 'Trail Cooling Down'}
          </button>

          {(lastSubmission || lastCatch) && (
            <div
              data-testid="hunt-result-banner"
              style={{
                padding: '6px 10px',
                borderRadius: '10px',
                background: 'rgba(30, 41, 59, 0.85)',
                border: '1px solid rgba(251, 191, 36, 0.35)',
                fontSize: '11px',
                color: '#fef3c7',
              }}
            >
              {lastSubmission
                ? `Released shot at ${lastSubmission.distance.toFixed(1)}m (${lastSubmission.stealthScore}% stealth)`
                : null}
              {lastSubmission && lastCatch ? ' · ' : null}
              {lastCatch ? `Latest Harvest: ${lastCatch}` : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
