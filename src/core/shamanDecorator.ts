import { evaluateEquipmentForCombatant } from './equipmentEngine.ts';
import type {
  CharacterId,
  CombatCommandDef,
  CombatantInput,
  DecoratedCombatant,
  ScalingContext,
  ShamanDefinition,
  ShamanId,
  ShamanModifierTableRow,
  StatBlock,
} from './types.ts';

export const ARMOR_BREAK_SINGLE_HIT_RATIO = 0.3;
export const ARMOR_BREAK_LOW_HP_RATIO = 0.25;
export const ARMOR_BREAK_DURATION = 2;
export const ARMOR_BREAK_DEF_PENALTY = 0.15;
export const ARMOR_BREAK_REBIND_HP_RATIO = 0.35;

export const SHAMAN_REBIND_COMMAND: CombatCommandDef = {
  id: 'shaman_rebind',
  label: 'Shaman Rebind',
  apCost: 4,
  powerMultiplier: 0,
  element: 'holy',
  targetType: 'self',
  kind: 'shaman_rebind',
  description: 'Restores full Shaman Fusion stability and clears Armor Break immediately.',
};

export const SHAMAN_DEFINITIONS: Record<ShamanId, ShamanDefinition> = {
  sana: {
    id: 'sana',
    name: 'Sana',
    element: 'fire',
    auraColor: '#ff5a2f',
    statMultipliers: {
      atk: 1.2,
      mag: 1.15,
    },
    flatBonuses: {
      atk: 4,
      mag: 3,
    },
    grantedCommands: [
      {
        id: 'sana_flame_burst',
        label: 'Sana Flame Burst',
        apCost: 7,
        powerMultiplier: 1.65,
        element: 'fire',
        targetType: 'single_enemy',
        kind: 'skill',
        description: 'Unleashes Sana’s concentrated fire resonance against one foe.',
      },
    ],
    lore: 'Fire Shaman of the High Flame, awakening ferocious offensive vigor.',
  },
  seso: {
    id: 'seso',
    name: 'Seso',
    element: 'ice',
    auraColor: '#38bdf8',
    statMultipliers: {
      mag: 1.2,
      maxAp: 1.15,
    },
    flatBonuses: {
      mag: 4,
      maxAp: 8,
    },
    grantedCommands: [
      {
        id: 'seso_frost_lance',
        label: 'Seso Frost Lance',
        apCost: 7,
        powerMultiplier: 1.6,
        element: 'ice',
        targetType: 'single_enemy',
        kind: 'skill',
        description: 'Pierces a target with Seso’s crystalline ice spear.',
      },
    ],
    lore: 'Ice and Water Shaman, sharpening focus and arcane clarity.',
  },
  spoo: {
    id: 'spoo',
    name: 'Spoo',
    element: 'wind',
    auraColor: '#4ade80',
    statMultipliers: {
      spd: 1.25,
      luck: 1.15,
    },
    flatBonuses: {
      spd: 6,
      luck: 4,
    },
    grantedCommands: [
      {
        id: 'spoo_gale_cyclone',
        label: 'Spoo Gale Cyclone',
        apCost: 8,
        powerMultiplier: 1.4,
        element: 'wind',
        targetType: 'all_enemies',
        kind: 'skill',
        description: 'Sweeps all enemies with Spoo’s slicing wind vortex.',
      },
    ],
    lore: 'Wind Shaman of the High Plains, granting lightning-fast footwork.',
  },
  solo: {
    id: 'solo',
    name: 'Solo',
    element: 'earth',
    auraColor: '#d97706',
    statMultipliers: {
      def: 1.25,
      maxHp: 1.2,
    },
    flatBonuses: {
      def: 6,
      maxHp: 25,
    },
    grantedCommands: [
      {
        id: 'solo_quake_crag',
        label: 'Solo Quake Crag',
        apCost: 8,
        powerMultiplier: 1.65,
        element: 'earth',
        targetType: 'single_enemy',
        kind: 'skill',
        description: 'Crushes a foe beneath tectonic pillars summoned through Solo.',
      },
    ],
    lore: 'Earth Shaman of stone and mountain, hardening armor and resolve.',
  },
  seny: {
    id: 'seny',
    name: 'Seny',
    element: 'holy',
    auraColor: '#fde047',
    statMultipliers: {
      mag: 1.15,
      def: 1.15,
      maxAp: 1.1,
    },
    flatBonuses: {
      mag: 4,
      def: 3,
      maxAp: 5,
    },
    grantedCommands: [
      {
        id: 'seny_sacred_radiance',
        label: 'Seny Sacred Radiance',
        apCost: 9,
        powerMultiplier: 1.55,
        element: 'holy',
        targetType: 'all_allies',
        kind: 'heal',
        description: 'Channels Seny’s pure light to mend all allies.',
      },
    ],
    lore: 'Holy Shaman of dawn, mending wounds and shielding allies from corruption.',
  },
  shin: {
    id: 'shin',
    name: 'Shin',
    element: 'shadow',
    auraColor: '#a855f7',
    statMultipliers: {
      atk: 1.2,
      spd: 1.15,
      luck: 1.2,
    },
    flatBonuses: {
      atk: 5,
      spd: 4,
      luck: 5,
    },
    grantedCommands: [
      {
        id: 'shin_umbral_rend',
        label: 'Shin Umbral Rend',
        apCost: 9,
        powerMultiplier: 1.75,
        element: 'shadow',
        targetType: 'single_enemy',
        kind: 'skill',
        description: 'Strikes a foe’s shadow directly with Shin’s abyssal edge.',
      },
    ],
    lore: 'Shadow Shaman of the deep night, unlocking lethal critical precision.',
  },
};

