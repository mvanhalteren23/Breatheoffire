import { describe, expect, it } from 'vitest';
import {
  ALL_CHARACTER_IDS,
  ARMOR_BREAK_DURATION,
  BaseCombatantWrapper,
  CAMPAIGN_REGION_IDS,
  CHARACTER_PROGRESSION_RELIC_MAP,
  CHARACTER_SIGNATURE_GEAR_MAP,
  COMPANION_IDS,
  DRAGON_FORM_CONFIGS,
  DRAGON_TRANSFORM_COMMANDS,
  PROGRESSION_RELICS,
  SHAMAN_DEFINITIONS,
  SHAMAN_DUAL_SYNERGIES,
  SHAMAN_FUSION_MODIFIER_TABLES,
  SIGNATURE_GEAR_CATALOG,
  ShamanFusionDecorator,
  activateQuest,
  adjustCompanionLoyalty,
  advanceCampaignAct,
  advanceCombatTurn,
  advanceInitToCommandSelect,
  completeQuestObjective,
  createCombatState,
  createEmptyStatBlock,
  createInitialWorldRegistry,
  decorateCombatant,
  discoverQuest,
  discoverStEvaClue,
  evaluateArmorBreakTrigger,
  evaluateEquipmentForCombatant,
  evaluateRelicScaling,
  evaluateTrueEndingConditions,
  getEquipmentCatalogItem,
  getShamanFusionModifierTable,
  liberateRegion,
  queuePartyCommand,
  rebindShamanFusion,
  recruitTownshipCitizen,
  resolveDeathevanBattle,
  setShamanResonanceRank,
  setWorldFlag,
  tickArmorBreakRecovery,
  unlockInfinityGate,
  verifyStEvaClue,
} from '../src/core/index.ts';
import type {
  CharacterId,
  CombatCommandDef,
  CombatantInput,
  DragonFormId,
  EnemyCombatant,
  QuestDefinition,
  ScalingContext,
  ShamanId,
  StEvaClue,
} from '../src/core/index.ts';

const BASIC_ATTACK: CombatCommandDef = {
  id: 'attack',
  label: 'Attack',
  apCost: 0,
  powerMultiplier: 1,
  element: 'neutral',
  targetType: 'single_enemy',
  kind: 'attack',
  description: 'Standard weapon strike.',
};

const DEFEND_COMMAND: CombatCommandDef = {
  id: 'defend',
  label: 'Defend',
  apCost: 0,
  powerMultiplier: 0,
  element: 'neutral',
  targetType: 'self',
  kind: 'defend',
  description: 'Guard against incoming attacks.',
};

const MAJOR_HEAL: CombatCommandDef = {
  id: 'cure_all',
  label: 'Cure All',
  apCost: 6,
  powerMultiplier: 2.5,
  element: 'holy',
  targetType: 'ally',
  kind: 'heal',
  description: 'Restores heavy HP to one ally.',
};

function makeRyuInput(overrides: Partial<CombatantInput> = {}): CombatantInput {
  return {
    id: 'ryu',
    name: 'Ryu',
    level: 5,
    hp: 160,
    ap: 60,
    baseStats: {
      maxHp: 160,
      maxAp: 60,
      atk: 24,
      def: 18,
      mag: 18,
      spd: 20,
      luck: 12,
    },
    element: 'neutral',
    spriteId: 'ryu',
    loyalty: 100,
    equippedRelicIds: [],
    equippedSignatureIds: [],
    shamanIds: [],
    isArmorBroken: false,
    armorBreakTurnsRemaining: 0,
    commands: [
      BASIC_ATTACK,
      DEFEND_COMMAND,
      DRAGON_TRANSFORM_COMMANDS.fire_dragon,
      DRAGON_TRANSFORM_COMMANDS.ice_dragon,
      DRAGON_TRANSFORM_COMMANDS.thunder_dragon,
      DRAGON_TRANSFORM_COMMANDS.great_dragon,
    ],
    ...overrides,
  };
}

function makeKattInput(overrides: Partial<CombatantInput> = {}): CombatantInput {
  return {
    id: 'katt',
    name: 'Katt',
    level: 5,
    hp: 100,
    ap: 35,
    baseStats: {
      maxHp: 100,
      maxAp: 35,
      atk: 25,
      def: 20,
      mag: 12,
      spd: 26,
      luck: 14,
    },
    element: 'neutral',
    spriteId: 'katt',
    loyalty: 75,
    equippedRelicIds: [],
    equippedSignatureIds: [],
    shamanIds: [],
    isArmorBroken: false,
    armorBreakTurnsRemaining: 0,
    commands: [BASIC_ATTACK, DEFEND_COMMAND],
    ...overrides,
  };
}

function makeBowInput(overrides: Partial<CombatantInput> = {}): CombatantInput {
  return {
    id: 'bow',
    name: 'Bow',
    level: 5,
    hp: 110,
    ap: 50,
    baseStats: {
      maxHp: 110,
      maxAp: 50,
      atk: 19,
      def: 16,
      mag: 24,
      spd: 18,
      luck: 15,
    },
    element: 'neutral',
    spriteId: 'bow',
    loyalty: 80,
    equippedRelicIds: [],
    equippedSignatureIds: [],
    shamanIds: [],
    isArmorBroken: false,
    armorBreakTurnsRemaining: 0,
    commands: [BASIC_ATTACK, DEFEND_COMMAND, MAJOR_HEAL],
    ...overrides,
  };
}

function makeEnemy(overrides: Partial<EnemyCombatant> = {}): EnemyCombatant {
  return {
    instanceId: 'enemy_1',
    templateId: 'barubary_guard',
    name: 'St. Eva Zealot',
    level: 5,
    hp: 250,
    maxHp: 250,
    atk: 24,
    def: 10,
    spd: 14,
    element: 'neutral',
    weakness: 'fire',
    spriteId: 'zealot',
    aiState: 'Aggro_Sight',
    xpReward: 120,
    zennyReward: 85,
    ...overrides,
  };
}

