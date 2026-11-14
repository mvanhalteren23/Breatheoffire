import { evaluateEquipmentForCombatant } from './equipmentEngine.ts';
import {
  ARMOR_BREAK_LOW_HP_RATIO,
  ARMOR_BREAK_REBIND_HP_RATIO,
  ARMOR_BREAK_SINGLE_HIT_RATIO,
  SHAMAN_DEFINITIONS,
  decorateCombatant,
  evaluateArmorBreakTrigger,
  rebindShamanFusion,
  tickArmorBreakRecovery,
} from './shamanDecorator.ts';
import type {
  CombatCommandDef,
  CombatLogEntry,
  CombatState,
  CombatantInput,
  DecoratedCombatant,
  DragonFormId,
  ElementType,
  EnemyCombatant,
  QueuedCombatAction,
  ScalingContext,
} from './types.ts';

export interface DragonFormConfig {
  id: DragonFormId;
  label: string;
  element: ElementType;
  initialApCost: number;
  initialSyncCost: number;
  baseApPerTurn: number;
  baseSyncPerTurn: number;
  damageMultiplier: number;
}

export const DRAGON_FORM_CONFIGS: Record<DragonFormId, DragonFormConfig> = {
  puppy: {
    id: 'puppy',
    label: 'Breath Whelp',
    element: 'neutral',
    initialApCost: 6,
    initialSyncCost: 10,
    baseApPerTurn: 4,
    baseSyncPerTurn: 5,
    damageMultiplier: 1.4,
  },
  fire_whelpling: {
    id: 'fire_whelpling',
    label: 'Fire Whelpling',
    element: 'fire',
    initialApCost: 8,
    initialSyncCost: 14,
    baseApPerTurn: 5,
    baseSyncPerTurn: 7,
    damageMultiplier: 1.6,
  },
  ice_whelpling: {
    id: 'ice_whelpling',
    label: 'Ice Whelpling',
    element: 'ice',
    initialApCost: 8,
    initialSyncCost: 14,
    baseApPerTurn: 5,
    baseSyncPerTurn: 7,
    damageMultiplier: 1.6,
  },
  thunder_whelpling: {
    id: 'thunder_whelpling',
    label: 'Thunder Whelpling',
    element: 'thunder',
    initialApCost: 9,
    initialSyncCost: 16,
    baseApPerTurn: 6,
    baseSyncPerTurn: 8,
    damageMultiplier: 1.7,
  },
  fire_dragon: {
    id: 'fire_dragon',
    label: 'Fire Dragon',
    element: 'fire',
    initialApCost: 12,
    initialSyncCost: 20,
    baseApPerTurn: 8,
    baseSyncPerTurn: 10,
    damageMultiplier: 1.85,
  },
  ice_dragon: {
    id: 'ice_dragon',
    label: 'Ice Dragon',
    element: 'ice',
    initialApCost: 12,
    initialSyncCost: 20,
    baseApPerTurn: 8,
    baseSyncPerTurn: 10,
    damageMultiplier: 1.9,
  },
  thunder_dragon: {
    id: 'thunder_dragon',
    label: 'Thunder Dragon',
    element: 'thunder',
    initialApCost: 14,
    initialSyncCost: 25,
    baseApPerTurn: 10,
    baseSyncPerTurn: 12,
    damageMultiplier: 2.1,
  },
  great_dragon: {
    id: 'great_dragon',
    label: 'Kaiser Great Dragon',
    element: 'holy',
    initialApCost: 20,
    initialSyncCost: 35,
    baseApPerTurn: 14,
    baseSyncPerTurn: 16,
    damageMultiplier: 2.6,
  },
  kaiser_dragon: {
    id: 'kaiser_dragon',
    label: 'True Kaiser Dragon',
    element: 'holy',
    initialApCost: 24,
    initialSyncCost: 45,
    baseApPerTurn: 16,
    baseSyncPerTurn: 18,
    damageMultiplier: 3.2,
  },
};