const FUSION_TITLE_MAP: Record<CharacterId, Record<ShamanId, string>> = {
  ryu: {
    sana: 'Ember Scion',
    seso: 'Glacier Scion',
    spoo: 'Tempest Scion',
    solo: 'Bastion Scion',
    seny: 'Dawn Scion',
    shin: 'Eclipse Scion',
  },
  bow: {
    sana: 'Cinder Marksman',
    seso: 'Frost Arbalest',
    spoo: 'Gale Ranger',
    solo: 'Iron Sentinel',
    seny: 'Hallowed Warden',
    shin: 'Nightstalker Crossbow',
  },
  katt: {
    sana: 'Flame Tigress',
    seso: 'Rime Panther',
    spoo: 'Zephyr Lynx',
    solo: 'Crag Brawler',
    seny: 'Solar Lioness',
    shin: 'Shadow Stalker',
  },
  rand: {
    sana: 'Magma Titan',
    seso: 'Permafrost Shell',
    spoo: 'Cyclone Armadillo',
    solo: 'Obsidian Colossus',
    seny: 'Aegis Guardian',
    shin: 'Dusk Juggernaut',
  },
  nina: {
    sana: 'Phoenix Wing',
    seso: 'Frost Seraph',
    spoo: 'Sky Empress',
    solo: 'Terran Valkyrie',
    seny: 'Celestial Archon',
    shin: 'Raven Harbinger',
  },
  jean: {
    sana: 'Crimson Chevalier',
    seso: 'Azure Duelist',
    spoo: 'Silken Zephyr',
    solo: 'Gilded Paladin',
    seny: 'Radiant Noble',
    shin: 'Phantom Blade',
  },
  sten: {
    sana: 'Pyre Acrobat',
    seso: 'Icicle Trickster',
    spoo: 'Cloud Dancer',
    solo: 'Pillar Vaulter',
    seny: 'Sunlit Jester',
    shin: 'Mirage Assassin',
  },
  spar: {
    sana: 'Wildfire Bloom',
    seso: 'Tundra Fern',
    spoo: 'Pollen Gale',
    solo: 'Ancient Treant',
    seny: 'Worldtree Sprout',
    shin: 'Nightshade Warden',
  },
  bleu: {
    sana: 'Pyre Serpent',
    seso: 'Abyssal Naga',
    spoo: 'Storm Leviathan',
    solo: 'Monolith Gorgon',
    seny: 'Astral Oracle',
    shin: 'Void Lamia',
  },
};

