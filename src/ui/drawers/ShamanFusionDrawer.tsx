import React, { useState } from 'react';
import type { CharacterId, ShamanId } from '../../core/types';
import type { HUDPartyMember, ShamanCatalogItem } from '../hudTypes';

export interface ShamanFusionDrawerProps {
  party: HUDPartyMember[];
  initialCharacterId: CharacterId;
  shamans: ShamanCatalogItem[];
  onFuseShaman: (characterId: CharacterId, shamanId: ShamanId) => void;
  onUnfuseShaman: (characterId: CharacterId, shamanId: ShamanId) => void;
  onClose: () => void;
}

const FUSION_TITLE_MAP: Partial<Record<CharacterId, Partial<Record<ShamanId, string>>>> = {
  katt: {
    sana: 'Flame Tigress',
    seso: 'Frostclaw Striker',
    spoo: 'Tempest Tigress',
    solo: 'Terra Feral',
    seny: 'Radiant Lynx',
    shin: 'Eclipse Tigress',
  },
  bow: {
    sana: 'Blaze Marksman',
    seso: 'Frost Arbalest',
    spoo: 'Gale Ranger',
    solo: 'Ironwood Bowman',
    seny: 'Dawn Sniper',
    shin: 'Umbral Marksman',
  },
  ryu: {
    sana: 'Ember Dragonblood',
    seso: 'Glacial Dragonblood',
    spoo: 'Storm Dragonblood',
    solo: 'Stone Dragonblood',
    seny: 'Astral Dragonblood',
    shin: 'Twilight Dragonblood',
  },
  nina: {
    sana: 'Phoenix Wing',
    seso: 'Boreal Seraph',
    spoo: 'Tempest Sylph',
    seny: 'Solar Seraph',
  },
  rand: {
    solo: 'Bastion Titan',
    sana: 'Magma Pangolin',
  },
  jean: {
    seso: 'Tideblade Cavalier',
    seny: 'Silver Paladin',
  },
  sten: {
    spoo: 'Skyline Corsair',
    sana: 'Wildfire Acrobatic',
  },
  spar: {
    solo: 'Elderwood Sage',
    seny: 'Sunbloom Dryad',
  },
};

function previewFusionTitle(character: HUDPartyMember, shaman: ShamanCatalogItem): string {
  const mapped = FUSION_TITLE_MAP[character.id]?.[shaman.id];
  if (mapped) return mapped;
  return `${shaman.name}-Attuned ${character.name}`;
}

/**
 * Mobile drawer displaying all 6 canonical Shamans (Sana, Seso, Spoo, Solo, Seny, Shin),
 * Decorator fusion previews, >= 48px Fuse/Unfuse controls, and Armor Break explainer.
 */