export const DRAGON_TRANSFORM_COMMANDS: Record<DragonFormId, CombatCommandDef> = {
  puppy: {
    id: 'dragon_puppy',
    label: 'Breath Whelp',
    apCost: DRAGON_FORM_CONFIGS.puppy.initialApCost,
    syncCost: DRAGON_FORM_CONFIGS.puppy.initialSyncCost,
    powerMultiplier: 1.4,
    element: 'neutral',
    targetType: 'single_enemy',
    kind: 'dragon_transform',
    dragonFormId: 'puppy',
    description: 'Transforms Ryu into Breath Whelp, sustaining neutral dragon breath each turn.',
  },
  fire_whelpling: {
    id: 'dragon_fire_whelpling',
    label: 'Fire Whelpling',
    apCost: DRAGON_FORM_CONFIGS.fire_whelpling.initialApCost,
    syncCost: DRAGON_FORM_CONFIGS.fire_whelpling.initialSyncCost,
    powerMultiplier: 1.6,
    element: 'fire',
    targetType: 'single_enemy',
    kind: 'dragon_transform',
    dragonFormId: 'fire_whelpling',
    description: 'Transforms Ryu into Fire Whelpling, sustaining scorching juvenile Fire breath.',
  },
  ice_whelpling: {
    id: 'dragon_ice_whelpling',
    label: 'Ice Whelpling',
    apCost: DRAGON_FORM_CONFIGS.ice_whelpling.initialApCost,
    syncCost: DRAGON_FORM_CONFIGS.ice_whelpling.initialSyncCost,
    powerMultiplier: 1.6,
    element: 'ice',
    targetType: 'single_enemy',
    kind: 'dragon_transform',
    dragonFormId: 'ice_whelpling',
    description: 'Transforms Ryu into Ice Whelpling, sustaining chilling juvenile Ice breath.',
  },
  thunder_whelpling: {
    id: 'dragon_thunder_whelpling',
    label: 'Thunder Whelpling',
    apCost: DRAGON_FORM_CONFIGS.thunder_whelpling.initialApCost,
    syncCost: DRAGON_FORM_CONFIGS.thunder_whelpling.initialSyncCost,
    powerMultiplier: 1.7,
    element: 'thunder',
    targetType: 'single_enemy',
    kind: 'dragon_transform',
    dragonFormId: 'thunder_whelpling',
    description: 'Transforms Ryu into Thunder Whelpling, sustaining crackling juvenile Lightning breath.',
  },
  fire_dragon: {
    id: 'dragon_fire',
    label: 'Fire Dragon',
    apCost: DRAGON_FORM_CONFIGS.fire_dragon.initialApCost,
    syncCost: DRAGON_FORM_CONFIGS.fire_dragon.initialSyncCost,
    powerMultiplier: 1.85,
    element: 'fire',
    targetType: 'single_enemy',
    kind: 'dragon_transform',
    dragonFormId: 'fire_dragon',
    description: 'Transforms Ryu into Fire Dragon, sustaining Fire breath each turn.',
  },
  ice_dragon: {
    id: 'dragon_ice',
    label: 'Ice Dragon',
    apCost: DRAGON_FORM_CONFIGS.ice_dragon.initialApCost,
    syncCost: DRAGON_FORM_CONFIGS.ice_dragon.initialSyncCost,
    powerMultiplier: 1.9,
    element: 'ice',
    targetType: 'single_enemy',
    kind: 'dragon_transform',
    dragonFormId: 'ice_dragon',
    description: 'Transforms Ryu into Ice Dragon, sustaining Ice breath each turn.',
  },
  thunder_dragon: {
    id: 'dragon_thunder',
    label: 'Thunder Dragon',
    apCost: DRAGON_FORM_CONFIGS.thunder_dragon.initialApCost,
    syncCost: DRAGON_FORM_CONFIGS.thunder_dragon.initialSyncCost,
    powerMultiplier: 2.1,
    element: 'thunder',
    targetType: 'single_enemy',
    kind: 'dragon_transform',
    dragonFormId: 'thunder_dragon',
    description: 'Transforms Ryu into Thunder Dragon, sustaining Lightning breath each turn.',
  },
  great_dragon: {
    id: 'dragon_great',
    label: 'Great Dragon',
    apCost: DRAGON_FORM_CONFIGS.great_dragon.initialApCost,
    syncCost: DRAGON_FORM_CONFIGS.great_dragon.initialSyncCost,
    powerMultiplier: 2.6,
    element: 'holy',
    targetType: 'all_enemies',
    kind: 'dragon_transform',
    dragonFormId: 'great_dragon',
    description: 'Awakens Kaiser Great Dragon form for devastating sustained Dragon strikes.',
  },
  kaiser_dragon: {
    id: 'dragon_kaiser',
    label: 'True Kaiser Dragon',
    apCost: DRAGON_FORM_CONFIGS.kaiser_dragon.initialApCost,
    syncCost: DRAGON_FORM_CONFIGS.kaiser_dragon.initialSyncCost,
    powerMultiplier: 3.2,
    element: 'holy',
    targetType: 'all_enemies',
    kind: 'dragon_transform',
    dragonFormId: 'kaiser_dragon',
    description: 'Unleashes True Kaiser Dragon form, saturating all foes with supreme holy dragonfire.',
  },
};

