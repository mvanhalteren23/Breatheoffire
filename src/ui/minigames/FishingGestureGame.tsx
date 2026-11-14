import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface FishingGestureGameProps {
  baitCount: number;
  spotActive: boolean;
  lastCatch?: string | null;
  onBiteCue?: () => void;
  onCompleteCast: (castScore: number) => void;
}

type FishingPhase = 'ready' | 'charging' | 'reeling';

function predictCatchTier(score: number): string {
  if (score >= 0.85) return 'Manillo Koi';
  if (score >= 0.55) return 'Silver Carp';
  return 'Red Snapper';
}

/**
 * Touch & pointer gesture-based Manillo Fishing mini-game.
 * Supports swipe-up or tap-hold & release cast power gauge plus
 * >= 48px dynamic bite timing / reel tension bar emitting castScore (0..1).
 */
export const FishingGestureGame: React.FC<FishingGestureGameProps> = ({
  baitCount,
  spotActive,
  lastCatch,
  onBiteCue,
  onCompleteCast,
}) => {
  const [phase, setPhase] = useState<FishingPhase>('ready');
  const [castPower, setCastPower] = useState<number>(0.5);
  const [reelCursor, setReelCursor] = useState<number>(0.5);
  const [lastCastScore, setLastCastScore] = useState<number | null>(null);

  const chargeStartYRef = useRef<number | null>(null);
  const dragMovedRef = useRef<boolean>(false);
  const activeModeRef = useRef<'pointer' | 'touch' | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activeTouchIdRef = useRef<number | null>(null);
  const castPowerRef = useRef<number>(0.5);
  const reelCursorRef = useRef<number>(0.5);
  const inSweetSpotRef = useRef<boolean>(false);

  castPowerRef.current = castPower;
  reelCursorRef.current = reelCursor;

  const canFish = baitCount > 0;

  // Animate cast power oscillation during tap-hold when user isn't actively swiping up
  useEffect(() => {
    if (phase !== 'charging') return;
    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      if (!dragMovedRef.current) {
        const elapsedSec = (now - startTime) / 1000;
        // Triangle wave 0.15 -> 1.0 -> 0.15 every 1.4s
        const cycle = (elapsedSec * 1.4) % 2;
        const wave = cycle <= 1 ? cycle : 2 - cycle;
        const nextPower = Number((0.15 + wave * 0.85).toFixed(3));
        setCastPower(nextPower);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase]);

  // Animate dynamic bite timing / reel tension cursor during reeling phase
  useEffect(() => {
    if (phase !== 'reeling') {
      inSweetSpotRef.current = false;
      return;
    }
    let rafId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsedSec = (now - startTime) / 1000;
      const speed = spotActive ? 1.55 : 1.85;
      const cycle = (elapsedSec * speed) % 2;
      const pos = cycle <= 1 ? cycle : 2 - cycle;
      const rounded = Number(pos.toFixed(3));
      const inZone = rounded >= 0.68 && rounded <= 0.88;
      if (inZone && !inSweetSpotRef.current) {
        inSweetSpotRef.current = true;
        onBiteCue?.();
      } else if (!inZone) {
        inSweetSpotRef.current = false;
      }
      setReelCursor(rounded);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase, spotActive, onBiteCue]);

  const startCharge = useCallback(
    (clientY: number) => {
      if (!canFish || phase === 'reeling') return;
      chargeStartYRef.current = clientY;
      dragMovedRef.current = false;
      setPhase('charging');
    },
    [canFish, phase]
  );

  const updateSwipePower = useCallback((clientY: number) => {
    if (chargeStartYRef.current === null) return;
    const upwardDelta = chargeStartYRef.current - clientY;
    if (Math.abs(upwardDelta) > 6) {
      dragMovedRef.current = true;
      const normalized = Math.max(0.1, Math.min(1, 0.25 + upwardDelta / 120));
      setCastPower(Number(normalized.toFixed(3)));
    }
  }, []);

  const releaseCast = useCallback(() => {
    if (phase !== 'charging') return;
    activeModeRef.current = null;
    activePointerIdRef.current = null;
    activeTouchIdRef.current = null;
    chargeStartYRef.current = null;
    onBiteCue?.();
    setPhase('reeling');
  }, [phase, onBiteCue]);

  const handleReelHook = useCallback(() => {
    if (!canFish || phase !== 'reeling') return;
    // Optimal sweet spot centered at 0.78 on tension bar
    const distanceFromSweetSpot = Math.abs(reelCursorRef.current - 0.78);
    const timingAccuracy = Math.max(0, 1 - distanceFromSweetSpot / 0.55);
    const rippleBonus = spotActive ? 0.08 : 0;
    const rawScore = castPowerRef.current * 0.45 + timingAccuracy * 0.55 + rippleBonus;
    const castScore = Number(Math.max(0, Math.min(1, rawScore)).toFixed(3));
    setLastCastScore(castScore);
    setPhase('ready');
    onCompleteCast(castScore);
  }, [canFish, phase, spotActive, onCompleteCast]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canFish || phase === 'reeling' || activeModeRef.current === 'touch') return;
    e.preventDefault();
    activeModeRef.current = 'pointer';
    activePointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic PointerEvents without capture
    }
    startCharge(e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeModeRef.current !== 'pointer' || activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateSwipePower(e.clientY);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeModeRef.current !== 'pointer' || activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore cleanup
    }
    releaseCast();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!canFish || phase === 'reeling' || activeModeRef.current === 'pointer') return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    e.preventDefault();
    activeModeRef.current = 'touch';
    activeTouchIdRef.current = touch.identifier;
    startCharge(touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (activeModeRef.current !== 'touch') return;
    for (let i = 0; i < e.changedTouches.length; i += 1) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeTouchIdRef.current) {
        e.preventDefault();
        updateSwipePower(touch.clientY);
        return;
      }
    }
  };

  const handleTouchEndOrCancel = (e: React.TouchEvent<HTMLDivElement>) => {
    if (activeModeRef.current !== 'touch') return;
    for (let i = 0; i < e.changedTouches.length; i += 1) {
      if (e.changedTouches[i].identifier === activeTouchIdRef.current) {
        e.preventDefault();
        releaseCast();
        return;
      }
    }
  };

  const castPct = Math.round(castPower * 100);
  const cursorPct = Math.round(reelCursor * 100);

  return (
    <div
      data-testid="fishing-gesture-game"
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
          <div style={{ fontSize: '14px', fontWeight: 800, color: '#7dd3fc' }}>
            🎣 Manillo Dock Cast &amp; Reel
          </div>
          <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
            Swipe up or tap-hold &amp; release to cast, then tap the <strong>Reel Tension Bar</strong> on the golden bite zone.
          </div>
        </div>
        <div
          style={{
            padding: '4px 10px',
            borderRadius: '9999px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.45)',
            fontSize: '11px',
            color: spotActive ? '#fde68a' : '#bae6fd',
            fontWeight: 700,
          }}
        >
          Bait: {baitCount} · {spotActive ? '✨ Rippling (+Bonus)' : 'Calm Water'}
        </div>
      </div>

      {/* Step 1: Cast Distance Gauge (Swipe Up or Tap-Hold & Release) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '10px',
        }}
      >
        <div
          role="slider"
          aria-label="Manillo Cast Distance Gauge"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={castPct}
          data-testid="fishing-cast-pad"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEndOrCancel}
          onTouchCancel={handleTouchEndOrCancel}
          style={{
            minHeight: '116px',
            padding: '12px',
            borderRadius: '12px',
            border: `2px dashed ${
              phase === 'charging' ? '#fbbf24' : 'rgba(56, 189, 248, 0.5)'
            }`,
            background:
              phase === 'charging'
                ? 'linear-gradient(180deg, rgba(14, 116, 144, 0.38) 0%, rgba(15, 23, 42, 0.92) 100%)'
                : 'rgba(15, 23, 42, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
            touchAction: 'none',
            cursor: canFish && phase !== 'reeling' ? 'grab' : 'default',
            opacity: canFish ? 1 : 0.5,
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
            <span style={{ color: '#bae6fd' }}>
              {phase === 'charging'
                ? '⬆️ Charging — Release to Cast!'
                : phase === 'reeling'
                  ? '🌊 Line Cast! Watch Bite Bar'
                  : '⬆️ Swipe Up or Hold & Release'}
            </span>
            <span data-testid="fishing-cast-power" style={{ color: '#fde68a' }}>
              {castPct}%
            </span>
          </div>

          <div
            className="bof-bar-track"
            style={{ height: '14px', borderRadius: '9999px', border: '1px solid rgba(148,163,184,0.3)' }}
          >
            <div
              className="bof-bar-fill"
              style={{
                width: `${castPct}%`,
                background: 'linear-gradient(90deg, #38bdf8 0%, #4ade80 65%, #fbbf24 100%)',
              }}
            />
          </div>

          <div style={{ fontSize: '10px', color: '#94a3b8' }}>
            Longer casts reach deep-water Silver Carp &amp; Manillo Koi schools.
          </div>
        </div>

        {/* Step 2: Dynamic Bite Timing / Reel Tension Bar (>= 48px touch area) */}
        <div
          style={{
            padding: '12px',
            borderRadius: '12px',
            border: `1px solid ${phase === 'reeling' ? '#fbbf24' : 'rgba(148, 163, 184, 0.3)'}`,
            background: 'rgba(15, 23, 42, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
            <span style={{ color: phase === 'reeling' ? '#fde047' : '#94a3b8' }}>
              {phase === 'reeling' ? '🐟 BITE ACTIVE! Tap Bar to Hook' : '⏳ Bite Timing / Reel Tension'}
            </span>
            <span style={{ fontSize: '11px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
              {cursorPct}%
            </span>
          </div>

          {/* >= 48px touch area reel tension bar */}
          <button
            type="button"
            data-testid="fishing-reel-bar"
            disabled={!canFish || phase !== 'reeling'}
            onClick={handleReelHook}
            aria-label="Reel Tension Bar — Tap to Set Hook"
            style={{
              position: 'relative',
              width: '100%',
              minHeight: '52px',
              borderRadius: '12px',
              border: `2px solid ${phase === 'reeling' ? '#fde047' : 'rgba(148, 163, 184, 0.3)'}`,
              background: 'rgba(2, 6, 23, 0.9)',
              cursor: phase === 'reeling' ? 'pointer' : 'not-allowed',
              overflow: 'hidden',
              padding: 0,
              touchAction: 'manipulation',
            }}
          >
            {/* Silver Carp medium zone (50% - 94%) */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                width: '44%',
                top: 0,
                bottom: 0,
                background: 'rgba(34, 197, 94, 0.22)',
              }}
            />
            {/* Manillo Koi golden sweet spot (68% - 88%) */}
            <div
              style={{
                position: 'absolute',
                left: '68%',
                width: '20%',
                top: 0,
                bottom: 0,
                background: 'rgba(250, 204, 21, 0.38)',
                borderLeft: '2px solid #fde047',
                borderRight: '2px solid #fde047',
              }}
            />
            {/* Moving Reel Tension Needle */}
            <div
              data-testid="fishing-reel-cursor"
              style={{
                position: 'absolute',
                left: `${cursorPct}%`,
                top: '4px',
                bottom: '4px',
                width: '6px',
                transform: 'translateX(-50%)',
                borderRadius: '9999px',
                background: '#f8fafc',
                boxShadow: '0 0 10px #fde047',
              }}
            />
            <span
              style={{
                position: 'relative',
                zIndex: 1,
                fontSize: '12px',
                fontWeight: 800,
                color: phase === 'reeling' ? '#fef08a' : '#64748b',
                textShadow: '0 1px 4px rgba(0,0,0,0.9)',
              }}
            >
              {phase === 'reeling' ? '🪝 TAP TO REEL IN!' : 'Cast Line First'}
            </span>
          </button>

          <div style={{ display: 'flex', gap: '6px' }}>
            {phase !== 'reeling' ? (
              <button
                type="button"
                data-testid="btn-fishing-quick-cast"
                className="bof-touch-btn bof-touch-btn--primary"
                style={{ minHeight: '48px', width: '100%' }}
                disabled={!canFish}
                onClick={() => setPhase('reeling')}
              >
                {canFish ? '🎣 Quick Cast Line' : 'Out of Bait'}
              </button>
            ) : (
              <button
                type="button"
                data-testid="btn-fishing-reel"
                className="bof-touch-btn bof-touch-btn--primary"
                style={{ minHeight: '48px', width: '100%' }}
                onClick={handleReelHook}
              >
                🪝 Set Hook &amp; Reel!
              </button>
            )}
          </div>
        </div>
      </div>

      {(lastCastScore !== null || lastCatch) && (
        <div
          data-testid="fishing-result-banner"
          style={{
            padding: '8px 10px',
            borderRadius: '10px',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            fontSize: '11px',
            color: '#e0f2fe',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: '6px',
          }}
        >
          {lastCastScore !== null && (
            <span>
              Cast Score: <strong>{Math.round(lastCastScore * 100)}%</strong> (
              {predictCatchTier(lastCastScore)} tier)
            </span>
          )}
          {lastCatch && (
            <span style={{ color: '#fde68a', fontWeight: 700 }}>
              Last Catch: {lastCatch}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
