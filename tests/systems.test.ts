import { describe, expect, it } from 'vitest';
import { createInitialWorldRegistry, recruitTownshipCitizen } from '../src/core';
import {
  ALL_CHARACTER_IDS,
  ALL_DRAGON_FORMS,
  ALL_SHAMAN_IDS,
  CAMPAIGN_CLUES,
  CAMPAIGN_QUESTS,
  CAMPAIGN_ROSTER,
  CONTINENT_PLAYABLE_LIMIT,
  ENEMY_TEMPLATES,
  FIELD_ACTION_PROFILES,
  TOWNSHIP_CITIZENS,
  VERTICAL_SLICE_CLUES,
  VERTICAL_SLICE_QUESTS,
} from '../src/data/verticalSliceContent';
import {
  cookCampfireMeal,
  evaluateWindScentTracking,
  executeFishingCast,
} from '../src/systems/ecosystemSystem';
import { updateEnemyAI, type EnemyAIActor } from '../src/systems/enemyAISystem';
import { useGameStore } from '../src/systems/gameStore';
import {
  canRecruitCitizen,
  executeCitizenRecruitment,
  getTownshipSnapshot,
} from '../src/systems/townshipSystem';

describe('Enemy AI System (Patrol / Aggro_Sight / Ambush)', () => {
  it('transitions Patrol -> Aggro_Sight when player enters sight cone and returns outside aggro drop radius', () => {
    const scout: EnemyAIActor = {
      id: 'harpy_1',
      templateId: 'harpy_scout',
      position: [0, 0, 0],
      velocity: [0, 0, 0],
      facingAngle: 0, // facing +Z
      aiState: 'Patrol',
      homePos: [0, 0, 0],
      waypoints: [
        [0, 0, 0],
        [10, 0, 0],
      ],
      waypointIndex: 1,
      moveSpeed: 4,
    };

    const aggroRes = updateEnemyAI(scout, [0, 0, 10], [0, 0, 0], 0.5);
    expect(aggroRes.nextState).toBe('Aggro_Sight');
    expect(aggroRes.shouldEngageCombat).toBe(false);

    const dropRes = updateEnemyAI(aggroRes.enemy, [0, 0, 40], [0, 0, 0], 0.5);
    expect(dropRes.nextState).toBe('Patrol');
  });

  it('triggers Ambush lunge at 1.45x speed when player enters 9m radius', () => {
    const ambusher: EnemyAIActor = {
      id: 'augus_1',
      templateId: 'augus_enforcer',
      position: [20, 0, 0],
      velocity: [0, 0, 0],
      facingAngle: Math.PI,
      aiState: 'Ambush',
      homePos: [20, 0, 0],
      waypoints: [[20, 0, 0]],
      waypointIndex: 0,
      moveSpeed: 5,
      camouflaged: true,
      ambushTriggered: false,
    };

    const farRes = updateEnemyAI(ambusher, [0, 0, 0], [0, 0, 0], 0.1);
    expect(farRes.enemy.ambushTriggered).toBe(false);

    const triggerRes = updateEnemyAI(ambusher, [14, 0, 0], [0, 0, 0], 0.2);
    expect(triggerRes.enemy.ambushTriggered).toBe(true);
    expect(triggerRes.enemy.camouflaged).toBe(false);
    expect(Math.hypot(triggerRes.enemy.velocity[0], triggerRes.enemy.velocity[2])).toBeCloseTo(
      5 * 1.45,
      2
    );
  });
});