const DEFAULT_CONTEXT: ScalingContext = {
  characterLevel: 5,
  liberatedRegions: 1,
  shamanResonanceRank: 1,
  loyalty: 75,
};

describe('Shaman Decorator & Armor Break Threshold', () => {
  it('defines all 6 canonical Shamans with expected elements and aura colors', () => {
    const expected: Record<ShamanId, { element: string; auraColor: string }> = {
      sana: { element: 'fire', auraColor: '#ff5a2f' },
      seso: { element: 'ice', auraColor: '#38bdf8' },
      spoo: { element: 'wind', auraColor: '#4ade80' },
      solo: { element: 'earth', auraColor: '#d97706' },
      seny: { element: 'holy', auraColor: '#fde047' },
      shin: { element: 'shadow', auraColor: '#a855f7' },
    };

    expect(Object.keys(SHAMAN_DEFINITIONS).sort()).toEqual(Object.keys(expected).sort());
    for (const [id, spec] of Object.entries(expected)) {
      const def = SHAMAN_DEFINITIONS[id as ShamanId];
      expect(def.element).toBe(spec.element);
      expect(def.auraColor).toBe(spec.auraColor);
      expect(def.grantedCommands.length).toBeGreaterThan(0);
    }
  });

  it('decorates combatants via Decorator Pattern with sprite variants, titles, stats, and commands', () => {
    const kattSana = new ShamanFusionDecorator(
      new BaseCombatantWrapper(makeKattInput(), DEFAULT_CONTEXT),
      'sana',
    ).getDecorated();

    expect(kattSana.spriteId).toBe('katt_sana');
    expect(kattSana.fusionTitle).toBe('Flame Tigress');
    expect(kattSana.element).toBe('fire');
    expect(kattSana.auraColor).toBe('#ff5a2f');
    expect(kattSana.stats.atk).toBeGreaterThan(25);
    expect(kattSana.commands.some((c) => c.id === 'sana_flame_burst')).toBe(true);
    expect(kattSana.commands.some((c) => c.id === 'shaman_rebind')).toBe(true);

    const bowSeso = new ShamanFusionDecorator(
      new BaseCombatantWrapper(makeBowInput(), DEFAULT_CONTEXT),
      'seso',
    ).getDecorated();

    expect(bowSeso.spriteId).toBe('bow_seso');
    expect(bowSeso.fusionTitle).toBe('Frost Arbalest');
    expect(bowSeso.element).toBe('ice');
    expect(bowSeso.auraColor).toBe('#38bdf8');
  });

  it('triggers Armor Break on >= 30% single hit or <= 25% MaxHP, suppressing 50% shaman bonuses and reducing DEF by 15%', () => {
    const baseKatt = decorateCombatant(makeKattInput(), DEFAULT_CONTEXT);
    const fusedKatt = decorateCombatant(
      makeKattInput({ shamanIds: ['sana', 'solo'] }),
      DEFAULT_CONTEXT,
    );

    // Light hit above 25% HP does not trigger Armor Break
    const lightHit = evaluateArmorBreakTrigger(
      { ...fusedKatt, hp: fusedKatt.stats.maxHp - 10 },
      10,
    );
    expect(lightHit.isArmorBroken).toBe(false);
    expect(lightHit.armorBreakTurnsRemaining).toBe(0);

    // Single hit >= 30% MaxHP triggers Armor Break
    const heavyDamage = Math.ceil(fusedKatt.stats.maxHp * 0.3);
    const brokenByHit = evaluateArmorBreakTrigger(
      { ...fusedKatt, hp: fusedKatt.stats.maxHp - heavyDamage },
      heavyDamage,
    );
    expect(brokenByHit.isArmorBroken).toBe(true);
    expect(brokenByHit.armorBreakTurnsRemaining).toBe(ARMOR_BREAK_DURATION);
    // Shaman ATK bonus suppressed by 50% (between base and full)
    expect(brokenByHit.stats.atk).toBeLessThan(fusedKatt.stats.atk);
    expect(brokenByHit.stats.atk).toBeGreaterThan(baseKatt.stats.atk);
    // DEF reduced by 15% as well
    expect(brokenByHit.stats.def).toBeLessThan(fusedKatt.stats.def);

    // Dropping <= 25% MaxHP even from a small hit also triggers Armor Break
    const lowHp = Math.floor(fusedKatt.stats.maxHp * 0.25);
    const brokenByLowHp = evaluateArmorBreakTrigger({ ...fusedKatt, hp: lowHp }, 2);
    expect(brokenByLowHp.isArmorBroken).toBe(true);

    // Recovery ticks down 2 -> 1 -> 0 (restored)
    const afterTick1 = tickArmorBreakRecovery(brokenByHit);
    expect(afterTick1.isArmorBroken).toBe(true);
    expect(afterTick1.armorBreakTurnsRemaining).toBe(1);

    const afterTick2 = tickArmorBreakRecovery(afterTick1);
    expect(afterTick2.isArmorBroken).toBe(false);
    expect(afterTick2.armorBreakTurnsRemaining).toBe(0);
    expect(afterTick2.stats.atk).toBe(fusedKatt.stats.atk);
    expect(afterTick2.stats.def).toBe(fusedKatt.stats.def);

    // Immediate rebind restores full fusion stats right away
    const rebound = rebindShamanFusion(brokenByHit);
    expect(rebound.isArmorBroken).toBe(false);
    expect(rebound.armorBreakTurnsRemaining).toBe(0);
    expect(rebound.stats).toEqual(fusedKatt.stats);
  });
});

