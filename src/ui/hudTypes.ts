import type {
  CharacterId,
  CombatCommandDef,
  CombatState,
  ComputedRelicEvaluation,
  DragonFormId,
  ElementType,
  FieldActionId,
  ProgressionRelicDef,
  ScalingContext,
  ShamanDefinition,
  ShamanId,
  SignatureGearDef,
  SignatureHookDef,
  StatBlock,
  TerrainTag,
  TrueEndingEvaluation,
  WorldStateRegistry,
} from '../core/types';

export type HUDDrawerId = 'quests' | 'shamans' | 'relics' | 'township' | null;

export interface ThumbstickVector {
  x: number;
  y: number;
}

export interface HUDPartyMember {
  id: CharacterId;
  name: string;
  role: string;
  isActiveParty: boolean;
  level: number;
  hp: number;
  maxHp: number;
  ap: number;
  maxAp: number;
  element: ElementType;
  shamanIds: ShamanId[];
  fusionTitle?: string | null;
  auraColor?: string | null;
  isArmorBroken?: boolean;
  armorBreakTurnsRemaining?: number;
  loyalty: number;
  equippedRelicIds: string[];
  equippedSignatureIds: string[];
  computedStats?: StatBlock;
  relicEvaluations?: ComputedRelicEvaluation[];
  activeHooks?: SignatureHookDef[];
}

export interface NearbyInteractable {
  id: string;
  label: string;
  kind: 'npc' | 'clue' | 'township' | 'gate' | 'shrine' | 'fishing' | 'hunting' | 'obstacle';
}

export interface ContextualActionSpec {
  actionId: FieldActionId | 'interact';
  label: string;
  icon: string;
  accentColor: string;
  description: string;
  available: boolean;
}

export interface ShamanCatalogItem extends ShamanDefinition {
  unlocked: boolean;
  bondedToCharacterId: CharacterId | null;
}

export interface EquipmentCatalogState {
  relics: Array<
    ProgressionRelicDef & {
      unlocked: boolean;
      evaluation?: ComputedRelicEvaluation;
    }
  >;
  signatureGear: Array<
    SignatureGearDef & {
      unlocked: boolean;
    }
  >;
  scalingContext: ScalingContext;
}

export interface TownshipCitizenView {
  id: string;
  name: string;
  role: string;
  specialty: string;
  buildingName: string;
  recruited: boolean;
  canRecruit: boolean;
}

export interface TownshipBuildingView {
  id: string;
  name: string;
  level: number;
  bonusDescription: string;
}

export interface CampRecipeView {
  id: string;
  name: string;
  ingredientsLabel: string;
  effectLabel: string;
  canCook: boolean;
}

export interface TownshipCampView {
  plotName: string;
  townshipLevel: number;
  zenny: number;
  citizens: TownshipCitizenView[];
  buildings: TownshipBuildingView[];
  activeBuffs: string[];
  huntingStatus: {
    windDirection: string;
    windAngle?: number;
    scentIntensity: string;
    lastCatch?: string | null;
    available: boolean;
  };
  fishingStatus: {
    spotActive: boolean;
    baitCount: number;
    lastCatch?: string | null;
  };
  recipes: CampRecipeView[];
}

export interface TelemetryData {
  fps: number;
  drawCalls: number;
  biomeName: string;
  terrainTag: TerrainTag;
}

export interface MobileHUDProps {
  /** Active overworld leader character id */
  leaderId: CharacterId;
  /** Full party + field specialist roster */
  party: HUDPartyMember[];
  /** Shared Dragon Sync Pool (for PartyHotSwapBar gauge) */
  sharedSyncPool: number;
  maxSyncPool: number;
  /** Active combat state, or null when exploring overworld */
  combatState: CombatState | null;
  /** World narrative, quest, St. Eva clue, and township registry */
  worldState: WorldStateRegistry;
  /** True Ending evaluation summary */
  trueEnding: TrueEndingEvaluation;
  /** Live telemetry + active terrain tag */
  telemetry: TelemetryData;
  /** Optional nearby interactable object/NPC/clue */
  nearbyInteractable?: NearbyInteractable | null;
  /** Optional status banner toast */
  statusBanner?: string | null;
  /** Active open drawer */
  activeDrawer: HUDDrawerId;
  /** All 6 canonical shamans with unlock & bond state */
  shamans: ShamanCatalogItem[];
  /** Unlocked/available progression relics & signature gear */
  equipment: EquipmentCatalogState;
  /** Diegetic township, hunting, fishing, and campfire cooking state */
  township: TownshipCampView;
  /** Available dragon forms for Ryu in combat */
  availableDragonForms?: DragonFormId[];

  /** Movement stick output (-1..1) */
  onMoveVector: (vector: ThumbstickVector) => void;
  /** Hot-swap overworld leader immediately */
  onSelectLeader: (characterId: CharacterId) => void;
  /** Execute contextual field action or interaction */
  onContextualAction: (action: ContextualActionSpec) => void;
  /** Start combat encounter from overworld */
  onEngageCombat: () => void;
  /** Open/close mobile drawer */
  onSetActiveDrawer: (drawer: HUDDrawerId) => void;

  /** Combat actions */
  onQueueCombatCommand: (actorId: string, command: CombatCommandDef, targetIds: string[]) => void;
  onExecuteCombatTurn: () => void;
  onCancelCombatAction?: (actorId: string) => void;
  onRevertDragonForm?: () => void;
  onExitCombat?: () => void;

  /** Quest & Clue actions */
  onInvestigateClue: (clueId: string) => void;
  onAdvanceQuestObjective?: (questId: string, objectiveId: string) => void;

  /** Shaman Fusion actions */
  onFuseShaman: (characterId: CharacterId, shamanId: ShamanId) => void;
  onUnfuseShaman: (characterId: CharacterId, shamanId: ShamanId) => void;

  /** Equipment & Relic actions */
  onEquipRelic: (characterId: CharacterId, relicId: string) => void;
  onUnequipRelic: (characterId: CharacterId, relicId: string) => void;
  onEquipSignatureGear: (characterId: CharacterId, gearId: string) => void;
  onUnequipSignatureGear: (characterId: CharacterId, gearId: string) => void;

  /** Township, Hunting, Fishing, Campfire actions */
  onRecruitCitizen: (citizenId: string) => void;
  onStartHunt?: (params?: { approachAngle: number; distance: number }) => void;
  onCastFishingLine?: (castScore?: number) => void;
  onFishingBite?: () => void;
  onCookRecipe: (recipeId: string) => void;
  onRestAtCampfire: () => void;
}
