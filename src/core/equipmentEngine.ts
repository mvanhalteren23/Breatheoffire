import type {
  CharacterId,
  ComputedEquipmentSummary,
  ComputedRelicEvaluation,
  ElementType,
  EquipmentItemDef,
  ProgressionRelicDef,
  RelicScalingRule,
  ScalingContext,
  SignatureGearDef,
  SignatureHookDef,
  StatBlock,
} from './types.ts';

export const DRAGON_AP_REDUCTION_CAP = 0.45;
export const MIN_DRAGON_AP_COST_MULTIPLIER = 0.25;

const STAT_LABELS: Record<keyof StatBlock, string> = {
  maxHp: 'MaxHP',
  maxAp: 'MaxAP',
  atk: 'ATK',
  def: 'DEF',
  mag: 'MAG',
  spd: 'SPD',
  luck: 'LUCK',
};

export function createEmptyStatBlock(): StatBlock {
  return {
    maxHp: 0,
    maxAp: 0,
    atk: 0,
    def: 0,
    mag: 0,
    spd: 0,
    luck: 0,
  };
}

export function addStatBlocks(a: StatBlock, b: Partial<StatBlock>): StatBlock {
  return {
    maxHp: a.maxHp + (b.maxHp ?? 0),
    maxAp: a.maxAp + (b.maxAp ?? 0),
    atk: a.atk + (b.atk ?? 0),
    def: a.def + (b.def ?? 0),
    mag: a.mag + (b.mag ?? 0),
    spd: a.spd + (b.spd ?? 0),
    luck: a.luck + (b.luck ?? 0),
  };
}