const ENEMY_BASIC_ATTACK: CombatCommandDef = {
  id: 'enemy_strike',
  label: 'Strike',
  apCost: 0,
  powerMultiplier: 1,
  element: 'neutral',
  targetType: 'single_enemy',
  kind: 'attack',
  description: 'Enemy basic attack.',
};

function findFirstLivingPartyIndex(party: DecoratedCombatant[]): number {
  const idx = party.findIndex((member) => member.hp > 0);
  return idx >= 0 ? idx : 0;
}

function appendLog(
  log: CombatLogEntry[],
  turn: number,
  text: string,
  kind: CombatLogEntry['kind'],
): void {
  log.push({ turn, text, kind });
}

function getHumanRyuAppearance(ryu: DecoratedCombatant): {
  spriteId: string;
  element: ElementType;
} {
  if (ryu.shamanIds.length === 0) {
    return { spriteId: 'ryu', element: 'neutral' };
  }
  const lastShaman = SHAMAN_DEFINITIONS[ryu.shamanIds[ryu.shamanIds.length - 1]];
  return {
    spriteId: `ryu_${ryu.shamanIds.join('_')}`,
    element: lastShaman.element,
  };
}

function revertDragonForm(
  state: CombatState,
  reason: string,
): CombatState {
  const nextParty = state.party.map((member) => {
    if (member.id !== 'ryu') return member;
    const appearance = getHumanRyuAppearance(member);
    return {
      ...member,
      spriteId: appearance.spriteId,
      element: appearance.element,
    };
  });

  const nextLog = [...state.log];
  appendLog(nextLog, state.turnNumber, reason, 'dragon');

  return {
    ...state,
    party: nextParty,
    dragonState: {
      activeForm: null,
      turnsSustained: 0,
      baseApPerTurn: 0,
      baseSyncPerTurn: 0,
      effectiveApPerTurn: 0,
      effectiveSyncPerTurn: 0,
    },
    log: nextLog,
  };
}

export function createCombatState(
  partyInputs: CombatantInput[],
  enemies: EnemyCombatant[],
  context: ScalingContext,
  initialSyncPool = 50,
): CombatState {
  const maxSyncPool = 100;
  const party = partyInputs.map((input) => decorateCombatant(input, context));
  const clonedEnemies = enemies.map((enemy) => ({ ...enemy }));

  return {
    phase: 'INIT',
    turnNumber: 1,
    party,
    enemies: clonedEnemies,
    sharedSyncPool: Math.max(0, Math.min(maxSyncPool, initialSyncPool)),
    maxSyncPool,
    dragonState: {
      activeForm: null,
      turnsSustained: 0,
      baseApPerTurn: 0,
      baseSyncPerTurn: 0,
      effectiveApPerTurn: 0,
      effectiveSyncPerTurn: 0,
    },
    selectedActorIndex: findFirstLivingPartyIndex(party),
    commandQueue: [],
    log: [
      {
        turn: 1,
        text: 'Encounter started.',
        kind: 'system',
      },
    ],
    victoryRewards: null,
  };
}

export function advanceInitToCommandSelect(state: CombatState): CombatState {
  if (state.phase !== 'INIT') {
    return state;
  }

  return {
    ...state,
    phase: 'COMMAND_SELECT',
    selectedActorIndex: findFirstLivingPartyIndex(state.party),
  };
}

