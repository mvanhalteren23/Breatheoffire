import { create } from 'zustand';
import {
  activateQuest,
  adjustCompanionLoyalty,
  advanceCampaignAct,
  advanceCombatTurn,
  advanceInitToCommandSelect,
  completeQuestObjective,
  createCombatState,
  createInitialWorldRegistry,
  decorateCombatant,
  discoverStEvaClue,
  evaluateTrueEndingConditions,
  getEquipmentCatalogItem,
  liberateRegion,
  queuePartyCommand,
  recruitTownshipCitizen,
  resolveDeathevanBattle,
  setShamanResonanceRank,
  setWorldFlag,
  unlockInfinityGate,
  verifyStEvaClue,
} from '../core';
import type {
  CharacterId,
  CombatState,
  CombatantInput,
  ContinentalBiomeId,
  DragonFormId,
  EnemyCombatant,
  ScalingContext,
  ShamanId,
  TerrainTag,
  TrueEndingEvaluation,
  WorldStateRegistry,
} from '../core/types';
import {
  ACTIVE_STARTER_PARTY_IDS,
  ALL_DRAGON_FORMS,
  CAMPAIGN_CLUES,
  CAMPAIGN_QUESTS,
  CAMPAIGN_ROSTER,
  CONTINENT_PLAYABLE_LIMIT,
  EARLY_SHAMAN_IDS,
  ENEMY_TEMPLATES,
  FIELD_ACTION_PROFILES,
  QUEST_COMPANION_LOYALTY_REWARDS,
  REGION_TRAVEL_ANCHORS,
  TOWNSHIP_CITIZENS,
  createEnemyCombatantFromTemplate,
  resolveTerrainAtPosition,
  type CampfireRecipeDef,
  type Vec3Tuple,
} from '../data/verticalSliceContent';
import {
  triggerCombatHitHaptic,
  triggerFishingBiteHaptic,
  triggerShamanFusionHaptic,
} from './capacitorBridge';
import {
  cookCampfireMeal,
  evaluateWindScentTracking,
  executeFishingCast,
  type ActiveMealBuff,
} from './ecosystemSystem';
import {
  ecsWorld,
  resetEcsWorld,
  stepEnemyEntitiesInWorld,
  syncPlayerEntityInWorld,
} from './ecsWorld';
import {
  canRecruitCitizen,
  executeCitizenRecruitment,
  getTownshipSnapshot,
  type TownshipSnapshot,
} from './townshipSystem';

export type GameDrawerId = 'quests' | 'shamans' | 'relics' | 'township' | null;

export interface FpsTelemetry {
  fps: number;
  drawCalls: number;
  frameTimeMs: number;
}

export interface ContextualActionOutcome {
  executed: boolean;
  action: string;
  message: string;
}

export interface ContextualActionOptions {
  approachAngle?: number;
  distance?: number;
  castScore?: number;
}

export interface GameStoreState {
  // Overworld exploration
  playerPos: Vec3Tuple;
  playerVelocity: Vec3Tuple;
  leaderId: CharacterId;
  facingAngle: number;
  activeTerrainTag: TerrainTag;
  currentBiomeId: ContinentalBiomeId;
  inputVector: { x: number; y: number };
  activeDrawer: GameDrawerId;

  // World & progression
  worldRegistry: WorldStateRegistry;
  partyRoster: Record<CharacterId, CombatantInput>;
  activePartyIds: CharacterId[];
  equippedRelics: Record<CharacterId, string[]>;
  equippedSignatures: Record<CharacterId, string[]>;
  fusedShamans: Record<CharacterId, ShamanId[]>;
  unlockedShamans: ShamanId[];
  availableDragonForms: DragonFormId[];
  ownedEquipmentIds: string[];
  inventory: Record<string, number>;
  zenny: number;
  sharedSyncPool: number;
  windAngle: number;
  activeMealBuff: ActiveMealBuff | null;
  lastCatchLabel: string | null;
  statusBanner: string | null;

  // Combat & telemetry
  activeEncounterEnemyId: string | null;
  combatState: CombatState | null;
  fpsTelemetry: FpsTelemetry;

  // Derived helpers
  getScalingContext: (characterId?: CharacterId) => ScalingContext;
  getTownshipSnapshot: () => TownshipSnapshot;
  getTrueEndingEvaluation: () => TrueEndingEvaluation;

  // Actions
  setInputVector: (vector: { x: number; y: number }) => void;
  setActiveDrawer: (drawer: GameDrawerId) => void;
  setStatusBanner: (banner: string | null) => void;
  movePlayer: (dx: number, dz: number, dt?: number) => void;
  hotSwapLeader: (characterId: CharacterId) => void;
  triggerContextualFieldAction: (
    options?: ContextualActionOptions
  ) => ContextualActionOutcome;
  startHunt: (options?: {
    approachAngle?: number;
    distance?: number;
  }) => ContextualActionOutcome;
  castFishingLine: (castScore?: number) => ContextualActionOutcome;
  travelToRegion: (biomeId: ContinentalBiomeId) => boolean;
  unlockShaman: (shamanId: ShamanId) => void;
  advanceQuestObjective: (questId: string, objectiveId: string) => void;
  unlockInfinity: () => boolean;
  confrontDeathevan: (victory?: boolean) => TrueEndingEvaluation;
  startEncounter: (
    enemyTemplateId?: keyof typeof ENEMY_TEMPLATES,
    enemyEntityId?: string
  ) => void;
  submitCombatCommand: (
    actorId: string,
    commandId: string,
    targetIds: string[]
  ) => void;
  runCombatTurn: (rng?: () => number) => void;
  exitCombat: () => void;
  toggleShamanFusion: (characterId: CharacterId, shamanId: ShamanId) => void;
  equipItem: (
    characterId: CharacterId,
    itemId: string,
    mode?: 'equip' | 'unequip'
  ) => void;
  recruitCitizen: (citizenId: string) => boolean;
  discoverOrAdvanceClue: (clueId: string) => void;
  cookMeal: (recipeId: CampfireRecipeDef['id']) => boolean;
  updateFpsTelemetry: (
    fps: number,
    drawCalls: number,
    frameTimeMs?: number
  ) => void;
  resetGame: () => void;
}

function cloneInitialRoster(): Record<CharacterId, CombatantInput> {
  const result = {} as Record<CharacterId, CombatantInput>;
  for (const [key, member] of Object.entries(CAMPAIGN_ROSTER)) {
    const id = key as CharacterId;
    result[id] = {
      ...member,
      baseStats: { ...member.baseStats },
      equippedRelicIds: [...member.equippedRelicIds],
      equippedSignatureIds: [...member.equippedSignatureIds],
      shamanIds: [...member.shamanIds],
      commands: member.commands.map((cmd) => ({ ...cmd })),
    };
  }
  return result;
}