describe('Equipment Engine (Progression Relics & Signature Gear)', () => {
  it('evaluates Dragon Tear scaling math with exact live formula lines and 45% AP reduction cap', () => {
    const empty = createEmptyStatBlock();
    expect(Object.values(empty).every((v) => v === 0)).toBe(true);

    const dragonTear = PROGRESSION_RELICS.relic_dragon_tear;
    expect(getEquipmentCatalogItem('relic_dragon_tear')).toBe(dragonTear);

    const eval1 = evaluateRelicScaling(dragonTear, DEFAULT_CONTEXT);
    expect(eval1.bonuses.atk).toBe(14);
    expect(eval1.formulaLines[0]).toBe(
      'ATK +14 = 4 + (Lv 5 × 1) + (Regions 1 × 3) + (Resonance 1 × 2)',
    );
    expect(eval1.dragonApReductionRatio).toBeCloseTo(0.08, 4);

    // 8 liberated regions * 0.08 = 0.64 -> capped at 0.45
    const evalCap = evaluateRelicScaling(dragonTear, {
      characterLevel: 20,
      liberatedRegions: 8,
      shamanResonanceRank: 3,
      loyalty: 100,
    });
    expect(evalCap.dragonApReductionRatio).toBe(0.45);
  });

  it('evaluates combined Dragon Tear + Dragnier Scale Mail AP drain reduction and Coliseum Fang hooks', () => {
    const ryuGear = evaluateEquipmentForCombatant(
      ['relic_dragon_tear'],
      ['sig_dragnier_mail'],
      DEFAULT_CONTEXT,
    );
    // (1 - 0.08) * 0.75 = 0.69
    expect(ryuGear.dragonApCostMultiplier).toBeCloseTo(0.69, 4);
    expect(ryuGear.flatBonuses.def).toBe(14);

    const kattGear = evaluateEquipmentForCombatant(
      ['relic_township_keystone'],
      ['sig_coliseum_fang'],
      DEFAULT_CONTEXT,
    );
    expect(kattGear.convertedAttackElement).toBe('fire');
    expect(kattGear.hooks.map((h) => h.type)).toEqual([
      'ELEMENTAL_CONVERSION',
      'COMBO_CHAIN',
      'COUNTER_STANCE',
    ]);
    expect(getEquipmentCatalogItem('sig_coliseum_fang')).toBe(
      SIGNATURE_GEAR_CATALOG.sig_coliseum_fang,
    );
    expect(getEquipmentCatalogItem('relic_eva_seal')).toBe(PROGRESSION_RELICS.relic_eva_seal);
    expect(getEquipmentCatalogItem('sig_rangers_alibi')).toBe(
      SIGNATURE_GEAR_CATALOG.sig_rangers_alibi,
    );
  });
});