export const PROGRESSION_RELICS: Record<string, ProgressionRelicDef> = {
  relic_dragon_tear: {
    id: 'relic_dragon_tear',
    name: 'Dragon Tear',
    archetype: 'PROGRESSION_RELIC',
    slot: 'relic',
    lore: 'An heirloom crystal resonating with Ryu’s dragon lineage, growing stronger as regions are freed from St. Eva.',
    dragonApReductionPerRegion: 0.08,
    scalingRules: [
      {
        stat: 'atk',
        base: 4,
        perLevel: 1,
        perLiberatedRegion: 3,
        perShamanResonance: 2,
      },
      {
        stat: 'mag',
        base: 3,
        perLevel: 1,
        perLiberatedRegion: 2,
        perShamanResonance: 3,
      },
      {
        stat: 'maxAp',
        base: 6,
        perLevel: 1,
        perLiberatedRegion: 4,
        perShamanResonance: 3,
      },
    ],
  },
  relic_eva_seal: {
    id: 'relic_eva_seal',
    name: 'St. Eva Inquisitor Seal',
    archetype: 'PROGRESSION_RELIC',
    slot: 'relic',
    lore: 'A reclaimed church sigil turned against its makers, amplifying arcane ward and precision.',
    scalingRules: [
      {
        stat: 'mag',
        base: 4,
        perLevel: 1,
        perLiberatedRegion: 2,
        perShamanResonance: 3,
      },
      {
        stat: 'def',
        base: 3,
        perLevel: 1,
        perLiberatedRegion: 2,
        perShamanResonance: 1,
      },
      {
        stat: 'luck',
        base: 2,
        perLevel: 0,
        perLiberatedRegion: 2,
        perShamanResonance: 2,
      },
    ],
  },
  relic_township_keystone: {
    id: 'relic_township_keystone',
    name: 'Township Keystone',
    archetype: 'PROGRESSION_RELIC',
    slot: 'relic',
    lore: 'Forged from the bonds of Township’s citizens, fortifying vitality and battlefield initiative.',
    scalingRules: [
      {
        stat: 'maxHp',
        base: 15,
        perLevel: 3,
        perLiberatedRegion: 10,
        perShamanResonance: 5,
        perLoyaltyTier: 8,
      },
      {
        stat: 'def',
        base: 2,
        perLevel: 1,
        perLiberatedRegion: 2,
        perShamanResonance: 1,
        perLoyaltyTier: 2,
      },
      {
        stat: 'spd',
        base: 2,
        perLevel: 0,
        perLiberatedRegion: 1,
        perShamanResonance: 2,
        perLoyaltyTier: 1,
      },
    ],
  },
  relic_coliseum_crest: {
    id: 'relic_coliseum_crest',
    name: 'Coliseum Champion Crest',
    archetype: 'PROGRESSION_RELIC',
    slot: 'relic',
    lore: 'A battle-scarred Woren medallion from Coursair that sharpens Katt’s speed and ferocity.',
    scalingRules: [
      {
        stat: 'atk',
        base: 3,
        perLevel: 1,
        perLiberatedRegion: 3,
        perShamanResonance: 2,
        perLoyaltyTier: 2,
      },
      {
        stat: 'spd',
        base: 3,
        perLevel: 1,
        perLiberatedRegion: 2,
        perShamanResonance: 2,
        perLoyaltyTier: 1,
      },
      {
        stat: 'luck',
        base: 2,
        perLevel: 0,
        perLiberatedRegion: 1,
        perShamanResonance: 2,
        perLoyaltyTier: 1,
      },
    ],
  },
  relic_wyndia_feather: {
    id: 'relic_wyndia_feather',
    name: 'Wyndia Royal Feather',
    archetype: 'PROGRESSION_RELIC',
    slot: 'relic',
    lore: 'An heirloom pinion of Windia’s royal line that awakens Nina’s wind magic and grace.',
    scalingRules: [
      {
        stat: 'mag',
        base: 4,
        perLevel: 1,
        perLiberatedRegion: 3,
        perShamanResonance: 3,
        perLoyaltyTier: 2,
      },
      {
        stat: 'spd',
        base: 3,
        perLevel: 1,
        perLiberatedRegion: 2,
        perShamanResonance: 2,
        perLoyaltyTier: 1,
      },
      {
        stat: 'maxAp',
        base: 5,
        perLevel: 1,
        perLiberatedRegion: 3,
        perShamanResonance: 3,
        perLoyaltyTier: 2,
      },
    ],
  },
  relic_simafort_signet: {
    id: 'relic_simafort_signet',
    name: 'SimaFort Royal Signet',
    archetype: 'PROGRESSION_RELIC',
    slot: 'relic',
    lore: 'A gilded frog-crest seal of SimaFort nobility that empowers Jean’s chivalry and precision.',
    scalingRules: [
      {
        stat: 'atk',
        base: 3,
        perLevel: 1,
        perLiberatedRegion: 2,
        perShamanResonance: 2,
        perLoyaltyTier: 2,
      },
      {
        stat: 'maxHp',
        base: 10,
        perLevel: 2,
        perLiberatedRegion: 8,
        perShamanResonance: 4,
        perLoyaltyTier: 6,
      },
      {
        stat: 'luck',
        base: 3,
        perLevel: 0,
        perLiberatedRegion: 2,
        perShamanResonance: 2,
        perLoyaltyTier: 2,
      },
    ],
  },
  relic_highfort_compass: {
    id: 'relic_highfort_compass',
    name: 'Highfort Nomad Compass',
    archetype: 'PROGRESSION_RELIC',
    slot: 'relic',
    lore: 'A wind-etched Highlanders’ compass that guides Sten’s acrobatics and ambush instincts.',
    scalingRules: [
      {
        stat: 'spd',
        base: 4,
        perLevel: 1,
        perLiberatedRegion: 3,
        perShamanResonance: 2,
        perLoyaltyTier: 2,
      },
      {
        stat: 'atk',
        base: 3,
        perLevel: 1,
        perLiberatedRegion: 2,
        perShamanResonance: 2,
        perLoyaltyTier: 1,
      },
      {
        stat: 'luck',
        base: 2,
        perLevel: 0,
        perLiberatedRegion: 2,
        perShamanResonance: 1,
        perLoyaltyTier: 2,
      },
    ],
  },
  relic_great_tree_seed: {
    id: 'relic_great_tree_seed',
    name: 'Great Tree Seed',
    archetype: 'PROGRESSION_RELIC',
    slot: 'relic',
    lore: 'A living seed of Wise Tree that deepens Spar’s sylvan resilience and restorative sap.',
    scalingRules: [
      {
        stat: 'maxHp',
        base: 12,
        perLevel: 2,
        perLiberatedRegion: 8,
        perShamanResonance: 6,
        perLoyaltyTier: 6,
      },
      {
        stat: 'mag',
        base: 3,
        perLevel: 1,
        perLiberatedRegion: 2,
        perShamanResonance: 3,
        perLoyaltyTier: 2,
      },
      {
        stat: 'def',
        base: 3,
        perLevel: 1,
        perLiberatedRegion: 2,
        perShamanResonance: 2,
        perLoyaltyTier: 1,
      },
    ],
  },
  relic_serpent_astrolabe: {
    id: 'relic_serpent_astrolabe',
    name: 'Serpent Astrolabe',
    archetype: 'PROGRESSION_RELIC',
    slot: 'relic',
    lore: 'An ancient celestial dial unearthed from Bleu’s slumber vault, amplifying high sorcery.',
    scalingRules: [
      {
        stat: 'mag',
        base: 5,
        perLevel: 1,
        perLiberatedRegion: 3,
        perShamanResonance: 4,
        perLoyaltyTier: 2,
      },
      {
        stat: 'maxAp',
        base: 8,
        perLevel: 1,
        perLiberatedRegion: 4,
        perShamanResonance: 4,
        perLoyaltyTier: 3,
      },
      {
        stat: 'def',
        base: 2,
        perLevel: 0,
        perLiberatedRegion: 2,
        perShamanResonance: 2,
        perLoyaltyTier: 1,
      },
    ],
  },
};