function buildInitialWorldRegistry(): WorldStateRegistry {
  let registry = createInitialWorldRegistry(
    Object.values(CAMPAIGN_QUESTS),
    Object.values(CAMPAIGN_CLUES)
  );
  // Seed initial companion loyalties from roster
  for (const member of Object.values(CAMPAIGN_ROSTER)) {
    const delta = member.loyalty - (registry.companionLoyalty[member.id] ?? 50);
    if (delta !== 0) {
      registry = adjustCompanionLoyalty(registry, member.id, delta);
    }
  }
  // Kay starts settled at the Starter Campfire & Provision Hall
  registry = recruitTownshipCitizen(
    registry,
    TOWNSHIP_CITIZENS.kay.id,
    TOWNSHIP_CITIZENS.kay.buildingId
  );
  registry = setWorldFlag(registry, 'frontier_arrival', true);
  return registry;
}

function createInitialRecord<T>(factory: (id: CharacterId) => T): Record<CharacterId, T> {
  return {
    ryu: factory('ryu'),
    bow: factory('bow'),
    katt: factory('katt'),
    rand: factory('rand'),
    nina: factory('nina'),
    jean: factory('jean'),
    sten: factory('sten'),
    spar: factory('spar'),
    bleu: factory('bleu'),
  };
}

function buildScalingContextFromState(
  registry: WorldStateRegistry,
  roster: Record<CharacterId, CombatantInput>,
  characterId: CharacterId = 'ryu'
): ScalingContext {
  const member = roster[characterId];
  return {
    characterLevel: member.level,
    liberatedRegions: registry.liberatedRegions.length,
    shamanResonanceRank: registry.shamanResonanceRank,
    loyalty: registry.companionLoyalty[characterId] ?? member.loyalty,
  };
}

function resolveBiomeFromPosition(x: number, z: number): ContinentalBiomeId {
  const cx = Math.round(x / 250);
  const cz = Math.round(z / 250);
  if (cx === 0 && cz === -2) return 'infinity';
  if (cx === 0 && cz === -1) return 'gate';
  if (cx === -1 && cz === -1) return 'windia';
  if (cx === 1 && cz === -1) return 'highfort';
  if (cx === -1 && cz === 0) return 'simafort';
  if (cx === 1 && cz === 0) return 'tunlan';
  if (cx === -1 && cz === 1) return 'capitan';
  return 'frontier';
}

const CLUE_TO_QUEST_OBJECTIVE: Record<
  string,
  { questId: string; objectiveId: string }
> = {
  clue_tainted_tithe: {
    questId: 'quest_steva_ledger',
    objectiveId: 'obj_clue_tithe',
  },
  clue_courtyard_cipher: {
    questId: 'quest_steva_ledger',
    objectiveId: 'obj_clue_cipher',
  },
  clue_shrine_seal: {
    questId: 'quest_steva_ledger',
    objectiveId: 'obj_clue_seal',
  },
  clue_capitan_well: {
    questId: 'quest_steva_cathedral',
    objectiveId: 'obj_clue_capitan_well',
  },
  clue_tunlan_hymn: {
    questId: 'quest_steva_cathedral',
    objectiveId: 'obj_clue_tunlan_hymn',
  },
  clue_infinity_organ: {
    questId: 'quest_steva_cathedral',
    objectiveId: 'obj_clue_infinity_organ',
  },
  clue_deathevan_heart: {
    questId: 'quest_steva_cathedral',
    objectiveId: 'obj_clue_deathevan_heart',
  },
};

const ACT1_LEDGER_CLUE_IDS = [
  'clue_tainted_tithe',
  'clue_courtyard_cipher',
  'clue_shrine_seal',
];

const CATHEDRAL_CLUE_IDS = [
  'clue_capitan_well',
  'clue_tunlan_hymn',
  'clue_infinity_organ',
  'clue_deathevan_heart',
];

function completeObjectiveWithRewards(
  registry: WorldStateRegistry,
  ownedEquipmentIds: string[],
  questId: string,
  objectiveId: string
): {
  registry: WorldStateRegistry;
  ownedEquipmentIds: string[];
  newlyCompleted: boolean;
} {
  const prevQuest = registry.quests[questId];
  if (!prevQuest) {
    return { registry, ownedEquipmentIds, newlyCompleted: false };
  }
  const prevStage = prevQuest.stage;
  let nextRegistry =
    prevStage === 'DISCOVERED' ? activateQuest(registry, questId) : registry;
  nextRegistry = completeQuestObjective(nextRegistry, questId, objectiveId);

  const updatedQuest = nextRegistry.quests[questId];
  const newlyCompleted =
    prevStage !== 'COMPLETED' && updatedQuest?.stage === 'COMPLETED';
  let nextOwned = ownedEquipmentIds;

  if (newlyCompleted && updatedQuest) {
    if (
      updatedQuest.rewardRelicId &&
      !nextOwned.includes(updatedQuest.rewardRelicId)
    ) {
      nextOwned = [...nextOwned, updatedQuest.rewardRelicId];
    }
    if (
      updatedQuest.rewardSignatureId &&
      !nextOwned.includes(updatedQuest.rewardSignatureId)
    ) {
      nextOwned = [...nextOwned, updatedQuest.rewardSignatureId];
    }
    const loyaltyReward = QUEST_COMPANION_LOYALTY_REWARDS[questId];
    if (loyaltyReward) {
      nextRegistry = adjustCompanionLoyalty(
        nextRegistry,
        loyaltyReward.companionId,
        loyaltyReward.loyaltyBonus
      );
    }
  }

  return { registry: nextRegistry, ownedEquipmentIds: nextOwned, newlyCompleted };
}

function grantShamanUnlock(
  unlockedShamans: ShamanId[],
  shamanId: ShamanId
): ShamanId[] {
  return unlockedShamans.includes(shamanId)
    ? unlockedShamans
    : [...unlockedShamans, shamanId];
}