describe('Combat State Machine, Dragon Transformations & Signature Hooks', () => {
  it('transitions INIT -> COMMAND_SELECT -> VICTORY and awards XP/Zenny', () => {
    const ryu = makeRyuInput();
    const slime = makeEnemy({
      instanceId: 'slime_1',
      name: 'Slime',
      hp: 20,
      maxHp: 20,
      def: 2,
      xpReward: 40,
      zennyReward: 25,
    });

    let state = createCombatState([ryu], [slime], DEFAULT_CONTEXT, 50);
    expect(state.phase).toBe('INIT');

    state = advanceInitToCommandSelect(state);
    expect(state.phase).toBe('COMMAND_SELECT');

    state = queuePartyCommand(state, 'ryu', 'attack', ['slime_1']);
    state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.99);

    expect(state.phase).toBe('VICTORY');
    expect(state.victoryRewards).toEqual({ xp: 40, zenny: 25 });
  });

  it('transitions to DEFEAT when all party members fall', () => {
    const fragileKatt = makeKattInput({ hp: 5 });
    const boss = makeEnemy({
      instanceId: 'boss_1',
      atk: 90,
      spd: 99,
      hp: 500,
      maxHp: 500,
    });

    let state = advanceInitToCommandSelect(
      createCombatState([fragileKatt], [boss], DEFAULT_CONTEXT, 20),
    );
    state = queuePartyCommand(state, 'katt', 'attack', ['boss_1']);
    state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.99);

    expect(state.phase).toBe('DEFEAT');
    expect(state.party[0].hp).toBe(0);
  });

  it('sustains Dragon Transformations across turns with reduced AP drain and reverts gracefully when AP or Sync runs out', () => {
    // Give Ryu Dragon Tear + Dragnier Scale Mail so dragonApCostMultiplier = 0.69
    const ryu = makeRyuInput({
      ap: 20,
      equippedRelicIds: ['relic_dragon_tear'],
      equippedSignatureIds: ['sig_dragnier_mail'],
    });
    const boss = makeEnemy({
      instanceId: 'boss',
      hp: 900,
      maxHp: 900,
      atk: 5,
      def: 10,
      spd: 5,
      weakness: 'fire',
    });

    let state = advanceInitToCommandSelect(
      createCombatState([ryu], [boss], DEFAULT_CONTEXT, 35),
    );

    // Turn 1: Transform into Fire Dragon
    // Initial AP = round(12 * 0.69) = 8; Initial Sync = 20
    // Effective AP/turn = round(8 * 0.69) = 6; Effective Sync/turn = 10
    state = queuePartyCommand(state, 'ryu', 'dragon_fire', ['boss']);
    state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.99);

    expect(state.phase).toBe('COMMAND_SELECT');
    expect(state.turnNumber).toBe(2);
    expect(state.dragonState.activeForm).toBe('fire_dragon');
    expect(state.dragonState.turnsSustained).toBe(1);
    expect(state.dragonState.effectiveApPerTurn).toBe(
      Math.round(DRAGON_FORM_CONFIGS.fire_dragon.baseApPerTurn * 0.69),
    );
    expect(state.party[0].spriteId).toBe('ryu_dragon');
    expect(state.party[0].element).toBe('fire');
    expect(state.party[0].ap).toBe(12); // 20 - 8
    expect(state.sharedSyncPool).toBe(15); // 35 - 20

    const hpAfterTurn1 = state.enemies[0].hp;
    expect(hpAfterTurn1).toBeLessThan(900);

    // Turn 2: Sustain Fire Dragon (costs 6 AP, 10 Sync -> leaves 6 AP, 5 Sync) and attack
    state = queuePartyCommand(state, 'ryu', 'attack', ['boss']);
    state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.99);

    expect(state.dragonState.activeForm).toBe('fire_dragon');
    expect(state.dragonState.turnsSustained).toBe(2);
    expect(state.party[0].ap).toBe(6);
    expect(state.sharedSyncPool).toBe(5);
    // Amplified dragon fire attack against fire-weak boss deals heavy damage
    expect(hpAfterTurn1 - state.enemies[0].hp).toBeGreaterThan(80);

    // Turn 3: Sync is 5 < 10 -> gracefully reverts to human form before Ryu attacks
    state = queuePartyCommand(state, 'ryu', 'attack', ['boss']);
    state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.99);

    expect(state.dragonState.activeForm).toBeNull();
    expect(state.dragonState.turnsSustained).toBe(0);
    expect(state.party[0].spriteId).toBe('ryu');
    expect(state.party[0].element).toBe('neutral');
    expect(state.log.some((entry) => entry.kind === 'dragon' && entry.text.includes('reverts'))).toBe(
      true,
    );
  });

  it('executes Coliseum Fang ELEMENTAL_CONVERSION (1.5x weakness), COMBO_CHAIN, and COUNTER_STANCE hooks', () => {
    const kattWithFang = makeKattInput({
      equippedSignatureIds: ['sig_coliseum_fang'],
    });
    const kattPlain = makeKattInput({
      equippedSignatureIds: [],
    });

    // Compare basic attack against fire-weak enemy with vs without Elemental Conversion
    const fireWeakEnemy = makeEnemy({
      instanceId: 'e1',
      hp: 400,
      maxHp: 400,
      atk: 10,
      def: 10,
      spd: 5,
      weakness: 'fire',
    });

    let statePlain = advanceInitToCommandSelect(
      createCombatState([kattPlain], [fireWeakEnemy], DEFAULT_CONTEXT, 50),
    );
    statePlain = queuePartyCommand(statePlain, 'katt', 'attack', ['e1']);
    statePlain = advanceCombatTurn(statePlain, DEFAULT_CONTEXT, () => 0.99);
    const plainDmg = 400 - statePlain.enemies[0].hp;

    // With Coliseum Fang and rng() = 0.1 (< 0.35), triggers Elemental Conversion (fire 1.5x) + Combo Chain (0.55x)
    let stateFang = advanceInitToCommandSelect(
      createCombatState([kattWithFang], [fireWeakEnemy], DEFAULT_CONTEXT, 50),
    );
    stateFang = queuePartyCommand(stateFang, 'katt', 'attack', ['e1']);
    stateFang = advanceCombatTurn(stateFang, DEFAULT_CONTEXT, () => 0.1);
    const fangDmg = 400 - stateFang.enemies[0].hp;

    expect(fangDmg).toBeGreaterThan(plainDmg * 2);
    expect(stateFang.log.some((l) => l.kind === 'hook' && l.text.includes('Elemental Conversion'))).toBe(
      true,
    );
    expect(stateFang.log.some((l) => l.kind === 'hook' && l.text.includes('Combo Chain'))).toBe(
      true,
    );

    // Test COUNTER_STANCE when guarded Katt is struck by an enemy
    let stateCounter = advanceInitToCommandSelect(
      createCombatState([kattWithFang], [fireWeakEnemy], DEFAULT_CONTEXT, 50),
    );
    stateCounter = queuePartyCommand(stateCounter, 'katt', 'defend', ['katt']);
    stateCounter = advanceCombatTurn(stateCounter, DEFAULT_CONTEXT, () => 0.1);

    expect(stateCounter.enemies[0].hp).toBeLessThan(400);
    expect(stateCounter.log.some((l) => l.kind === 'hook' && l.text.includes('counters'))).toBe(
      true,
    );
  });

  it('triggers Armor Break on heavy combat hit and rebinds via >35% heal or shaman_rebind command', () => {
    const katt = makeKattInput({ shamanIds: ['sana'], hp: 130 });
    const bow = makeBowInput({
      baseStats: {
        maxHp: 110,
        maxAp: 50,
        atk: 19,
        def: 16,
        mag: 24,
        spd: 5,
        luck: 15,
      },
    });
    const crusher = makeEnemy({
      instanceId: 'crusher',
      hp: 500,
      maxHp: 500,
      atk: 55,
      spd: 50,
    });

    let state = advanceInitToCommandSelect(
      createCombatState([katt, bow], [crusher], DEFAULT_CONTEXT, 50),
    );

    // Turn 1: Crusher hits Katt for >= 30% MaxHP -> Armor Break!
    state = queuePartyCommand(state, 'katt', 'attack', ['crusher']);
    state = queuePartyCommand(state, 'bow', 'attack', ['crusher']);
    state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.0);

    expect(state.party[0].isArmorBroken).toBe(true);
    expect(state.party[0].armorBreakTurnsRemaining).toBe(2);

    // Turn 2: Katt uses 'shaman_rebind' to immediately restore full Shaman Fusion
    state = queuePartyCommand(state, 'katt', 'shaman_rebind', ['katt']);
    state = queuePartyCommand(state, 'bow', 'defend', ['bow']);
    // Have enemy target Bow by giving rng > 0.5
    state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.99);

    expect(state.party[0].isArmorBroken).toBe(false);
    expect(state.party[0].armorBreakTurnsRemaining).toBe(0);

    // Now test > 35% MaxHP heal rebind
    let state2 = advanceInitToCommandSelect(
      createCombatState([katt, bow], [crusher], DEFAULT_CONTEXT, 50),
    );
    state2 = {
      ...state2,
      party: [
        evaluateArmorBreakTrigger({ ...state2.party[0], hp: 50 }, 50),
        state2.party[1],
      ],
    };
    expect(state2.party[0].isArmorBroken).toBe(true);

    state2 = queuePartyCommand(state2, 'katt', 'defend', ['katt']);
    state2 = queuePartyCommand(state2, 'bow', 'cure_all', ['katt']);
    // Bow acts before enemy if we bump Bow's speed or let enemy hit Bow (rng 0.99)
    state2 = advanceCombatTurn(state2, DEFAULT_CONTEXT, () => 0.99);

    expect(state2.party[0].isArmorBroken).toBe(false);
  });

  it('supports ice_dragon, thunder_dragon, and great_dragon forms and reverts when AP is insufficient', () => {
    for (const [formId, cmdId, expectedElement] of [
      ['ice_dragon', 'dragon_ice', 'ice'],
      ['thunder_dragon', 'dragon_thunder', 'thunder'],
      ['great_dragon', 'dragon_great', 'holy'],
    ] as const) {
      const cfg = DRAGON_FORM_CONFIGS[formId];
      expect(cfg.damageMultiplier).toBeGreaterThanOrEqual(1.8);
      expect(cfg.damageMultiplier).toBeLessThanOrEqual(2.6);

      const ryu = makeRyuInput({ ap: cfg.initialApCost }); // enough to transform, 0 AP left for upkeep
      const boss = makeEnemy({
        instanceId: 'boss',
        hp: 1000,
        maxHp: 1000,
        atk: 1,
        spd: 1,
      });

      let state = advanceInitToCommandSelect(
        createCombatState([ryu], [boss], DEFAULT_CONTEXT, 80),
      );
      state = queuePartyCommand(state, 'ryu', cmdId, ['boss']);
      state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.99);

      expect(state.dragonState.activeForm).toBe(formId);
      expect(state.party[0].spriteId).toBe('ryu_dragon');
      expect(state.party[0].element).toBe(expectedElement);
      expect(state.party[0].ap).toBe(0);

      // Next turn: AP is 0 < effectiveApPerTurn -> reverts gracefully
      state = queuePartyCommand(state, 'ryu', 'attack', ['boss']);
      state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.99);
      expect(state.dragonState.activeForm).toBeNull();
      expect(state.party[0].spriteId).toBe('ryu');
    }
  });

  it('recovers Armor Break automatically after 2 combat turns', () => {
    const katt = makeKattInput({ shamanIds: ['sana'], hp: 130 });
    const weakEnemy = makeEnemy({
      instanceId: 'e1',
      hp: 800,
      maxHp: 800,
      atk: 10,
      spd: 5,
    });

    let state = advanceInitToCommandSelect(
      createCombatState([katt], [weakEnemy], DEFAULT_CONTEXT, 50),
    );
    state = {
      ...state,
      party: [evaluateArmorBreakTrigger({ ...state.party[0], hp: 50 }, 50)],
    };
    expect(state.party[0].isArmorBroken).toBe(true);
    expect(state.party[0].armorBreakTurnsRemaining).toBe(2);

    // Turn 1 ends -> ticks 2 -> 1
    state = queuePartyCommand(state, 'katt', 'defend', ['katt']);
    state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.99);
    expect(state.party[0].isArmorBroken).toBe(true);
    expect(state.party[0].armorBreakTurnsRemaining).toBe(1);

    // Turn 2 ends -> ticks 1 -> 0 and restores fusion
    state = queuePartyCommand(state, 'katt', 'defend', ['katt']);
    state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.99);
    expect(state.party[0].isArmorBroken).toBe(false);
    expect(state.party[0].armorBreakTurnsRemaining).toBe(0);
  });
});