export const SIGNATURE_GEAR_CATALOG: Record<string, SignatureGearDef> = {
  sig_coliseum_fang: {
    id: 'sig_coliseum_fang',
    name: 'Coliseum Fang',
    archetype: 'SIGNATURE_GEAR',
    slot: 'weapon',
    ownerId: 'katt',
    lore: 'Worn in the Coursair pits; ignites bare strikes with fire, relentless combos, and fierce counters.',
    flatStats: {
      atk: 12,
      spd: 6,
      luck: 4,
    },
    hooks: [
      {
        type: 'ELEMENTAL_CONVERSION',
        label: 'Blazing Edge',
        description: 'Converts basic attacks to Fire element.',
        element: 'fire',
      },
      {
        type: 'COMBO_CHAIN',
        label: 'Arena Flurry',
        description: '35% chance to chain an extra 0.55x follow-up strike.',
        comboChance: 0.35,
        comboDamageRatio: 0.55,
      },
      {
        type: 'COUNTER_STANCE',
        label: 'Pit Riposte',
        description: '25% chance to counter-attack at 0.75x damage when struck while guarding.',
        counterChance: 0.25,
        counterDamageRatio: 0.75,
      },
    ],
  },
  sig_rangers_alibi: {
    id: 'sig_rangers_alibi',
    name: "Ranger's Alibi Crossbow",
    archetype: 'SIGNATURE_GEAR',
    slot: 'weapon',
    ownerId: 'bow',
    lore: 'A precision repeater carved in Hometown; lets Bow double-tap targets from disciplined cover.',
    flatStats: {
      atk: 10,
      spd: 7,
      luck: 6,
    },
    hooks: [
      {
        type: 'COMBO_CHAIN',
        label: 'Twin Quarrel',
        description: '30% chance to fire an extra 0.50x bolt on hit.',
        comboChance: 0.3,
        comboDamageRatio: 0.5,
      },
      {
        type: 'COUNTER_STANCE',
        label: 'Overwatch Snap',
        description: '25% chance to counter at 0.70x damage when struck while guarding.',
        counterChance: 0.25,
        counterDamageRatio: 0.7,
      },
    ],
  },
  sig_dragnier_mail: {
    id: 'sig_dragnier_mail',
    name: 'Dragnier Scale Mail',
    archetype: 'SIGNATURE_GEAR',
    slot: 'armor',
    ownerId: 'ryu',
    lore: 'Ancient dragon-forged mail that stabilizes dragon-form AP upkeep.',
    flatStats: {
      maxHp: 35,
      maxAp: 10,
      def: 14,
    },
    hooks: [
      {
        type: 'DRAGON_AP_DRAIN_REDUCTION',
        label: 'Dragonic Reservoir',
        description: 'Reduces sustained Dragon Transformation AP upkeep to 0.75x.',
        apDrainMultiplier: 0.75,
      },
    ],
  },
  sig_farmtown_shell: {
    id: 'sig_farmtown_shell',
    name: 'Farmtown Bastion Shell',
    archetype: 'SIGNATURE_GEAR',
    slot: 'armor',
    ownerId: 'rand',
    lore: 'Reinforced stone-carapace plate forged on Rand’s homestead, punishing attackers with earth counters.',
    flatStats: {
      maxHp: 30,
      def: 15,
      atk: 6,
    },
    hooks: [
      {
        type: 'ELEMENTAL_CONVERSION',
        label: 'Tectonic Knuckle',
        description: 'Converts basic attacks to Earth element.',
        element: 'earth',
      },
      {
        type: 'COUNTER_STANCE',
        label: 'Rolling Counter',
        description: '35% chance to counter-attack at 0.85x damage when struck while guarding.',
        counterChance: 0.35,
        counterDamageRatio: 0.85,
      },
    ],
  },
  sig_black_wing_pinion: {
    id: 'sig_black_wing_pinion',
    name: 'Black Wing Pinion',
    archetype: 'SIGNATURE_GEAR',
    slot: 'accessory',
    ownerId: 'nina',
    lore: 'A taboo Windia crest accepted by Nina, infusing her strikes with gale arcs and follow-up gusts.',
    flatStats: {
      mag: 12,
      spd: 8,
      maxAp: 10,
    },
    hooks: [
      {
        type: 'ELEMENTAL_CONVERSION',
        label: 'Tempest Plume',
        description: 'Converts basic attacks to Wind element.',
        element: 'wind',
      },
      {
        type: 'COMBO_CHAIN',
        label: 'Gale Echo',
        description: '30% chance to chain an extra 0.50x wind strike.',
        comboChance: 0.3,
        comboDamageRatio: 0.5,
      },
    ],
  },
  sig_frogsbane_rapier: {
    id: 'sig_frogsbane_rapier',
    name: 'Frogsbane Rapier',
    archetype: 'SIGNATURE_GEAR',
    slot: 'weapon',
    ownerId: 'jean',
    lore: 'SimaFort’s royal dueling blade tempered in mountain ice for lightning-quick lunges.',
    flatStats: {
      atk: 11,
      spd: 7,
      luck: 6,
    },
    hooks: [
      {
        type: 'ELEMENTAL_CONVERSION',
        label: 'Glacial Thrust',
        description: 'Converts basic attacks to Ice element.',
        element: 'ice',
      },
      {
        type: 'COMBO_CHAIN',
        label: 'Chevalier Riposte',
        description: '35% chance to chain a second 0.55x thrust.',
        comboChance: 0.35,
        comboDamageRatio: 0.55,
      },
    ],
  },
  sig_highlander_hookblade: {
    id: 'sig_highlander_hookblade',
    name: 'Highlander Hookblade',
    archetype: 'SIGNATURE_GEAR',
    slot: 'weapon',
    ownerId: 'sten',
    lore: 'A twin-tethered Highfort dagger heated in forge embers for rapid aerial follow-ups.',
    flatStats: {
      atk: 10,
      spd: 9,
      luck: 5,
    },
    hooks: [
      {
        type: 'ELEMENTAL_CONVERSION',
        label: 'Ember Tether',
        description: 'Converts basic attacks to Fire element.',
        element: 'fire',
      },
      {
        type: 'COMBO_CHAIN',
        label: 'Acrobat’s Snap',
        description: '35% chance to chain an extra 0.50x hook strike.',
        comboChance: 0.35,
        comboDamageRatio: 0.5,
      },
    ],
  },
  sig_whispering_bark: {
    id: 'sig_whispering_bark',
    name: 'Whispering Bark Mantle',
    archetype: 'SIGNATURE_GEAR',
    slot: 'armor',
    ownerId: 'spar',
    lore: 'Living Wise-Tree bark that channels forest resonance to counter blows and ease Dragon AP strain.',
    flatStats: {
      maxHp: 24,
      def: 12,
      mag: 8,
    },
    hooks: [
      {
        type: 'COUNTER_STANCE',
        label: 'Bramble Guard',
        description: '30% chance to counter-attack at 0.70x damage when struck while guarding.',
        counterChance: 0.3,
        counterDamageRatio: 0.7,
      },
      {
        type: 'DRAGON_AP_DRAIN_REDUCTION',
        label: 'Sylvan Wellspring',
        description: 'Reduces sustained Dragon Transformation AP upkeep to 0.85x.',
        apDrainMultiplier: 0.85,
      },
    ],
  },
  sig_starfall_staff: {
    id: 'sig_starfall_staff',
    name: 'Starfall Serpent Staff',
    archetype: 'SIGNATURE_GEAR',
    slot: 'weapon',
    ownerId: 'bleu',
    lore: 'An ancient arcane conduit wielded by Bleu that discharges thunderous bolts and arcane cascades.',
    flatStats: {
      mag: 14,
      maxAp: 14,
      spd: 5,
    },
    hooks: [
      {
        type: 'ELEMENTAL_CONVERSION',
        label: 'Astral Thunderbolt',
        description: 'Converts basic attacks to Thunder element.',
        element: 'thunder',
      },
      {
        type: 'COMBO_CHAIN',
        label: 'Arcane Cascade',
        description: '35% chance to chain an extra 0.60x thunder strike.',
        comboChance: 0.35,
        comboDamageRatio: 0.6,
      },
    ],
  },
};