export const ShamanFusionDrawer: React.FC<ShamanFusionDrawerProps> = ({
  party,
  initialCharacterId,
  shamans,
  onFuseShaman,
  onUnfuseShaman,
  onClose,
}) => {
  const [selectedCharId, setSelectedCharId] = useState<CharacterId>(initialCharacterId);
  const selectedCharacter = party.find((p) => p.id === selectedCharId) ?? party[0];

  return (
    <div
      className="bof-drawer-backdrop"
      data-testid="shaman-fusion-drawer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bof-drawer-sheet bof-panel">
        <div className="bof-drawer-header">
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#fde68a' }}>
              ✨ Shaman Fusion — Decorator Resonance
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Bind unlocked Shamans to transform combat stats, aura, and granted skills
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-shamans"
            className="bof-touch-btn"
            style={{ minWidth: '48px', minHeight: '48px' }}
            onClick={onClose}
          >
            ✕ Close
          </button>
        </div>

        <div className="bof-drawer-body">
          {/* Character Selector */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {party.map((member) => {
              const isSelected = member.id === selectedCharacter?.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  data-testid={`shaman-char-${member.id}`}
                  className={`bof-touch-btn ${isSelected ? 'bof-touch-btn--active' : ''}`}
                  style={{ minHeight: '48px', minWidth: '80px' }}
                  onClick={() => setSelectedCharId(member.id)}
                >
                  <span>{member.name}</span>
                  {member.shamanIds.length > 0 && (
                    <span style={{ fontSize: '10px', color: '#fde68a' }}>
                      ({member.shamanIds.length})
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Armor Break Mechanics Explainer */}
          <div
            data-testid="armor-break-explainer"
            className="bof-panel"
            style={{
              padding: '9px 12px',
              borderRadius: '12px',
              borderColor: 'rgba(248, 113, 113, 0.45)',
              background: 'rgba(69, 10, 10, 0.45)',
              fontSize: '12px',
              color: '#fecaca',
              lineHeight: 1.35,
            }}
          >
            <strong>Armor Break Rule:</strong> Taking a single hit{' '}
            <strong>&gt;= 30% max HP</strong> or dropping <strong>&lt;= 25% HP</strong> triggers
            Armor Break — suppressing <strong>50%</strong> of Shaman fusion bonuses instead of
            permanently losing your bond. Use <strong>Rebind Fusion</strong> in combat to restore
            full power!
          </div>

          {/* Selected Character Active Fusion Status */}
          {selectedCharacter && (
            <div
              className="bof-panel"
              style={{
                padding: '9px 12px',
                borderRadius: '12px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              <div>
                <span style={{ fontWeight: 700 }}>{selectedCharacter.name}</span>{' '}
                <span style={{ color: '#94a3b8' }}>({selectedCharacter.role})</span>
                <div style={{ fontSize: '11px', color: '#fde68a', marginTop: '2px' }}>
                  Active Form:{' '}
                  {selectedCharacter.fusionTitle
                    ? selectedCharacter.fusionTitle
                    : selectedCharacter.shamanIds.length > 0
                    ? selectedCharacter.shamanIds.join(' + ')
                    : 'Unfused Base Form'}
                  {selectedCharacter.isArmorBroken ? ' · ⚠️ ARMOR BROKEN (50% suppressed)' : ''}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                Bonded Shamans: {selectedCharacter.shamanIds.length}/2
              </div>
            </div>
          )}

          {/* All 6 Canonical Shamans Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(245px, 1fr))',
              gap: '8px',
            }}
          >
            {shamans.map((shaman) => {
              const isBondedToSelected =
                selectedCharacter?.shamanIds.includes(shaman.id) ?? false;
              const isBondedElsewhere =
                shaman.bondedToCharacterId !== null &&
                shaman.bondedToCharacterId !== selectedCharacter?.id;
              const multiplierSummary = Object.entries(shaman.statMultipliers)
                .map(([stat, val]) => `${stat.toUpperCase()} x${val}`)
                .join(' · ');
              const fusionPreview = selectedCharacter
                ? previewFusionTitle(selectedCharacter, shaman)
                : shaman.name;

              return (
                <div
                  key={shaman.id}
                  data-testid={`shaman-card-${shaman.id}`}
                  className="bof-panel"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px',
                    opacity: shaman.unlocked ? 1 : 0.62,
                    borderColor: isBondedToSelected
                      ? shaman.auraColor
                      : shaman.unlocked
                      ? 'rgba(148,163,184,0.3)'
                      : 'rgba(100,116,139,0.2)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          color: shaman.auraColor,
                        }}
                      >
                        {shaman.name}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '9999px',
                          border: `1px solid ${shaman.auraColor}`,
                          color: shaman.unlocked ? '#f8fafc' : '#94a3b8',
                        }}
                      >
                        {shaman.unlocked ? shaman.element.toUpperCase() : 'LOCKED'}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{shaman.lore}</div>

                    <div style={{ fontSize: '11px', color: '#fde68a', fontWeight: 600 }}>
                      Preview: {fusionPreview}
                    </div>

                    {multiplierSummary && (
                      <div style={{ fontSize: '11px', color: '#93c5fd' }}>
                        {multiplierSummary}
                      </div>
                    )}

                    {shaman.grantedCommands.length > 0 && (
                      <div style={{ fontSize: '11px', color: '#d8b4fe' }}>
                        Skills: {shaman.grantedCommands.map((c) => c.label).join(', ')}
                      </div>
                    )}

                    {isBondedElsewhere && (
                      <div style={{ fontSize: '10px', color: '#fca5a5' }}>
                        Currently fused with {shaman.bondedToCharacterId}
                      </div>
                    )}
                  </div>

                  {selectedCharacter && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isBondedToSelected ? (
                        <button
                          type="button"
                          data-testid={`btn-unfuse-${shaman.id}`}
                          className="bof-touch-btn"
                          style={{
                            minHeight: '48px',
                            width: '100%',
                            borderColor: '#f87171',
                            color: '#fecaca',
                          }}
                          onClick={() => onUnfuseShaman(selectedCharacter.id, shaman.id)}
                        >
                          Unfuse {shaman.name}
                        </button>
                      ) : (
                        <button
                          type="button"
                          data-testid={`btn-fuse-${shaman.id}`}
                          className="bof-touch-btn bof-touch-btn--primary"
                          style={{ minHeight: '48px', width: '100%' }}
                          disabled={!shaman.unlocked}
                          onClick={() => onFuseShaman(selectedCharacter.id, shaman.id)}
                        >
                          {shaman.unlocked
                            ? `Fuse with ${selectedCharacter.name}`
                            : 'Find in World'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
