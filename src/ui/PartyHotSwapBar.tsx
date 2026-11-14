import React, { useState } from 'react';
import type { CharacterId, ShamanId } from '../core/types';
import type { HUDPartyMember } from './hudTypes';

export interface PartyHotSwapBarProps {
  leaderId: CharacterId;
  party: HUDPartyMember[];
  sharedSyncPool: number;
  maxSyncPool: number;
  onSelectLeader: (characterId: CharacterId) => void;
}

const CHARACTER_EMBLEMS: Record<CharacterId, string> = {
  ryu: '🐉',
  bow: '🏹',
  katt: '🐾',
  rand: '🪨',
  nina: '🪽',
  jean: '🐸',
  sten: '🪝',
  spar: '🌿',
  bleu: '🔮',
};

const SHAMAN_BADGES: Record<ShamanId, { label: string; color: string }> = {
  sana: { label: 'Sana', color: '#f97316' },
  seso: { label: 'Seso', color: '#38bdf8' },
  spoo: { label: 'Spoo', color: '#a855f7' },
  solo: { label: 'Solo', color: '#84cc16' },
  seny: { label: 'Seny', color: '#facc15' },
  shin: { label: 'Shin', color: '#f8fafc' },
};

/**
 * Top-left compact zero-menu Party Leader Hot-Swapping bar.
 * Displays active party (Ryu, Bow, Katt), quick-toggle field specialists
 * (Rand, Nina, Jean, Sten, Spar, Bleu), HP/AP mini-bars, Shaman badges, and Dragon Sync gauge.
 */
export const PartyHotSwapBar: React.FC<PartyHotSwapBarProps> = ({
  leaderId,
  party,
  sharedSyncPool,
  maxSyncPool,
  onSelectLeader,
}) => {
  const [showSpecialists, setShowSpecialists] = useState(false);

  const activeMembers = party.filter((m) => m.isActiveParty);
  const specialistMembers = party.filter((m) => !m.isActiveParty);
  const visibleMembers = showSpecialists
    ? [...activeMembers, ...specialistMembers]
    : [
        ...activeMembers,
        ...specialistMembers.filter((m) => m.id === leaderId),
      ];

  const syncPct = maxSyncPool > 0 ? Math.min(100, Math.round((sharedSyncPool / maxSyncPool) * 100)) : 0;

  return (
    <div
      data-testid="party-hotswap-bar"
      className="bof-hud-interactive"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        maxWidth: 'calc(100vw - 210px)',
      }}
    >
      {/* Portrait hot-swap row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {visibleMembers.map((member) => {
          const isLeader = member.id === leaderId;
          const hpPct = member.maxHp > 0 ? Math.max(0, Math.min(100, (member.hp / member.maxHp) * 100)) : 0;
          const apPct = member.maxAp > 0 ? Math.max(0, Math.min(100, (member.ap / member.maxAp) * 100)) : 0;

          return (
            <button
              key={member.id}
              type="button"
              data-testid={`hotswap-${member.id}`}
              aria-pressed={isLeader}
              onClick={() => onSelectLeader(member.id)}
              className="bof-panel"
              style={{
                minHeight: '48px',
                minWidth: '96px',
                padding: '5px 8px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '3px',
                cursor: 'pointer',
                textAlign: 'left',
                color: '#f8fafc',
                touchAction: 'manipulation',
                borderColor: isLeader ? '#fbbf24' : 'rgba(148, 163, 184, 0.28)',
                boxShadow: isLeader
                  ? '0 0 0 1px rgba(251,191,36,0.7), 0 6px 16px rgba(217,119,6,0.3)'
                  : undefined,
                background: isLeader
                  ? 'linear-gradient(155deg, rgba(120, 53, 15, 0.72), rgba(15, 23, 42, 0.92))'
                  : undefined,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  width: '100%',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
                  <span>{CHARACTER_EMBLEMS[member.id]}</span>
                  <span>{member.name}</span>
                </span>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  {member.shamanIds.map((shamanId) => {
                    const badge = SHAMAN_BADGES[shamanId];
                    return (
                      <span
                        key={shamanId}
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '1px 4px',
                          borderRadius: '9999px',
                          background: `${badge.color}28`,
                          border: `1px solid ${badge.color}`,
                          color: badge.color,
                        }}
                        title={`Fused with ${badge.label}${member.isArmorBroken ? ' (Armor Broken)' : ''}`}
                      >
                        {badge.label}
                        {member.isArmorBroken ? '!' : ''}
                      </span>
                    );
                  })}
                  {isLeader && (
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        color: '#fde68a',
                        letterSpacing: '0.03em',
                      }}
                    >
                      LEAD
                    </span>
                  )}
                </div>
              </div>

              {/* HP / AP mini-bars */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                <div className="bof-bar-track" title={`HP ${member.hp}/${member.maxHp}`}>
                  <div
                    className="bof-bar-fill"
                    style={{
                      width: `${hpPct}%`,
                      background: hpPct > 30 ? '#22c55e' : '#ef4444',
                    }}
                  />
                </div>
                <div className="bof-bar-track" title={`AP ${member.ap}/${member.maxAp}`}>
                  <div
                    className="bof-bar-fill"
                    style={{
                      width: `${apPct}%`,
                      background: '#38bdf8',
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}

        {specialistMembers.length > 0 && (
          <button
            type="button"
            data-testid="btn-toggle-specialists"
            className={`bof-touch-btn ${showSpecialists ? 'bof-touch-btn--active' : ''}`}
            style={{ minHeight: '48px', minWidth: '48px', padding: '4px 10px' }}
            onClick={() => setShowSpecialists((prev) => !prev)}
            aria-expanded={showSpecialists}
          >
            <span>{showSpecialists ? '◀ Hide' : `+${specialistMembers.length} Field`}</span>
          </button>
        )}
      </div>

      {/* Dragon Sync Gauge */}
      <div
        data-testid="dragon-sync-gauge"
        className="bof-panel"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 10px',
          borderRadius: '9999px',
          width: 'fit-content',
          fontSize: '11px',
        }}
      >
        <span style={{ fontWeight: 700, color: '#fbbf24' }}>🔥 Dragon Sync</span>
        <div
          className="bof-bar-track"
          style={{ width: '92px', height: '7px', background: 'rgba(30, 41, 59, 0.9)' }}
        >
          <div
            className="bof-bar-fill"
            style={{
              width: `${syncPct}%`,
              background: 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)',
            }}
          />
        </div>
        <span style={{ fontVariantNumeric: 'tabular-nums', color: '#fde68a', fontWeight: 600 }}>
          {sharedSyncPool}/{maxSyncPool}
        </span>
      </div>
    </div>
  );
};