describe('Diegetic Township Hub & Ecosystem Systems', () => {
  it('instantiates buildings, unlocks services, and grants passive party buffs upon recruiting citizens including Azuki and Leminton', () => {
    let registry = createInitialWorldRegistry(
      Object.values(VERTICAL_SLICE_QUESTS),
      Object.values(VERTICAL_SLICE_CLUES)
    );
    registry = recruitTownshipCitizen(
      registry,
      TOWNSHIP_CITIZENS.kay.id,
      TOWNSHIP_CITIZENS.kay.buildingId
    );

    const initialSnap = getTownshipSnapshot(registry);
    expect(initialSnap.unlockedServices.campfireKitchen).toBe(true);
    expect(initialSnap.unlockedServices.relicReforge).toBe(false);

    const hanzCheck = canRecruitCitizen(registry, 'hanz');
    expect(hanzCheck.allowed).toBe(true);

    const hanzRecruit = executeCitizenRecruitment(registry, 'hanz');
    expect(hanzRecruit.success).toBe(true);

    const sanaRecruit = executeCitizenRecruitment(hanzRecruit.registry, 'sana');
    expect(sanaRecruit.success).toBe(true);

    const azukiRecruit = executeCitizenRecruitment(sanaRecruit.registry, 'azuki');
    expect(azukiRecruit.success).toBe(true);

    const lemintonRecruit = executeCitizenRecruitment(azukiRecruit.registry, 'leminton');
    expect(lemintonRecruit.success).toBe(true);

    const updatedSnap = getTownshipSnapshot(lemintonRecruit.registry);
    expect(updatedSnap.unlockedServices.relicReforge).toBe(true);
    expect(updatedSnap.unlockedServices.shamanAltar).toBe(true);
    expect(updatedSnap.passiveBuffs.atkPercent).toBe(19);
    expect(updatedSnap.passiveBuffs.syncMaxBonus).toBe(50);
    expect(updatedSnap.passiveBuffs.dragonApDiscountPercent).toBe(25);
  });

  it('evaluates downwind scent hunting, Ryu Manillo fishing bonus, and campfire cooking', () => {
    const perfectHunt = evaluateWindScentTracking(0, Math.PI, 12);
    expect(perfectHunt.success).toBe(true);
    expect(perfectHunt.tier).toBe('PERFECT_DOWNWIND');
    expect(perfectHunt.drops.length).toBe(2);

    const ryuFish = executeFishingCast(14, true, 0.92);
    const bowFish = executeFishingCast(14, false, 0.92);
    expect(ryuFish.ryuBonusApplied).toBe(true);
    expect(ryuFish.manilloTokensEarned).toBeGreaterThan(bowFish.manilloTokensEarned);

    const cooked = cookCampfireMeal('dragon_skewers', {
      red_snapper: 1,
      wild_boar_cut: 1,
    });
    expect(cooked.success).toBe(true);
    expect(cooked.hpRestore).toBeGreaterThan(0);
    expect(cooked.syncRestore).toBeGreaterThan(0);
    expect(cooked.updatedInventory.red_snapper).toBeUndefined();
  });
});

