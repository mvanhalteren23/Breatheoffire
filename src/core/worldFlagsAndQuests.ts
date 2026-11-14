import type {
  CampaignEndingPath,
  CharacterId,
  QuestDefinition,
  StEvaClue,
  TrueEndingEvaluation,
  WorldStateRegistry,
} from './types.ts';

export const TRUE_ENDING_REQUIRED_CLUES = 4;
export const TRUE_ENDING_REQUIRED_REGIONS = 4;
export const TRUE_ENDING_REQUIRED_LOYALTY = 75;
export const TRUE_ENDING_REQUIRED_SHAMAN_RANK = 3;

export const CAMPAIGN_REGION_IDS = [
  'frontier',
  'gate',
  'windia',
  'highfort',
  'simafort',
  'tunlan',
  'capitan',
  'infinity',
] as const;

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

export const COMPANION_IDS: CharacterId[] = [
  'bow',
  'katt',
  'rand',
  'nina',
  'jean',
  'sten',
  'spar',
  'bleu',
];

export function createInitialWorldRegistry(
  quests: QuestDefinition[],
  clues: StEvaClue[],
): WorldStateRegistry {
  const questMap: Record<string, QuestDefinition> = {};
  for (const quest of quests) {
    questMap[quest.id] = {
      ...quest,
      objectives: quest.objectives.map((obj) => ({ ...obj })),
      unlocksFlags: [...quest.unlocksFlags],
    };
  }

  const clueMap: Record<string, StEvaClue> = {};
  for (const clue of clues) {
    clueMap[clue.id] = { ...clue };
  }

  const companionLoyalty = {} as Record<CharacterId, number>;
  for (const id of ALL_CHARACTER_IDS) {
    companionLoyalty[id] = 50;
  }

  return {
    flags: {},
    currentAct: 1,
    liberatedRegions: [],
    shamanResonanceRank: 0,
    companionLoyalty,
    quests: questMap,
    stEvaClues: clueMap,
    recruitedCitizens: [],
    townshipBuildings: [],
    infinityUnlocked: false,
    deathevanDefeated: false,
    endingPath: 'PENDING',
  };
}

export function setWorldFlag(
  registry: WorldStateRegistry,
  flag: string,
  value: boolean,
): WorldStateRegistry {
  return {
    ...registry,
    flags: {
      ...registry.flags,
      [flag]: value,
    },
  };
}

export function discoverQuest(
  registry: WorldStateRegistry,
  questId: string,
): WorldStateRegistry {
  const quest = registry.quests[questId];
  if (!quest || quest.stage !== 'HIDDEN') {
    return registry;
  }

  return {
    ...registry,
    quests: {
      ...registry.quests,
      [questId]: {
        ...quest,
        stage: 'DISCOVERED',
      },
    },
  };
}

export function activateQuest(
  registry: WorldStateRegistry,
  questId: string,
): WorldStateRegistry {
  const quest = registry.quests[questId];
  if (!quest || quest.stage !== 'DISCOVERED') {
    return registry;
  }

  return {
    ...registry,
    quests: {
      ...registry.quests,
      [questId]: {
        ...quest,
        stage: 'ACTIVE',
      },
    },
  };
}

export function completeQuestObjective(
  registry: WorldStateRegistry,
  questId: string,
  objectiveId: string,
): WorldStateRegistry {
  const quest = registry.quests[questId];
  if (!quest || quest.stage !== 'ACTIVE') {
    return registry;
  }

  const hasObjective = quest.objectives.some((obj) => obj.id === objectiveId);
  if (!hasObjective) {
    return registry;
  }

  const nextObjectives = quest.objectives.map((obj) =>
    obj.id === objectiveId ? { ...obj, completed: true } : obj,
  );
  const allComplete =
    nextObjectives.length > 0 && nextObjectives.every((obj) => obj.completed);

  const nextFlags = { ...registry.flags };
  if (allComplete) {
    for (const flag of quest.unlocksFlags) {
      nextFlags[flag] = true;
    }
  }

  return {
    ...registry,
    flags: nextFlags,
    quests: {
      ...registry.quests,
      [questId]: {
        ...quest,
        stage: allComplete ? 'COMPLETED' : 'ACTIVE',
        objectives: nextObjectives,
      },
    },
  };
}