export const CHARACTER_PROGRESSION_RELIC_MAP: Record<CharacterId, string> = {
  ryu: 'relic_dragon_tear',
  bow: 'relic_eva_seal',
  katt: 'relic_coliseum_crest',
  rand: 'relic_township_keystone',
  nina: 'relic_wyndia_feather',
  jean: 'relic_simafort_signet',
  sten: 'relic_highfort_compass',
  spar: 'relic_great_tree_seed',
  bleu: 'relic_serpent_astrolabe',
};

export const CHARACTER_SIGNATURE_GEAR_MAP: Record<CharacterId, string> = {
  ryu: 'sig_dragnier_mail',
  bow: 'sig_rangers_alibi',
  katt: 'sig_coliseum_fang',
  rand: 'sig_farmtown_shell',
  nina: 'sig_black_wing_pinion',
  jean: 'sig_frogsbane_rapier',
  sten: 'sig_highlander_hookblade',
  spar: 'sig_whispering_bark',
  bleu: 'sig_starfall_staff',
};

export function getEquipmentCatalogItem(id: string): EquipmentItemDef | undefined {
  return PROGRESSION_RELICS[id] ?? SIGNATURE_GEAR_CATALOG[id];
}

function computeRuleValue(rule: RelicScalingRule, context: ScalingContext): {
  total: number;
  formulaLine: string;
} {
  const level = Math.max(0, context.characterLevel);
  const regions = Math.max(0, context.liberatedRegions);
  const resonance = Math.max(0, context.shamanResonanceRank);
  const loyaltyTier = Math.floor(Math.max(0, context.loyalty) / 25);

  const levelBonus = rule.perLevel * level;
  const regionBonus = rule.perLiberatedRegion * regions;
  const resonanceBonus = rule.perShamanResonance * resonance;
  const loyaltyBonus = (rule.perLoyaltyTier ?? 0) * loyaltyTier;

  const total = Math.round(
    rule.base + levelBonus + regionBonus + resonanceBonus + loyaltyBonus,
  );

  const label = STAT_LABELS[rule.stat];
  const parts = [
    `${rule.base}`,
    `(Lv ${level} × ${rule.perLevel})`,
    `(Regions ${regions} × ${rule.perLiberatedRegion})`,
    `(Resonance ${resonance} × ${rule.perShamanResonance})`,
  ];

  if (rule.perLoyaltyTier !== undefined && rule.perLoyaltyTier !== 0) {
    parts.push(`(Loyalty ${loyaltyTier} × ${rule.perLoyaltyTier})`);
  }

  return {
    total,
    formulaLine: `${label} +${total} = ${parts.join(' + ')}`,
  };
}