describe('Full 9-Character Campaign Roster & Content Expansion', () => {
  it('defines all 9 playable characters including Bleu, 9 companion quests, Act I-III quests, 7 clues, and continental enemies', () => {
    expect(ALL_CHARACTER_IDS).toHaveLength(9);
    expect(ALL_CHARACTER_IDS).toContain('bleu');
    expect(Object.keys(CAMPAIGN_ROSTER)).toHaveLength(9);

    const bleu = CAMPAIGN_ROSTER.bleu;
    expect(bleu.spriteId).toBe('sprite_bleu');
    expect(bleu.baseStats.mag).toBeGreaterThanOrEqual(30);
    expect(bleu.baseStats.maxAp).toBeGreaterThanOrEqual(70);
    const bleuCmdIds = bleu.commands.map((c) => c.id);
    expect(bleuCmdIds).toContain('bleu_thunder');
    expect(bleuCmdIds).toContain('bleu_freeze');
    expect(bleuCmdIds).toContain('bleu_bolster');
    expect(FIELD_ACTION_PROFILES.bleu.primaryAction).toBe('arcane_warp');

    // 9 companion quests with unique relic & signature IDs
    const companionQuests = Object.values(CAMPAIGN_QUESTS).filter(
      (q) => q.category === 'COMPANION_ARC'
    );
    expect(companionQuests).toHaveLength(9);
    for (const charId of ALL_CHARACTER_IDS) {
      expect(companionQuests.some((q) => q.companionId === charId)).toBe(true);
    }

    // Act I-III main quests + St. Eva investigation branches
    expect(CAMPAIGN_QUESTS.quest_coursair_innocence.act).toBe(1);
    expect(CAMPAIGN_QUESTS.quest_act2_continental_pact.act).toBe(2);
    expect(CAMPAIGN_QUESTS.quest_act3_infinity_descent.act).toBe(3);
    expect(CAMPAIGN_QUESTS.quest_deathevan_reckoning.act).toBe(3);
    expect(CAMPAIGN_QUESTS.quest_steva_ledger).toBeDefined();
    expect(CAMPAIGN_QUESTS.quest_steva_cathedral).toBeDefined();
    expect(Object.keys(CAMPAIGN_CLUES)).toHaveLength(7);

    // Continental enemy templates
    expect(ENEMY_TEMPLATES.highfort_automaton).toBeDefined();
    expect(ENEMY_TEMPLATES.simafort_leech).toBeDefined();
    expect(ENEMY_TEMPLATES.barubary_warden).toBeDefined();
    expect(ENEMY_TEMPLATES.deathevan_aspect).toBeDefined();
  });
});