export function discoverStEvaClue(
  registry: WorldStateRegistry,
  clueId: string,
): WorldStateRegistry {
  const clue = registry.stEvaClues[clueId];
  if (!clue || clue.discovered) {
    return registry;
  }

  return {
    ...registry,
    stEvaClues: {
      ...registry.stEvaClues,
      [clueId]: {
        ...clue,
        discovered: true,
      },
    },
  };
}

export function verifyStEvaClue(
  registry: WorldStateRegistry,
  clueId: string,
): WorldStateRegistry {
  const clue = registry.stEvaClues[clueId];
  if (!clue) {
    return registry;
  }

  return {
    ...registry,
    stEvaClues: {
      ...registry.stEvaClues,
      [clueId]: {
        ...clue,
        discovered: true,
        verified: true,
      },
    },
  };
}

export function liberateRegion(
  registry: WorldStateRegistry,
  regionId: string,
): WorldStateRegistry {
  const nextRegions = registry.liberatedRegions.includes(regionId)
    ? registry.liberatedRegions
    : [...registry.liberatedRegions, regionId];

  const derivedAct: 1 | 2 | 3 =
    nextRegions.length >= 4 ? 3 : nextRegions.length >= 2 ? 2 : 1;
  const nextAct: 1 | 2 | 3 =
    derivedAct > registry.currentAct ? derivedAct : registry.currentAct;

  return {
    ...registry,
    currentAct: nextAct,
    liberatedRegions: nextRegions,
    flags: {
      ...registry.flags,
      [`region_liberated_${regionId}`]: true,
    },
  };
}

export function adjustCompanionLoyalty(
  registry: WorldStateRegistry,
  characterId: CharacterId,
  delta: number,
): WorldStateRegistry {
  const current = registry.companionLoyalty[characterId] ?? 50;
  const clamped = Math.max(0, Math.min(100, current + delta));

  return {
    ...registry,
    companionLoyalty: {
      ...registry.companionLoyalty,
      [characterId]: clamped,
    },
  };
}

export function setShamanResonanceRank(
  registry: WorldStateRegistry,
  rank: number,
): WorldStateRegistry {
  return {
    ...registry,
    shamanResonanceRank: Math.max(0, Math.floor(rank)),
  };
}

export function recruitTownshipCitizen(
  registry: WorldStateRegistry,
  citizenId: string,
  buildingId: string,
): WorldStateRegistry {
  const nextCitizens = registry.recruitedCitizens.includes(citizenId)
    ? registry.recruitedCitizens
    : [...registry.recruitedCitizens, citizenId];
  const nextBuildings = registry.townshipBuildings.includes(buildingId)
    ? registry.townshipBuildings
    : [...registry.townshipBuildings, buildingId];

  return {
    ...registry,
    recruitedCitizens: nextCitizens,
    townshipBuildings: nextBuildings,
  };
}

export function advanceCampaignAct(
  registry: WorldStateRegistry,
  act: 1 | 2 | 3,
): WorldStateRegistry {
  if (act <= registry.currentAct) {
    return registry;
  }

  return {
    ...registry,
    currentAct: act,
    flags: {
      ...registry.flags,
      [`act_${act}_reached`]: true,
    },
  };
}

export function unlockInfinityGate(registry: WorldStateRegistry): WorldStateRegistry {
  if (registry.infinityUnlocked) {
    return registry;
  }

  const hasCompletedAct3MainQuest = Object.values(registry.quests).some(
    (q) => q.category === 'MAIN_STORY' && q.act === 3 && q.stage === 'COMPLETED',
  );
  const canUnlock =
    registry.currentAct >= 3 ||
    registry.liberatedRegions.length >= TRUE_ENDING_REQUIRED_REGIONS ||
    hasCompletedAct3MainQuest ||
    Boolean(registry.flags.infinity_ready) ||
    Boolean(registry.flags.main_story_complete);

  if (!canUnlock) {
    return registry;
  }

  return {
    ...registry,
    currentAct: 3,
    infinityUnlocked: true,
    flags: {
      ...registry.flags,
      infinity_gate_opened: true,
    },
  };
}