export interface ShamanDualSynergyDef {
  id: string;
  pair: readonly [ShamanId, ShamanId];
  title: string;
  bonusMultipliers: Partial<Record<keyof StatBlock, number>>;
  bonusFlatStats: Partial<StatBlock>;
  description: string;
}

export const SHAMAN_DUAL_SYNERGIES: Record<string, ShamanDualSynergyDef> = {
  'sana+spoo': {
    id: 'sana+spoo',
    pair: ['sana', 'spoo'],
    title: 'Wildfire Tempest',
    bonusMultipliers: { atk: 1.08, spd: 1.08 },
    bonusFlatStats: { atk: 4, spd: 4 },
    description: 'Fire and Wind Shamans ignite blinding gale strikes.',
  },
  'seso+seny': {
    id: 'seso+seny',
    pair: ['seso', 'seny'],
    title: 'Sacred Glacier',
    bonusMultipliers: { mag: 1.08, maxAp: 1.08 },
    bonusFlatStats: { mag: 4, maxAp: 6 },
    description: 'Ice and Holy Shamans crystallize restorative astral mana.',
  },
  'solo+sana': {
    id: 'solo+sana',
    pair: ['solo', 'sana'],
    title: 'Molten Bastion',
    bonusMultipliers: { atk: 1.06, def: 1.08 },
    bonusFlatStats: { maxHp: 15, def: 4 },
    description: 'Earth and Fire Shamans temper volcanic armor.',
  },
  'shin+spoo': {
    id: 'shin+spoo',
    pair: ['shin', 'spoo'],
    title: 'Phantom Squall',
    bonusMultipliers: { spd: 1.08, luck: 1.1 },
    bonusFlatStats: { spd: 5, luck: 5 },
    description: 'Shadow and Wind Shamans vanish between critical strikes.',
  },
  'seny+shin': {
    id: 'seny+shin',
    pair: ['seny', 'shin'],
    title: 'Twilight Eclipse',
    bonusMultipliers: { mag: 1.08, atk: 1.08 },
    bonusFlatStats: { atk: 4, mag: 4 },
    description: 'Holy and Shadow Shamans harmonize light and abyss.',
  },
};

const SHAMAN_SYNERGY_PAIR_META: Record<
  ShamanId,
  { synergyPair: ShamanId; miracleTitleSuffix: string }
> = {
  sana: { synergyPair: 'spoo', miracleTitleSuffix: 'Wildfire Tempest' },
  seso: { synergyPair: 'seny', miracleTitleSuffix: 'Sacred Glacier' },
  spoo: { synergyPair: 'sana', miracleTitleSuffix: 'Wildfire Tempest' },
  solo: { synergyPair: 'sana', miracleTitleSuffix: 'Molten Bastion' },
  seny: { synergyPair: 'seso', miracleTitleSuffix: 'Sacred Glacier' },
  shin: { synergyPair: 'seny', miracleTitleSuffix: 'Twilight Eclipse' },
};

function buildShamanModifierRow(id: ShamanId): ShamanModifierTableRow {
  const def = SHAMAN_DEFINITIONS[id];
  const meta = SHAMAN_SYNERGY_PAIR_META[id];
  return {
    shamanId: def.id,
    name: def.name,
    element: def.element,
    auraColor: def.auraColor,
    statMultipliers: { ...def.statMultipliers },
    flatBonuses: { ...def.flatBonuses },
    grantedCommandIds: def.grantedCommands.map((c) => c.id),
    synergyPair: meta.synergyPair,
    miracleTitleSuffix: meta.miracleTitleSuffix,
  };
}

