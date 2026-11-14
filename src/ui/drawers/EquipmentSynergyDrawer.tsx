import React, { useState } from 'react';
import type { CharacterId, ProgressionRelicDef, ScalingContext } from '../../core/types';
import type { EquipmentCatalogState, HUDPartyMember } from '../hudTypes';

export interface EquipmentSynergyDrawerProps {
  party: HUDPartyMember[];
  initialCharacterId: CharacterId;
  equipment: EquipmentCatalogState;
  onEquipRelic: (characterId: CharacterId, relicId: string) => void;
  onUnequipRelic: (characterId: CharacterId, relicId: string) => void;
  onEquipSignatureGear: (characterId: CharacterId, gearId: string) => void;
  onUnequipSignatureGear: (characterId: CharacterId, gearId: string) => void;
  onClose: () => void;
}

function buildRelicFormulaLines(
  relic: ProgressionRelicDef,
  ctx: ScalingContext
): Array<{ stat: string; total: number; formula: string }> {
  return relic.scalingRules.map((rule) => {
    const levelPart = rule.perLevel * ctx.characterLevel;
    const regionPart = rule.perLiberatedRegion * ctx.liberatedRegions;
    const resonancePart = rule.perShamanResonance * ctx.shamanResonanceRank;
    const loyaltyTier = Math.floor(ctx.loyalty / 25);
    const loyaltyPart = (rule.perLoyaltyTier ?? 0) * loyaltyTier;
    const total = Math.round(rule.base + levelPart + regionPart + resonancePart + loyaltyPart);

    const terms = [
      `${rule.base}`,
      `${rule.perLevel}×Lv(${ctx.characterLevel})`,
      `${rule.perLiberatedRegion}×Regions(${ctx.liberatedRegions})`,
      `${rule.perShamanResonance}×Resonance(${ctx.shamanResonanceRank})`,
    ];
    if (rule.perLoyaltyTier) {
      terms.push(`${rule.perLoyaltyTier}×LoyaltyTier(${loyaltyTier})`);
    }
    return {
      stat: rule.stat.toUpperCase(),
      total,
      formula: `${rule.stat.toUpperCase()}: ${terms.join(' + ')} = +${total}`,
    };
  });
}

/**
 * Mobile drawer displaying Progression-Scaling Relics with live scaling formulas
 * and Build-Altering Signature Gear with passive combat hooks.
 */
