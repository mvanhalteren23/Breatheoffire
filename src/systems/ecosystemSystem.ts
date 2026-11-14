import {
  CAMPFIRE_RECIPES,
  FISH_CATCH_TABLE,
  HUNT_DROP_TABLE,
  type CampfireRecipeDef,
  type FishCatchEntry,
  type HuntDropEntry,
} from '../data/verticalSliceContent';

export interface HuntDropResult {
  itemId: HuntDropEntry['id'];
  name: string;
  quantity: number;
}

export interface WindScentTrackingResult {
  stealthScore: number;
  success: boolean;
  tier: 'PERFECT_DOWNWIND' | 'CLEAN_STALK' | 'WIND_ALERT' | 'STARTLED';
  windAlignmentLabel: string;
  drops: HuntDropResult[];
}

export interface FishingCastResult {
  catchItem: FishCatchEntry;
  manilloTokensEarned: number;
  zennyValue: number;
  ryuBonusApplied: boolean;
  effectiveLuck: number;
}

export interface ActiveMealBuff {
  sourceRecipeId: CampfireRecipeDef['id'];
  name: string;
  atkBonus: number;
  defBonus: number;
  remainingBattles: number;
}

export interface CampfireCookingResult {
  success: boolean;
  recipe: CampfireRecipeDef;
  updatedInventory: Record<string, number>;
  missingIngredients: Record<string, number>;
  hpRestore: number;
  apRestore: number;
  syncRestore: number;
  buff: ActiveMealBuff | null;
  message: string;
}

/**
 * Evaluates Wind/Scent hunting stealth and harvest yield.
 * Approaching into the wind (approachAngle opposite to windAngle, cos = -1)
 * keeps the hunter's scent downwind of the prey for maximum stealth.
 */
export function evaluateWindScentTracking(
  windAngle: number,
  approachAngle: number,
  distance: number
): WindScentTrackingResult {
  const safeDistance = Math.max(0, distance);
  // cosDiff = -1 when approaching directly into the wind (best stealth)
  // cosDiff = +1 when walking with the wind at your back (scent blows onto prey)
  const cosDiff = Math.cos(approachAngle - windAngle);
  const windStealthRatio = (1 - cosDiff) * 0.5; // 0 (upwind) .. 1 (downwind)

  let distanceRatio = 1;
  if (safeDistance < 4) {
    distanceRatio = 0.35 + (safeDistance / 4) * 0.45;
  } else if (safeDistance > 20) {
    distanceRatio = Math.max(0.15, 1 - (safeDistance - 20) / 25);
  }

  const rawScore = windStealthRatio * 70 + distanceRatio * 30;
  const stealthScore = Math.round(Math.max(0, Math.min(100, rawScore)));

  const windAlignmentLabel =
    windStealthRatio >= 0.75
      ? 'Downwind Concealed'
      : windStealthRatio >= 0.4
        ? 'Crosswind Neutral'
        : 'Upwind Scent Exposed';

  const boar = HUNT_DROP_TABLE[0];
  const fowl = HUNT_DROP_TABLE[1];

  if (stealthScore >= 80) {
    return {
      stealthScore,
      success: true,
      tier: 'PERFECT_DOWNWIND',
      windAlignmentLabel,
      drops: [
        { itemId: boar.id, name: boar.name, quantity: 2 },
        { itemId: fowl.id, name: fowl.name, quantity: 1 },
      ],
    };
  }

  if (stealthScore >= 55) {
    return {
      stealthScore,
      success: true,
      tier: 'CLEAN_STALK',
      windAlignmentLabel,
      drops: [
        { itemId: boar.id, name: boar.name, quantity: 1 },
        { itemId: fowl.id, name: fowl.name, quantity: 1 },
      ],
    };
  }

  if (stealthScore >= 35) {
    return {
      stealthScore,
      success: true,
      tier: 'WIND_ALERT',
      windAlignmentLabel,
      drops: [{ itemId: fowl.id, name: fowl.name, quantity: 1 }],
    };
  }

  return {
    stealthScore,
    success: false,
    tier: 'STARTLED',
    windAlignmentLabel,
    drops: [],
  };
}

