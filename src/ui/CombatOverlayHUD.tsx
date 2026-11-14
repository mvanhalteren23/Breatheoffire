import React, { useMemo, useState } from 'react';
import type {
  CombatCommandDef,
  CombatState,
  DecoratedCombatant,
  DragonFormId,
  ElementType,
} from '../core/types';

export interface CombatOverlayHUDProps {
  combatState: CombatState;
  availableDragonForms?: DragonFormId[];
  onQueueCommand: (actorId: string, command: CombatCommandDef, targetIds: string[]) => void;
  onExecuteTurn: () => void;
  onCancelAction?: (actorId: string) => void;
  onRevertDragonForm?: () => void;
  onExitCombat?: () => void;
}

const ELEMENT_COLORS: Record<ElementType, string> = {
  neutral: '#94a3b8',
  fire: '#f97316',
  ice: '#38bdf8',
  thunder: '#facc15',
  wind: '#4ade80',
  earth: '#a16207',
  holy: '#fde68a',
  shadow: '#a855f7',
};

const DRAGON_FORM_LABELS: Record<
  DragonFormId,
  { label: string; element: ElementType; ap: number; sync: number }
> = {
  puppy: { label: 'BREATH WHELP', element: 'neutral', ap: 4, sync: 5 },
  fire_whelpling: { label: 'FIRE WHELPLING', element: 'fire', ap: 5, sync: 7 },
  ice_whelpling: { label: 'ICE WHELPLING', element: 'ice', ap: 5, sync: 7 },
  thunder_whelpling: { label: 'THUNDER WHELPLING', element: 'thunder', ap: 6, sync: 8 },
  fire_dragon: { label: 'FIRE DRAGON', element: 'fire', ap: 8, sync: 10 },
  ice_dragon: { label: 'ICE DRAGON', element: 'ice', ap: 8, sync: 10 },
  thunder_dragon: { label: 'THUNDER DRAGON', element: 'thunder', ap: 10, sync: 12 },
  great_dragon: { label: 'KAISER GREAT DRAGON', element: 'holy', ap: 14, sync: 16 },
  kaiser_dragon: { label: 'TRUE KAISER DRAGON', element: 'holy', ap: 16, sync: 18 },
};

const ALL_NINE_DRAGON_FORMS: DragonFormId[] = [
  'puppy',
  'fire_whelpling',
  'ice_whelpling',
  'thunder_whelpling',
  'fire_dragon',
  'ice_dragon',
  'thunder_dragon',
  'great_dragon',
  'kaiser_dragon',
];