export const SHAMAN_FUSION_MODIFIER_TABLES: Record<ShamanId, ShamanModifierTableRow> = {
  sana: buildShamanModifierRow('sana'),
  seso: buildShamanModifierRow('seso'),
  spoo: buildShamanModifierRow('spoo'),
  solo: buildShamanModifierRow('solo'),
  seny: buildShamanModifierRow('seny'),
  shin: buildShamanModifierRow('shin'),
};

export interface ComputedShamanModifierTable {
  characterId: CharacterId;
  shamanIds: ShamanId[];
  fusionTitle: string | null;
  miracleTitle: string | null;
  effectiveMultipliers: Record<keyof StatBlock, number>;
  flatBonuses: StatBlock;
  grantedCommandIds: string[];
  hasDualSynergy: boolean;
  synergy: ShamanDualSynergyDef | null;
}

function findMatchingDualSynergy(shamanIds: ShamanId[]): ShamanDualSynergyDef | null {
  if (shamanIds.length < 2) return null;
  const bound = new Set(shamanIds);
  for (const synergy of Object.values(SHAMAN_DUAL_SYNERGIES)) {
    if (bound.has(synergy.pair[0]) && bound.has(synergy.pair[1])) {
      return synergy;
    }
  }
  return null;
}

/**
 * Pure lookup returning effective multipliers, flat bonuses, fusion title,
 * and dual-shaman miracle synergy status for a character and Shaman loadout.
 */
export function getShamanFusionModifierTable(
  characterId: CharacterId,
  shamanIds: ShamanId[],
): ComputedShamanModifierTable {
  const effectiveMultipliers: Record<keyof StatBlock, number> = {
    maxHp: 1,
    maxAp: 1,
    atk: 1,
    def: 1,
    mag: 1,
    spd: 1,
    luck: 1,
  };
  const flatBonuses: StatBlock = {
    maxHp: 0,
    maxAp: 0,
    atk: 0,
    def: 0,
    mag: 0,
    spd: 0,
    luck: 0,
  };
  const grantedCommandIds: string[] = [];
  const seenCommands = new Set<string>();

  for (const shamanId of shamanIds) {
    const row = SHAMAN_FUSION_MODIFIER_TABLES[shamanId];
    for (const key of STAT_KEYS) {
      effectiveMultipliers[key] = Number(
        (effectiveMultipliers[key] * (row.statMultipliers[key] ?? 1)).toFixed(4),
      );
      flatBonuses[key] += row.flatBonuses[key] ?? 0;
    }
    for (const cmdId of row.grantedCommandIds) {
      if (!seenCommands.has(cmdId)) {
        seenCommands.add(cmdId);
        grantedCommandIds.push(cmdId);
      }
    }
  }

  const synergy = findMatchingDualSynergy(shamanIds);
  const hasDualSynergy = synergy !== null;
  if (synergy) {
    for (const key of STAT_KEYS) {
      effectiveMultipliers[key] = Number(
        (effectiveMultipliers[key] * (synergy.bonusMultipliers[key] ?? 1)).toFixed(4),
      );
      flatBonuses[key] += synergy.bonusFlatStats[key] ?? 0;
    }
  }

  const fusionTitle = resolveFusionTitle(characterId, shamanIds);
  const miracleTitle =
    fusionTitle && synergy ? `${fusionTitle} — ${synergy.title}` : fusionTitle;

  return {
    characterId,
    shamanIds: [...shamanIds],
    fusionTitle,
    miracleTitle,
    effectiveMultipliers,
    flatBonuses,
    grantedCommandIds,
    hasDualSynergy,
    synergy,
  };
}

const STAT_KEYS: (keyof StatBlock)[] = [
  'maxHp',
  'maxAp',
  'atk',
  'def',
  'mag',
  'spd',
  'luck',
];