export function evaluateRelicScaling(
  relic: ProgressionRelicDef,
  context: ScalingContext,
): ComputedRelicEvaluation {
  const bonuses = createEmptyStatBlock();
  const formulaLines: string[] = [];

  for (const rule of relic.scalingRules) {
    const { total, formulaLine } = computeRuleValue(rule, context);
    bonuses[rule.stat] += total;
    formulaLines.push(formulaLine);
  }

  const regions = Math.max(0, context.liberatedRegions);
  const perRegion = relic.dragonApReductionPerRegion ?? 0;
  const dragonApReductionRatio = Math.min(
    DRAGON_AP_REDUCTION_CAP,
    Math.max(0, Number((perRegion * regions).toFixed(4))),
  );

  if (perRegion > 0) {
    const pct = Math.round(dragonApReductionRatio * 100);
    const perPct = Math.round(perRegion * 100);
    const capPct = Math.round(DRAGON_AP_REDUCTION_CAP * 100);
    formulaLines.push(
      `Dragon AP Drain -${pct}% = min(${capPct}%, Regions ${regions} × ${perPct}%)`,
    );
  }

  return {
    relicId: relic.id,
    name: relic.name,
    bonuses,
    dragonApReductionRatio,
    formulaLines,
  };
}

export function evaluateEquipmentForCombatant(
  relicIds: string[],
  signatureIds: string[],
  context: ScalingContext,
): ComputedEquipmentSummary {
  let flatBonuses = createEmptyStatBlock();
  const hooks: SignatureHookDef[] = [];
  const relicEvaluations: ComputedRelicEvaluation[] = [];
  let dragonApCostMultiplier = 1;
  let convertedAttackElement: ElementType | null = null;

  for (const relicId of relicIds) {
    const relic = PROGRESSION_RELICS[relicId];
    if (!relic) continue;
    const evaluation = evaluateRelicScaling(relic, context);
    relicEvaluations.push(evaluation);
    flatBonuses = addStatBlocks(flatBonuses, evaluation.bonuses);
    if (evaluation.dragonApReductionRatio > 0) {
      dragonApCostMultiplier *= 1 - evaluation.dragonApReductionRatio;
    }
  }

  for (const sigId of signatureIds) {
    const item = SIGNATURE_GEAR_CATALOG[sigId];
    if (!item) continue;
    flatBonuses = addStatBlocks(flatBonuses, item.flatStats);
    for (const hook of item.hooks) {
      hooks.push(hook);
      if (hook.type === 'DRAGON_AP_DRAIN_REDUCTION' && hook.apDrainMultiplier !== undefined) {
        dragonApCostMultiplier *= hook.apDrainMultiplier;
      }
      if (hook.type === 'ELEMENTAL_CONVERSION' && hook.element) {
        convertedAttackElement = hook.element;
      }
    }
  }

  dragonApCostMultiplier = Math.max(
    MIN_DRAGON_AP_COST_MULTIPLIER,
    Number(dragonApCostMultiplier.toFixed(4)),
  );

  return {
    flatBonuses,
    hooks,
    dragonApCostMultiplier,
    convertedAttackElement,
    relicEvaluations,
  };
}