describe('World Flags, Quest FSM & True Ending Evaluation', () => {
  const sampleQuests: QuestDefinition[] = [
    {
      id: 'q_coursair_coliseum',
      title: 'Blood in the Sand',
      category: 'COMPANION_ARC',
      act: 1,
      companionId: 'katt',
      stage: 'HIDDEN',
      summary: 'Free Katt from the Coursair arena.',
      objectives: [
        { id: 'obj_enter', description: 'Enter the Coliseum', completed: false },
        { id: 'obj_win', description: 'Defeat the Pit Champion', completed: false },
      ],
      rewardSignatureId: 'sig_coliseum_fang',
      unlocksFlags: ['katt_freed', 'coursair_arena_cleared'],
    },
  ];

  const sampleClues: StEvaClue[] = [
    { id: 'clue_1', title: 'Cryptic Altar', location: 'Hometown', summary: 'Bloodstained seal.', discovered: false, verified: false },
    { id: 'clue_2', title: 'Confessor Ledger', location: 'Windia', summary: 'Hidden tithes.', discovered: false, verified: false },
    { id: 'clue_3', title: 'Sunken Reliquary', location: 'Coursair', summary: 'Demon script.', discovered: false, verified: false },
    { id: 'clue_4', title: 'Gatekeeper Vault', location: 'Infinity', summary: 'Deathevan core.', discovered: false, verified: false },
  ];

  it('transitions quest stages HIDDEN -> DISCOVERED -> ACTIVE -> COMPLETED and unlocks flags', () => {
    let reg = createInitialWorldRegistry(sampleQuests, sampleClues);
    expect(reg.quests.q_coursair_coliseum.stage).toBe('HIDDEN');

    // Cannot activate directly from HIDDEN
    reg = activateQuest(reg, 'q_coursair_coliseum');
    expect(reg.quests.q_coursair_coliseum.stage).toBe('HIDDEN');

    reg = discoverQuest(reg, 'q_coursair_coliseum');
    expect(reg.quests.q_coursair_coliseum.stage).toBe('DISCOVERED');

    reg = activateQuest(reg, 'q_coursair_coliseum');
    expect(reg.quests.q_coursair_coliseum.stage).toBe('ACTIVE');

    reg = completeQuestObjective(reg, 'q_coursair_coliseum', 'obj_enter');
    expect(reg.quests.q_coursair_coliseum.stage).toBe('ACTIVE');
    expect(reg.flags.katt_freed).toBeUndefined();

    reg = completeQuestObjective(reg, 'q_coursair_coliseum', 'obj_win');
    expect(reg.quests.q_coursair_coliseum.stage).toBe('COMPLETED');
    expect(reg.flags.katt_freed).toBe(true);
    expect(reg.flags.coursair_arena_cleared).toBe(true);
  });

  it('tracks world flags, St. Eva clues, regions, loyalty, township citizens, and True Ending conditions', () => {
    let reg = createInitialWorldRegistry(sampleQuests, sampleClues);

    reg = setWorldFlag(reg, 'met_ganer', true);
    expect(reg.flags.met_ganer).toBe(true);

    reg = discoverStEvaClue(reg, 'clue_1');
    expect(reg.stEvaClues.clue_1.discovered).toBe(true);
    expect(reg.stEvaClues.clue_1.verified).toBe(false);

    // Incomplete evaluation reports missing conditions
    const initialEval = evaluateTrueEndingConditions(reg);
    expect(initialEval.isUnlocked).toBe(false);
    expect(initialEval.missingConditions.length).toBe(4);

    // Satisfy all True Ending conditions
    for (const clueId of ['clue_1', 'clue_2', 'clue_3', 'clue_4']) {
      reg = verifyStEvaClue(reg, clueId);
    }
    for (const regionId of ['hometown', 'coursair', 'windia', 'highfort']) {
      reg = liberateRegion(reg, regionId);
    }
    expect(reg.currentAct).toBe(3);

    for (const comp of ['bow', 'katt', 'rand', 'nina', 'jean', 'sten', 'spar', 'bleu'] as const) {
      reg = adjustCompanionLoyalty(reg, comp, 35); // 50 + 35 = 85
    }
    reg = setShamanResonanceRank(reg, 3);
    reg = recruitTownshipCitizen(reg, 'beretta', 'armory');

    expect(reg.recruitedCitizens).toEqual(['beretta']);
    expect(reg.townshipBuildings).toEqual(['armory']);

    const finalEval = evaluateTrueEndingConditions(reg);
    expect(finalEval.isUnlocked).toBe(true);
    expect(finalEval.evanCluesVerified).toBe(4);
    expect(finalEval.liberatedRegionsCount).toBe(4);
    expect(finalEval.avgCompanionLoyalty).toBe(85);
    expect(finalEval.shamanResonanceRank).toBe(3);
    expect(finalEval.missingConditions).toEqual([]);
  });
});