function resolveFusionTitle(characterId: CharacterId, shamanIds: ShamanId[]): string | null {
  if (shamanIds.length === 0) return null;
  const primary = shamanIds[shamanIds.length - 1];
  const mapped = FUSION_TITLE_MAP[characterId]?.[primary];
  const baseTitle = mapped ?? `${SHAMAN_DEFINITIONS[primary].name}-Fused`;
  if (shamanIds.length === 1) return baseTitle;
  const firstShaman = SHAMAN_DEFINITIONS[shamanIds[0]].name;
  return `${firstShaman} / ${baseTitle}`;
}

function resolveFusionSpriteId(baseSpriteId: string, shamanIds: ShamanId[]): string {
  if (shamanIds.length === 0) return baseSpriteId;
  const suffix = shamanIds.join('_');
  return baseSpriteId.endsWith(`_${suffix}`) ? baseSpriteId : `${baseSpriteId}_${suffix}`;
}

function applySingleShamanStat(
  prevVal: number,
  statKey: keyof StatBlock,
  shaman: ShamanDefinition,
  isArmorBroken: boolean,
  isFirstShamanLayer: boolean,
): number {
  const mult = shaman.statMultipliers[statKey] ?? 1;
  const flat = shaman.flatBonuses[statKey] ?? 0;
  const fullDelta = Math.round(prevVal * (mult - 1) + flat);
  const effectiveDelta = isArmorBroken ? Math.round(fullDelta * 0.5) : fullDelta;
  let nextVal = prevVal + effectiveDelta;

  if (statKey === 'def' && isArmorBroken) {
    if (isFirstShamanLayer) {
      nextVal = Math.max(1, Math.round(nextVal * (1 - ARMOR_BREAK_DEF_PENALTY)));
    } else {
      // Scale additional shaman DEF delta proportionally so multi-shaman order stays consistent
      nextVal = Math.max(
        1,
        prevVal + Math.round(effectiveDelta * (1 - ARMOR_BREAK_DEF_PENALTY)),
      );
    }
  }

  return Math.max(1, nextVal);
}

function applyAllShamanStatsForKey(
  baseVal: number,
  statKey: keyof StatBlock,
  shamanIds: ShamanId[],
  isArmorBroken: boolean,
): number {
  let val = baseVal;
  shamanIds.forEach((id, idx) => {
    val = applySingleShamanStat(val, statKey, SHAMAN_DEFINITIONS[id], isArmorBroken, idx === 0);
  });
  return val;
}

function invertBaseStatValue(
  currentVal: number,
  statKey: keyof StatBlock,
  shamanIds: ShamanId[],
  currentIsArmorBroken: boolean,
): number {
  if (shamanIds.length === 0) return currentVal;
  let low = 0;
  let high = Math.max(100, currentVal * 3 + 50);
  let bestCandidate = currentVal;
  let bestDiff = Number.POSITIVE_INFINITY;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const produced = applyAllShamanStatsForKey(mid, statKey, shamanIds, currentIsArmorBroken);
    const diff = Math.abs(produced - currentVal);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestCandidate = mid;
    }
    if (produced === currentVal) {
      return mid;
    }
    if (produced < currentVal) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return bestCandidate;
}

function recomputeStatsForBreakTransition(
  combatant: DecoratedCombatant,
  nextIsArmorBroken: boolean,
): StatBlock {
  if (combatant.shamanIds.length === 0 || combatant.isArmorBroken === nextIsArmorBroken) {
    return { ...combatant.stats };
  }

  const nextStats = { ...combatant.stats };
  for (const key of STAT_KEYS) {
    const baseVal = invertBaseStatValue(
      combatant.stats[key],
      key,
      combatant.shamanIds,
      combatant.isArmorBroken,
    );
    nextStats[key] = applyAllShamanStatsForKey(
      baseVal,
      key,
      combatant.shamanIds,
      nextIsArmorBroken,
    );
  }
  return nextStats;
}

