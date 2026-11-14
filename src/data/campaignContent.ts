import type {
  CharacterId,
  CombatantInput,
  ContinentalBiomeId,
  DragonFormId,
  EnemyAIState,
  EnemyCombatant,
  FieldActionId,
  QuestDefinition,
  ShamanId,
  StEvaClue,
  TerrainTag,
} from '../core/types';

export type Vec3Tuple = [number, number, number];
export type Vec2Tuple = [number, number];

export const BIOME_HALF_EXTENT = 125; // 250m x 250m chunk half-extent
export const BIOME_PLAYABLE_LIMIT = 110; // [-110..110] starter frontier boundary
export const CONTINENT_PLAYABLE_LIMIT = 460; // [-460..460] full continental boundary

export const ALL_CHARACTER_IDS: CharacterId[] = [
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

export const ACTIVE_STARTER_PARTY_IDS: CharacterId[] = ['ryu', 'bow', 'katt'];

export const FIELD_SPECIALIST_IDS: CharacterId[] = [
  'rand',
  'nina',
  'jean',
  'sten',
  'spar',
  'bleu',
];

export const ALL_DRAGON_FORMS: DragonFormId[] = [
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

export const ALL_SHAMAN_IDS: ShamanId[] = [
  'sana',
  'seso',
  'spoo',
  'solo',
  'seny',
  'shin',
];

export const EARLY_SHAMAN_IDS: ShamanId[] = ['sana', 'seso', 'spoo'];

export interface RegionTravelAnchor {
  biomeId: ContinentalBiomeId;
  name: string;
  position: Vec3Tuple;
  terrainTag: TerrainTag;
  requiresInfinityUnlock?: boolean;
}

export const REGION_TRAVEL_ANCHORS: Record<ContinentalBiomeId, RegionTravelAnchor> = {
  frontier: {
    biomeId: 'frontier',
    name: 'Township Frontier',
    position: [0, 0, 8],
    terrainTag: 'TOWNSHIP_PLOT',
  },
  gate: {
    biomeId: 'gate',
    name: 'Gate Fissure',
    position: [0, 0, -230],
    terrainTag: 'GATE_FISSURE',
  },
  windia: {
    biomeId: 'windia',
    name: 'Windia Sky Citadel',
    position: [-235, 0, -210],
    terrainTag: 'WIND_UPDRAFT',
  },
  highfort: {
    biomeId: 'highfort',
    name: 'Highfort Gear Citadel',
    position: [240, 0, -220],
    terrainTag: 'HIGHFORT_GEAR',
  },
  simafort: {
    biomeId: 'simafort',
    name: 'SimaFort Mire',
    position: [-245, 0, 18],
    terrainTag: 'SIMAFORT_MIRE',
  },
  tunlan: {
    biomeId: 'tunlan',
    name: 'Tunlan Tidal Terrace',
    position: [245, 0, 18],
    terrainTag: 'TUNLAN_TIDE',
  },
  capitan: {
    biomeId: 'capitan',
    name: 'Capitan Harbor & Well',
    position: [-235, 0, 235],
    terrainTag: 'CAPITAN_SHORE',
  },
  infinity: {
    biomeId: 'infinity',
    name: 'Infinity Void Core',
    position: [0, 0, -430],
    terrainTag: 'INFINITY_VOID',
    requiresInfinityUnlock: true,
  },
};

export interface FieldSpecialistProfile {
  characterId: CharacterId;
  primaryAction: FieldActionId;
  secondaryAction?: FieldActionId;
  targetTerrains: TerrainTag[];
  actionLabel: string;
  actionDescription: string;
}

export const FIELD_ACTION_PROFILES: Record<CharacterId, FieldSpecialistProfile> = {
  ryu: {
    characterId: 'ryu',
    primaryAction: 'dragon_sight',
    secondaryAction: 'fishing',
    targetTerrains: ['DRAGON_SHRINE', 'FISHING_SPOT', 'GATE_FISSURE'],
    actionLabel: 'Dragon Sight / Cast Line',
    actionDescription:
      'Resonate with Ancient Gate Dragon Shrines or cast a Manillo lure at river docks.',
  },
  bow: {
    characterId: 'bow',
    primaryAction: 'hunting_shot',
    targetTerrains: ['HUNTING_TRAIL', 'COURSAIR_GATE', 'CAPITAN_SHORE'],
    actionLabel: 'Ranger Shot',
    actionDescription:
      'Stalk downwind on hunting trails for clean game harvests and scout St. Eva outposts.',
  },
  katt: {
    characterId: 'katt',
    primaryAction: 'daunting_dash',
    targetTerrains: ['COURSAIR_GATE', 'HUNTING_TRAIL'],
    actionLabel: 'Coliseum Dash',
    actionDescription:
      'Sprint-strike across Coliseum approaches or scatter ambushers before battle.',
  },
  rand: {
    characterId: 'rand',
    primaryAction: 'terrain_roll',
    targetTerrains: ['BOULDER_CRACK'],
    actionLabel: 'Armadillo Roll',
    actionDescription: 'Shatter cracked boulders blocking frontier shortcuts.',
  },
  nina: {
    characterId: 'nina',
    primaryAction: 'wind_glide',
    targetTerrains: ['CLIFF_GAP', 'WIND_UPDRAFT'],
    actionLabel: 'Wind Glide',
    actionDescription: 'Ride frontier and Windia updrafts across steep cliff gaps.',
  },
  jean: {
    characterId: 'jean',
    primaryAction: 'water_leap',
    targetTerrains: ['SHALLOW_WATER', 'SIMAFORT_MIRE'],
    actionLabel: 'Frog Leap',
    actionDescription: 'Vault across river rapids and SimaFort mire crossings.',
  },
  sten: {
    characterId: 'sten',
    primaryAction: 'grapple_reach',
    targetTerrains: ['CHASM_POST', 'HIGHFORT_GEAR'],
    actionLabel: 'Grapple Reach',
    actionDescription: 'Hook onto gorge anchor posts and Highfort clockwork pulleys.',
  },
  spar: {
    characterId: 'spar',
    primaryAction: 'forest_commune',
    targetTerrains: ['FOREST_THICKET', 'TUNLAN_TIDE'],
    actionLabel: 'Forest Commune',
    actionDescription:
      'Part whispering thickets and commune with ancient roots across Tunlan.',
  },
  bleu: {
    characterId: 'bleu',
    primaryAction: 'arcane_warp',
    targetTerrains: ['GATE_FISSURE', 'INFINITY_VOID', 'DRAGON_SHRINE'],
    actionLabel: 'Arcane Warp',
    actionDescription:
      'Channel ancient serpentine sorcery to unseal Gate fissures and traverse Infinity.',
  },
};

export const CAMPAIGN_ROSTER: Record<CharacterId, CombatantInput> = {
  ryu: {
    id: 'ryu',
    name: 'Ryu',
    level: 6,
    hp: 92,
    ap: 38,
    baseStats: {
      maxHp: 92,
      maxAp: 38,
      atk: 24,
      def: 17,
      mag: 16,
      spd: 18,
      luck: 14,
    },
    element: 'fire',
    spriteId: 'sprite_ryu',
    loyalty: 80,
    equippedRelicIds: ['relic_dragon_tear'],
    equippedSignatureIds: [],
    shamanIds: [],
    isArmorBroken: false,
    armorBreakTurnsRemaining: 0,
    commands: [
      {
        id: 'ryu_slash',
        label: 'Dragoon Slash',
        apCost: 0,
        powerMultiplier: 1.0,
        element: 'neutral',
        targetType: 'single_enemy',
        kind: 'attack',
        description: 'Crisp sword strike fueled by Gate lineage.',
      },
      {
        id: 'ryu_flame_edge',
        label: 'Flame Edge',
        apCost: 6,
        powerMultiplier: 1.45,
        element: 'fire',
        targetType: 'single_enemy',
        kind: 'skill',
        description: 'Ignites blade with dragonfire to cleave fire-weak foes.',
      },
      {
        id: 'dragon_fire',
        label: 'Fire Dragon',
        apCost: 12,
        syncCost: 20,
        powerMultiplier: 1.85,
        element: 'fire',
        targetType: 'single_enemy',
        kind: 'dragon_transform',
        dragonFormId: 'fire_dragon',
        description:
          'Transforms Ryu into Fire Dragon, sustaining Fire breath each turn.',
      },
      {
        id: 'ryu_defend',
        label: 'Guard',
        apCost: 0,
        powerMultiplier: 0,
        element: 'neutral',
        targetType: 'self',
        kind: 'defend',
        description: 'Brace for incoming blows and stabilize Sync.',
      },
    ],
  },
  bow: {
    id: 'bow',
    name: 'Bow',
    level: 6,
    hp: 78,
    ap: 44,
    baseStats: {
      maxHp: 78,
      maxAp: 44,
      atk: 19,
      def: 15,
      mag: 22,
      spd: 17,
      luck: 16,
    },
    element: 'holy',
    spriteId: 'sprite_bow',
    loyalty: 85,
    equippedRelicIds: [],
    equippedSignatureIds: [],
    shamanIds: [],
    isArmorBroken: false,
    armorBreakTurnsRemaining: 0,
    commands: [
      {
        id: 'bow_bolt',
        label: 'Crossbow Bolt',
        apCost: 0,
        powerMultiplier: 1.0,
        element: 'neutral',
        targetType: 'single_enemy',
        kind: 'attack',
        description: 'Accurate bolt fired from Bow’s ranger repeater.',
      },
      {
        id: 'bow_cure',
        label: 'Cure 1',
        apCost: 6,
        powerMultiplier: 1.6,
        element: 'holy',
        targetType: 'ally',
        kind: 'heal',
        description: 'Restores an ally’s HP with steady Ranger grace.',
      },
      {
        id: 'bow_shot',
        label: 'Pinning Shot',
        apCost: 7,
        powerMultiplier: 1.4,
        element: 'holy',
        targetType: 'single_enemy',
        kind: 'skill',
        description: 'Radiant volley effective against St. Eva enforcers.',
      },
      {
        id: 'bow_defend',
        label: 'Guard',
        apCost: 0,
        powerMultiplier: 0,
        element: 'neutral',
        targetType: 'self',
        kind: 'defend',
        description: 'Take cover and restore composure.',
      },
    ],
  },
  katt: {
    id: 'katt',
    name: 'Katt',
    level: 6,
    hp: 82,
    ap: 28,
    baseStats: {
      maxHp: 82,
      maxAp: 28,
      atk: 26,
      def: 13,
      mag: 12,
      spd: 26,
      luck: 15,
    },
    element: 'wind',
    spriteId: 'sprite_katt',
    loyalty: 75,
    equippedRelicIds: [],
    equippedSignatureIds: [],
    shamanIds: [],
    isArmorBroken: false,
    armorBreakTurnsRemaining: 0,
    commands: [
      {
        id: 'katt_staff',
        label: 'Woren Blitz',
        apCost: 0,
        powerMultiplier: 1.05,
        element: 'neutral',
        targetType: 'single_enemy',
        kind: 'attack',
        description: 'Rapid staff flurry driven by Coliseum agility.',
      },
      {
        id: 'katt_tempest',
        label: 'Tempest Kick',
        apCost: 7,
        powerMultiplier: 1.55,
        element: 'wind',
        targetType: 'single_enemy',
        kind: 'skill',
        description: 'Whirling wind-charged strike that punishes flying foes.',
      },
      {
        id: 'katt_hailstorm',
        label: 'Whirlwind Sweep',
        apCost: 11,
        powerMultiplier: 1.25,
        element: 'wind',
        targetType: 'all_enemies',
        kind: 'skill',
        description: 'Sweeping gale across the entire enemy vanguard.',
      },
      {
        id: 'katt_defend',
        label: 'Guard',
        apCost: 0,
        powerMultiplier: 0,
        element: 'neutral',
        targetType: 'self',
        kind: 'defend',
        description: 'Coiled stance ready to evade or counter.',
      },
    ],
  },
  rand: {
    id: 'rand',
    name: 'Rand',
    level: 6,
    hp: 116,
    ap: 26,
    baseStats: {
      maxHp: 116,
      maxAp: 26,
      atk: 25,
      def: 24,
      mag: 13,
      spd: 10,
      luck: 12,
    },
    element: 'earth',
    spriteId: 'sprite_rand',
    loyalty: 70,
    equippedRelicIds: [],
    equippedSignatureIds: [],
    shamanIds: [],
    isArmorBroken: false,
    armorBreakTurnsRemaining: 0,
    commands: [
      {
        id: 'rand_knuckle',
        label: 'Iron Knuckle',
        apCost: 0,
        powerMultiplier: 1.1,
        element: 'earth',
        targetType: 'single_enemy',
        kind: 'attack',
        description: 'Heavy gauntlet blow backed by Pangolin shell mass.',
      },
      {
        id: 'rand_cure',
        label: 'Earth Balm',
        apCost: 7,
        powerMultiplier: 1.5,
        element: 'holy',
        targetType: 'ally',
        kind: 'heal',
        description: 'Grounded field poultice restoring an ally’s HP.',
      },
      {
        id: 'rand_defend',
        label: 'Shell Guard',
        apCost: 0,
        powerMultiplier: 0,
        element: 'earth',
        targetType: 'self',
        kind: 'defend',
        description: 'Hunker behind armored scales.',
      },
    ],
  },
  nina: {
    id: 'nina',
    name: 'Nina',
    level: 6,
    hp: 68,
    ap: 56,
    baseStats: {
      maxHp: 68,
      maxAp: 56,
      atk: 12,
      def: 12,
      mag: 28,
      spd: 21,
      luck: 15,
    },
    element: 'wind',
    spriteId: 'sprite_nina',
    loyalty: 75,
    equippedRelicIds: [],
    equippedSignatureIds: [],
    shamanIds: [],
    isArmorBroken: false,
    armorBreakTurnsRemaining: 0,
    commands: [
      {
        id: 'nina_staff',
        label: 'Wing Staff',
        apCost: 0,
        powerMultiplier: 0.9,
        element: 'wind',
        targetType: 'single_enemy',
        kind: 'attack',
        description: 'Light wind-touched staff strike.',
      },
      {
        id: 'nina_sever',
        label: 'Sever',
        apCost: 8,
        powerMultiplier: 1.65,
        element: 'wind',
        targetType: 'single_enemy',
        kind: 'skill',
        description: 'Razor air blade conjured from Wyndia training.',
      },
      {
        id: 'nina_typhoon',
        label: 'Typhoon',
        apCost: 14,
        powerMultiplier: 1.45,
        element: 'wind',
        targetType: 'all_enemies',
        kind: 'skill',
        description: 'Calls down a frontier tempest across all enemies.',
      },
      {
        id: 'nina_defend',
        label: 'Guard',
        apCost: 0,
        powerMultiplier: 0,
        element: 'wind',
        targetType: 'self',
        kind: 'defend',
        description: 'Wrap wings to deflect incoming attacks.',
      },
    ],
  },
  jean: {
    id: 'jean',
    name: 'Jean',
    level: 6,
    hp: 86,
    ap: 34,
    baseStats: {
      maxHp: 86,
      maxAp: 34,
      atk: 20,
      def: 16,
      mag: 18,
      spd: 19,
      luck: 17,
    },
    element: 'ice',
    spriteId: 'sprite_jean',
    loyalty: 72,
    equippedRelicIds: [],
    equippedSignatureIds: [],
    shamanIds: [],
    isArmorBroken: false,
    armorBreakTurnsRemaining: 0,
    commands: [
      {
        id: 'jean_rapier',
        label: 'Noble Thrust',
        apCost: 0,
        powerMultiplier: 1.0,
        element: 'neutral',
        targetType: 'single_enemy',
        kind: 'attack',
        description: 'Swift SimaFort fencing lunge.',
      },
      {
        id: 'jean_frost',
        label: 'River Frost',
        apCost: 7,
        powerMultiplier: 1.5,
        element: 'ice',
        targetType: 'single_enemy',
        kind: 'skill',
        description: 'Chilling river-mist thrust.',
      },
      {
        id: 'jean_defend',
        label: 'Parry Stance',
        apCost: 0,
        powerMultiplier: 0,
        element: 'ice',
        targetType: 'self',
        kind: 'defend',
        description: 'Duelist guard posture.',
      },
    ],
  },
  sten: {
    id: 'sten',
    name: 'Sten',
    level: 6,
    hp: 79,
    ap: 36,
    baseStats: {
      maxHp: 79,
      maxAp: 36,
      atk: 22,
      def: 14,
      mag: 17,
      spd: 24,
      luck: 19,
    },
    element: 'fire',
    spriteId: 'sprite_sten',
    loyalty: 68,
    equippedRelicIds: [],
    equippedSignatureIds: [],
    shamanIds: [],
    isArmorBroken: false,
    armorBreakTurnsRemaining: 0,
    commands: [
      {
        id: 'sten_dagger',
        label: 'Twin Dagger',
        apCost: 0,
        powerMultiplier: 1.05,
        element: 'neutral',
        targetType: 'single_enemy',
        kind: 'attack',
        description: 'Acrobatic double slash.',
      },
      {
        id: 'sten_spark',
        label: 'Spark Bomb',
        apCost: 8,
        powerMultiplier: 1.45,
        element: 'fire',
        targetType: 'all_enemies',
        kind: 'skill',
        description: 'Highlander pyrotechnic flash across enemy ranks.',
      },
      {
        id: 'sten_defend',
        label: 'Guard',
        apCost: 0,
        powerMultiplier: 0,
        element: 'fire',
        targetType: 'self',
        kind: 'defend',
        description: 'Tuck and evade incoming strikes.',
      },
    ],
  },
  spar: {
    id: 'spar',
    name: 'Spar',
    level: 6,
    hp: 80,
    ap: 48,
    baseStats: {
      maxHp: 80,
      maxAp: 48,
      atk: 15,
      def: 16,
      mag: 23,
      spd: 15,
      luck: 16,
    },
    element: 'earth',
    spriteId: 'sprite_spar',
    loyalty: 74,
    equippedRelicIds: [],
    equippedSignatureIds: [],
    shamanIds: [],
    isArmorBroken: false,
    armorBreakTurnsRemaining: 0,
    commands: [
      {
        id: 'spar_whip',
        label: 'Briar Lash',
        apCost: 0,
        powerMultiplier: 0.95,
        element: 'earth',
        targetType: 'single_enemy',
        kind: 'attack',
        description: 'Snapping vine strike.',
      },
      {
        id: 'spar_balm',
        label: 'Bud Dew',
        apCost: 9,
        powerMultiplier: 1.35,
        element: 'holy',
        targetType: 'all_allies',
        kind: 'heal',
        description: 'Soothes all allies with restorative forest mist.',
      },
      {
        id: 'spar_defend',
        label: 'Root Guard',
        apCost: 0,
        powerMultiplier: 0,
        element: 'earth',
        targetType: 'self',
        kind: 'defend',
        description: 'Anchor into the soil to soften damage.',
      },
    ],
  },
  bleu: {
    id: 'bleu',
    name: 'Bleu',
    level: 7,
    hp: 76,
    ap: 74,
    baseStats: {
      maxHp: 76,
      maxAp: 74,
      atk: 14,
      def: 13,
      mag: 34,
      spd: 20,
      luck: 18,
    },
    element: 'thunder',
    spriteId: 'sprite_bleu',
    loyalty: 70,
    equippedRelicIds: [],
    equippedSignatureIds: [],
    shamanIds: [],
    isArmorBroken: false,
    armorBreakTurnsRemaining: 0,
    commands: [
      {
        id: 'bleu_staff',
        label: 'Serpent Rod',
        apCost: 0,
        powerMultiplier: 0.95,
        element: 'thunder',
        targetType: 'single_enemy',
        kind: 'attack',
        description: 'Arcane staff strike crackling with awakened lightning.',
      },
      {
        id: 'bleu_thunder',
        label: 'Thunder',
        apCost: 9,
        powerMultiplier: 1.7,
        element: 'thunder',
        targetType: 'all_enemies',
        kind: 'skill',
        description: 'Ancient lightning storm striking every foe on the field.',
      },
      {
        id: 'bleu_freeze',
        label: 'Freeze',
        apCost: 8,
        powerMultiplier: 1.75,
        element: 'ice',
        targetType: 'single_enemy',
        kind: 'skill',
        description: 'Sub-zero crystalline lance awakened from millennia of slumber.',
      },
      {
        id: 'bleu_bolster',
        label: 'Bolster',
        apCost: 10,
        powerMultiplier: 1.45,
        element: 'holy',
        targetType: 'all_allies',
        kind: 'heal',
        description: 'Ancient sorcerous blessing that mends and fortifies all allies.',
      },
      {
        id: 'bleu_defend',
        label: 'Arcane Ward',
        apCost: 0,
        powerMultiplier: 0,
        element: 'thunder',
        targetType: 'self',
        kind: 'defend',
        description: 'Raise a shimmering serpent barrier.',
      },
    ],
  },
};

export const VERTICAL_SLICE_ROSTER = CAMPAIGN_ROSTER;

export const QUEST_COMPANION_LOYALTY_REWARDS: Record<
  string,
  { companionId: CharacterId; loyaltyBonus: number }
> = {
  quest_dragon_tear: { companionId: 'ryu', loyaltyBonus: 12 },
  quest_coursair_alibi: { companionId: 'bow', loyaltyBonus: 15 },
  quest_coliseum_fang: { companionId: 'katt', loyaltyBonus: 15 },
  quest_farmtown_burden: { companionId: 'rand', loyaltyBonus: 18 },
  quest_black_wing: { companionId: 'nina', loyaltyBonus: 18 },
  quest_simafort_curse: { companionId: 'jean', loyaltyBonus: 18 },
  quest_highfort_oath: { companionId: 'sten', loyaltyBonus: 18 },
  quest_great_tree_memory: { companionId: 'spar', loyaltyBonus: 18 },
  quest_ancient_serpent: { companionId: 'bleu', loyaltyBonus: 20 },
};

export const CAMPAIGN_QUESTS: Record<string, QuestDefinition> = {
  // === ACT I–III MAIN STORY ===
  quest_coursair_innocence: {
    id: 'quest_coursair_innocence',
    title: 'Coursair Innocence',
    category: 'MAIN_STORY',
    act: 1,
    stage: 'ACTIVE',
    summary:
      "Clear Bow's name in Coursair, confront Augus's syndicate at the Coliseum approach, and expose St. Eva's tax-ledger coverup.",
    objectives: [
      {
        id: 'obj_coursair_gate',
        description:
          "Reach the Coursair Coliseum Gate and confront Augus's syndicate.",
        completed: false,
      },
      {
        id: 'obj_clear_bow',
        description:
          "Defeat the syndicate ambushers and recover evidence clearing Bow's name.",
        completed: false,
      },
      {
        id: 'obj_expose_ledger',
        description:
          "Verify St. Eva's tax-ledger coverup with Barose at the Township Archive.",
        completed: false,
      },
    ],
    unlocksFlags: [
      'coursair_innocence_cleared',
      'region_coursair_frontier_liberated',
    ],
  },
  quest_act2_continental_pact: {
    id: 'quest_act2_continental_pact',
    title: 'Continental Pact Against St. Eva',
    category: 'MAIN_STORY',
    act: 2,
    stage: 'DISCOVERED',
    summary:
      "Unite Windia, Highfort, SimaFort, Tunlan, and Capitan into a continental pact against St. Eva's expansion.",
    objectives: [
      {
        id: 'obj_pact_windia_highfort',
        description:
          'Secure the sky-highland alliance across Windia and Highfort.',
        completed: false,
      },
      {
        id: 'obj_pact_simafort_tunlan',
        description:
          "Rally SimaFort and Tunlan against St. Eva's spiritual blockade.",
        completed: false,
      },
      {
        id: 'obj_pact_capitan',
        description:
          "Free Capitan's port and uncover St. Eva's subterranean wellspring.",
        completed: false,
      },
    ],
    unlocksFlags: ['continental_pact_forged', 'act2_complete'],
  },
  quest_act3_infinity_descent: {
    id: 'quest_act3_infinity_descent',
    title: 'Descent Into Infinity',
    category: 'MAIN_STORY',
    act: 3,
    stage: 'DISCOVERED',
    summary:
      'Unseal the ancient Gate Fissure using Dragon & Shaman resonance and descend into the abyss of Infinity.',
    objectives: [
      {
        id: 'obj_unseal_gate_fissure',
        description:
          'Break the St. Eva Cathedral lock sealing the Gate Fissure.',
        completed: false,
      },
      {
        id: 'obj_breach_infinity_threshold',
        description:
          "Cross into Infinity's void sanctum and defeat Barubary's vanguard.",
        completed: false,
      },
    ],
    unlocksFlags: ['infinity_unlocked', 'gate_fissure_unsealed'],
  },
  quest_deathevan_reckoning: {
    id: 'quest_deathevan_reckoning',
    title: "Deathevan's Reckoning",
    category: 'MAIN_STORY',
    act: 3,
    stage: 'DISCOVERED',
    summary:
      'Confront Deathevan at the core of Infinity. Fate branches between sealing the Gate (Normal) or purifying the curse via united allies & Shamans (True Ending).',
    objectives: [
      {
        id: 'obj_confront_deathevan_heart',
        description:
          "Reach Deathevan's Aspect within the Infinity Void Core.",
        completed: false,
      },
      {
        id: 'obj_resolve_gate_destiny',
        description:
          'Defeat Deathevan and seal or purify the Gate of Infinity.',
        completed: false,
      },
    ],
    unlocksFlags: ['deathevan_defeated', 'campaign_completed'],
  },

  // === 9 DEDICATED COMPANION SIDE QUESTS ===
  quest_dragon_tear: {
    id: 'quest_dragon_tear',
    title: 'Echoes of Gate & The Dragon Tear',
    category: 'COMPANION_ARC',
    act: 1,
    companionId: 'ryu',
    stage: 'ACTIVE',
    summary:
      'Investigate the Dragon Shrine monoliths in the Township Frontier and attune with Shaman Sana.',
    objectives: [
      {
        id: 'obj_dragon_shrine',
        description:
          'Channel Dragon Sight at the Ancient Gate Dragon Shrine north of Township.',
        completed: false,
      },
      {
        id: 'obj_attune_sana',
        description:
          'Recruit Shaman Sana and attune Dragon resonance at the Township Shrine.',
        completed: false,
      },
    ],
    rewardRelicId: 'relic_dragon_tear',
    rewardSignatureId: 'sig_dragnier_mail',
    unlocksFlags: ['dragon_tear_awakened', 'sana_attuned'],
  },
  quest_coursair_alibi: {
    id: 'quest_coursair_alibi',
    title: "The Exiled Ranger's Alibi",
    category: 'COMPANION_ARC',
    act: 1,
    companionId: 'bow',
    stage: 'ACTIVE',
    summary:
      "Track down Trout's forged bounty trail and restore Bow's standing with the Coursair Rangers.",
    objectives: [
      {
        id: 'obj_bow_alibi_trail',
        description:
          'Scout the Wind-Scent Hunting Trail and recover Trout’s forged courier tally.',
        completed: false,
      },
      {
        id: 'obj_bow_clear_name',
        description:
          'Present Bow’s alibi ledger at Coursair Gate to shatter the St. Eva warrant.',
        completed: false,
      },
    ],
    rewardRelicId: 'relic_eva_seal',
    rewardSignatureId: 'sig_rangers_alibi',
    unlocksFlags: ['bow_alibi_cleared', 'rangers_alibi_awarded'],
  },
  quest_coliseum_fang: {
    id: 'quest_coliseum_fang',
    title: "The Coliseum Fang & Augus's Sabotage",
    category: 'COMPANION_ARC',
    act: 1,
    companionId: 'katt',
    stage: 'ACTIVE',
    summary:
      "Track the Coliseum ambush squad on the eastern hunting trail and reclaim Katt's Coliseum Fang.",
    objectives: [
      {
        id: 'obj_track_sabotage',
        description:
          'Inspect the eastern Hunting Trail where Augus hid rigged Coliseum weapons.',
        completed: false,
      },
      {
        id: 'obj_reclaim_fang',
        description:
          "Defeat Augus's Enforcer ambush to reclaim Katt's Coliseum Fang.",
        completed: false,
      },
    ],
    rewardRelicId: 'relic_coliseum_crest',
    rewardSignatureId: 'sig_coliseum_fang',
    unlocksFlags: ['coliseum_fang_reclaimed'],
  },
  quest_farmtown_burden: {
    id: 'quest_farmtown_burden',
    title: "Farmtown's Burden",
    category: 'COMPANION_ARC',
    act: 2,
    companionId: 'rand',
    stage: 'DISCOVERED',
    summary:
      'Break the frontier rockslide blocking Farmtown supply lines and defend Rand’s homestead from St. Eva tax collectors.',
    objectives: [
      {
        id: 'obj_rand_boulder_pass',
        description:
          "Shatter Rand's Cracked Boulder shortcut with Armadillo Roll.",
        completed: false,
      },
      {
        id: 'obj_rand_mothers_oath',
        description:
          'Stand beside Rand to forge the Township Keystone and Farmtown Bastion Shell.',
        completed: false,
      },
    ],
    rewardRelicId: 'relic_township_keystone',
    rewardSignatureId: 'sig_farmtown_shell',
    unlocksFlags: ['farmtown_burden_resolved', 'rand_oath_fulfilled'],
  },
  quest_black_wing: {
    id: 'quest_black_wing',
    title: 'Trial of the Black Wing',
    category: 'COMPANION_ARC',
    act: 2,
    companionId: 'nina',
    stage: 'DISCOVERED',
    summary:
      'Ascend Windia’s gale ridges with Nina to claim the taboo Black Wing Pinion and Wyndia Royal Feather.',
    objectives: [
      {
        id: 'obj_nina_windia_updraft',
        description:
          'Ride the Windia Sky Updraft using Nina’s Wind Glide.',
        completed: false,
      },
      {
        id: 'obj_nina_black_wing_trial',
        description:
          'Claim the Black Wing Pinion at Windia Citadel without yielding to St. Eva envoys.',
        completed: false,
      },
    ],
    rewardRelicId: 'relic_wyndia_feather',
    rewardSignatureId: 'sig_black_wing_pinion',
    unlocksFlags: ['black_wing_accepted', 'windia_sky_covenant'],
  },
  quest_simafort_curse: {
    id: 'quest_simafort_curse',
    title: 'Shadows Over SimaFort',
    category: 'COMPANION_ARC',
    act: 2,
    companionId: 'jean',
    stage: 'DISCOVERED',
    summary:
      'Purge the mire toxin gripping SimaFort’s royal halls and reclaim Jean’s Frogsbane Rapier.',
    objectives: [
      {
        id: 'obj_jean_mire_crossing',
        description:
          'Vault across the SimaFort Mire Causeway using Jean’s Frog Leap.',
        completed: false,
      },
      {
        id: 'obj_jean_break_curse',
        description:
          'Defeat the SimaFort Mire Leech brood to lift the noble curse.',
        completed: false,
      },
    ],
    rewardRelicId: 'relic_simafort_signet',
    rewardSignatureId: 'sig_frogsbane_rapier',
    unlocksFlags: ['simafort_curse_lifted', 'simafort_allied'],
  },
  quest_highfort_oath: {
    id: 'quest_highfort_oath',
    title: "Highfort's Unbroken Oath",
    category: 'COMPANION_ARC',
    act: 2,
    companionId: 'sten',
    stage: 'DISCOVERED',
    summary:
      'Traverse Highfort’s clockwork bridges with Sten and disable the corrupted automata guarding Shaman Solo.',
    objectives: [
      {
        id: 'obj_sten_highfort_gears',
        description:
          'Swing across Highfort’s Gear Citadel chasm posts using Grapple Reach.',
        completed: false,
      },
      {
        id: 'obj_sten_honor_duel',
        description:
          'Defeat a Highfort Clockwork Automaton and reclaim Sten’s Highlander Hookblade.',
        completed: false,
      },
    ],
    rewardRelicId: 'relic_highfort_compass',
    rewardSignatureId: 'sig_highlander_hookblade',
    unlocksFlags: ['highfort_oath_kept', 'highfort_allied'],
  },
  quest_great_tree_memory: {
    id: 'quest_great_tree_memory',
    title: 'Memory of the Great Wise Tree',
    category: 'COMPANION_ARC',
    act: 2,
    companionId: 'spar',
    stage: 'DISCOVERED',
    summary:
      'Awaken the ancient memories sleeping beneath Tunlan and the Whispering Thicket with Spar.',
    objectives: [
      {
        id: 'obj_spar_thicket_song',
        description:
          'Commune with Spar’s Whispering Thicket or Tunlan’s Tidal Terrace.',
        completed: false,
      },
      {
        id: 'obj_spar_wise_tree',
        description:
          'Restore the Great Tree Seed and awaken Shaman Seny’s dawn resonance.',
        completed: false,
      },
    ],
    rewardRelicId: 'relic_great_tree_seed',
    rewardSignatureId: 'sig_whispering_bark',
    unlocksFlags: ['great_tree_awakened', 'tunlan_memory_restored'],
  },
  quest_ancient_serpent: {
    id: 'quest_ancient_serpent',
    title: 'Awakening of the Ancient Serpent',
    category: 'COMPANION_ARC',
    act: 3,
    companionId: 'bleu',
    stage: 'DISCOVERED',
    summary:
      'Unseal Bleu’s dormant sorcerous vault beside Gate Fissure and reclaim the Serpent Astrolabe & Starfall Staff.',
    objectives: [
      {
        id: 'obj_bleu_awaken_seal',
        description:
          "Use Bleu's Arcane Warp at Gate Fissure to shatter the millenary sleep seal.",
        completed: false,
      },
      {
        id: 'obj_bleu_starfall_trial',
        description:
          'Confront the Barubary Warden guarding the approach to Infinity.',
        completed: false,
      },
    ],
    rewardRelicId: 'relic_serpent_astrolabe',
    rewardSignatureId: 'sig_starfall_staff',
    unlocksFlags: ['ancient_serpent_awakened', 'bleu_joined_vanguard'],
  },

  // === ST. EVA INVESTIGATION BRANCHES ===
  quest_steva_ledger: {
    id: 'quest_steva_ledger',
    title: 'Whispers Behind the Altar',
    category: 'ST_EVA_RUMOR',
    act: 1,
    stage: 'DISCOVERED',
    summary:
      'Gather & verify St. Eva evidence clues hidden in Coursair & Township Frontier.',
    objectives: [
      {
        id: 'obj_clue_tithe',
        description: 'Discover & verify the Tainted Tithe Manifest.',
        completed: false,
      },
      {
        id: 'obj_clue_cipher',
        description: 'Discover & verify the Courtyard Ledger Cipher.',
        completed: false,
      },
      {
        id: 'obj_clue_seal',
        description: 'Discover & verify the Broken Gate Shrine Seal.',
        completed: false,
      },
    ],
    unlocksFlags: ['steva_ledger_exposed'],
  },
  quest_steva_cathedral: {
    id: 'quest_steva_cathedral',
    title: 'Cathedral of Flesh & Lies',
    category: 'ST_EVA_RUMOR',
    act: 2,
    stage: 'DISCOVERED',
    summary:
      'Follow St. Eva’s continental lifeforce conduits across Capitan, Tunlan, and the depths of Infinity.',
    objectives: [
      {
        id: 'obj_clue_capitan_well',
        description: 'Discover & verify the Capitan Wellspring Conduit.',
        completed: false,
      },
      {
        id: 'obj_clue_tunlan_hymn',
        description: 'Discover & verify the Tunlan Forbidden Hymn.',
        completed: false,
      },
      {
        id: 'obj_clue_infinity_organ',
        description: 'Discover & verify the Infinity Neural Organ.',
        completed: false,
      },
      {
        id: 'obj_clue_deathevan_heart',
        description: 'Discover & verify the Deathevan Heart Confession.',
        completed: false,
      },
    ],
    unlocksFlags: ['steva_cathedral_exposed', 'true_eva_truth_uncovered'],
  },
};

export const VERTICAL_SLICE_QUESTS = CAMPAIGN_QUESTS;

export const CAMPAIGN_CLUES: Record<string, StEvaClue> = {
  clue_tainted_tithe: {
    id: 'clue_tainted_tithe',
    title: 'Tainted Tithe Manifest',
    location: 'Coursair Coliseum Gate',
    summary:
      'Duplicate tithe receipts stamped by Augus showing St. Eva clergy skimming Coursair relief grain.',
    discovered: false,
    verified: false,
  },
  clue_courtyard_cipher: {
    id: 'clue_courtyard_cipher',
    title: 'Courtyard Ledger Cipher',
    location: 'Eastern Hunting Trail',
    summary:
      'Encoded courier tally linking Trout’s frame-up of Bow to St. Eva inquisitorial enforcers.',
    discovered: false,
    verified: false,
  },
  clue_shrine_seal: {
    id: 'clue_shrine_seal',
    title: 'Broken Gate Shrine Seal',
    location: 'Ancient Gate Dragon Shrine',
    summary:
      'Chiseled St. Eva ward placed over ancient Gate Dragon murals to suppress local memory.',
    discovered: false,
    verified: false,
  },
  clue_capitan_well: {
    id: 'clue_capitan_well',
    title: 'Capitan Wellspring Conduit',
    location: 'Capitan Harbor & Well',
    summary:
      'Subterranean cathedral conduits beneath Capitan channeling prayer-drained lifeforce toward Gate.',
    discovered: false,
    verified: false,
  },
  clue_tunlan_hymn: {
    id: 'clue_tunlan_hymn',
    title: 'Tunlan Forbidden Hymn',
    location: 'Tunlan Tidal Terrace',
    summary:
      'Forgotten Tunlan lullaby revealing how Bishop Evan sealed a pact with the subterranean demon.',
    discovered: false,
    verified: false,
  },
  clue_infinity_organ: {
    id: 'clue_infinity_organ',
    title: 'Infinity Neural Organ',
    location: 'Infinity Void Core',
    summary:
      'Biomechanical neural spires linking St. Eva cathedrals directly into Deathevan’s gestation chamber.',
    discovered: false,
    verified: false,
  },
  clue_deathevan_heart: {
    id: 'clue_deathevan_heart',
    title: 'Deathevan Heart Confession',
    location: 'Gate Fissure / Infinity Sanctum',
    summary:
      'Inscribed confession tablet proving St. Eva’s Grand Church is Deathevan’s living sensory organ.',
    discovered: false,
    verified: false,
  },
};

export const VERTICAL_SLICE_CLUES = CAMPAIGN_CLUES;

export interface BiomeLandmarkDef {
  id: string;
  name: string;
  biomeId?: ContinentalBiomeId;
  terrainTag: TerrainTag;
  coords2D: Vec2Tuple;
  position: Vec3Tuple;
  radius: number;
  specialistHint: CharacterId;
  description: string;
  clueId?: string;
  shamanUnlockId?: ShamanId;
  regionIdToLiberate?: string;
}

export const BIOME_LANDMARKS: BiomeLandmarkDef[] = [
  {
    id: 'landmark_township_plot',
    name: 'Starter Camp & Township Plot',
    biomeId: 'frontier',
    terrainTag: 'TOWNSHIP_PLOT',
    coords2D: [0, 0],
    position: [0, 0, 0],
    radius: 11,
    specialistHint: 'ryu',
    description:
      'Central frontier clearing where your Township rises around the starter campfire.',
  },
  {
    id: 'landmark_fishing_spot',
    name: 'Coursair Riverbend Dock',
    biomeId: 'frontier',
    terrainTag: 'FISHING_SPOT',
    coords2D: [-38, 24],
    position: [-38, 0, 24],
    radius: 9,
    specialistHint: 'ryu',
    description:
      'Calm riverbend dock frequented by Manillo traders and prized carp.',
  },
  {
    id: 'landmark_dragon_shrine',
    name: 'Ancient Gate Dragon Shrine',
    biomeId: 'frontier',
    terrainTag: 'DRAGON_SHRINE',
    coords2D: [0, -48],
    position: [0, 0, -48],
    radius: 10,
    specialistHint: 'ryu',
    description:
      'Mossy monoliths bearing Gate dragon carvings and Shaman Sana’s altar.',
    clueId: 'clue_shrine_seal',
    shamanUnlockId: 'sana',
  },
  {
    id: 'landmark_hunting_trail',
    name: 'Wind-Scent Hunting Trail',
    biomeId: 'frontier',
    terrainTag: 'HUNTING_TRAIL',
    coords2D: [42, -18],
    position: [42, 0, -18],
    radius: 12,
    specialistHint: 'bow',
    description:
      'Wind-swept eastern trail teeming with wild boar, fowl, and Augus scouts.',
    clueId: 'clue_courtyard_cipher',
  },
  {
    id: 'landmark_coursair_gate',
    name: 'Coursair Coliseum Gate',
    biomeId: 'frontier',
    terrainTag: 'COURSAIR_GATE',
    coords2D: [58, 36],
    position: [58, 0, 36],
    radius: 11,
    specialistHint: 'katt',
    description:
      'Southern approach to Coursair Coliseum where Augus’s syndicate holds court.',
    clueId: 'clue_tainted_tithe',
  },
  {
    id: 'landmark_shallow_water',
    name: "Jean's Water Crossing",
    biomeId: 'frontier',
    terrainTag: 'SHALLOW_WATER',
    coords2D: [-48, -10],
    position: [-48, 0, -10],
    radius: 9,
    specialistHint: 'jean',
    description:
      'Stepping-stone river rapids leading toward the western ruins.',
  },
  {
    id: 'landmark_boulder_crack',
    name: "Rand's Cracked Boulder",
    biomeId: 'frontier',
    terrainTag: 'BOULDER_CRACK',
    coords2D: [24, 48],
    position: [24, 0, 48],
    radius: 8,
    specialistHint: 'rand',
    description:
      'Fractured limestone barricade concealing a cache behind Coursair Road.',
  },
  {
    id: 'landmark_cliff_gap',
    name: "Nina's Wind-Glide Ridge",
    biomeId: 'frontier',
    terrainTag: 'CLIFF_GAP',
    coords2D: [-22, -56],
    position: [-22, 0, -56],
    radius: 9,
    specialistHint: 'nina',
    description:
      'High canyon thermals overlooking the Ancient Gate Dragon Shrine.',
  },
  {
    id: 'landmark_chasm_post',
    name: "Sten's Grapple Anchor",
    biomeId: 'frontier',
    terrainTag: 'CHASM_POST',
    coords2D: [62, -45],
    position: [62, 0, -45],
    radius: 8,
    specialistHint: 'sten',
    description:
      'Iron timber post spanning the northeastern gorge.',
  },
  {
    id: 'landmark_forest_thicket',
    name: "Spar's Whispering Thicket",
    biomeId: 'frontier',
    terrainTag: 'FOREST_THICKET',
    coords2D: [-64, 46],
    position: [-64, 0, 46],
    radius: 11,
    specialistHint: 'spar',
    description:
      'Dense emerald grove humming with Shaman Seso’s ice-forest resonance.',
    shamanUnlockId: 'seso',
  },

  // === CONTINENTAL BIOME LANDMARKS (ACT II–III) ===
  {
    id: 'landmark_gate_fissure',
    name: 'Gate Volcanic Fissure',
    biomeId: 'gate',
    terrainTag: 'GATE_FISSURE',
    coords2D: [0, -230],
    position: [0, 0, -230],
    radius: 18,
    specialistHint: 'bleu',
    description:
      'Volcanic dragon seal guarding the threshold to Infinity and Shaman Shin’s shadow altar.',
    clueId: 'clue_deathevan_heart',
    shamanUnlockId: 'shin',
    regionIdToLiberate: 'gate',
  },
  {
    id: 'landmark_windia_updraft',
    name: 'Windia Sky Updraft',
    biomeId: 'windia',
    terrainTag: 'WIND_UPDRAFT',
    coords2D: [-235, -210],
    position: [-235, 0, -210],
    radius: 18,
    specialistHint: 'nina',
    description:
      'Winged plateau spire where Nina confronts the Black Wing legacy and Shaman Spoo’s gale.',
    shamanUnlockId: 'spoo',
    regionIdToLiberate: 'windia',
  },
  {
    id: 'landmark_highfort_gear',
    name: 'Highfort Clockwork Citadel',
    biomeId: 'highfort',
    terrainTag: 'HIGHFORT_GEAR',
    coords2D: [240, -220],
    position: [240, 0, -220],
    radius: 18,
    specialistHint: 'sten',
    description:
      'Cliffside Highlander fortress housing rogue automata and Earth Shaman Solo’s sanctuary.',
    shamanUnlockId: 'solo',
    regionIdToLiberate: 'highfort',
  },
  {
    id: 'landmark_simafort_mire',
    name: 'SimaFort Mire Causeway',
    biomeId: 'simafort',
    terrainTag: 'SIMAFORT_MIRE',
    coords2D: [-245, 18],
    position: [-245, 0, 18],
    radius: 18,
    specialistHint: 'jean',
    description:
      'Misty river bastion under siege by mire leeches and St. Eva’s corruption.',
    regionIdToLiberate: 'simafort',
  },
  {
    id: 'landmark_tunlan_tide',
    name: 'Tunlan Tidal Terrace',
    biomeId: 'tunlan',
    terrainTag: 'TUNLAN_TIDE',
    coords2D: [245, 18],
    position: [245, 0, 18],
    radius: 18,
    specialistHint: 'spar',
    description:
      'Resonant coastal city preserving forbidden St. Eva hymns and Holy Shaman Seny’s shrine.',
    clueId: 'clue_tunlan_hymn',
    shamanUnlockId: 'seny',
    regionIdToLiberate: 'tunlan',
  },
  {
    id: 'landmark_capitan_shore',
    name: 'Capitan Harbor & Wellspring',
    biomeId: 'capitan',
    terrainTag: 'CAPITAN_SHORE',
    coords2D: [-235, 235],
    position: [-235, 0, 235],
    radius: 18,
    specialistHint: 'bow',
    description:
      'Sun-baked port hiding St. Eva’s subterranean lifeforce well beneath the town square.',
    clueId: 'clue_capitan_well',
    regionIdToLiberate: 'capitan',
  },
  {
    id: 'landmark_infinity_void',
    name: 'Infinity Void Core',
    biomeId: 'infinity',
    terrainTag: 'INFINITY_VOID',
    coords2D: [0, -430],
    position: [0, 0, -430],
    radius: 22,
    specialistHint: 'bleu',
    description:
      'Crystalline abyssal sanctum pulsing at the heart of Deathevan’s domain.',
    clueId: 'clue_infinity_organ',
    regionIdToLiberate: 'infinity',
  },
];

export function resolveTerrainAtPosition(x: number, z: number): TerrainTag {
  let closestLandmark: BiomeLandmarkDef | null = null;
  let closestDist = Infinity;

  for (const landmark of BIOME_LANDMARKS) {
    const dx = x - landmark.coords2D[0];
    const dz = z - landmark.coords2D[1];
    const dist = Math.hypot(dx, dz);
    if (dist <= landmark.radius && dist < closestDist) {
      closestDist = dist;
      closestLandmark = landmark;
    }
  }

  if (closestLandmark) {
    return closestLandmark.terrainTag;
  }

  // Main dirt road corridor connecting Township [0,0] toward Coursair Gate [58,36] and Shrine [0,-48]
  if (Math.abs(x) < 4.5 && z >= -50 && z <= 12) {
    return 'PATH';
  }
  const roadT = Math.max(0, Math.min(1, (x * 58 + z * 36) / (58 * 58 + 36 * 36)));
  const projX = roadT * 58;
  const projZ = roadT * 36;
  if (Math.hypot(x - projX, z - projZ) < 4.5) {
    return 'PATH';
  }

  return 'GRASS';
}

export interface EnemyPatrolTemplate {
  templateId: string;
  name: string;
  level: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  element: EnemyCombatant['element'];
  weakness: EnemyCombatant['weakness'];
  spriteId: string;
  initialAIState: EnemyAIState;
  moveSpeed: number;
  sightRadius: number;
  ambushRadius: number;
  xpReward: number;
  zennyReward: number;
  patrolWaypoints: Vec3Tuple[];
}

export const ENEMY_TEMPLATES: Record<string, EnemyPatrolTemplate> = {
  harpy_scout: {
    templateId: 'harpy_scout',
    name: 'Harpy Scout',
    level: 5,
    maxHp: 72,
    atk: 18,
    def: 11,
    spd: 20,
    element: 'wind',
    weakness: 'fire',
    spriteId: 'sprite_harpy_scout',
    initialAIState: 'Patrol',
    moveSpeed: 4.2,
    sightRadius: 16,
    ambushRadius: 9,
    xpReward: 48,
    zennyReward: 65,
    patrolWaypoints: [
      [-16, 0, -24],
      [-4, 0, -32],
      [-24, 0, -34],
    ],
  },
  k_goblin_raider: {
    templateId: 'k_goblin_raider',
    name: 'K. Goblin Raider',
    level: 6,
    maxHp: 88,
    atk: 21,
    def: 14,
    spd: 16,
    element: 'earth',
    weakness: 'wind',
    spriteId: 'sprite_kgoblin_raider',
    initialAIState: 'Aggro_Sight',
    moveSpeed: 4.8,
    sightRadius: 16,
    ambushRadius: 9,
    xpReward: 64,
    zennyReward: 95,
    patrolWaypoints: [
      [28, 0, 14],
      [40, 0, 22],
      [34, 0, 32],
    ],
  },
  augus_enforcer: {
    templateId: 'augus_enforcer',
    name: "Augus's Enforcer",
    level: 7,
    maxHp: 124,
    atk: 25,
    def: 17,
    spd: 18,
    element: 'shadow',
    weakness: 'holy',
    spriteId: 'sprite_augus_enforcer',
    initialAIState: 'Ambush',
    moveSpeed: 5.2,
    sightRadius: 16,
    ambushRadius: 9,
    xpReward: 110,
    zennyReward: 180,
    patrolWaypoints: [
      [48, 0, -6],
      [54, 0, 24],
    ],
  },
  highfort_automaton: {
    templateId: 'highfort_automaton',
    name: 'Highfort Automaton',
    level: 11,
    maxHp: 175,
    atk: 30,
    def: 24,
    spd: 16,
    element: 'thunder',
    weakness: 'earth',
    spriteId: 'sprite_highfort_automaton',
    initialAIState: 'Patrol',
    moveSpeed: 4.5,
    sightRadius: 17,
    ambushRadius: 9,
    xpReward: 165,
    zennyReward: 240,
    patrolWaypoints: [
      [226, 0, -214],
      [252, 0, -230],
    ],
  },
  simafort_leech: {
    templateId: 'simafort_leech',
    name: 'SimaFort Mire Leech',
    level: 10,
    maxHp: 158,
    atk: 27,
    def: 18,
    spd: 19,
    element: 'ice',
    weakness: 'fire',
    spriteId: 'sprite_simafort_leech',
    initialAIState: 'Ambush',
    moveSpeed: 5.0,
    sightRadius: 16,
    ambushRadius: 9,
    xpReward: 145,
    zennyReward: 210,
    patrolWaypoints: [
      [-232, 0, 10],
      [-255, 0, 26],
    ],
  },
  barubary_warden: {
    templateId: 'barubary_warden',
    name: 'Barubary Warden',
    level: 15,
    maxHp: 280,
    atk: 38,
    def: 26,
    spd: 22,
    element: 'shadow',
    weakness: 'holy',
    spriteId: 'sprite_barubary_warden',
    initialAIState: 'Aggro_Sight',
    moveSpeed: 5.4,
    sightRadius: 18,
    ambushRadius: 10,
    xpReward: 340,
    zennyReward: 480,
    patrolWaypoints: [
      [-8, 0, -242],
      [10, 0, -242],
    ],
  },
  deathevan_aspect: {
    templateId: 'deathevan_aspect',
    name: 'Deathevan Aspect',
    level: 18,
    maxHp: 420,
    atk: 44,
    def: 28,
    spd: 24,
    element: 'shadow',
    weakness: 'holy',
    spriteId: 'sprite_deathevan_aspect',
    initialAIState: 'Aggro_Sight',
    moveSpeed: 5.6,
    sightRadius: 20,
    ambushRadius: 11,
    xpReward: 900,
    zennyReward: 1200,
    patrolWaypoints: [
      [0, 0, -442],
      [10, 0, -434],
    ],
  },
};

export interface OverworldEnemySpawn {
  instanceId: string;
  templateId: keyof typeof ENEMY_TEMPLATES;
  homePos: Vec3Tuple;
  waypoints: Vec3Tuple[];
  linkedQuestId?: string;
}

export const OVERWORLD_ENEMY_SPAWNS: OverworldEnemySpawn[] = [
  {
    instanceId: 'enemy_harpy_north_1',
    templateId: 'harpy_scout',
    homePos: [-16, 0, -24],
    waypoints: [
      [-16, 0, -24],
      [-4, 0, -32],
      [-24, 0, -34],
    ],
  },
  {
    instanceId: 'enemy_goblin_east_1',
    templateId: 'k_goblin_raider',
    homePos: [28, 0, 14],
    waypoints: [
      [28, 0, 14],
      [40, 0, 22],
      [34, 0, 32],
    ],
  },
  {
    instanceId: 'enemy_augus_trail_ambush',
    templateId: 'augus_enforcer',
    homePos: [46, 0, -10],
    waypoints: [
      [46, 0, -10],
      [44, 0, -20],
    ],
    linkedQuestId: 'quest_coliseum_fang',
  },
  {
    instanceId: 'enemy_augus_coliseum_guard',
    templateId: 'augus_enforcer',
    homePos: [54, 0, 30],
    waypoints: [
      [54, 0, 30],
      [58, 0, 34],
    ],
    linkedQuestId: 'quest_coursair_innocence',
  },
  {
    instanceId: 'enemy_highfort_automaton_1',
    templateId: 'highfort_automaton',
    homePos: [228, 0, -214],
    waypoints: [
      [228, 0, -214],
      [252, 0, -228],
    ],
    linkedQuestId: 'quest_highfort_oath',
  },
  {
    instanceId: 'enemy_simafort_leech_1',
    templateId: 'simafort_leech',
    homePos: [-234, 0, 12],
    waypoints: [
      [-234, 0, 12],
      [-254, 0, 26],
    ],
    linkedQuestId: 'quest_simafort_curse',
  },
  {
    instanceId: 'enemy_barubary_gate_1',
    templateId: 'barubary_warden',
    homePos: [0, 0, -246],
    waypoints: [
      [-10, 0, -246],
      [10, 0, -246],
    ],
    linkedQuestId: 'quest_act3_infinity_descent',
  },
  {
    instanceId: 'enemy_deathevan_core_1',
    templateId: 'deathevan_aspect',
    homePos: [0, 0, -445],
    waypoints: [
      [0, 0, -445],
      [8, 0, -438],
    ],
    linkedQuestId: 'quest_deathevan_reckoning',
  },
];

export type TownshipServiceKey =
  | 'relicReforge'
  | 'shamanAltar'
  | 'evaArchive'
  | 'campfireKitchen';

export interface TownshipCitizenDef {
  id: 'hanz' | 'sana' | 'barose' | 'kay' | 'azuki' | 'leminton';
  name: string;
  roleTitle: string;
  buildingId: string;
  buildingName: string;
  serviceKey: TownshipServiceKey;
  plotOffset: Vec3Tuple;
  zennyCost: number;
  requiredFlag?: string;
  passiveBuffLabel: string;
  atkBonusPercent: number;
  syncMaxBonus: number;
  dragonApDiscountPercent: number;
  lore: string;
}

export const TOWNSHIP_CITIZENS: Record<
  TownshipCitizenDef['id'],
  TownshipCitizenDef
> = {
  kay: {
    id: 'kay',
    name: 'Kay',
    roleTitle: 'Campfire Quartermaster',
    buildingId: 'bldg_campfire_hall',
    buildingName: 'Campfire & Provision Hall',
    serviceKey: 'campfireKitchen',
    plotOffset: [-5, 0, 4],
    zennyCost: 0,
    passiveBuffLabel: '+15 Max Sync Pool & Campfire Buff Recipes',
    atkBonusPercent: 0,
    syncMaxBonus: 15,
    dragonApDiscountPercent: 0,
    lore: 'Turns wild game and Manillo catches into morale-boosting frontier meals.',
  },
  hanz: {
    id: 'hanz',
    name: 'Hanz',
    roleTitle: 'Master Reforge Smith',
    buildingId: 'bldg_armory_forge',
    buildingName: 'Armory / Relic Reforge Forge',
    serviceKey: 'relicReforge',
    plotOffset: [6, 0, 3],
    zennyCost: 120,
    passiveBuffLabel: '+8% Party ATK & Relic Reforge Calibration',
    atkBonusPercent: 8,
    syncMaxBonus: 0,
    dragonApDiscountPercent: 0,
    lore: 'Tempers Signature Gear and scales Progression Relics from frontier ore.',
  },
  sana: {
    id: 'sana',
    name: 'Sana',
    roleTitle: 'Flame-Wind Shaman',
    buildingId: 'bldg_shaman_shrine',
    buildingName: 'Shaman Fusion Shrine',
    serviceKey: 'shamanAltar',
    plotOffset: [0, 0, -6],
    zennyCost: 100,
    passiveBuffLabel: '+10 Max Sync & -15% Dragon AP Upkeep',
    atkBonusPercent: 0,
    syncMaxBonus: 10,
    dragonApDiscountPercent: 15,
    lore: 'Presides over live Shaman Fusion swaps and resonance attunement.',
  },
  barose: {
    id: 'barose',
    name: 'Barose',
    roleTitle: 'Archivist of Gate',
    buildingId: 'bldg_steva_archive',
    buildingName: 'St. Eva Archive',
    serviceKey: 'evaArchive',
    plotOffset: [-6, 0, -5],
    zennyCost: 80,
    passiveBuffLabel: '+4% Party ATK & St. Eva Clue Verification',
    atkBonusPercent: 4,
    syncMaxBonus: 5,
    dragonApDiscountPercent: 0,
    lore: 'Cross-references encrypted St. Eva tithe ledgers and Gate inscriptions.',
  },
  azuki: {
    id: 'azuki',
    name: 'Azuki',
    roleTitle: 'Artisan & Manillo Broker',
    buildingId: 'bldg_manillo_exchange',
    buildingName: 'Manillo Trade Guild',
    serviceKey: 'relicReforge',
    plotOffset: [8, 0, -5],
    zennyCost: 140,
    passiveBuffLabel: '+5% Party ATK & +10 Max Sync Pool',
    atkBonusPercent: 5,
    syncMaxBonus: 10,
    dragonApDiscountPercent: 0,
    lore: 'Connects Township with Manillo rare-fish brokers and continental master smiths.',
  },
  leminton: {
    id: 'leminton',
    name: 'Leminton',
    roleTitle: 'Sky-Ship Quartermaster',
    buildingId: 'bldg_sky_harbor',
    buildingName: 'Township Sky Harbor',
    serviceKey: 'shamanAltar',
    plotOffset: [-8, 0, 7],
    zennyCost: 180,
    passiveBuffLabel: '+6% Party ATK, +15 Sync & -10% Dragon AP',
    atkBonusPercent: 6,
    syncMaxBonus: 15,
    dragonApDiscountPercent: 10,
    lore: 'Maintains Township’s wind-vane beacons and fast-travel sky moorings across the continent.',
  },
};

export interface FishCatchEntry {
  id: 'red_snapper' | 'silver_carp' | 'manillo_koi';
  name: string;
  rarityWeight: number;
  minLuck: number;
  manilloTokens: number;
  zennyValue: number;
  description: string;
}

export const FISH_CATCH_TABLE: FishCatchEntry[] = [
  {
    id: 'red_snapper',
    name: 'Red Snapper',
    rarityWeight: 55,
    minLuck: 0,
    manilloTokens: 1,
    zennyValue: 35,
    description: 'Firm river-mouth snapper prized for campfire skewers.',
  },
  {
    id: 'silver_carp',
    name: 'Silver Carp',
    rarityWeight: 32,
    minLuck: 10,
    manilloTokens: 2,
    zennyValue: 75,
    description: 'Gleaming frontier carp traded eagerly by Manillo merchants.',
  },
  {
    id: 'manillo_koi',
    name: 'Manillo Koi',
    rarityWeight: 13,
    minLuck: 14,
    manilloTokens: 5,
    zennyValue: 180,
    description: 'Golden-scaled koi blessed with Gate-stream resonance.',
  },
];

export interface HuntDropEntry {
  id: 'wild_boar_cut' | 'forest_fowl';
  name: string;
  baseYield: number;
  zennyValue: number;
  description: string;
}

export const HUNT_DROP_TABLE: HuntDropEntry[] = [
  {
    id: 'wild_boar_cut',
    name: 'Wild Boar Cut',
    baseYield: 1,
    zennyValue: 45,
    description: 'Rich frontier flank harvested cleanly from downwind.',
  },
  {
    id: 'forest_fowl',
    name: 'Forest Fowl',
    baseYield: 1,
    zennyValue: 40,
    description: 'Tender pheasant cut ideal for Ranger Stew.',
  },
];

export interface CampfireRecipeDef {
  id: 'dragon_skewers' | 'ranger_stew' | 'shaman_broth';
  name: string;
  ingredients: Record<string, number>;
  hpRestore: number;
  apRestore: number;
  syncRestore: number;
  tempAtkBonus: number;
  tempDefBonus: number;
  durationBattles: number;
  description: string;
}

export const CAMPFIRE_RECIPES: Record<
  CampfireRecipeDef['id'],
  CampfireRecipeDef
> = {
  dragon_skewers: {
    id: 'dragon_skewers',
    name: 'Dragon Skewers',
    ingredients: {
      red_snapper: 1,
      wild_boar_cut: 1,
    },
    hpRestore: 65,
    apRestore: 14,
    syncRestore: 25,
    tempAtkBonus: 6,
    tempDefBonus: 2,
    durationBattles: 2,
    description:
      'Char-grilled boar and river snapper that surges party ATK and Sync.',
  },
  ranger_stew: {
    id: 'ranger_stew',
    name: 'Ranger Stew',
    ingredients: {
      forest_fowl: 1,
      silver_carp: 1,
    },
    hpRestore: 85,
    apRestore: 18,
    syncRestore: 15,
    tempAtkBonus: 3,
    tempDefBonus: 5,
    durationBattles: 2,
    description:
      'Hearty Coursair trail stew bolstering party defense and stamina.',
  },
  shaman_broth: {
    id: 'shaman_broth',
    name: 'Shaman Broth',
    ingredients: {
      manillo_koi: 1,
    },
    hpRestore: 110,
    apRestore: 32,
    syncRestore: 45,
    tempAtkBonus: 5,
    tempDefBonus: 5,
    durationBattles: 3,
    description:
      'Luminous Manillo Koi elixir restoring deep AP and Shaman Sync.',
  },
};

export function createEnemyCombatantFromTemplate(
  templateId: keyof typeof ENEMY_TEMPLATES,
  instanceId: string
): EnemyCombatant {
  const tpl = ENEMY_TEMPLATES[templateId];
  return {
    instanceId,
    templateId: tpl.templateId,
    name: tpl.name,
    level: tpl.level,
    hp: tpl.maxHp,
    maxHp: tpl.maxHp,
    atk: tpl.atk,
    def: tpl.def,
    spd: tpl.spd,
    element: tpl.element,
    weakness: tpl.weakness,
    spriteId: tpl.spriteId,
    aiState: tpl.initialAIState,
    xpReward: tpl.xpReward,
    zennyReward: tpl.zennyReward,
  };
}