describe('Campaign GameStore: Traversal, Gesture Mini-Games, Shamans & Infinity/Deathevan', () => {
  it('supports hot-swapping to Bleu, exposing all 9 Dragon Forms, and gesture-scored hunting & fishing', () => {
    useGameStore.getState().resetGame();
    const store = useGameStore.getState();

    expect(store.availableDragonForms).toEqual(ALL_DRAGON_FORMS);
    expect(store.availableDragonForms).toHaveLength(9);
    expect(store.unlockedShamans).toEqual(['sana', 'seso', 'spoo']);

    store.hotSwapLeader('bleu');
    expect(useGameStore.getState().leaderId).toBe('bleu');
    expect(useGameStore.getState().activePartyIds).toContain('bleu');

    // Gesture hunting passes downwind approachAngle & optimal distance
    const wind = useGameStore.getState().windAngle;
    const huntOutcome = store.startHunt({
      approachAngle: wind + Math.PI,
      distance: 12,
    });
    expect(huntOutcome.executed).toBe(true);
    expect(huntOutcome.message).toContain('Downwind Concealed');
    expect(useGameStore.getState().inventory.wild_boar_cut).toBeGreaterThanOrEqual(3);

    // Gesture fishing passes castScore with Ryu angler affinity
    store.hotSwapLeader('ryu');
    const tokensBefore = useGameStore.getState().inventory.manillo_tokens ?? 0;
    const fishOutcome = store.castFishingLine(0.95);
    expect(fishOutcome.executed).toBe(true);
    expect(fishOutcome.message).toContain('Manillo Koi');
    expect(useGameStore.getState().inventory.manillo_tokens).toBeGreaterThan(tokensBefore);
  });

  it('traverses continental regions, investigates St. Eva branches, unlocks Infinity, and branches Normal vs True Ending', () => {
    useGameStore.getState().resetGame();
    const store = useGameStore.getState();

    // Verify expanded continental playable bounds
    expect(CONTINENT_PLAYABLE_LIMIT).toBe(460);
    expect(store.travelToRegion('infinity')).toBe(false);

    // Travel across continental biomes and trigger landmark actions to liberate & unlock shamans
    expect(store.travelToRegion('windia')).toBe(true);
    expect(useGameStore.getState().currentBiomeId).toBe('windia');
    store.hotSwapLeader('nina');
    store.triggerContextualFieldAction();

    expect(store.travelToRegion('highfort')).toBe(true);
    store.hotSwapLeader('sten');
    store.triggerContextualFieldAction();
    expect(useGameStore.getState().unlockedShamans).toContain('solo');

    expect(store.travelToRegion('simafort')).toBe(true);
    store.hotSwapLeader('jean');
    store.triggerContextualFieldAction();

    expect(store.travelToRegion('tunlan')).toBe(true);
    store.hotSwapLeader('spar');
    store.triggerContextualFieldAction();
    expect(useGameStore.getState().unlockedShamans).toContain('seny');

    expect(store.travelToRegion('capitan')).toBe(true);
    store.triggerContextualFieldAction();

    // Unseal Gate Fissure / Infinity and unlock Shadow Shaman Shin
    expect(store.unlockInfinity()).toBe(true);
    expect(useGameStore.getState().worldRegistry.infinityUnlocked).toBe(true);
    expect(useGameStore.getState().unlockedShamans).toContain('shin');
    for (const shamanId of ALL_SHAMAN_IDS) {
      expect(useGameStore.getState().unlockedShamans).toContain(shamanId);
    }
    expect(store.travelToRegion('infinity')).toBe(true);

    // Confront Deathevan before verifying 4 clues & raising loyalty -> Normal Ending
    const normalResult = store.confrontDeathevan(true);
    expect(normalResult.deathevanDefeated).toBe(true);
    expect(normalResult.endingPath).toBe('NORMAL');

    // Reset and fulfill all True Ending requirements (4+ clues verified, 4+ regions liberated, >=75 avg loyalty, >=3 shaman rank)
    store.resetGame();
    const fresh = useGameStore.getState();
    for (const clueId of [
      'clue_tainted_tithe',
      'clue_courtyard_cipher',
      'clue_shrine_seal',
      'clue_capitan_well',
    ]) {
      fresh.discoverOrAdvanceClue(clueId);
      fresh.discoverOrAdvanceClue(clueId);
    }
    expect(
      useGameStore.getState().worldRegistry.quests.quest_steva_ledger.stage
    ).toBe('COMPLETED');

    // Complete companion arcs & continental travel for loyalty + regions + shamans
    for (const [questId, obj1, obj2] of [
      ['quest_dragon_tear', 'obj_dragon_shrine', 'obj_attune_sana'],
      ['quest_coursair_alibi', 'obj_bow_alibi_trail', 'obj_bow_clear_name'],
      ['quest_coliseum_fang', 'obj_track_sabotage', 'obj_reclaim_fang'],
      ['quest_farmtown_burden', 'obj_rand_boulder_pass', 'obj_rand_mothers_oath'],
      ['quest_black_wing', 'obj_nina_windia_updraft', 'obj_nina_black_wing_trial'],
      ['quest_simafort_curse', 'obj_jean_mire_crossing', 'obj_jean_break_curse'],
      ['quest_highfort_oath', 'obj_sten_highfort_gears', 'obj_sten_honor_duel'],
      ['quest_great_tree_memory', 'obj_spar_thicket_song', 'obj_spar_wise_tree'],
      ['quest_ancient_serpent', 'obj_bleu_awaken_seal', 'obj_bleu_starfall_trial'],
    ] as const) {
      fresh.advanceQuestObjective(questId, obj1);
      fresh.advanceQuestObjective(questId, obj2);
    }

    fresh.travelToRegion('windia');
    fresh.triggerContextualFieldAction();
    fresh.travelToRegion('highfort');
    fresh.triggerContextualFieldAction();
    fresh.travelToRegion('tunlan');
    fresh.triggerContextualFieldAction();
    fresh.unlockInfinity();

    const trueEval = fresh.confrontDeathevan(true);
    expect(trueEval.isUnlocked).toBe(true);
    expect(trueEval.deathevanDefeated).toBe(true);
    expect(trueEval.endingPath).toBe('TRUE_ENDING');
  });
});