function mergeCommands(existing: CombatCommandDef[], additions: CombatCommandDef[]): CombatCommandDef[] {
  const seen = new Set(existing.map((c) => c.id));
  const result = [...existing];
  for (const cmd of additions) {
    if (!seen.has(cmd.id)) {
      seen.add(cmd.id);
      result.push(cmd);
    }
  }
  return result;
}

export interface CombatantDecorator {
  getDecorated(): DecoratedCombatant;
}

export class BaseCombatantWrapper implements CombatantDecorator {
  private readonly input: CombatantInput;
  private readonly context: ScalingContext;

  constructor(input: CombatantInput, context?: ScalingContext) {
    this.input = input;
    this.context = context ?? {
      characterLevel: input.level,
      liberatedRegions: 0,
      shamanResonanceRank: 0,
      loyalty: input.loyalty,
    };
  }

  getDecorated(): DecoratedCombatant {
    const equipmentSummary = evaluateEquipmentForCombatant(
      this.input.equippedRelicIds,
      this.input.equippedSignatureIds,
      this.context,
    );

    const stats: StatBlock = {
      maxHp: this.input.baseStats.maxHp + equipmentSummary.flatBonuses.maxHp,
      maxAp: this.input.baseStats.maxAp + equipmentSummary.flatBonuses.maxAp,
      atk: this.input.baseStats.atk + equipmentSummary.flatBonuses.atk,
      def: this.input.baseStats.def + equipmentSummary.flatBonuses.def,
      mag: this.input.baseStats.mag + equipmentSummary.flatBonuses.mag,
      spd: this.input.baseStats.spd + equipmentSummary.flatBonuses.spd,
      luck: this.input.baseStats.luck + equipmentSummary.flatBonuses.luck,
    };

    return {
      id: this.input.id,
      name: this.input.name,
      level: this.input.level,
      hp: Math.min(this.input.hp, stats.maxHp),
      ap: Math.min(this.input.ap, stats.maxAp),
      stats,
      element: this.input.element,
      spriteId: this.input.spriteId,
      auraColor: null,
      fusionTitle: null,
      shamanIds: [],
      isArmorBroken: this.input.isArmorBroken,
      armorBreakTurnsRemaining: this.input.armorBreakTurnsRemaining,
      commands: [...this.input.commands],
      equipmentSummary,
    };
  }
}

export class ShamanFusionDecorator implements CombatantDecorator {
  private readonly wrapped: CombatantDecorator;
  private readonly shaman: ShamanDefinition;

  constructor(wrapped: CombatantDecorator, shamanId: ShamanId) {
    this.wrapped = wrapped;
    this.shaman = SHAMAN_DEFINITIONS[shamanId];
  }