describe('Full Campaign Engine Expansion', () => {
  it('supports all 9 Dragon Forms with accurate costs, sustained upkeep, scaling, and reversion', () => {
    const allForms: DragonFormId[] = [
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

    expect(Object.keys(DRAGON_FORM_CONFIGS).sort()).toEqual([...allForms].sort());
    expect(Object.keys(DRAGON_TRANSFORM_COMMANDS).sort()).toEqual([...allForms].sort());

    expect(DRAGON_FORM_CONFIGS.puppy).toEqual({
      id: 'puppy',
      label: 'Breath Whelp',
      element: 'neutral',
      initialApCost: 6,
      initialSyncCost: 10,
      baseApPerTurn: 4,
      baseSyncPerTurn: 5,
      damageMultiplier: 1.4,
    });
    expect(DRAGON_FORM_CONFIGS.kaiser_dragon).toEqual({
      id: 'kaiser_dragon',
      label: 'True Kaiser Dragon',
      element: 'holy',
      initialApCost: 24,
      initialSyncCost: 45,
      baseApPerTurn: 16,
      baseSyncPerTurn: 18,
      damageMultiplier: 3.2,
    });

    // Test sustained upkeep + dragonApCostMultiplier scaling + graceful reversion for newly added forms
    for (const formId of [
      'puppy',
      'fire_whelpling',
      'ice_whelpling',
      'thunder_whelpling',
      'kaiser_dragon',
    ] as const) {
      const cfg = DRAGON_FORM_CONFIGS[formId];
      const cmd = DRAGON_TRANSFORM_COMMANDS[formId];

      // Give Ryu Dragon Tear + Dragnier Mail -> 0.69 AP cost multiplier
      const scaledInitAp = Math.max(1, Math.round(cfg.initialApCost * 0.69));
      const scaledUpkeepAp = Math.max(1, Math.round(cfg.baseApPerTurn * 0.69));

      // Enough AP and Sync for transform + 1 turn upkeep, then run out on turn 3
      const ryu = makeRyuInput({
        ap: scaledInitAp + scaledUpkeepAp,
        baseStats: {
          maxHp: 220,
          maxAp: 120,
          atk: 30,
          def: 20,
          mag: 28,
          spd: 22,
          luck: 14,
        },
        equippedRelicIds: ['relic_dragon_tear'],
        equippedSignatureIds: ['sig_dragnier_mail'],
        commands: [BASIC_ATTACK, DEFEND_COMMAND, cmd],
      });
      const boss = makeEnemy({
        instanceId: 'boss',
        hp: 2000,
        maxHp: 2000,
        atk: 5,
        def: 10,
        spd: 5,
        weakness: cfg.element === 'neutral' ? 'fire' : cfg.element,
      });

      const initSync = cfg.initialSyncCost + cfg.baseSyncPerTurn + 2;
      let state = advanceInitToCommandSelect(
        createCombatState([ryu], [boss], DEFAULT_CONTEXT, initSync),
      );

      // Turn 1: Transform
      state = queuePartyCommand(state, 'ryu', cmd.id, ['boss']);
      state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.99);
      expect(state.dragonState.activeForm).toBe(formId);
      expect(state.dragonState.turnsSustained).toBe(1);
      expect(state.dragonState.effectiveApPerTurn).toBe(scaledUpkeepAp);
      expect(state.party[0].element).toBe(cfg.element);
      expect(state.party[0].spriteId).toBe('ryu_dragon');
      expect(state.enemies[0].hp).toBeLessThan(2000);

      // Turn 2: Sustain for 1 additional turn
      state = queuePartyCommand(state, 'ryu', 'attack', ['boss']);
      state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.99);
      expect(state.dragonState.activeForm).toBe(formId);
      expect(state.dragonState.turnsSustained).toBe(2);
      expect(state.party[0].ap).toBe(0);

      // Turn 3: AP is 0 -> reverts gracefully to human form
      state = queuePartyCommand(state, 'ryu', 'attack', ['boss']);
      state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.99);
      expect(state.dragonState.activeForm).toBeNull();
      expect(state.dragonState.turnsSustained).toBe(0);
      expect(state.party[0].spriteId).toBe('ryu');
      expect(state.party[0].element).toBe('neutral');
    }
  });

  it('exposes all 6 Shaman modifier tables, Dual-Shaman synergies, and Bleu decorations', () => {
    const expectedBleuTitles: Record<ShamanId, string> = {
      sana: 'Pyre Serpent',
      seso: 'Abyssal Naga',
      spoo: 'Storm Leviathan',
      solo: 'Monolith Gorgon',
      seny: 'Astral Oracle',
      shin: 'Void Lamia',
    };

    for (const shamanId of Object.keys(expectedBleuTitles) as ShamanId[]) {
      const row = SHAMAN_FUSION_MODIFIER_TABLES[shamanId];
      expect(row.shamanId).toBe(shamanId);
      expect(row.grantedCommandIds.length).toBeGreaterThan(0);

      const bleuDecorated = decorateCombatant(
        {
          id: 'bleu',
          name: 'Bleu',
          level: 10,
          hp: 140,
          ap: 90,
          baseStats: { maxHp: 140, maxAp: 90, atk: 16, def: 15, mag: 34, spd: 20, luck: 14 },
          element: 'neutral',
          spriteId: 'bleu',
          loyalty: 85,
          equippedRelicIds: [],
          equippedSignatureIds: [],
          shamanIds: [shamanId],
          isArmorBroken: false,
          armorBreakTurnsRemaining: 0,
          commands: [BASIC_ATTACK],
        },
        DEFAULT_CONTEXT,
      );
      expect(bleuDecorated.fusionTitle).toBe(expectedBleuTitles[shamanId]);
      expect(bleuDecorated.spriteId).toBe(`bleu_${shamanId}`);

      const singleTable = getShamanFusionModifierTable('bleu', [shamanId]);
      expect(singleTable.fusionTitle).toBe(expectedBleuTitles[shamanId]);
      expect(singleTable.hasDualSynergy).toBe(false);
      expect(singleTable.synergy).toBeNull();
    }

    // Verify miracle dual-shaman pairings (order-insensitive)
    for (const pairKey of ['sana+spoo', 'seso+seny', 'solo+sana', 'shin+spoo', 'seny+shin']) {
      expect(Object.keys(SHAMAN_DUAL_SYNERGIES)).toContain(pairKey);
    }

    const bleuMiracle = getShamanFusionModifierTable('bleu', ['spoo', 'sana']);
    expect(bleuMiracle.hasDualSynergy).toBe(true);
    expect(bleuMiracle.synergy?.id).toBe('sana+spoo');
    expect(bleuMiracle.miracleTitle).toContain('Wildfire Tempest');
    expect(bleuMiracle.effectiveMultipliers.atk).toBeCloseTo(1.2 * 1.08, 3);
    expect(bleuMiracle.effectiveMultipliers.spd).toBeCloseTo(1.25 * 1.08, 3);
    expect(bleuMiracle.flatBonuses.atk).toBeGreaterThan(4);
    expect(bleuMiracle.grantedCommandIds).toContain('spoo_gale_cyclone');
    expect(bleuMiracle.grantedCommandIds).toContain('sana_flame_burst');
  });

  it('gives all 9 party members unique Progression Relics and Signature Gear with active hooks', () => {
    const allMembers: CharacterId[] = [
      'ryu',
      'bow',
      'katt',
      'rand',
      'nina',
      'jean',
      'sten',
      'spar',
      'bleu',
    ];

    const seenRelics = new Set<string>();
    const seenSig = new Set<string>();

    for (const memberId of allMembers) {
      const relicId = CHARACTER_PROGRESSION_RELIC_MAP[memberId];
      const sigId = CHARACTER_SIGNATURE_GEAR_MAP[memberId];

      expect(relicId).toBeTruthy();
      expect(sigId).toBeTruthy();
      expect(seenRelics.has(relicId)).toBe(false);
      expect(seenSig.has(sigId)).toBe(false);
      seenRelics.add(relicId);
      seenSig.add(sigId);

      const relic = PROGRESSION_RELICS[relicId];
      const sig = SIGNATURE_GEAR_CATALOG[sigId];
      expect(relic).toBeDefined();
      expect(sig).toBeDefined();
      expect(sig.ownerId).toBe(memberId);
      expect(getEquipmentCatalogItem(relicId)).toBe(relic);
      expect(getEquipmentCatalogItem(sigId)).toBe(sig);

      const summary = evaluateEquipmentForCombatant([relicId], [sigId], {
        characterLevel: 12,
        liberatedRegions: 5,
        shamanResonanceRank: 3,
        loyalty: 90,
      });
      const statTotal = Object.values(summary.flatBonuses).reduce((a, b) => a + b, 0);
      expect(statTotal).toBeGreaterThan(0);
      expect(summary.hooks.length).toBeGreaterThan(0);
    }

    // Verify specific elemental & hook contracts for the 6 newly added signature items
    expect(
      evaluateEquipmentForCombatant([], ['sig_farmtown_shell'], DEFAULT_CONTEXT)
        .convertedAttackElement,
    ).toBe('earth');
    expect(
      evaluateEquipmentForCombatant([], ['sig_black_wing_pinion'], DEFAULT_CONTEXT)
        .convertedAttackElement,
    ).toBe('wind');
    expect(
      evaluateEquipmentForCombatant([], ['sig_frogsbane_rapier'], DEFAULT_CONTEXT)
        .convertedAttackElement,
    ).toBe('ice');
    expect(
      evaluateEquipmentForCombatant([], ['sig_highlander_hookblade'], DEFAULT_CONTEXT)
        .convertedAttackElement,
    ).toBe('fire');
    expect(
      evaluateEquipmentForCombatant([], ['sig_whispering_bark'], DEFAULT_CONTEXT)
        .dragonApCostMultiplier,
    ).toBeCloseTo(0.85, 4);
    expect(
      evaluateEquipmentForCombatant([], ['sig_starfall_staff'], DEFAULT_CONTEXT)
        .convertedAttackElement,
    ).toBe('thunder');

    // Execute Bleu's Starfall Staff (thunder conversion + combo chain) in combat
    const bleuCombatant: CombatantInput = {
      id: 'bleu',
      name: 'Bleu',
      level: 10,
      hp: 150,
      ap: 90,
      baseStats: { maxHp: 150, maxAp: 90, atk: 24, def: 16, mag: 34, spd: 24, luck: 15 },
      element: 'neutral',
      spriteId: 'bleu',
      loyalty: 85,
      equippedRelicIds: ['relic_serpent_astrolabe'],
      equippedSignatureIds: ['sig_starfall_staff'],
      shamanIds: [],
      isArmorBroken: false,
      armorBreakTurnsRemaining: 0,
      commands: [BASIC_ATTACK, DEFEND_COMMAND],
    };
    const thunderWeakBoss = makeEnemy({
      instanceId: 'e_th',
      hp: 500,
      maxHp: 500,
      weakness: 'thunder',
      spd: 5,
    });
    let state = advanceInitToCommandSelect(
      createCombatState([bleuCombatant], [thunderWeakBoss], DEFAULT_CONTEXT, 50),
    );
    state = queuePartyCommand(state, 'bleu', 'attack', ['e_th']);
    state = advanceCombatTurn(state, DEFAULT_CONTEXT, () => 0.1);
    expect(state.enemies[0].hp).toBeLessThan(500);
    expect(state.log.some((l) => l.kind === 'hook' && l.text.includes('thunder'))).toBe(true);
    expect(state.log.some((l) => l.kind === 'hook' && l.text.includes('Combo Chain'))).toBe(true);
  });

  it('transitions Act I -> II -> III -> Infinity Gate -> Deathevan Normal vs True Ending', () => {
    expect(ALL_CHARACTER_IDS).toHaveLength(9);
    expect(ALL_CHARACTER_IDS).toContain('bleu');
    expect(COMPANION_IDS).toHaveLength(8);
    expect(COMPANION_IDS).toContain('bleu');
    expect(CAMPAIGN_REGION_IDS).toHaveLength(8);

    const expandedClues: StEvaClue[] = [
      { id: 'c1', title: 'Gate Fissure', location: 'Gate', summary: 'Demonic rift.', discovered: false, verified: false },
      { id: 'c2', title: 'Windia Crypt', location: 'Windia', summary: 'Winged seal.', discovered: false, verified: false },
      { id: 'c3', title: 'Highfort Log', location: 'Highfort', summary: 'Sky altar.', discovered: false, verified: false },
      { id: 'c4', title: 'SimaFort Vault', location: 'SimaFort', summary: 'Tribute ledger.', discovered: false, verified: false },
      { id: 'c5', title: 'Tunlan Tablet', location: 'Tunlan', summary: 'Elder hymn.', discovered: false, verified: false },
      { id: 'c6', title: 'Capitan Shrine', location: 'Capitan', summary: 'Tide bell.', discovered: false, verified: false },
    ];

    let reg = createInitialWorldRegistry([], expandedClues);
    expect(reg.currentAct).toBe(1);
    expect(reg.infinityUnlocked).toBe(false);
    expect(reg.deathevanDefeated).toBe(false);
    expect(reg.endingPath).toBe('PENDING');

    // Cannot unlock Infinity Gate in Act 1 before conditions are met
    reg = unlockInfinityGate(reg);
    expect(reg.infinityUnlocked).toBe(false);

    // Advance Act I -> II -> III
    reg = advanceCampaignAct(reg, 2);
    expect(reg.currentAct).toBe(2);
    expect(reg.flags.act_2_reached).toBe(true);

    reg = advanceCampaignAct(reg, 3);
    expect(reg.currentAct).toBe(3);
    expect(reg.flags.act_3_reached).toBe(true);

    // Now Infinity Gate unlocks
    reg = unlockInfinityGate(reg);
    expect(reg.infinityUnlocked).toBe(true);
    expect(reg.flags.infinity_gate_opened).toBe(true);

    // Failed Deathevan attempt keeps battle unresolved
    reg = resolveDeathevanBattle(reg, false);
    expect(reg.deathevanDefeated).toBe(false);
    expect(reg.endingPath).toBe('PENDING');

    // Victory without meeting True Ending requirements yields NORMAL ending
    const normalReg = resolveDeathevanBattle(reg, true);
    expect(normalReg.deathevanDefeated).toBe(true);
    expect(normalReg.flags.deathevan_defeated).toBe(true);
    expect(normalReg.endingPath).toBe('NORMAL');
    const normalEval = evaluateTrueEndingConditions(normalReg);
    expect(normalEval.isUnlocked).toBe(false);
    expect(normalEval.infinityUnlocked).toBe(true);
    expect(normalEval.deathevanDefeated).toBe(true);
    expect(normalEval.endingPath).toBe('NORMAL');

    // Satisfy 6 clues + 7 regions + all 8 companions >= 75 loyalty + shaman rank 3 -> TRUE_ENDING
    let trueReg = reg;
    for (const clue of expandedClues) {
      trueReg = verifyStEvaClue(trueReg, clue.id);
    }
    for (const regionId of ['frontier', 'gate', 'windia', 'highfort', 'simafort', 'tunlan', 'capitan']) {
      trueReg = liberateRegion(trueReg, regionId);
    }
    for (const comp of COMPANION_IDS) {
      trueReg = adjustCompanionLoyalty(trueReg, comp, 35); // 85
    }
    trueReg = setShamanResonanceRank(trueReg, 3);
    trueReg = resolveDeathevanBattle(trueReg, true);

    expect(trueReg.deathevanDefeated).toBe(true);
    expect(trueReg.endingPath).toBe('TRUE_ENDING');
    const trueEval = evaluateTrueEndingConditions(trueReg);
    expect(trueEval.isUnlocked).toBe(true);
    expect(trueEval.evanCluesVerified).toBe(6);
    expect(trueEval.liberatedRegionsCount).toBe(7);
    expect(trueEval.infinityUnlocked).toBe(true);
    expect(trueEval.deathevanDefeated).toBe(true);
    expect(trueEval.endingPath).toBe('TRUE_ENDING');
    expect(trueEval.missingConditions).toEqual([]);
  });
});