export function queuePartyCommand(
  state: CombatState,
  actorId: string,
  commandId: string,
  targetIds: string[],
): CombatState {
  if (state.phase !== 'COMMAND_SELECT') {
    return state;
  }

  const actor = state.party.find((member) => member.id === actorId && member.hp > 0);
  if (!actor) {
    return state;
  }

  const dragonCmd =
    actor.id === 'ryu'
      ? Object.values(DRAGON_TRANSFORM_COMMANDS).find((c) => c.id === commandId)
      : undefined;
  const command = actor.commands.find((cmd) => cmd.id === commandId) ?? dragonCmd;
  if (!command) {
    return state;
  }

  const filteredQueue = state.commandQueue.filter(
    (entry) => !(entry.actorSide === 'party' && entry.actorId === actorId),
  );

  const queuedAction: QueuedCombatAction = {
    actorId: actor.id,
    actorSide: 'party',
    command,
    targetIds: [...targetIds],
    speed: actor.stats.spd,
  };

  const nextQueue = [...filteredQueue, queuedAction];
  const queuedActorIds = new Set(
    nextQueue.filter((q) => q.actorSide === 'party').map((q) => q.actorId),
  );
  const nextIndex = state.party.findIndex(
    (member) => member.hp > 0 && !queuedActorIds.has(member.id),
  );

  return {
    ...state,
    commandQueue: nextQueue,
    selectedActorIndex: nextIndex >= 0 ? nextIndex : findFirstLivingPartyIndex(state.party),
  };
}

function resolveDragonUpkeepAtTurnStart(
  state: CombatState,
  context: ScalingContext,
): CombatState {
  if (!state.dragonState.activeForm) {
    return state;
  }

  const ryuIndex = state.party.findIndex((member) => member.id === 'ryu');
  if (ryuIndex < 0 || state.party[ryuIndex].hp <= 0) {
    return revertDragonForm(state, 'Ryu falls and Dragon Form dissipates.');
  }

  const ryu = state.party[ryuIndex];
  const config = DRAGON_FORM_CONFIGS[state.dragonState.activeForm];

  // Refresh effective upkeep with the current scaling context
  const baseScale = ryu.equipmentSummary.dragonApCostMultiplier;
  const relicCount = ryu.equipmentSummary.relicEvaluations.length;
  const refreshedSummary =
    relicCount > 0
      ? evaluateEquipmentForCombatant(
          ryu.equipmentSummary.relicEvaluations.map((r) => r.relicId),
          [],
          context,
        )
      : null;
  const effectiveMultiplier = refreshedSummary
    ? Math.min(baseScale, refreshedSummary.dragonApCostMultiplier)
    : baseScale;

  const effectiveApPerTurn = Math.max(
    1,
    Math.round(config.baseApPerTurn * effectiveMultiplier),
  );
  const effectiveSyncPerTurn = config.baseSyncPerTurn;

  if (ryu.ap < effectiveApPerTurn || state.sharedSyncPool < effectiveSyncPerTurn) {
    return revertDragonForm(
      state,
      `Ryu lacks AP (${ryu.ap}/${effectiveApPerTurn}) or Sync (${state.sharedSyncPool}/${effectiveSyncPerTurn}) and reverts from ${config.label} to human form.`,
    );
  }

  const nextParty = state.party.map((member, idx) =>
    idx === ryuIndex ? { ...member, ap: member.ap - effectiveApPerTurn } : member,
  );
  const nextLog = [...state.log];
  appendLog(
    nextLog,
    state.turnNumber,
    `Ryu sustains ${config.label} (-${effectiveApPerTurn} AP, -${effectiveSyncPerTurn} Sync).`,
    'dragon',
  );

  return {
    ...state,
    party: nextParty,
    sharedSyncPool: state.sharedSyncPool - effectiveSyncPerTurn,
    dragonState: {
      ...state.dragonState,
      turnsSustained: state.dragonState.turnsSustained + 1,
      effectiveApPerTurn,
      effectiveSyncPerTurn,
    },
    log: nextLog,
  };
}

function calculatePartyAttackDamage(
  actor: DecoratedCombatant,
  enemy: EnemyCombatant,
  powerMultiplier: number,
  attackElement: ElementType,
  isMagicSkill: boolean,
): { damage: number; isWeakness: boolean } {
  const offensiveStat = isMagicSkill
    ? Math.max(actor.stats.atk, actor.stats.mag)
    : actor.stats.atk;
  const raw = Math.max(1, Math.round(offensiveStat * 1.4 - enemy.def * 0.5));
  const isWeakness = attackElement !== 'neutral' && attackElement === enemy.weakness;
  const weaknessMult = isWeakness ? 1.5 : 1;
  const damage = Math.max(1, Math.round(raw * powerMultiplier * weaknessMult));
  return { damage, isWeakness };
}