  getDecorated(): DecoratedCombatant {
    const prev = this.wrapped.getDecorated();
    const isFirstShamanLayer = prev.shamanIds.length === 0;
    const nextShamanIds = [...prev.shamanIds, this.shaman.id];

    const stats: StatBlock = {
      maxHp: applySingleShamanStat(
        prev.stats.maxHp,
        'maxHp',
        this.shaman,
        prev.isArmorBroken,
        isFirstShamanLayer,
      ),
      maxAp: applySingleShamanStat(
        prev.stats.maxAp,
        'maxAp',
        this.shaman,
        prev.isArmorBroken,
        isFirstShamanLayer,
      ),
      atk: applySingleShamanStat(
        prev.stats.atk,
        'atk',
        this.shaman,
        prev.isArmorBroken,
        isFirstShamanLayer,
      ),
      def: applySingleShamanStat(
        prev.stats.def,
        'def',
        this.shaman,
        prev.isArmorBroken,
        isFirstShamanLayer,
      ),
      mag: applySingleShamanStat(
        prev.stats.mag,
        'mag',
        this.shaman,
        prev.isArmorBroken,
        isFirstShamanLayer,
      ),
      spd: applySingleShamanStat(
        prev.stats.spd,
        'spd',
        this.shaman,
        prev.isArmorBroken,
        isFirstShamanLayer,
      ),
      luck: applySingleShamanStat(
        prev.stats.luck,
        'luck',
        this.shaman,
        prev.isArmorBroken,
        isFirstShamanLayer,
      ),
    };

    const baseSprite =
      prev.shamanIds.length === 0
        ? prev.spriteId
        : prev.spriteId.replace(new RegExp(`_${prev.shamanIds.join('_')}$`), '');

    const commands = mergeCommands(prev.commands, [
      ...this.shaman.grantedCommands,
      SHAMAN_REBIND_COMMAND,
    ]);

    return {
      ...prev,
      hp: Math.min(prev.hp, stats.maxHp),
      ap: Math.min(prev.ap, stats.maxAp),
      stats,
      element: this.shaman.element,
      spriteId: resolveFusionSpriteId(baseSprite, nextShamanIds),
      auraColor: this.shaman.auraColor,
      fusionTitle: resolveFusionTitle(prev.id, nextShamanIds),
      shamanIds: nextShamanIds,
      commands,
    };
  }
}

export function decorateCombatant(
  input: CombatantInput,
  context?: ScalingContext,
): DecoratedCombatant {
  let decorator: CombatantDecorator = new BaseCombatantWrapper(input, context);
  for (const shamanId of input.shamanIds) {
    decorator = new ShamanFusionDecorator(decorator, shamanId);
  }
  return decorator.getDecorated();
}

/**
 * Evaluates whether Armor Break triggers after `combatant` has received `damageTaken`
 * (expects `combatant.hp` to reflect post-hit HP).
 */
export function evaluateArmorBreakTrigger(
  combatant: DecoratedCombatant,
  damageTaken: number,
): DecoratedCombatant {
  if (combatant.shamanIds.length === 0 || combatant.hp <= 0) {
    return combatant;
  }

  const maxHp = Math.max(1, combatant.stats.maxHp);
  const heavyHit = damageTaken >= maxHp * ARMOR_BREAK_SINGLE_HIT_RATIO;
  const lowHp = combatant.hp <= maxHp * ARMOR_BREAK_LOW_HP_RATIO;

  if (!heavyHit && !lowHp) {
    return combatant;
  }

  if (combatant.isArmorBroken) {
    return {
      ...combatant,
      armorBreakTurnsRemaining: ARMOR_BREAK_DURATION,
    };
  }

  const nextStats = recomputeStatsForBreakTransition(combatant, true);
  return {
    ...combatant,
    stats: nextStats,
    hp: Math.min(combatant.hp, nextStats.maxHp),
    ap: Math.min(combatant.ap, nextStats.maxAp),
    isArmorBroken: true,
    armorBreakTurnsRemaining: ARMOR_BREAK_DURATION,
  };
}

export function tickArmorBreakRecovery(combatant: DecoratedCombatant): DecoratedCombatant {
  if (!combatant.isArmorBroken) {
    return combatant;
  }

  const nextTurns = Math.max(0, combatant.armorBreakTurnsRemaining - 1);
  if (nextTurns > 0) {
    return {
      ...combatant,
      armorBreakTurnsRemaining: nextTurns,
    };
  }

  return rebindShamanFusion(combatant);
}

export function rebindShamanFusion(combatant: DecoratedCombatant): DecoratedCombatant {
  if (!combatant.isArmorBroken && combatant.armorBreakTurnsRemaining === 0) {
    return combatant;
  }

  const nextStats = recomputeStatsForBreakTransition(combatant, false);
  return {
    ...combatant,
    stats: nextStats,
    isArmorBroken: false,
    armorBreakTurnsRemaining: 0,
  };
}