const FALLBACK_DRAGON_COMMANDS: Record<DragonFormId, CombatCommandDef> = {
  puppy: {
    id: 'dragon_puppy',
    label: 'Breath Whelp',
    apCost: 6,
    syncCost: 10,
    powerMultiplier: 1.4,
    element: 'neutral',
    targetType: 'single_enemy',
    kind: 'dragon_transform',
    dragonFormId: 'puppy',
    description: 'Transform into Breath Whelp (6 AP, 10 Sync)',
  },
  fire_whelpling: {
    id: 'dragon_fire_whelpling',
    label: 'Fire Whelpling',
    apCost: 8,
    syncCost: 14,
    powerMultiplier: 1.6,
    element: 'fire',
    targetType: 'single_enemy',
    kind: 'dragon_transform',
    dragonFormId: 'fire_whelpling',
    description: 'Transform into Fire Whelpling (8 AP, 14 Sync)',
  },
  ice_whelpling: {
    id: 'dragon_ice_whelpling',
    label: 'Ice Whelpling',
    apCost: 8,
    syncCost: 14,
    powerMultiplier: 1.6,
    element: 'ice',
    targetType: 'single_enemy',
    kind: 'dragon_transform',
    dragonFormId: 'ice_whelpling',
    description: 'Transform into Ice Whelpling (8 AP, 14 Sync)',
  },
  thunder_whelpling: {
    id: 'dragon_thunder_whelpling',
    label: 'Thunder Whelpling',
    apCost: 9,
    syncCost: 16,
    powerMultiplier: 1.7,
    element: 'thunder',
    targetType: 'single_enemy',
    kind: 'dragon_transform',
    dragonFormId: 'thunder_whelpling',
    description: 'Transform into Thunder Whelpling (9 AP, 16 Sync)',
  },
  fire_dragon: {
    id: 'dragon_fire',
    label: 'Fire Dragon',
    apCost: 12,
    syncCost: 20,
    powerMultiplier: 1.85,
    element: 'fire',
    targetType: 'single_enemy',
    kind: 'dragon_transform',
    dragonFormId: 'fire_dragon',
    description: 'Transform into Fire Dragon (12 AP, 20 Sync)',
  },
  ice_dragon: {
    id: 'dragon_ice',
    label: 'Ice Dragon',
    apCost: 12,
    syncCost: 20,
    powerMultiplier: 1.9,
    element: 'ice',
    targetType: 'single_enemy',
    kind: 'dragon_transform',
    dragonFormId: 'ice_dragon',
    description: 'Transform into Ice Dragon (12 AP, 20 Sync)',
  },
  thunder_dragon: {
    id: 'dragon_thunder',
    label: 'Thunder Dragon',
    apCost: 14,
    syncCost: 25,
    powerMultiplier: 2.1,
    element: 'thunder',
    targetType: 'single_enemy',
    kind: 'dragon_transform',
    dragonFormId: 'thunder_dragon',
    description: 'Transform into Thunder Dragon (14 AP, 25 Sync)',
  },
  great_dragon: {
    id: 'dragon_great',
    label: 'Great Dragon',
    apCost: 20,
    syncCost: 35,
    powerMultiplier: 2.6,
    element: 'holy',
    targetType: 'all_enemies',
    kind: 'dragon_transform',
    dragonFormId: 'great_dragon',
    description: 'Unleash Kaiser Great Dragon (20 AP, 35 Sync)',
  },
  kaiser_dragon: {
    id: 'dragon_kaiser',
    label: 'True Kaiser Dragon',
    apCost: 24,
    syncCost: 45,
    powerMultiplier: 3.2,
    element: 'holy',
    targetType: 'all_enemies',
    kind: 'dragon_transform',
    dragonFormId: 'kaiser_dragon',
    description: 'Ascend into True Kaiser Dragon (24 AP, 45 Sync)',
  },
};

const FALLBACK_REVERT_COMMAND: CombatCommandDef = {
  id: 'dragon_revert',
  label: 'Revert Form',
  apCost: 0,
  syncCost: 0,
  powerMultiplier: 0,
  element: 'neutral',
  targetType: 'self',
  kind: 'dragon_transform',
  description: 'Revert out of Dragon Form to halt Sync drain',
};

const FALLBACK_REBIND_COMMAND: CombatCommandDef = {
  id: 'shaman_rebind',
  label: 'Rebind Fusion',
  apCost: 3,
  syncCost: 0,
  powerMultiplier: 0,
  element: 'holy',
  targetType: 'self',
  kind: 'shaman_rebind',
  description: 'Restore suppressed Shaman Fusion bonuses after Armor Break',
};

function resolveTargets(
  command: CombatCommandDef,
  actor: DecoratedCombatant,
  selectedEnemyId: string | null,
  combatState: CombatState
): string[] {
  const aliveEnemies = combatState.enemies.filter((e) => e.hp > 0);
  const aliveParty = combatState.party.filter((p) => p.hp > 0);

  switch (command.targetType) {
    case 'single_enemy': {
      const chosen =
        aliveEnemies.find((e) => e.instanceId === selectedEnemyId) ?? aliveEnemies[0];
      return chosen ? [chosen.instanceId] : [];
    }
    case 'all_enemies':
      return aliveEnemies.map((e) => e.instanceId);
    case 'ally':
      return [actor.id];
    case 'all_allies':
      return aliveParty.map((p) => p.id);
    case 'self':
    default:
      return [actor.id];
  }
}

/**
 * Full-screen transparent-center Combat Overlay HUD displayed over live 3D terrain.
 */
