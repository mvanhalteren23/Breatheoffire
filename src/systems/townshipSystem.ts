import {
  recruitTownshipCitizen,
  setShamanResonanceRank,
} from '../core';
import type { WorldStateRegistry } from '../core/types';
import {
  TOWNSHIP_CITIZENS,
  type TownshipCitizenDef,
} from '../data/verticalSliceContent';

export interface TownshipUnlockedServices {
  relicReforge: boolean;
  shamanAltar: boolean;
  evaArchive: boolean;
  campfireKitchen: boolean;
}

export interface TownshipPassiveBuffs {
  atkPercent: number;
  syncMaxBonus: number;
  dragonApDiscountPercent: number;
}

export interface TownshipSnapshot {
  townshipLevel: number;
  recruitedCitizenIds: string[];
  activeBuildings: TownshipCitizenDef[];
  buildingIds: string[];
  unlockedServices: TownshipUnlockedServices;
  passiveBuffs: TownshipPassiveBuffs;
}

export interface CitizenRecruitmentCheck {
  allowed: boolean;
  reason?: string;
  citizen?: TownshipCitizenDef;
}

export interface CitizenRecruitmentResult {
  success: boolean;
  registry: WorldStateRegistry;
  citizen?: TownshipCitizenDef;
  message: string;
}

function isTownshipCitizenId(
  id: string
): id is TownshipCitizenDef['id'] {
  return id in TOWNSHIP_CITIZENS;
}

export function getTownshipSnapshot(
  registry: WorldStateRegistry
): TownshipSnapshot {
  const unlockedServices: TownshipUnlockedServices = {
    relicReforge: false,
    shamanAltar: false,
    evaArchive: false,
    campfireKitchen: false,
  };

  const passiveBuffs: TownshipPassiveBuffs = {
    atkPercent: 0,
    syncMaxBonus: 0,
    dragonApDiscountPercent: 0,
  };

  const activeBuildings: TownshipCitizenDef[] = [];

  for (const citizen of Object.values(TOWNSHIP_CITIZENS)) {
    const isActive =
      registry.recruitedCitizens.includes(citizen.id) ||
      registry.townshipBuildings.includes(citizen.buildingId);

    if (!isActive) continue;

    activeBuildings.push(citizen);
    unlockedServices[citizen.serviceKey] = true;
    passiveBuffs.atkPercent += citizen.atkBonusPercent;
    passiveBuffs.syncMaxBonus += citizen.syncMaxBonus;
    passiveBuffs.dragonApDiscountPercent += citizen.dragonApDiscountPercent;
  }

  return {
    townshipLevel: Math.max(1, activeBuildings.length),
    recruitedCitizenIds: [...registry.recruitedCitizens],
    activeBuildings,
    buildingIds: [...registry.townshipBuildings],
    unlockedServices,
    passiveBuffs,
  };
}

export function canRecruitCitizen(
  registry: WorldStateRegistry,
  citizenId: string
): CitizenRecruitmentCheck {
  if (!isTownshipCitizenId(citizenId)) {
    return {
      allowed: false,
      reason: `Unknown Township citizen "${citizenId}".`,
    };
  }

  const citizen = TOWNSHIP_CITIZENS[citizenId];

  if (registry.recruitedCitizens.includes(citizen.id)) {
    return {
      allowed: false,
      citizen,
      reason: `${citizen.name} is already settled in Township.`,
    };
  }

  if (citizen.requiredFlag && !registry.flags[citizen.requiredFlag]) {
    return {
      allowed: false,
      citizen,
      reason: `Prerequisite flag "${citizen.requiredFlag}" is not yet unlocked.`,
    };
  }

  return {
    allowed: true,
    citizen,
  };
}

export function executeCitizenRecruitment(
  registry: WorldStateRegistry,
  citizenId: string
): CitizenRecruitmentResult {
  const check = canRecruitCitizen(registry, citizenId);
  if (!check.allowed || !check.citizen) {
    return {
      success: false,
      registry,
      citizen: check.citizen,
      message: check.reason ?? 'Cannot recruit citizen.',
    };
  }

  const citizen = check.citizen;
  let nextRegistry = recruitTownshipCitizen(
    registry,
    citizen.id,
    citizen.buildingId
  );

  if (citizen.id === 'sana' && nextRegistry.shamanResonanceRank < 1) {
    nextRegistry = setShamanResonanceRank(nextRegistry, 1);
  }

  return {
    success: true,
    registry: nextRegistry,
    citizen,
    message: `${citizen.name} joined Township! Constructed ${citizen.buildingName}.`,
  };
}