export function resolveDeathevanBattle(
  registry: WorldStateRegistry,
  victory: boolean,
): WorldStateRegistry {
  if (!victory) {
    return {
      ...registry,
      deathevanDefeated: Boolean(registry.deathevanDefeated),
      endingPath: registry.endingPath ?? 'PENDING',
    };
  }

  const trueEndingEval = evaluateTrueEndingConditions(registry);
  const endingPath: CampaignEndingPath = trueEndingEval.isUnlocked
    ? 'TRUE_ENDING'
    : 'NORMAL';

  return {
    ...registry,
    deathevanDefeated: true,
    endingPath,
    flags: {
      ...registry.flags,
      deathevan_defeated: true,
      [`ending_${endingPath.toLowerCase()}`]: true,
    },
  };
}

export function evaluateTrueEndingConditions(
  registry: WorldStateRegistry,
): TrueEndingEvaluation {
  const evanCluesVerified = Object.values(registry.stEvaClues).filter(
    (clue) => clue.verified,
  ).length;
  const liberatedRegionsCount = registry.liberatedRegions.length;

  const loyaltySum = COMPANION_IDS.reduce(
    (sum, id) => sum + (registry.companionLoyalty[id] ?? 0),
    0,
  );
  const avgCompanionLoyalty = Number((loyaltySum / COMPANION_IDS.length).toFixed(2));
  const shamanResonanceRank = registry.shamanResonanceRank;

  const missingConditions: string[] = [];

  if (evanCluesVerified < TRUE_ENDING_REQUIRED_CLUES) {
    missingConditions.push(
      `Verify ${TRUE_ENDING_REQUIRED_CLUES - evanCluesVerified} more St. Eva clue(s) (${evanCluesVerified}/${TRUE_ENDING_REQUIRED_CLUES}).`,
    );
  }
  if (liberatedRegionsCount < TRUE_ENDING_REQUIRED_REGIONS) {
    missingConditions.push(
      `Liberate ${TRUE_ENDING_REQUIRED_REGIONS - liberatedRegionsCount} more region(s) (${liberatedRegionsCount}/${TRUE_ENDING_REQUIRED_REGIONS}).`,
    );
  }
  if (avgCompanionLoyalty < TRUE_ENDING_REQUIRED_LOYALTY) {
    missingConditions.push(
      `Raise average companion loyalty to ${TRUE_ENDING_REQUIRED_LOYALTY} (currently ${avgCompanionLoyalty}).`,
    );
  }
  if (shamanResonanceRank < TRUE_ENDING_REQUIRED_SHAMAN_RANK) {
    missingConditions.push(
      `Reach Shaman Resonance Rank ${TRUE_ENDING_REQUIRED_SHAMAN_RANK} (currently ${shamanResonanceRank}).`,
    );
  }

  const infinityUnlocked = Boolean(
    registry.infinityUnlocked || registry.flags.infinity_gate_opened,
  );
  const deathevanDefeated = Boolean(
    registry.deathevanDefeated || registry.flags.deathevan_defeated,
  );
  const endingPath: CampaignEndingPath =
    registry.endingPath ??
    (deathevanDefeated
      ? missingConditions.length === 0
        ? 'TRUE_ENDING'
        : 'NORMAL'
      : 'PENDING');

  return {
    isUnlocked: missingConditions.length === 0,
    evanCluesVerified,
    requiredClues: TRUE_ENDING_REQUIRED_CLUES,
    liberatedRegionsCount,
    requiredRegions: TRUE_ENDING_REQUIRED_REGIONS,
    avgCompanionLoyalty,
    requiredLoyalty: TRUE_ENDING_REQUIRED_LOYALTY,
    shamanResonanceRank,
    infinityUnlocked,
    deathevanDefeated,
    endingPath,
    missingConditions,
  };
}