export const EquipmentSynergyDrawer: React.FC<EquipmentSynergyDrawerProps> = ({
  party,
  initialCharacterId,
  equipment,
  onEquipRelic,
  onUnequipRelic,
  onEquipSignatureGear,
  onUnequipSignatureGear,
  onClose,
}) => {
  const [selectedCharId, setSelectedCharId] = useState<CharacterId>(initialCharacterId);
  const selectedCharacter = party.find((p) => p.id === selectedCharId) ?? party[0];

  const charCtx: ScalingContext = {
    characterLevel: selectedCharacter?.level ?? equipment.scalingContext.characterLevel,
    liberatedRegions: equipment.scalingContext.liberatedRegions,
    shamanResonanceRank: equipment.scalingContext.shamanResonanceRank,
    loyalty: selectedCharacter?.loyalty ?? equipment.scalingContext.loyalty,
  };

  return (
    <div
      className="bof-drawer-backdrop"
      data-testid="equipment-synergy-drawer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bof-drawer-sheet bof-panel">
        <div className="bof-drawer-header">
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#fde68a' }}>
              💎 Relics &amp; Signature Gear Synergy
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Progression-Scaling Relics grow dynamically · Signature Gear alters combat mechanics
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-relics"
            className="bof-touch-btn"
            style={{ minWidth: '48px', minHeight: '48px' }}
            onClick={onClose}
          >
            ✕ Close
          </button>
        </div>

        <div className="bof-drawer-body">
          {/* Character selector */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {party.map((member) => (
              <button
                key={member.id}
                type="button"
                data-testid={`equip-char-${member.id}`}
                className={`bof-touch-btn ${
                  member.id === selectedCharacter?.id ? 'bof-touch-btn--active' : ''
                }`}
                style={{ minHeight: '48px', minWidth: '76px' }}
                onClick={() => setSelectedCharId(member.id)}
              >
                {member.name} (Lv.{member.level})
              </button>
            ))}
          </div>

          {/* Live Scaling Context Banner */}
          <div
            data-testid="scaling-context-banner"
            className="bof-panel"
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '12px',
              color: '#bae6fd',
            }}
          >
            <span>
              <strong>characterLevel:</strong> {charCtx.characterLevel}
            </span>
            <span>
              <strong>liberatedRegions:</strong> {charCtx.liberatedRegions}
            </span>
            <span>
              <strong>shamanResonanceRank:</strong> {charCtx.shamanResonanceRank}
            </span>
            <span>
              <strong>loyalty:</strong> {charCtx.loyalty}
            </span>
          </div>

          {/* Progression-Scaling Relics Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#fde68a' }}>
              Progression-Scaling Relics
            </div>

            {equipment.relics.map((relic) => {
              const isEquipped =
                selectedCharacter?.equippedRelicIds.includes(relic.id) ?? false;
              const liveLines = buildRelicFormulaLines(relic, charCtx);
              const matchedEval = selectedCharacter?.relicEvaluations?.find(
                (ev) => ev.relicId === relic.id
              );

              return (
                <div
                  key={relic.id}
                  data-testid={`relic-card-${relic.id}`}
                  className="bof-panel"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    opacity: relic.unlocked ? 1 : 0.55,
                    borderColor: isEquipped ? '#fbbf24' : 'rgba(148,163,184,0.28)',
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
                      <div style={{ fontSize: '13px', fontWeight: 800 }}>
                        💎 {relic.name}{' '}
                        {isEquipped && (
                          <span style={{ fontSize: '11px', color: '#4ade80' }}>[EQUIPPED]</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{relic.lore}</div>
                    </div>

                    {selectedCharacter && (
                      <button
                        type="button"
                        data-testid={`btn-toggle-relic-${relic.id}`}
                        className={`bof-touch-btn ${isEquipped ? '' : 'bof-touch-btn--primary'}`}
                        style={{ minHeight: '48px', minWidth: '110px' }}
                        disabled={!relic.unlocked}
                        onClick={() =>
                          isEquipped
                            ? onUnequipRelic(selectedCharacter.id, relic.id)
                            : onEquipRelic(selectedCharacter.id, relic.id)
                        }
                      >
                        {!relic.unlocked ? 'Locked' : isEquipped ? 'Unequip' : 'Equip Relic'}
                      </button>
                    )}
                  </div>

                  {/* Live Scaling Formulas */}
                  <div
                    data-testid={`relic-formulas-${relic.id}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '3px',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      background: 'rgba(15, 23, 42, 0.72)',
                      fontSize: '11px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      color: '#fde68a',
                    }}
                  >
                    {matchedEval && matchedEval.formulaLines.length > 0
                      ? matchedEval.formulaLines.map((line, idx) => <div key={idx}>{line}</div>)
                      : liveLines.map((line) => <div key={line.stat}>{line.formula}</div>)}
                    {relic.dragonApReductionPerRegion && (
                      <div style={{ color: '#fdba74' }}>
                        DRAGON_AP_REDUCTION: {relic.dragonApReductionPerRegion}×Regions(
                        {charCtx.liberatedRegions}) = -
                        {Math.round(
                          relic.dragonApReductionPerRegion * charCtx.liberatedRegions * 100
                        )}
                        % Dragon AP Drain
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Build-Altering Signature Gear Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#93c5fd' }}>
              Build-Altering Signature Gear
            </div>

            {equipment.signatureGear.map((gear) => {
              const isEquipped =
                selectedCharacter?.equippedSignatureIds.includes(gear.id) ?? false;
              const ownerMismatch =
                gear.ownerId !== undefined &&
                selectedCharacter !== undefined &&
                gear.ownerId !== selectedCharacter.id;
              const statEntries = Object.entries(gear.flatStats)
                .filter(([, v]) => typeof v === 'number' && v !== 0)
                .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
                .join(' · ');

              return (
                <div
                  key={gear.id}
                  data-testid={`signature-gear-card-${gear.id}`}
                  className="bof-panel"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    opacity: gear.unlocked ? 1 : 0.55,
                    borderColor: isEquipped ? '#60a5fa' : 'rgba(148,163,184,0.28)',
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
                      <div style={{ fontSize: '13px', fontWeight: 800 }}>
                        ⚔️ {gear.name}{' '}
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          ({gear.slot}
                          {gear.ownerId ? ` · ${gear.ownerId}` : ''})
                        </span>{' '}
                        {isEquipped && (
                          <span style={{ fontSize: '11px', color: '#4ade80' }}>[EQUIPPED]</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{gear.lore}</div>
                      {statEntries && (
                        <div style={{ fontSize: '11px', color: '#86efac', marginTop: '2px' }}>
                          {statEntries}
                        </div>
                      )}
                    </div>

                    {selectedCharacter && (
                      <button
                        type="button"
                        data-testid={`btn-toggle-gear-${gear.id}`}
                        className={`bof-touch-btn ${isEquipped ? '' : 'bof-touch-btn--primary'}`}
                        style={{ minHeight: '48px', minWidth: '118px' }}
                        disabled={!gear.unlocked || (ownerMismatch && !isEquipped)}
                        onClick={() =>
                          isEquipped
                            ? onUnequipSignatureGear(selectedCharacter.id, gear.id)
                            : onEquipSignatureGear(selectedCharacter.id, gear.id)
                        }
                      >
                        {!gear.unlocked
                          ? 'Locked'
                          : ownerMismatch && !isEquipped
                          ? `${gear.ownerId} Only`
                          : isEquipped
                          ? 'Unequip'
                          : 'Equip Gear'}
                      </button>
                    )}
                  </div>

                  {/* Active Passive Combat Hooks */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {gear.hooks.map((hook, idx) => (
                      <div
                        key={`${hook.type}-${idx}`}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '8px',
                          background: 'rgba(30, 58, 138, 0.35)',
                          border: '1px solid rgba(96, 165, 250, 0.35)',
                          fontSize: '11px',
                          color: '#dbeafe',
                        }}
                      >
                        <strong style={{ color: '#93c5fd' }}>[{hook.type}]</strong> {hook.label}:{' '}
                        {hook.description}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