export function advanceCombatTurn(
  initialState: CombatState,
  context: ScalingContext,
  rng: () => number = Math.random,
): CombatState {
  if (initialState.phase !== 'COMMAND_SELECT' && initialState.phase !== 'RESOLVE_QUEUE') {
    return initialState;
  }

  // Enter RESOLVE_QUEUE
  let state: CombatState = {
    ...initialState,
    phase: 'RESOLVE_QUEUE',
    party: initialState.party.map((m) => ({ ...m, stats: { ...m.stats } })),
    enemies: initialState.enemies.map((e) => ({ ...e })),
    log: [...initialState.log],
  };

  // Pay sustained upkeep if Dragon Form was already active from a prior turn
  state = resolveDragonUpkeepAtTurnStart(state, context);

  // Build enemy actions for living enemies
  const livingParty = state.party.filter((m) => m.hp > 0);
  const enemyActions: QueuedCombatAction[] = state.enemies
    .filter((e) => e.hp > 0)
    .map((enemy) => {
      const targetIdx =
        livingParty.length > 0
          ? Math.min(livingParty.length - 1, Math.floor(rng() * livingParty.length))
          : 0;
      const target = livingParty[targetIdx];
      return {
        actorId: enemy.instanceId,
        actorSide: 'enemy' as const,
        command: ENEMY_BASIC_ATTACK,
        targetIds: target ? [target.id] : [],
        speed: enemy.spd,
      };
    });

  const allActions = [...state.commandQueue, ...enemyActions].sort(
    (a, b) => b.speed - a.speed,
  );

  const guardedActorIds = new Set<string>();
  for (const action of state.commandQueue) {
    if (action.actorSide === 'party' && action.command.kind === 'defend') {
      guardedActorIds.add(action.actorId);
    }
  }

  const justArmorBrokenIds = new Set<string>();

  for (const action of allActions) {
    if (action.actorSide === 'party') {
      const actorIdx = state.party.findIndex(
        (m) => m.id === action.actorId && m.hp > 0,
      );
      if (actorIdx < 0) continue;

      let actor = state.party[actorIdx];
      const cmd = action.command;

      if (cmd.kind === 'defend') {
        guardedActorIds.add(actor.id);
        if (!state.dragonState.activeForm) {
          state.sharedSyncPool = Math.min(state.maxSyncPool, state.sharedSyncPool + 5);
        }
        appendLog(state.log, state.turnNumber, `${actor.name} takes a guarded stance.`, 'action');
        continue;
      }

      if (cmd.kind === 'shaman_rebind') {
        if (actor.ap < cmd.apCost) {
          appendLog(state.log, state.turnNumber, `${actor.name} lacks AP for Shaman Rebind.`, 'shaman');
          continue;
        }
        actor = { ...actor, ap: actor.ap - cmd.apCost };
        state.party[actorIdx] = actor;
        const targetId = action.targetIds[0] ?? actor.id;
        const targetIdx = state.party.findIndex((m) => m.id === targetId && m.hp > 0);
        if (targetIdx >= 0) {
          state.party[targetIdx] = rebindShamanFusion(state.party[targetIdx]);
          justArmorBrokenIds.delete(state.party[targetIdx].id);
          appendLog(
            state.log,
            state.turnNumber,
            `${state.party[targetIdx].name}'s Shaman Fusion is immediately rebound!`,
            'shaman',
          );
        }
        continue;
      }

      if (cmd.kind === 'heal') {
        if (actor.ap < cmd.apCost) {
          appendLog(state.log, state.turnNumber, `${actor.name} lacks AP for ${cmd.label}.`, 'action');
          continue;
        }
        actor = { ...actor, ap: actor.ap - cmd.apCost };
        state.party[actorIdx] = actor;

        const targets =
          cmd.targetType === 'all_allies'
            ? state.party.filter((m) => m.hp > 0)
            : state.party.filter((m) => m.hp > 0 && action.targetIds.includes(m.id));
        const resolvedTargets =
          targets.length > 0 ? targets : state.party.filter((m) => m.hp > 0).slice(0, 1);

        for (const target of resolvedTargets) {
          const tIdx = state.party.findIndex((m) => m.id === target.id);
          if (tIdx < 0) continue;
          const healAmount = Math.max(
            1,
            Math.round(actor.stats.mag * 1.4 * cmd.powerMultiplier),
          );
          const nextHp = Math.min(state.party[tIdx].stats.maxHp, state.party[tIdx].hp + healAmount);
          let updatedTarget: DecoratedCombatant = {
            ...state.party[tIdx],
            hp: nextHp,
          };
          appendLog(
            state.log,
            state.turnNumber,
            `${actor.name} heals ${updatedTarget.name} for ${healAmount} HP.`,
            'action',
          );

          if (
            updatedTarget.isArmorBroken &&
            healAmount > updatedTarget.stats.maxHp * ARMOR_BREAK_REBIND_HP_RATIO
          ) {
            updatedTarget = rebindShamanFusion(updatedTarget);
            justArmorBrokenIds.delete(updatedTarget.id);
            appendLog(
              state.log,
              state.turnNumber,
              `Major healing restores ${updatedTarget.name}'s Shaman Fusion!`,
              'shaman',
            );
          }
          state.party[tIdx] = updatedTarget;
        }
        continue;
      }

      if (cmd.kind === 'dragon_transform') {
        const formId = cmd.dragonFormId ?? 'fire_dragon';
        const config = DRAGON_FORM_CONFIGS[formId];
        const apMult = actor.equipmentSummary.dragonApCostMultiplier;
        const initialApCost = Math.max(1, Math.round(config.initialApCost * apMult));
        const initialSyncCost = cmd.syncCost ?? config.initialSyncCost;

        if (actor.ap < initialApCost || state.sharedSyncPool < initialSyncCost) {
          appendLog(
            state.log,
            state.turnNumber,
            `${actor.name} lacks AP or Sync to awaken ${config.label}.`,
            'dragon',
          );
          continue;
        }

        const effectiveApPerTurn = Math.max(
          1,
          Math.round(config.baseApPerTurn * apMult),
        );
        actor = {
          ...actor,
          ap: actor.ap - initialApCost,
          spriteId: 'ryu_dragon',
          element: config.element,
        };
        state.party[actorIdx] = actor;
        state.sharedSyncPool -= initialSyncCost;
        state.dragonState = {
          activeForm: formId,
          turnsSustained: 1,
          baseApPerTurn: config.baseApPerTurn,
          baseSyncPerTurn: config.baseSyncPerTurn,
          effectiveApPerTurn,
          effectiveSyncPerTurn: config.baseSyncPerTurn,
        };
        appendLog(
          state.log,
          state.turnNumber,
          `Ryu transforms into ${config.label}! (-${initialApCost} AP, -${initialSyncCost} Sync)`,
          'dragon',
        );

        // Execute initial Dragon breath strike if offensive powerMultiplier > 0
        if (cmd.powerMultiplier > 0) {
          const livingEnemies = state.enemies.filter((e) => e.hp > 0);
          const targetEnemies =
            cmd.targetType === 'all_enemies'
              ? livingEnemies
              : livingEnemies.filter((e) => action.targetIds.includes(e.instanceId));
          const resolvedEnemies =
            targetEnemies.length > 0 ? targetEnemies : livingEnemies.slice(0, 1);

          for (const enemy of resolvedEnemies) {
            const eIdx = state.enemies.findIndex((e) => e.instanceId === enemy.instanceId);
            if (eIdx < 0) continue;
            const { damage, isWeakness } = calculatePartyAttackDamage(
              actor,
              state.enemies[eIdx],
              config.damageMultiplier,
              config.element,
              true,
            );
            state.enemies[eIdx] = {
              ...state.enemies[eIdx],
              hp: Math.max(0, state.enemies[eIdx].hp - damage),
            };
            appendLog(
              state.log,
              state.turnNumber,
              `${config.label} scorches ${enemy.name} for ${damage} ${config.element} damage${isWeakness ? ' (WEAKNESS!)' : ''}.`,
              'dragon',
            );
          }
        }
        continue;
      }

      // Standard attack or skill
      if (actor.ap < cmd.apCost) {
        appendLog(state.log, state.turnNumber, `${actor.name} lacks AP for ${cmd.label}.`, 'action');
        continue;
      }

      if (cmd.apCost > 0) {
        actor = { ...actor, ap: actor.ap - cmd.apCost };
        state.party[actorIdx] = actor;
      }

      const isDragonActive = actor.id === 'ryu' && state.dragonState.activeForm !== null;
      const dragonConfig =
        isDragonActive && state.dragonState.activeForm
          ? DRAGON_FORM_CONFIGS[state.dragonState.activeForm]
          : null;

      let attackElement: ElementType = cmd.element;
      let convertedByGear = false;
      if (
        !dragonConfig &&
        cmd.kind === 'attack' &&
        cmd.element === 'neutral' &&
        actor.equipmentSummary.convertedAttackElement
      ) {
        attackElement = actor.equipmentSummary.convertedAttackElement;
        convertedByGear = true;
      } else if (dragonConfig) {
        attackElement = dragonConfig.element;
      }

      const powerMult = dragonConfig
        ? Number((cmd.powerMultiplier * dragonConfig.damageMultiplier).toFixed(2))
        : cmd.powerMultiplier;

      const livingEnemies = state.enemies.filter((e) => e.hp > 0);
      const selectedEnemies =
        cmd.targetType === 'all_enemies'
          ? livingEnemies
          : livingEnemies.filter((e) => action.targetIds.includes(e.instanceId));
      const targets =
        selectedEnemies.length > 0 ? selectedEnemies : livingEnemies.slice(0, 1);

      if (!dragonConfig && cmd.kind === 'attack') {
        state.sharedSyncPool = Math.min(state.maxSyncPool, state.sharedSyncPool + 5);
      }

      for (const target of targets) {
        const eIdx = state.enemies.findIndex((e) => e.instanceId === target.instanceId);
        if (eIdx < 0 || state.enemies[eIdx].hp <= 0) continue;

        const { damage, isWeakness } = calculatePartyAttackDamage(
          actor,
          state.enemies[eIdx],
          powerMult,
          attackElement,
          cmd.kind === 'skill' || dragonConfig !== null,
        );

        state.enemies[eIdx] = {
          ...state.enemies[eIdx],
          hp: Math.max(0, state.enemies[eIdx].hp - damage),
        };

        appendLog(
          state.log,
          state.turnNumber,
          `${actor.name} uses ${cmd.label} on ${target.name} for ${damage} ${attackElement} damage${isWeakness ? ' (WEAKNESS!)' : ''}.`,
          dragonConfig ? 'dragon' : 'action',
        );

        if (convertedByGear) {
          appendLog(
            state.log,
            state.turnNumber,
            `Elemental Conversion imbues ${actor.name}'s strike with ${attackElement}!`,
            'hook',
          );
        }

        // COMBO_CHAIN hook
        const comboHooks = actor.equipmentSummary.hooks.filter(
          (h) => h.type === 'COMBO_CHAIN',
        );
        for (const hook of comboHooks) {
          if (state.enemies[eIdx].hp <= 0) break;
          const chance = hook.comboChance ?? 0.35;
          if (rng() < chance) {
            const comboDamage = Math.max(
              1,
              Math.round(damage * (hook.comboDamageRatio ?? 0.55)),
            );
            state.enemies[eIdx] = {
              ...state.enemies[eIdx],
              hp: Math.max(0, state.enemies[eIdx].hp - comboDamage),
            };
            appendLog(
              state.log,
              state.turnNumber,
              `${hook.label} triggers Combo Chain! ${actor.name} strikes ${target.name} again for ${comboDamage} damage.`,
              'hook',
            );
          }
        }
      }
    } else {
      // Enemy turn
      const enemyIdx = state.enemies.findIndex(
        (e) => e.instanceId === action.actorId && e.hp > 0,
      );
      if (enemyIdx < 0) continue;
      const enemy = state.enemies[enemyIdx];

      const livingPartyNow = state.party.filter((m) => m.hp > 0);
      if (livingPartyNow.length === 0) break;

      const requestedTarget = livingPartyNow.find((m) =>
        action.targetIds.includes(m.id),
      );
      const chosenTarget = requestedTarget ?? livingPartyNow[0];
      const tIdx = state.party.findIndex((m) => m.id === chosenTarget.id);
      if (tIdx < 0) continue;

      const isGuarded = guardedActorIds.has(chosenTarget.id);
      const rawDamage = Math.max(
        1,
        Math.round(enemy.atk * 1.35 - chosenTarget.stats.def * 0.5),
      );
      const damage = isGuarded ? Math.max(1, Math.round(rawDamage * 0.5)) : rawDamage;

      let updatedTarget: DecoratedCombatant = {
        ...state.party[tIdx],
        hp: Math.max(0, state.party[tIdx].hp - damage),
      };

      appendLog(
        state.log,
        state.turnNumber,
        `${enemy.name} strikes ${updatedTarget.name} for ${damage} damage${isGuarded ? ' (guarded)' : ''}.`,
        'action',
      );

      // Armor Break evaluation on heavy/low-HP hit
      if (updatedTarget.hp > 0 && updatedTarget.shamanIds.length > 0) {
        const wasBroken = updatedTarget.isArmorBroken;
        const maxHp = Math.max(1, updatedTarget.stats.maxHp);
        const triggeredByThisHit =
          damage >= maxHp * ARMOR_BREAK_SINGLE_HIT_RATIO ||
          updatedTarget.hp <= maxHp * ARMOR_BREAK_LOW_HP_RATIO;
        if (triggeredByThisHit) {
          const postBreak = evaluateArmorBreakTrigger(updatedTarget, damage);
          if (postBreak.isArmorBroken) {
            updatedTarget = postBreak;
            justArmorBrokenIds.add(updatedTarget.id);
            if (!wasBroken) {
              appendLog(
                state.log,
                state.turnNumber,
                `${updatedTarget.name}'s Shaman Armor breaks under heavy impact! (2 turns)`,
                'shaman',
              );
            }
          }
        }
      }

      state.party[tIdx] = updatedTarget;

      // If Ryu fell in battle while in Dragon Form, revert
      if (updatedTarget.id === 'ryu' && updatedTarget.hp <= 0 && state.dragonState.activeForm) {
        state = revertDragonForm(state, 'Ryu is knocked out and reverts from Dragon Form.');
      }

      // COUNTER_STANCE hook when guarded party member is struck and survives
      if (isGuarded && updatedTarget.hp > 0 && enemy.hp > 0) {
        const counterHooks = updatedTarget.equipmentSummary.hooks.filter(
          (h) => h.type === 'COUNTER_STANCE',
        );
        for (const hook of counterHooks) {
          if (state.enemies[enemyIdx].hp <= 0) break;
          const chance = hook.counterChance ?? 0.25;
          if (rng() < chance) {
            const { damage: baseCounterDmg } = calculatePartyAttackDamage(
              updatedTarget,
              state.enemies[enemyIdx],
              hook.counterDamageRatio ?? 0.75,
              updatedTarget.equipmentSummary.convertedAttackElement ?? updatedTarget.element,
              false,
            );
            state.enemies[enemyIdx] = {
              ...state.enemies[enemyIdx],
              hp: Math.max(0, state.enemies[enemyIdx].hp - baseCounterDmg),
            };
            appendLog(
              state.log,
              state.turnNumber,
              `${hook.label}! ${updatedTarget.name} counters ${enemy.name} for ${baseCounterDmg} damage.`,
              'hook',
            );
          }
        }
      }
    }
  }

  // Tick Armor Break recovery for members not broken on this turn
  state.party = state.party.map((member) => {
    if (member.hp <= 0 || !member.isArmorBroken || justArmorBrokenIds.has(member.id)) {
      return member;
    }
    const recovered = tickArmorBreakRecovery(member);
    if (!recovered.isArmorBroken) {
      appendLog(
        state.log,
        state.turnNumber,
        `${recovered.name} recovers from Armor Break and restores full Shaman Fusion.`,
        'shaman',
      );
    }
    return recovered;
  });

  // CHECK_VICTORY phase
  const allEnemiesDefeated = state.enemies.every((e) => e.hp <= 0);
  if (allEnemiesDefeated) {
    const totalXp = state.enemies.reduce((sum, e) => sum + e.xpReward, 0);
    const totalZenny = state.enemies.reduce((sum, e) => sum + e.zennyReward, 0);
    appendLog(
      state.log,
      state.turnNumber,
      `Victory! Earned ${totalXp} XP and ${totalZenny} Zenny.`,
      'system',
    );
    return {
      ...state,
      phase: 'VICTORY',
      commandQueue: [],
      victoryRewards: { xp: totalXp, zenny: totalZenny },
    };
  }

  const allPartyDefeated = state.party.every((m) => m.hp <= 0);
  if (allPartyDefeated) {
    appendLog(state.log, state.turnNumber, 'The party has fallen...', 'system');
    return {
      ...state,
      phase: 'DEFEAT',
      commandQueue: [],
    };
  }

  return {
    ...state,
    phase: 'COMMAND_SELECT',
    turnNumber: state.turnNumber + 1,
    commandQueue: [],
    selectedActorIndex: findFirstLivingPartyIndex(state.party),
  };
}