export const CombatOverlayHUD: React.FC<CombatOverlayHUDProps> = ({
  combatState,
  availableDragonForms = ALL_NINE_DRAGON_FORMS,
  onQueueCommand,
  onExecuteTurn,
  onCancelAction,
  onRevertDragonForm,
  onExitCombat,
}) => {
  const aliveEnemies = useMemo(
    () => combatState.enemies.filter((e) => e.hp > 0),
    [combatState.enemies]
  );

  const [manualActorIndex, setManualActorIndex] = useState<number | null>(null);
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(
    aliveEnemies[0]?.instanceId ?? null
  );
  const [deckMode, setDeckMode] = useState<'main' | 'dragon' | 'shaman'>('main');

  const activeActorIndex =
    manualActorIndex !== null && combatState.party[manualActorIndex]
      ? manualActorIndex
      : Math.min(combatState.selectedActorIndex, Math.max(0, combatState.party.length - 1));
  const actor = combatState.party[activeActorIndex];

  const effectiveTargetId =
    aliveEnemies.find((e) => e.instanceId === selectedEnemyId)?.instanceId ??
    aliveEnemies[0]?.instanceId ??
    null;

  const queuedByActor = useMemo(() => {
    const map = new Map<string, string>();
    for (const action of combatState.commandQueue) {
      if (action.actorSide === 'party') {
        map.set(action.actorId, action.command.label);
      }
    }
    return map;
  }, [combatState.commandQueue]);

  const attackCmd = actor?.commands.find((c) => c.kind === 'attack') ?? {
    id: 'attack',
    label: 'Attack',
    apCost: 0,
    powerMultiplier: 1,
    element: actor?.element ?? 'neutral',
    targetType: 'single_enemy',
    kind: 'attack',
    description: 'Strike selected enemy',
  };

  const defendCmd = actor?.commands.find((c) => c.kind === 'defend') ?? {
    id: 'defend',
    label: 'Defend',
    apCost: 0,
    powerMultiplier: 0,
    element: 'neutral',
    targetType: 'self',
    kind: 'defend',
    description: 'Brace and halve incoming damage',
  };

  const shamanSkillCommands = useMemo(
    () =>
      (actor?.commands ?? []).filter(
        (c) => c.kind === 'skill' || c.kind === 'heal'
      ),
    [actor]
  );

  const dragonTransformCommands = useMemo(() => {
    const fromActor = (actor?.commands ?? []).filter(
      (c) => c.kind === 'dragon_transform' && c.dragonFormId
    );
    if (actor?.id === 'ryu') {
      const byForm = new Map<DragonFormId, CombatCommandDef>();
      for (const cmd of fromActor) {
        if (cmd.dragonFormId) byForm.set(cmd.dragonFormId, cmd);
      }
      const merged: CombatCommandDef[] = availableDragonForms.map(
        (formId) => byForm.get(formId) ?? FALLBACK_DRAGON_COMMANDS[formId]
      );
      for (const cmd of fromActor) {
        if (cmd.dragonFormId && !availableDragonForms.includes(cmd.dragonFormId)) {
          merged.push(cmd);
        }
      }
      return merged;
    }
    return fromActor;
  }, [actor, availableDragonForms]);

  const rebindCmd =
    actor?.commands.find((c) => c.kind === 'shaman_rebind') ?? FALLBACK_REBIND_COMMAND;

  const activeDragonMeta = combatState.dragonState.activeForm
    ? DRAGON_FORM_LABELS[combatState.dragonState.activeForm]
    : null;

  const isCommandSelect = combatState.phase === 'COMMAND_SELECT';
  const isFinished = combatState.phase === 'VICTORY' || combatState.phase === 'DEFEAT';

  const queueForActor = (cmd: CombatCommandDef) => {
    if (!actor || !isCommandSelect) return;
    const targets = resolveTargets(cmd, actor, effectiveTargetId, combatState);
    onQueueCommand(actor.id, cmd, targets);
    setDeckMode('main');
    // Auto-advance to next unqueued alive actor for smooth single-thumb mobile flow
    const nextIdx = combatState.party.findIndex(
      (p, idx) => idx !== activeActorIndex && p.hp > 0 && !queuedByActor.has(p.id)
    );
    if (nextIdx >= 0) {
      setManualActorIndex(nextIdx);
    }
  };

  const recentLog = combatState.log.slice(-4);

  return (
    <div
      data-testid="combat-overlay-hud"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '10px 14px',
        gap: '8px',
      }}
      className="safe-area-shell"
    >
      {/* Top Strip: Phase, Turn, Sync Pool, Active Dragon Form Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        <div
          className="bof-panel bof-hud-interactive"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '12px',
            fontSize: '12px',
          }}
        >
          <span
            data-testid="combat-phase-badge"
            style={{
              padding: '2px 8px',
              borderRadius: '9999px',
              fontWeight: 800,
              fontSize: '11px',
              background:
                combatState.phase === 'VICTORY'
                  ? 'rgba(34,197,94,0.25)'
                  : combatState.phase === 'DEFEAT'
                  ? 'rgba(239,68,68,0.25)'
                  : 'rgba(245,158,11,0.25)',
              border: '1px solid rgba(251,191,36,0.55)',
              color: '#fde68a',
            }}
          >
            {combatState.phase}
          </span>
          <span data-testid="combat-turn-counter" style={{ fontWeight: 700 }}>
            Turn {combatState.turnNumber}
          </span>
          <span style={{ color: '#94a3b8' }}>|</span>
          <span data-testid="combat-sync-pool" style={{ fontWeight: 700, color: '#fb923c' }}>
            🔥 Sync {combatState.sharedSyncPool} / {combatState.maxSyncPool}
          </span>
        </div>

        {activeDragonMeta && (
          <div
            data-testid="active-dragon-banner"
            className="bof-panel bof-hud-interactive"
            style={{
              padding: '6px 12px',
              borderRadius: '12px',
              borderColor: ELEMENT_COLORS[activeDragonMeta.element],
              background: 'rgba(124, 45, 18, 0.85)',
              fontSize: '12px',
              fontWeight: 700,
              color: '#fef3c7',
            }}
          >
            🐉 {activeDragonMeta.label} — Sustained: {combatState.dragonState.effectiveApPerTurn} AP +{' '}
            {combatState.dragonState.effectiveSyncPerTurn} Sync/turn
          </div>
        )}
      </div>

      {/* Middle Row: Enemy Status Cards (Right-aligned so 3D center remains clear) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        {combatState.enemies.map((enemy) => {
          const isSelected = enemy.instanceId === effectiveTargetId;
          const hpPct =
            enemy.maxHp > 0 ? Math.max(0, Math.min(100, (enemy.hp / enemy.maxHp) * 100)) : 0;
          const isDefeated = enemy.hp <= 0;

          return (
            <button
              key={enemy.instanceId}
              type="button"
              data-testid={`enemy-card-${enemy.instanceId}`}
              disabled={isDefeated}
              onClick={() => setSelectedEnemyId(enemy.instanceId)}
              className="bof-panel bof-hud-interactive"
              style={{
                minWidth: '156px',
                minHeight: '56px',
                padding: '7px 10px',
                borderRadius: '12px',
                textAlign: 'left',
                cursor: isDefeated ? 'default' : 'pointer',
                opacity: isDefeated ? 0.45 : 1,
                borderColor: isSelected ? '#f87171' : 'rgba(148, 163, 184, 0.3)',
                boxShadow: isSelected ? '0 0 0 2px rgba(248, 113, 113, 0.5)' : undefined,
                color: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', fontSize: '12px', fontWeight: 700 }}>
                <span>
                  {isSelected ? '🎯 ' : ''}
                  {enemy.name}
                </span>
                <span style={{ fontSize: '10px', color: '#cbd5e1' }}>Lv.{enemy.level}</span>
              </div>
              <div className="bof-bar-track">
                <div
                  className="bof-bar-fill"
                  style={{ width: `${hpPct}%`, background: '#ef4444' }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '10px',
                  gap: '6px',
                }}
              >
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {enemy.hp}/{enemy.maxHp} HP
                </span>
                <span
                  style={{
                    color: ELEMENT_COLORS[enemy.weakness],
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  Weak: {enemy.weakness}
                </span>
                <span
                  style={{
                    padding: '1px 5px',
                    borderRadius: '6px',
                    background: 'rgba(30, 41, 59, 0.9)',
                    color: '#fcd34d',
                  }}
                >
                  {enemy.aiState}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Area: Victory/Defeat Banner OR Party Command Deck + Combat Log */}
      {isFinished ? (
        <div
          className="bof-panel bof-hud-interactive"
          data-testid="combat-result-panel"
          style={{
            padding: '14px 18px',
            borderRadius: '16px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: combatState.phase === 'VICTORY' ? '#4ade80' : '#f87171' }}>
              {combatState.phase === 'VICTORY' ? '🏆 Battle Victory!' : '💀 Party Defeated'}
            </div>
            {combatState.victoryRewards && (
              <div style={{ fontSize: '13px', color: '#fde68a', marginTop: '2px' }}>
                Earned {combatState.victoryRewards.xp} XP · {combatState.victoryRewards.zenny} Zenny
              </div>
            )}
          </div>
          {onExitCombat && (
            <button
              type="button"
              data-testid="btn-exit-combat"
              className="bof-touch-btn bof-touch-btn--primary"
              style={{ minWidth: '140px', minHeight: '52px', fontSize: '13px' }}
              onClick={onExitCombat}
            >
              Return to Field
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          {/* Concise Combat Log */}
          <div
            data-testid="combat-log-feed"
            className="bof-panel bof-hud-interactive"
            style={{
              flex: '1 1 220px',
              maxWidth: '340px',
              padding: '8px 10px',
              borderRadius: '12px',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
            }}
          >
            <div style={{ fontWeight: 700, color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase' }}>
              Combat Log
            </div>
            {recentLog.length === 0 ? (
              <div style={{ color: '#cbd5e1' }}>Select party commands for Turn {combatState.turnNumber}.</div>
            ) : (
              recentLog.map((entry, idx) => (
                <div
                  key={`${entry.turn}-${idx}`}
                  style={{
                    color:
                      entry.kind === 'dragon'
                        ? '#fb923c'
                        : entry.kind === 'shaman'
                        ? '#c084fc'
                        : entry.kind === 'hook'
                        ? '#fde047'
                        : '#e2e8f0',
                    lineHeight: 1.25,
                  }}
                >
                  <span style={{ opacity: 0.65 }}>[T{entry.turn}] </span>
                  {entry.text}
                </div>
              ))
            )}
          </div>

          {/* Party Actor Tabs + Command Deck */}
          <div
            className="bof-panel bof-hud-interactive"
            style={{
              flex: '2 1 420px',
              padding: '8px 10px',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {/* Party selector strip */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {combatState.party.map((member, index) => {
                const isCurrent = index === activeActorIndex;
                const queuedLabel = queuedByActor.get(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    data-testid={`combat-actor-${member.id}`}
                    className={`bof-touch-btn ${isCurrent ? 'bof-touch-btn--active' : ''}`}
                    style={{
                      minHeight: '48px',
                      padding: '4px 10px',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '2px',
                      opacity: member.hp <= 0 ? 0.45 : 1,
                    }}
                    onClick={() => {
                      setManualActorIndex(index);
                      setDeckMode('main');
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                      <span>{member.name}</span>
                      {member.fusionTitle && (
                        <span style={{ fontSize: '10px', color: '#fde68a' }}>
                          ({member.fusionTitle})
                        </span>
                      )}
                      {member.isArmorBroken && (
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 4px',
                            borderRadius: '6px',
                            background: 'rgba(239,68,68,0.35)',
                            color: '#fca5a5',
                          }}
                        >
                          ARMOR BROKEN
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: '#cbd5e1', fontVariantNumeric: 'tabular-nums' }}>
                      HP {member.hp}/{member.stats.maxHp} · AP {member.ap}/{member.stats.maxAp}
                      {queuedLabel ? ` · ✓ ${queuedLabel}` : ''}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Sub-deck picker for Dragon Forms or Shaman Skills */}
            {deckMode === 'dragon' && actor && (
              <div
                data-testid="dragon-transform-picker"
                style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '2px' }}
              >
                {dragonTransformCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    type="button"
                    data-testid={`btn-dragon-form-${cmd.dragonFormId ?? cmd.id}`}
                    className="bof-touch-btn"
                    style={{
                      minHeight: '48px',
                      borderColor: ELEMENT_COLORS[cmd.element],
                    }}
                    disabled={
                      !isCommandSelect ||
                      actor.ap < cmd.apCost ||
                      combatState.sharedSyncPool < (cmd.syncCost ?? 0)
                    }
                    onClick={() => queueForActor(cmd)}
                  >
                    <span>🐉 {cmd.label}</span>
                    <span style={{ fontSize: '10px', color: '#fde68a' }}>
                      {cmd.apCost}AP/{cmd.syncCost ?? 0}S
                    </span>
                  </button>
                ))}
                {combatState.dragonState.activeForm && (
                  <button
                    type="button"
                    data-testid="btn-dragon-revert"
                    className="bof-touch-btn"
                    style={{
                      minHeight: '48px',
                      borderColor: '#94a3b8',
                    }}
                    disabled={!isCommandSelect}
                    onClick={() => {
                      if (onRevertDragonForm) {
                        onRevertDragonForm();
                        setDeckMode('main');
                      } else {
                        queueForActor(FALLBACK_REVERT_COMMAND);
                      }
                    }}
                  >
                    ↩ Revert
                  </button>
                )}
                <button
                  type="button"
                  className="bof-touch-btn"
                  style={{ minHeight: '48px' }}
                  onClick={() => setDeckMode('main')}
                >
                  Back
                </button>
              </div>
            )}

            {deckMode === 'shaman' && actor && (
              <div
                data-testid="shaman-skills-picker"
                style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '2px' }}
              >
                {shamanSkillCommands.map((cmd) => (
                  <button
                    key={cmd.id}
                    type="button"
                    data-testid={`btn-shaman-skill-${cmd.id}`}
                    className="bof-touch-btn"
                    style={{
                      minHeight: '48px',
                      borderColor: ELEMENT_COLORS[cmd.element],
                    }}
                    disabled={!isCommandSelect || actor.ap < cmd.apCost}
                    onClick={() => queueForActor(cmd)}
                  >
                    <span>✨ {cmd.label}</span>
                    <span style={{ fontSize: '10px', color: '#38bdf8' }}>{cmd.apCost}AP</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="bof-touch-btn"
                  style={{ minHeight: '48px' }}
                  onClick={() => setDeckMode('main')}
                >
                  Back
                </button>
              </div>
            )}

            {/* Main Command Deck Buttons (>= 48px x 48px) */}
            {deckMode === 'main' && actor && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                <button
                  type="button"
                  data-testid="btn-combat-attack"
                  className="bof-touch-btn"
                  style={{ minWidth: '84px', minHeight: '48px' }}
                  disabled={!isCommandSelect || actor.hp <= 0 || aliveEnemies.length === 0}
                  onClick={() => queueForActor(attackCmd)}
                >
                  ⚔️ Attack
                </button>

                {(dragonTransformCommands.length > 0 || combatState.dragonState.activeForm) && (
                  <button
                    type="button"
                    data-testid="btn-combat-dragon"
                    className="bof-touch-btn"
                    style={{
                      minWidth: '108px',
                      minHeight: '48px',
                      borderColor: 'rgba(249, 115, 22, 0.7)',
                    }}
                    disabled={!isCommandSelect || actor.hp <= 0}
                    onClick={() => setDeckMode('dragon')}
                  >
                    🐉 Dragon Form
                  </button>
                )}

                {(actor.shamanIds.length > 0 || shamanSkillCommands.length > 0) && (
                  <button
                    type="button"
                    data-testid="btn-combat-shaman-skills"
                    className="bof-touch-btn"
                    style={{
                      minWidth: '108px',
                      minHeight: '48px',
                      borderColor: 'rgba(192, 132, 252, 0.65)',
                    }}
                    disabled={!isCommandSelect || actor.hp <= 0 || shamanSkillCommands.length === 0}
                    onClick={() => setDeckMode('shaman')}
                  >
                    ✨ Shaman Skills ({shamanSkillCommands.length})
                  </button>
                )}

                {actor.isArmorBroken && (
                  <button
                    type="button"
                    data-testid="btn-combat-rebind-fusion"
                    className="bof-touch-btn"
                    style={{
                      minWidth: '124px',
                      minHeight: '48px',
                      borderColor: '#f87171',
                      background: 'rgba(185, 28, 28, 0.6)',
                    }}
                    disabled={!isCommandSelect || actor.hp <= 0 || actor.ap < rebindCmd.apCost}
                    onClick={() => queueForActor(rebindCmd)}
                  >
                    🔮 Rebind Fusion ({rebindCmd.apCost}AP)
                  </button>
                )}

                <button
                  type="button"
                  data-testid="btn-combat-defend"
                  className="bof-touch-btn"
                  style={{ minWidth: '84px', minHeight: '48px' }}
                  disabled={!isCommandSelect || actor.hp <= 0}
                  onClick={() => queueForActor(defendCmd)}
                >
                  🛡️ Defend
                </button>

                {onCancelAction && queuedByActor.has(actor.id) && (
                  <button
                    type="button"
                    data-testid="btn-combat-undo"
                    className="bof-touch-btn"
                    style={{ minHeight: '48px' }}
                    disabled={!isCommandSelect}
                    onClick={() => onCancelAction(actor.id)}
                  >
                    ↺ Undo
                  </button>
                )}

                <button
                  type="button"
                  data-testid="btn-combat-execute-turn"
                  className="bof-touch-btn bof-touch-btn--primary"
                  style={{ minWidth: '124px', minHeight: '48px', marginLeft: 'auto' }}
                  disabled={!isCommandSelect}
                  onClick={onExecuteTurn}
                >
                  ▶ Execute Turn ({queuedByActor.size}/{combatState.party.filter((p) => p.hp > 0).length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