function createInitialStateData() {
  const worldRegistry = buildInitialWorldRegistry();
  const partyRoster = cloneInitialRoster();

  return {
    playerPos: [0, 0, 8] as Vec3Tuple,
    playerVelocity: [0, 0, 0] as Vec3Tuple,
    leaderId: 'ryu' as CharacterId,
    facingAngle: Math.PI,
    activeTerrainTag: resolveTerrainAtPosition(0, 8),
    currentBiomeId: 'frontier' as ContinentalBiomeId,
    inputVector: { x: 0, y: 0 },
    activeDrawer: null as GameDrawerId,
    worldRegistry,
    partyRoster,
    activePartyIds: [...ACTIVE_STARTER_PARTY_IDS],
    equippedRelics: createInitialRecord((id) =>
      id === 'ryu' ? ['relic_dragon_tear'] : []
    ),
    equippedSignatures: createInitialRecord(() => [] as string[]),
    fusedShamans: createInitialRecord(() => [] as ShamanId[]),
    unlockedShamans: [...EARLY_SHAMAN_IDS] as ShamanId[],
    availableDragonForms: [...ALL_DRAGON_FORMS] as DragonFormId[],
    ownedEquipmentIds: ['relic_dragon_tear', 'sig_rangers_alibi'],
    inventory: {
      red_snapper: 1,
      wild_boar_cut: 1,
      manillo_tokens: 2,
    },
    zenny: 250,
    sharedSyncPool: 50,
    windAngle: 0.65,
    activeMealBuff: null as ActiveMealBuff | null,
    lastCatchLabel: null as string | null,
    statusBanner: 'Township Frontier — Press Field Action or explore landmarks.',
    activeEncounterEnemyId: null as string | null,
    combatState: null as CombatState | null,
    fpsTelemetry: {
      fps: 60,
      drawCalls: 0,
      frameTimeMs: 16.6,
    },
  };
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  ...createInitialStateData(),

  getScalingContext: (characterId = 'ryu') => {
    const state = get();
    return buildScalingContextFromState(
      state.worldRegistry,
      state.partyRoster,
      characterId
    );
  },

  getTownshipSnapshot: () => getTownshipSnapshot(get().worldRegistry),

  getTrueEndingEvaluation: () =>
    evaluateTrueEndingConditions(get().worldRegistry),

  setInputVector: (vector) => set({ inputVector: vector }),

  setActiveDrawer: (drawer) => set({ activeDrawer: drawer }),

  setStatusBanner: (banner) => set({ statusBanner: banner }),

  movePlayer: (dx, dz, dt = 1 / 60) => {
    const state = get();
    if (state.combatState !== null) {
      return;
    }

    const safeDt = Math.max(0, Math.min(dt, 0.1));
    const moveMag = Math.hypot(dx, dz);
    const normDx = moveMag > 1 ? dx / moveMag : dx;
    const normDz = moveMag > 1 ? dz / moveMag : dz;

    const leaderSpeed = state.leaderId === 'katt' ? 9.5 : 7.5;
    const vx = normDx * leaderSpeed;
    const vz = normDz * leaderSpeed;

    const nextX = Math.max(
      -CONTINENT_PLAYABLE_LIMIT,
      Math.min(CONTINENT_PLAYABLE_LIMIT, state.playerPos[0] + vx * safeDt)
    );
    const nextZ = Math.max(
      -CONTINENT_PLAYABLE_LIMIT,
      Math.min(CONTINENT_PLAYABLE_LIMIT, state.playerPos[2] + vz * safeDt)
    );
    const nextPos: Vec3Tuple = [nextX, 0, nextZ];
    const nextVel: Vec3Tuple = [vx, 0, vz];
    const nextFacing =
      moveMag > 0.05 ? Math.atan2(normDx, normDz) : state.facingAngle;
    const nextTerrain = resolveTerrainAtPosition(nextX, nextZ);
    const nextBiome = resolveBiomeFromPosition(nextX, nextZ);

    syncPlayerEntityInWorld(
      ecsWorld,
      nextPos,
      nextVel,
      nextFacing,
      state.leaderId,
      nextTerrain
    );

    const { engagedEnemy } = stepEnemyEntitiesInWorld(
      ecsWorld,
      nextPos,
      nextVel,
      safeDt
    );

    set({
      playerPos: nextPos,
      playerVelocity: nextVel,
      facingAngle: nextFacing,
      activeTerrainTag: nextTerrain,
      currentBiomeId: nextBiome,
    });

    if (engagedEnemy) {
      const templateId =
        (engagedEnemy.templateId as keyof typeof ENEMY_TEMPLATES) ??
        'harpy_scout';
      get().startEncounter(templateId, engagedEnemy.id);
    }
  },

  hotSwapLeader: (characterId) => {
    const state = get();
    const profile = FIELD_ACTION_PROFILES[characterId];
    const member = state.partyRoster[characterId];

    // Ensure leader stays available in activePartyIds when entering field combat
    const nextActiveParty = state.activePartyIds.includes(characterId)
      ? state.activePartyIds
      : [state.activePartyIds[0], state.activePartyIds[1], characterId];

    syncPlayerEntityInWorld(
      ecsWorld,
      state.playerPos,
      state.playerVelocity,
      state.facingAngle,
      characterId,
      state.activeTerrainTag
    );

    set({
      leaderId: characterId,
      activePartyIds: nextActiveParty,
      statusBanner: `${member.name} leads — ${profile.actionLabel}`,
    });
  },

  triggerContextualFieldAction: (options) => {
    const state = get();
    const terrain = state.activeTerrainTag;
    const leaderId = state.leaderId;
    const profile = FIELD_ACTION_PROFILES[leaderId];

    if (terrain === 'FISHING_SPOT') {
      const leader = state.partyRoster[leaderId];
      const context = buildScalingContextFromState(
        state.worldRegistry,
        state.partyRoster,
        leaderId
      );
      const decorated = decorateCombatant(leader, context);
      const castResult = executeFishingCast(
        decorated.stats.luck,
        leaderId === 'ryu',
        options?.castScore
      );

      const nextInventory = {
        ...state.inventory,
        [castResult.catchItem.id]:
          (state.inventory[castResult.catchItem.id] ?? 0) + 1,
        manillo_tokens:
          (state.inventory.manillo_tokens ?? 0) + castResult.manilloTokensEarned,
      };
      const message = `Caught ${castResult.catchItem.name}! (+${castResult.manilloTokensEarned} Manillo Tokens)`;

      void triggerFishingBiteHaptic(
        'catch',
        castResult.manilloTokensEarned >= 2 || (options?.castScore ?? 0) >= 0.85,
      );

      set({
        inventory: nextInventory,
        lastCatchLabel: castResult.catchItem.name,
        statusBanner: message,
      });

      return { executed: true, action: 'fishing', message };
    }

    if (terrain === 'HUNTING_TRAIL') {
      const approachAngle = options?.approachAngle ?? state.facingAngle;
      const distance = options?.distance ?? 12;
      const huntResult = evaluateWindScentTracking(
        state.windAngle,
        approachAngle,
        distance
      );
      const nextInventory = { ...state.inventory };
      for (const drop of huntResult.drops) {
        nextInventory[drop.itemId] =
          (nextInventory[drop.itemId] ?? 0) + drop.quantity;
      }

      let nextRegistry = state.worldRegistry;
      let nextOwned = state.ownedEquipmentIds;
      const fangRes = completeObjectiveWithRewards(
        nextRegistry,
        nextOwned,
        'quest_coliseum_fang',
        'obj_track_sabotage'
      );
      nextRegistry = fangRes.registry;
      nextOwned = fangRes.ownedEquipmentIds;

      const alibiRes = completeObjectiveWithRewards(
        nextRegistry,
        nextOwned,
        'quest_coursair_alibi',
        'obj_bow_alibi_trail'
      );
      nextRegistry = alibiRes.registry;
      nextOwned = alibiRes.ownedEquipmentIds;

      nextRegistry = discoverStEvaClue(nextRegistry, 'clue_courtyard_cipher');

      const dropSummary =
        huntResult.drops.length > 0
          ? huntResult.drops.map((d) => `${d.quantity}x ${d.name}`).join(', ')
          : 'Prey startled';
      const message = `${huntResult.windAlignmentLabel} (${huntResult.stealthScore}%): ${dropSummary}`;

      set({
        inventory: nextInventory,
        worldRegistry: nextRegistry,
        ownedEquipmentIds: nextOwned,
        lastCatchLabel: dropSummary,
        statusBanner: message,
      });

      return { executed: true, action: 'hunting_shot', message };
    }

    if (terrain === 'DRAGON_SHRINE') {
      let nextRegistry = state.worldRegistry;
      let nextOwned = state.ownedEquipmentIds;
      const shrineRes = completeObjectiveWithRewards(
        nextRegistry,
        nextOwned,
        'quest_dragon_tear',
        'obj_dragon_shrine'
      );
      nextRegistry = shrineRes.registry;
      nextOwned = shrineRes.ownedEquipmentIds;
      nextRegistry = discoverStEvaClue(nextRegistry, 'clue_shrine_seal');
      nextRegistry = setWorldFlag(nextRegistry, 'dragon_shrine_inspected', true);
      nextRegistry = setShamanResonanceRank(
        nextRegistry,
        Math.max(nextRegistry.shamanResonanceRank, 1)
      );

      const nextShamans = grantShamanUnlock(state.unlockedShamans, 'sana');
      const message =
        'Dragon Sight resonated with the Gate Monolith! Discovered Gate Shrine Seal.';

      set({
        worldRegistry: nextRegistry,
        ownedEquipmentIds: nextOwned,
        unlockedShamans: nextShamans,
        sharedSyncPool: Math.min(100, state.sharedSyncPool + 20),
        statusBanner: message,
      });

      return { executed: true, action: 'dragon_sight', message };
    }

    if (terrain === 'COURSAIR_GATE') {
      let nextRegistry = state.worldRegistry;
      let nextOwned = state.ownedEquipmentIds;
      const gateRes = completeObjectiveWithRewards(
        nextRegistry,
        nextOwned,
        'quest_coursair_innocence',
        'obj_coursair_gate'
      );
      nextRegistry = gateRes.registry;
      nextOwned = gateRes.ownedEquipmentIds;

      const alibiRes = completeObjectiveWithRewards(
        nextRegistry,
        nextOwned,
        'quest_coursair_alibi',
        'obj_bow_clear_name'
      );
      nextRegistry = alibiRes.registry;
      nextOwned = alibiRes.ownedEquipmentIds;

      nextRegistry = discoverStEvaClue(nextRegistry, 'clue_tainted_tithe');
      nextRegistry = setWorldFlag(nextRegistry, 'coursair_gate_reached', true);

      const message =
        "Confronted Augus's Gate Watch! Found Tainted Tithe Manifest clue.";

      set({
        worldRegistry: nextRegistry,
        ownedEquipmentIds: nextOwned,
        statusBanner: message,
      });

      return { executed: true, action: profile.primaryAction, message };
    }

    if (terrain === 'TOWNSHIP_PLOT') {
      const nextRoster = cloneInitialRoster();
      for (const id of Object.keys(state.partyRoster) as CharacterId[]) {
        const cur = state.partyRoster[id];
        const decorated = decorateCombatant(
          cur,
          buildScalingContextFromState(state.worldRegistry, state.partyRoster, id)
        );
        nextRoster[id] = {
          ...cur,
          hp: decorated.stats.maxHp,
          ap: decorated.stats.maxAp,
        };
      }
      const message =
        'Rested at Township Campfire — party HP & AP fully restored.';

      set({
        partyRoster: nextRoster,
        statusBanner: message,
      });

      return { executed: true, action: 'campfire_rest', message };
    }

    // Continental & Specialist landmarks
    let nextRegistry = state.worldRegistry;
    let nextOwned = state.ownedEquipmentIds;
    let nextShamans = state.unlockedShamans;
    let nextZenny = state.zenny;

    if (terrain === 'CAPITAN_SHORE') {
      nextRegistry = discoverStEvaClue(nextRegistry, 'clue_capitan_well');
      nextRegistry = liberateRegion(nextRegistry, 'capitan');
      nextRegistry = advanceCampaignAct(nextRegistry, 2);
      const pactRes = completeObjectiveWithRewards(
        nextRegistry,
        nextOwned,
        'quest_act2_continental_pact',
        'obj_pact_capitan'
      );
      nextRegistry = pactRes.registry;
      nextOwned = pactRes.ownedEquipmentIds;
      const message =
        'Capitan Harbor & Wellspring investigated! Discovered Capitan Wellspring Conduit.';
      set({
        worldRegistry: nextRegistry,
        ownedEquipmentIds: nextOwned,
        statusBanner: message,
      });
      return { executed: true, action: profile.primaryAction, message };
    }

    if (terrain === 'GATE_FISSURE') {
      nextShamans = grantShamanUnlock(nextShamans, 'shin');
      nextRegistry = setShamanResonanceRank(
        nextRegistry,
        Math.max(nextRegistry.shamanResonanceRank, 4)
      );
      nextRegistry = discoverStEvaClue(nextRegistry, 'clue_deathevan_heart');
      nextRegistry = liberateRegion(nextRegistry, 'gate');
      nextRegistry = advanceCampaignAct(nextRegistry, 3);

      const serpentRes = completeObjectiveWithRewards(
        nextRegistry,
        nextOwned,
        'quest_ancient_serpent',
        'obj_bleu_awaken_seal'
      );
      nextRegistry = serpentRes.registry;
      nextOwned = serpentRes.ownedEquipmentIds;

      const infRes = completeObjectiveWithRewards(
        nextRegistry,
        nextOwned,
        'quest_act3_infinity_descent',
        'obj_unseal_gate_fissure'
      );
      nextRegistry = infRes.registry;
      nextOwned = infRes.ownedEquipmentIds;
      nextRegistry = unlockInfinityGate(nextRegistry);

      const message =
        'Gate Fissure unsealed! Awakened Shadow Shaman Shin & Infinity Gate!';
      set({
        worldRegistry: nextRegistry,
        ownedEquipmentIds: nextOwned,
        unlockedShamans: nextShamans,
        statusBanner: message,
      });
      return { executed: true, action: profile.primaryAction, message };
    }

    if (terrain === 'INFINITY_VOID') {
      nextRegistry = discoverStEvaClue(nextRegistry, 'clue_infinity_organ');
      const reckRes = completeObjectiveWithRewards(
        nextRegistry,
        nextOwned,
        'quest_deathevan_reckoning',
        'obj_confront_deathevan_heart'
      );
      nextRegistry = reckRes.registry;
      nextOwned = reckRes.ownedEquipmentIds;
      const message =
        'Entered Infinity Void Core! Discovered Infinity Neural Organ clue.';
      set({
        worldRegistry: nextRegistry,
        ownedEquipmentIds: nextOwned,
        statusBanner: message,
      });
      return { executed: true, action: profile.primaryAction, message };
    }

    // Specialist traversal & continental biome landmarks
    const specialistMatch = profile.targetTerrains.includes(terrain);
    const continentalTerrains: TerrainTag[] = [
      'WIND_UPDRAFT',
      'HIGHFORT_GEAR',
      'SIMAFORT_MIRE',
      'TUNLAN_TIDE',
    ];
    if (specialistMatch || continentalTerrains.includes(terrain)) {
      const flagKey = `traversed_${terrain.toLowerCase()}`;
      const firstClear = !nextRegistry.flags[flagKey];
      nextRegistry = setWorldFlag(nextRegistry, flagKey, true);
      if (specialistMatch) {
        nextRegistry = adjustCompanionLoyalty(nextRegistry, leaderId, 5);
      }

      if (terrain === 'BOULDER_CRACK') {
        const res = completeObjectiveWithRewards(
          nextRegistry,
          nextOwned,
          'quest_farmtown_burden',
          'obj_rand_boulder_pass'
        );
        nextRegistry = res.registry;
        nextOwned = res.ownedEquipmentIds;
      } else if (terrain === 'FOREST_THICKET') {
        nextShamans = grantShamanUnlock(nextShamans, 'seso');
        nextRegistry = setShamanResonanceRank(
          nextRegistry,
          Math.max(nextRegistry.shamanResonanceRank, 2)
        );
        const res = completeObjectiveWithRewards(
          nextRegistry,
          nextOwned,
          'quest_great_tree_memory',
          'obj_spar_thicket_song'
        );
        nextRegistry = res.registry;
        nextOwned = res.ownedEquipmentIds;
      } else if (terrain === 'WIND_UPDRAFT') {
        nextShamans = grantShamanUnlock(nextShamans, 'spoo');
        nextRegistry = liberateRegion(nextRegistry, 'windia');
        const res = completeObjectiveWithRewards(
          nextRegistry,
          nextOwned,
          'quest_black_wing',
          'obj_nina_windia_updraft'
        );
        nextRegistry = res.registry;
        nextOwned = res.ownedEquipmentIds;
      } else if (terrain === 'HIGHFORT_GEAR') {
        nextShamans = grantShamanUnlock(nextShamans, 'solo');
        nextRegistry = setShamanResonanceRank(
          nextRegistry,
          Math.max(nextRegistry.shamanResonanceRank, 3)
        );
        nextRegistry = liberateRegion(nextRegistry, 'highfort');
        const res = completeObjectiveWithRewards(
          nextRegistry,
          nextOwned,
          'quest_highfort_oath',
          'obj_sten_highfort_gears'
        );
        nextRegistry = res.registry;
        nextOwned = res.ownedEquipmentIds;
        const pactRes = completeObjectiveWithRewards(
          nextRegistry,
          nextOwned,
          'quest_act2_continental_pact',
          'obj_pact_windia_highfort'
        );
        nextRegistry = pactRes.registry;
        nextOwned = pactRes.ownedEquipmentIds;
      } else if (terrain === 'SIMAFORT_MIRE') {
        nextRegistry = liberateRegion(nextRegistry, 'simafort');
        const res = completeObjectiveWithRewards(
          nextRegistry,
          nextOwned,
          'quest_simafort_curse',
          'obj_jean_mire_crossing'
        );
        nextRegistry = res.registry;
        nextOwned = res.ownedEquipmentIds;
        const pactRes = completeObjectiveWithRewards(
          nextRegistry,
          nextOwned,
          'quest_act2_continental_pact',
          'obj_pact_simafort_tunlan'
        );
        nextRegistry = pactRes.registry;
        nextOwned = pactRes.ownedEquipmentIds;
      } else if (terrain === 'TUNLAN_TIDE') {
        nextShamans = grantShamanUnlock(nextShamans, 'seny');
        nextRegistry = setShamanResonanceRank(
          nextRegistry,
          Math.max(nextRegistry.shamanResonanceRank, 3)
        );
        nextRegistry = discoverStEvaClue(nextRegistry, 'clue_tunlan_hymn');
        nextRegistry = liberateRegion(nextRegistry, 'tunlan');
        const res = completeObjectiveWithRewards(
          nextRegistry,
          nextOwned,
          'quest_great_tree_memory',
          'obj_spar_wise_tree'
        );
        nextRegistry = res.registry;
        nextOwned = res.ownedEquipmentIds;
        const pactRes = completeObjectiveWithRewards(
          nextRegistry,
          nextOwned,
          'quest_act2_continental_pact',
          'obj_pact_simafort_tunlan'
        );
        nextRegistry = pactRes.registry;
        nextOwned = pactRes.ownedEquipmentIds;
      }

      const bonusZenny = firstClear ? 50 : 0;
      nextZenny += bonusZenny;
      const message = `${state.partyRoster[leaderId].name} executed ${profile.actionLabel}!${bonusZenny > 0 ? ` (+${bonusZenny} Zenny)` : ''}`;

      set({
        worldRegistry: nextRegistry,
        ownedEquipmentIds: nextOwned,
        unlockedShamans: nextShamans,
        zenny: nextZenny,
        statusBanner: message,
      });

      return { executed: true, action: profile.primaryAction, message };
    }

    const fallbackMsg = `${profile.actionLabel}: Ready for ${profile.targetTerrains.join(' / ')} zones.`;
    set({ statusBanner: fallbackMsg });
    return {
      executed: false,
      action: profile.primaryAction,
      message: fallbackMsg,
    };
  },

  startHunt: (options) => {
    set({ activeTerrainTag: 'HUNTING_TRAIL' });
    return get().triggerContextualFieldAction({
      approachAngle: options?.approachAngle,
      distance: options?.distance,
    });
  },

  castFishingLine: (castScore) => {
    set({ activeTerrainTag: 'FISHING_SPOT' });
    return get().triggerContextualFieldAction({ castScore });
  },

  travelToRegion: (biomeId) => {
    const state = get();
    const anchor = REGION_TRAVEL_ANCHORS[biomeId];
    if (!anchor) return false;

    if (
      anchor.requiresInfinityUnlock &&
      !state.worldRegistry.infinityUnlocked &&
      !state.worldRegistry.flags.infinity_gate_opened
    ) {
      set({
        statusBanner:
          'Infinity Gate is sealed! Unseal Gate Fissure first via unlockInfinity().',
      });
      return false;
    }

    const nextPos: Vec3Tuple = [...anchor.position];
    syncPlayerEntityInWorld(
      ecsWorld,
      nextPos,
      [0, 0, 0],
      state.facingAngle,
      state.leaderId,
      anchor.terrainTag
    );

    set({
      playerPos: nextPos,
      playerVelocity: [0, 0, 0],
      activeTerrainTag: anchor.terrainTag,
      currentBiomeId: biomeId,
      statusBanner: `Traveled to ${anchor.name}.`,
    });
    return true;
  },

  unlockShaman: (shamanId) => {
    const state = get();
    const nextShamans = grantShamanUnlock(state.unlockedShamans, shamanId);
    const nextRank = Math.max(
      state.worldRegistry.shamanResonanceRank,
      Math.min(6, nextShamans.length)
    );
    const nextRegistry = setShamanResonanceRank(state.worldRegistry, nextRank);
    set({
      unlockedShamans: nextShamans,
      worldRegistry: nextRegistry,
      statusBanner: `Shaman ${shamanId.toUpperCase()} resonated! (Rank ${nextRank})`,
    });
  },

  advanceQuestObjective: (questId, objectiveId) => {
    const state = get();
    const result = completeObjectiveWithRewards(
      state.worldRegistry,
      state.ownedEquipmentIds,
      questId,
      objectiveId
    );
    let nextRegistry = result.registry;

    if (result.newlyCompleted) {
      if (questId === 'quest_act2_continental_pact') {
        nextRegistry = advanceCampaignAct(nextRegistry, 2);
      } else if (questId === 'quest_act3_infinity_descent') {
        nextRegistry = advanceCampaignAct(nextRegistry, 3);
        nextRegistry = unlockInfinityGate(nextRegistry);
      }
    }

    set({
      worldRegistry: nextRegistry,
      ownedEquipmentIds: result.ownedEquipmentIds,
      statusBanner: result.newlyCompleted
        ? `Quest Completed: ${nextRegistry.quests[questId]?.title ?? questId}!`
        : `Updated Quest: ${nextRegistry.quests[questId]?.title ?? questId}`,
    });
  },

  unlockInfinity: () => {
    const state = get();
    let nextRegistry = advanceCampaignAct(state.worldRegistry, 3);
    nextRegistry = setWorldFlag(nextRegistry, 'infinity_ready', true);

    const res = completeObjectiveWithRewards(
      nextRegistry,
      state.ownedEquipmentIds,
      'quest_act3_infinity_descent',
      'obj_unseal_gate_fissure'
    );
    nextRegistry = unlockInfinityGate(res.registry);
    const nextShamans = grantShamanUnlock(state.unlockedShamans, 'shin');

    set({
      worldRegistry: nextRegistry,
      ownedEquipmentIds: res.ownedEquipmentIds,
      unlockedShamans: nextShamans,
      statusBanner: 'The Gate Fissure splits open — Infinity is now unlocked!',
    });

    return Boolean(nextRegistry.infinityUnlocked);
  },

  confrontDeathevan: (victory = true) => {
    const state = get();
    let nextRegistry = advanceCampaignAct(state.worldRegistry, 3);
    let nextOwned = state.ownedEquipmentIds;

    const r1 = completeObjectiveWithRewards(
      nextRegistry,
      nextOwned,
      'quest_deathevan_reckoning',
      'obj_confront_deathevan_heart'
    );
    nextRegistry = r1.registry;
    nextOwned = r1.ownedEquipmentIds;

    if (victory) {
      const rInf = completeObjectiveWithRewards(
        nextRegistry,
        nextOwned,
        'quest_act3_infinity_descent',
        'obj_breach_infinity_threshold'
      );
      nextRegistry = unlockInfinityGate(rInf.registry);
      nextOwned = rInf.ownedEquipmentIds;

      const r2 = completeObjectiveWithRewards(
        nextRegistry,
        nextOwned,
        'quest_deathevan_reckoning',
        'obj_resolve_gate_destiny'
      );
      nextRegistry = r2.registry;
      nextOwned = r2.ownedEquipmentIds;
      nextRegistry = liberateRegion(nextRegistry, 'infinity');

      const bossEntity = ecsWorld.entities.find(
        (e) => e.id === 'enemy_deathevan_core_1'
      );
      if (bossEntity) {
        bossEntity.defeated = true;
      }
    }

    nextRegistry = resolveDeathevanBattle(nextRegistry, victory);
    const evaluation = evaluateTrueEndingConditions(nextRegistry);

    const statusBanner = !victory
      ? 'Driven back by Deathevan! Regroup and strengthen your bonds.'
      : evaluation.endingPath === 'TRUE_ENDING'
        ? 'True Ending Achieved! Deathevan is purified by united allies and Shamans.'
        : 'Normal Ending: Deathevan defeated and the Gate of Infinity is sealed.';

    set({
      worldRegistry: nextRegistry,
      ownedEquipmentIds: nextOwned,
      statusBanner,
    });

    return evaluation;
  },

  startEncounter: (enemyTemplateId, enemyEntityId) => {
    const state = get();
    const chosenTemplate: keyof typeof ENEMY_TEMPLATES =
      enemyTemplateId ??
      (state.activeTerrainTag === 'COURSAIR_GATE'
        ? 'augus_enforcer'
        : state.activeTerrainTag === 'HUNTING_TRAIL'
          ? 'k_goblin_raider'
          : state.activeTerrainTag === 'HIGHFORT_GEAR'
            ? 'highfort_automaton'
            : state.activeTerrainTag === 'SIMAFORT_MIRE'
              ? 'simafort_leech'
              : state.activeTerrainTag === 'GATE_FISSURE'
                ? 'barubary_warden'
                : state.activeTerrainTag === 'INFINITY_VOID'
                  ? 'deathevan_aspect'
                  : 'harpy_scout');

    const snapshot = getTownshipSnapshot(state.worldRegistry);
    const atkMult = 1 + snapshot.passiveBuffs.atkPercent / 100;
    const mealAtk = state.activeMealBuff?.atkBonus ?? 0;
    const mealDef = state.activeMealBuff?.defBonus ?? 0;

    const partyInputs: CombatantInput[] = state.activePartyIds.map((id) => {
      const base = state.partyRoster[id];
      return {
        ...base,
        baseStats: {
          ...base.baseStats,
          atk: Math.round(base.baseStats.atk * atkMult) + mealAtk,
          def: base.baseStats.def + mealDef,
        },
        equippedRelicIds: [...state.equippedRelics[id]],
        equippedSignatureIds: [...state.equippedSignatures[id]],
        shamanIds: [...state.fusedShamans[id]],
      };
    });

    const primaryEnemy = createEnemyCombatantFromTemplate(
      chosenTemplate,
      enemyEntityId ?? `${chosenTemplate}_1`
    );
    const enemies: EnemyCombatant[] = [primaryEnemy];
    if (
      chosenTemplate !== 'augus_enforcer' &&
      chosenTemplate !== 'barubary_warden' &&
      chosenTemplate !== 'deathevan_aspect'
    ) {
      enemies.push(
        createEnemyCombatantFromTemplate(
          'harpy_scout',
          `${chosenTemplate}_wing_2`
        )
      );
    }

    const context = buildScalingContextFromState(
      state.worldRegistry,
      state.partyRoster,
      state.leaderId
    );
    const rawCombat = createCombatState(
      partyInputs,
      enemies,
      context,
      state.sharedSyncPool
    );
    const maxSyncPool = 100 + snapshot.passiveBuffs.syncMaxBonus;
    const prepared = advanceInitToCommandSelect({
      ...rawCombat,
      maxSyncPool,
      sharedSyncPool: Math.min(maxSyncPool, rawCombat.sharedSyncPool),
    });

    set({
      combatState: prepared,
      activeEncounterEnemyId: enemyEntityId ?? null,
      statusBanner: `Encounter! ${enemies.map((e) => e.name).join(' & ')}`,
    });
  },

  submitCombatCommand: (actorId, commandId, targetIds) => {
    const state = get();
    if (!state.combatState) return;
    const nextCombat = queuePartyCommand(
      state.combatState,
      actorId,
      commandId,
      targetIds
    );
    set({ combatState: nextCombat });
  },

  runCombatTurn: (rng) => {
    const state = get();
    if (!state.combatState) return;

    const context = buildScalingContextFromState(
      state.worldRegistry,
      state.partyRoster,
      state.leaderId
    );
    const prevLogLength = state.combatState.log.length;
    const prevEnemyHp = state.combatState.enemies.reduce((sum, e) => sum + e.hp, 0);
    const prevPartyHp = state.combatState.party.reduce((sum, p) => sum + p.hp, 0);
    const prevBrokenCount = state.combatState.party.filter((p) => p.isArmorBroken).length;

    const nextCombat = advanceCombatTurn(state.combatState, context, rng);

    const nextEnemyHp = nextCombat.enemies.reduce((sum, e) => sum + e.hp, 0);
    const nextPartyHp = nextCombat.party.reduce((sum, p) => sum + p.hp, 0);
    const nextBrokenCount = nextCombat.party.filter((p) => p.isArmorBroken).length;
    const newLogs = nextCombat.log.slice(prevLogLength);
    const armorBreakTriggered =
      nextBrokenCount > prevBrokenCount ||
      newLogs.some((entry) => entry.kind === 'shaman' && /armor break/i.test(entry.text));
    const heavyHit =
      nextCombat.dragonState.activeForm !== null ||
      prevEnemyHp - nextEnemyHp >= 45 ||
      newLogs.some((entry) => entry.kind === 'hook' || entry.kind === 'dragon');
    const anyDamageHit =
      nextEnemyHp < prevEnemyHp || nextPartyHp < prevPartyHp || armorBreakTriggered;

    if (anyDamageHit) {
      void triggerCombatHitHaptic({
        heavy: heavyHit,
        armorBreak: armorBreakTriggered,
      });
    }

    let nextRegistry = state.worldRegistry;
    let nextZenny = state.zenny;
    let nextOwnedGear = state.ownedEquipmentIds;
    let nextBuff = state.activeMealBuff;
    let nextBanner = state.statusBanner;

    // Persist party HP/AP back to overworld roster
    const nextRoster = { ...state.partyRoster };
    for (const member of nextCombat.party) {
      nextRoster[member.id] = {
        ...nextRoster[member.id],
        hp: Math.max(1, member.hp),
        ap: member.ap,
      };
    }

    if (nextCombat.phase === 'VICTORY' && nextCombat.victoryRewards) {
      nextZenny += nextCombat.victoryRewards.zenny;
      nextBanner = `Victory! +${nextCombat.victoryRewards.xp} XP, +${nextCombat.victoryRewards.zenny} Zenny`;

      if (nextBuff) {
        const remaining = nextBuff.remainingBattles - 1;
        nextBuff = remaining > 0 ? { ...nextBuff, remainingBattles: remaining } : null;
      }

      if (state.activeEncounterEnemyId) {
        const defeatedEntity = ecsWorld.entities.find(
          (e) => e.id === state.activeEncounterEnemyId
        );
        if (defeatedEntity) {
          defeatedEntity.defeated = true;
          if (defeatedEntity.linkedQuestId === 'quest_coliseum_fang') {
            const r1 = completeObjectiveWithRewards(
              nextRegistry,
              nextOwnedGear,
              'quest_coliseum_fang',
              'obj_track_sabotage'
            );
            const r2 = completeObjectiveWithRewards(
              r1.registry,
              r1.ownedEquipmentIds,
              'quest_coliseum_fang',
              'obj_reclaim_fang'
            );
            nextRegistry = r2.registry;
            nextOwnedGear = r2.ownedEquipmentIds;
          } else if (defeatedEntity.linkedQuestId === 'quest_coursair_innocence') {
            const r1 = completeObjectiveWithRewards(
              nextRegistry,
              nextOwnedGear,
              'quest_coursair_innocence',
              'obj_coursair_gate'
            );
            const r2 = completeObjectiveWithRewards(
              r1.registry,
              r1.ownedEquipmentIds,
              'quest_coursair_innocence',
              'obj_clear_bow'
            );
            nextRegistry = r2.registry;
            nextOwnedGear = r2.ownedEquipmentIds;
          } else if (defeatedEntity.linkedQuestId === 'quest_highfort_oath') {
            const r = completeObjectiveWithRewards(
              nextRegistry,
              nextOwnedGear,
              'quest_highfort_oath',
              'obj_sten_honor_duel'
            );
            nextRegistry = r.registry;
            nextOwnedGear = r.ownedEquipmentIds;
          } else if (defeatedEntity.linkedQuestId === 'quest_simafort_curse') {
            const r = completeObjectiveWithRewards(
              nextRegistry,
              nextOwnedGear,
              'quest_simafort_curse',
              'obj_jean_break_curse'
            );
            nextRegistry = r.registry;
            nextOwnedGear = r.ownedEquipmentIds;
          } else if (defeatedEntity.linkedQuestId === 'quest_act3_infinity_descent') {
            const r1 = completeObjectiveWithRewards(
              nextRegistry,
              nextOwnedGear,
              'quest_act3_infinity_descent',
              'obj_breach_infinity_threshold'
            );
            const r2 = completeObjectiveWithRewards(
              r1.registry,
              r1.ownedEquipmentIds,
              'quest_ancient_serpent',
              'obj_bleu_starfall_trial'
            );
            nextRegistry = unlockInfinityGate(r2.registry);
            nextOwnedGear = r2.ownedEquipmentIds;
          } else if (defeatedEntity.linkedQuestId === 'quest_deathevan_reckoning') {
            const r = completeObjectiveWithRewards(
              nextRegistry,
              nextOwnedGear,
              'quest_deathevan_reckoning',
              'obj_resolve_gate_destiny'
            );
            nextRegistry = resolveDeathevanBattle(r.registry, true);
            nextOwnedGear = r.ownedEquipmentIds;
          }
        }
      }
    }

    set({
      combatState: nextCombat,
      partyRoster: nextRoster,
      sharedSyncPool: nextCombat.sharedSyncPool,
      worldRegistry: nextRegistry,
      zenny: nextZenny,
      ownedEquipmentIds: nextOwnedGear,
      activeMealBuff: nextBuff,
      statusBanner: nextBanner,
    });
  },

  exitCombat: () =>
    set({
      combatState: null,
      activeEncounterEnemyId: null,
    }),

  toggleShamanFusion: (characterId, shamanId) => {
    const state = get();
    const current = state.fusedShamans[characterId] ?? [];
    const exists = current.includes(shamanId);

    const nextIds: ShamanId[] = exists
      ? current.filter((id) => id !== shamanId)
      : current.length >= 2
        ? [current[1], shamanId]
        : [...current, shamanId];

    const nextFused = {
      ...state.fusedShamans,
      [characterId]: nextIds,
    };

    const nextRoster = {
      ...state.partyRoster,
      [characterId]: {
        ...state.partyRoster[characterId],
        shamanIds: nextIds,
      },
    };

    let nextCombat = state.combatState;
    if (nextCombat) {
      const context = buildScalingContextFromState(
        state.worldRegistry,
        nextRoster,
        characterId
      );
      nextCombat = {
        ...nextCombat,
        party: nextCombat.party.map((member) => {
          if (member.id !== characterId) return member;
          const updatedInput: CombatantInput = {
            ...nextRoster[characterId],
            hp: member.hp,
            ap: member.ap,
            equippedRelicIds: [...state.equippedRelics[characterId]],
            equippedSignatureIds: [...state.equippedSignatures[characterId]],
            shamanIds: nextIds,
          };
          return decorateCombatant(updatedInput, context);
        }),
      };
    }

    void triggerShamanFusionHaptic(!exists);

    set({
      fusedShamans: nextFused,
      partyRoster: nextRoster,
      combatState: nextCombat,
      statusBanner: exists
        ? `Unfused ${shamanId.toUpperCase()} from ${nextRoster[characterId].name}.`
        : `Fused ${shamanId.toUpperCase()} with ${nextRoster[characterId].name}!`,
    });
  },

  equipItem: (characterId, itemId, mode) => {
    const state = get();
    const catalogItem = getEquipmentCatalogItem(itemId);
    if (!catalogItem) return;

    const isRelic = catalogItem.archetype === 'PROGRESSION_RELIC';
    const currentList = isRelic
      ? state.equippedRelics[characterId]
      : state.equippedSignatures[characterId];
    const alreadyEquipped = currentList.includes(itemId);
    const shouldEquip = mode ? mode === 'equip' : !alreadyEquipped;

    const nextList = shouldEquip
      ? alreadyEquipped
        ? currentList
        : [...currentList, itemId]
      : currentList.filter((id) => id !== itemId);

    const nextEquippedRelics = isRelic
      ? { ...state.equippedRelics, [characterId]: nextList }
      : state.equippedRelics;
    const nextEquippedSignatures = !isRelic
      ? { ...state.equippedSignatures, [characterId]: nextList }
      : state.equippedSignatures;

    const nextRoster = {
      ...state.partyRoster,
      [characterId]: {
        ...state.partyRoster[characterId],
        equippedRelicIds: nextEquippedRelics[characterId],
        equippedSignatureIds: nextEquippedSignatures[characterId],
      },
    };

    const nextOwned =
      shouldEquip && !state.ownedEquipmentIds.includes(itemId)
        ? [...state.ownedEquipmentIds, itemId]
        : state.ownedEquipmentIds;

    set({
      equippedRelics: nextEquippedRelics,
      equippedSignatures: nextEquippedSignatures,
      partyRoster: nextRoster,
      ownedEquipmentIds: nextOwned,
      statusBanner: `${shouldEquip ? 'Equipped' : 'Unequipped'} ${catalogItem.name} on ${nextRoster[characterId].name}.`,
    });
  },

  recruitCitizen: (citizenId) => {
    const state = get();
    const check = canRecruitCitizen(state.worldRegistry, citizenId);
    if (!check.allowed || !check.citizen) {
      set({ statusBanner: check.reason ?? 'Cannot recruit citizen.' });
      return false;
    }

    if (state.zenny < check.citizen.zennyCost) {
      set({
        statusBanner: `Need ${check.citizen.zennyCost} Zenny to settle ${check.citizen.name}.`,
      });
      return false;
    }

    const result = executeCitizenRecruitment(state.worldRegistry, citizenId);
    if (!result.success) {
      set({ statusBanner: result.message });
      return false;
    }

    let nextRegistry = result.registry;
    let nextOwned = state.ownedEquipmentIds;
    let nextShamans = state.unlockedShamans;
    if (citizenId === 'sana') {
      const res = completeObjectiveWithRewards(
        nextRegistry,
        nextOwned,
        'quest_dragon_tear',
        'obj_attune_sana'
      );
      nextRegistry = res.registry;
      nextOwned = res.ownedEquipmentIds;
      nextShamans = grantShamanUnlock(nextShamans, 'sana');
    }

    resetEcsWorld(ecsWorld, state.leaderId, nextRegistry.recruitedCitizens);

    set({
      worldRegistry: nextRegistry,
      ownedEquipmentIds: nextOwned,
      unlockedShamans: nextShamans,
      zenny: state.zenny - check.citizen.zennyCost,
      statusBanner: result.message,
    });
    return true;
  },

  discoverOrAdvanceClue: (clueId) => {
    const state = get();
    const clue = state.worldRegistry.stEvaClues[clueId];
    if (!clue) return;

    let nextRegistry = state.worldRegistry;
    let nextOwned = state.ownedEquipmentIds;
    const mapping = CLUE_TO_QUEST_OBJECTIVE[clueId];
    if (mapping && nextRegistry.quests[mapping.questId]?.stage === 'DISCOVERED') {
      nextRegistry = activateQuest(nextRegistry, mapping.questId);
    }

    let message = '';
    if (!clue.discovered) {
      nextRegistry = discoverStEvaClue(nextRegistry, clueId);
      message = `Discovered St. Eva Clue: ${clue.title}`;
    } else if (!clue.verified) {
      nextRegistry = verifyStEvaClue(nextRegistry, clueId);
      if (mapping) {
        const res = completeObjectiveWithRewards(
          nextRegistry,
          nextOwned,
          mapping.questId,
          mapping.objectiveId
        );
        nextRegistry = res.registry;
        nextOwned = res.ownedEquipmentIds;
      }

      const ledgerComplete = ACT1_LEDGER_CLUE_IDS.every(
        (id) => nextRegistry.stEvaClues[id]?.verified
      );
      const cathedralComplete = CATHEDRAL_CLUE_IDS.every(
        (id) => nextRegistry.stEvaClues[id]?.verified
      );

      if (ledgerComplete && !nextRegistry.flags.region_coursair_frontier_liberated) {
        const res = completeObjectiveWithRewards(
          nextRegistry,
          nextOwned,
          'quest_coursair_innocence',
          'obj_expose_ledger'
        );
        nextRegistry = liberateRegion(res.registry, 'coursair_frontier');
        nextOwned = res.ownedEquipmentIds;
        message = `Verified ${clue.title}! St. Eva's Coursair Ledger exposed!`;
      } else if (cathedralComplete) {
        nextRegistry = setWorldFlag(nextRegistry, 'true_eva_truth_uncovered', true);
        message = `Verified ${clue.title}! St. Eva's Cathedral network exposed!`;
      } else {
        message = `Verified St. Eva Clue: ${clue.title}`;
      }
    } else {
      message = `${clue.title} is already verified.`;
    }

    set({
      worldRegistry: nextRegistry,
      ownedEquipmentIds: nextOwned,
      statusBanner: message,
    });
  },

  cookMeal: (recipeId) => {
    const state = get();
    const result = cookCampfireMeal(recipeId, state.inventory);
    if (!result.success) {
      set({ statusBanner: result.message });
      return false;
    }

    const nextRoster = { ...state.partyRoster };
    for (const id of state.activePartyIds) {
      const member = nextRoster[id];
      const decorated = decorateCombatant(
        member,
        buildScalingContextFromState(state.worldRegistry, state.partyRoster, id)
      );
      nextRoster[id] = {
        ...member,
        hp: Math.min(decorated.stats.maxHp, member.hp + result.hpRestore),
        ap: Math.min(decorated.stats.maxAp, member.ap + result.apRestore),
      };
    }

    const snapshot = getTownshipSnapshot(state.worldRegistry);
    const maxSync = 100 + snapshot.passiveBuffs.syncMaxBonus;

    set({
      inventory: result.updatedInventory,
      partyRoster: nextRoster,
      sharedSyncPool: Math.min(maxSync, state.sharedSyncPool + result.syncRestore),
      activeMealBuff: result.buff,
      statusBanner: result.message,
    });
    return true;
  },

  updateFpsTelemetry: (fps, drawCalls, frameTimeMs = 16.6) =>
    set({
      fpsTelemetry: { fps, drawCalls, frameTimeMs },
    }),

  resetGame: () => {
    const initial = createInitialStateData();
    resetEcsWorld(
      ecsWorld,
      initial.leaderId,
      initial.worldRegistry.recruitedCitizens
    );
    set(initial);
  },
}));