/**
 * Resolves a deterministic Manillo dock fishing cast using party Luck,
 * Ryu's Dragon-angler affinity, and an optional cast timing score (0..1).
 */
export function executeFishingCast(
  luck: number,
  isRyu: boolean,
  castScore?: number
): FishingCastResult {
  const safeLuck = Math.max(0, luck);
  const effectiveLuck = safeLuck + (isRyu ? 4 : 0);

  const eligible = FISH_CATCH_TABLE.filter(
    (entry) => effectiveLuck >= entry.minLuck
  );
  const pool = eligible.length > 0 ? eligible : [FISH_CATCH_TABLE[0]];

  const baseScore =
    castScore !== undefined
      ? Math.max(0, Math.min(0.999, castScore + (isRyu ? 0.1 : 0)))
      : Math.max(0, Math.min(0.999, 0.25 + effectiveLuck * 0.032));

  const totalWeight = pool.reduce((sum, item) => sum + item.rarityWeight, 0);
  const targetThreshold = baseScore * totalWeight;

  let cumulative = 0;
  let chosen = pool[0];
  for (const candidate of pool) {
    cumulative += candidate.rarityWeight;
    if (targetThreshold <= cumulative) {
      chosen = candidate;
      break;
    }
  }

  const ryuTokenBonus = isRyu ? 1 : 0;
  return {
    catchItem: chosen,
    manilloTokensEarned: chosen.manilloTokens + ryuTokenBonus,
    zennyValue: chosen.zennyValue,
    ryuBonusApplied: isRyu,
    effectiveLuck,
  };
}

/**
 * Pure campfire cooking reducer that consumes ingredients and produces
 * HP/AP/Sync restoration plus a multi-battle meal buff.
 */
export function cookCampfireMeal(
  recipeId: CampfireRecipeDef['id'],
  inventory: Record<string, number>
): CampfireCookingResult {
  const recipe = CAMPFIRE_RECIPES[recipeId];
  const missingIngredients: Record<string, number> = {};

  for (const [itemId, requiredQty] of Object.entries(recipe.ingredients)) {
    const owned = inventory[itemId] ?? 0;
    if (owned < requiredQty) {
      missingIngredients[itemId] = requiredQty - owned;
    }
  }

  if (Object.keys(missingIngredients).length > 0) {
    return {
      success: false,
      recipe,
      updatedInventory: { ...inventory },
      missingIngredients,
      hpRestore: 0,
      apRestore: 0,
      syncRestore: 0,
      buff: null,
      message: `Missing ingredients for ${recipe.name}.`,
    };
  }

  const updatedInventory: Record<string, number> = { ...inventory };
  for (const [itemId, requiredQty] of Object.entries(recipe.ingredients)) {
    const remaining = (updatedInventory[itemId] ?? 0) - requiredQty;
    if (remaining > 0) {
      updatedInventory[itemId] = remaining;
    } else {
      delete updatedInventory[itemId];
    }
  }

  const buff: ActiveMealBuff = {
    sourceRecipeId: recipe.id,
    name: recipe.name,
    atkBonus: recipe.tempAtkBonus,
    defBonus: recipe.tempDefBonus,
    remainingBattles: recipe.durationBattles,
  };

  return {
    success: true,
    recipe,
    updatedInventory,
    missingIngredients: {},
    hpRestore: recipe.hpRestore,
    apRestore: recipe.apRestore,
    syncRestore: recipe.syncRestore,
    buff,
    message: `Cooked ${recipe.name}! Restored ${recipe.hpRestore} HP, ${recipe.apRestore} AP, +${recipe.syncRestore} Sync.`,
  };
}
