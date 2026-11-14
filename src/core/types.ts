export type CharacterId =
  | 'ryu'
  | 'bow'
  | 'katt'
  | 'rand'
  | 'nina'
  | 'jean'
  | 'sten'
  | 'spar'
  | 'bleu';

export type ShamanId = 'sana' | 'seso' | 'spoo' | 'solo' | 'seny' | 'shin';

export type ElementType =
  | 'neutral'
  | 'fire'
  | 'ice'
  | 'thunder'
  | 'wind'
  | 'earth'
  | 'holy'
  | 'shadow';

export type DragonFormId =
  | 'puppy'
  | 'fire_whelpling'
  | 'ice_whelpling'
  | 'thunder_whelpling'
  | 'fire_dragon'
  | 'ice_dragon'
  | 'thunder_dragon'
  | 'great_dragon'
  | 'kaiser_dragon';

export type ContinentalBiomeId =
  | 'frontier'
  | 'gate'
  | 'windia'
  | 'highfort'
  | 'simafort'
  | 'tunlan'
  | 'capitan'
  | 'infinity';

export type CombatPhase =
  | 'INIT'
  | 'COMMAND_SELECT'
  | 'RESOLVE_QUEUE'
  | 'CHECK_VICTORY'
  | 'VICTORY'
  | 'DEFEAT';

export type QuestStage = 'HIDDEN' | 'DISCOVERED' | 'ACTIVE' | 'COMPLETED';

export type TerrainTag =
  | 'PATH'
  | 'GRASS'
  | 'FOREST_THICKET'
  | 'FISHING_SPOT'
  | 'HUNTING_TRAIL'
  | 'BOULDER_CRACK'
  | 'CLIFF_GAP'
  | 'CHASM_POST'
  | 'SHALLOW_WATER'
  | 'DRAGON_SHRINE'
  | 'TOWNSHIP_PLOT'
  | 'COURSAIR_GATE'
  | 'GATE_FISSURE'
  | 'WIND_UPDRAFT'
  | 'HIGHFORT_GEAR'
  | 'SIMAFORT_MIRE'
  | 'TUNLAN_TIDE'
  | 'CAPITAN_SHORE'
  | 'INFINITY_VOID';

export type FieldActionId =
  | 'dragon_sight'
  | 'fishing'
  | 'hunting_shot'
  | 'daunting_dash'
  | 'terrain_roll'
  | 'wind_glide'
  | 'water_leap'
  | 'grapple_reach'
  | 'forest_commune'
  | 'arcane_warp';

export type EnemyAIState = 'Patrol' | 'Aggro_Sight' | 'Ambush';

export interface StatBlock {
  maxHp: number;
  maxAp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  luck: number;
}

export interface CombatCommandDef {
  id: string;
  label: string;
  apCost: number;
  syncCost?: number;
  powerMultiplier: number;
  element: ElementType;
  targetType: 'single_enemy' | 'all_enemies' | 'self' | 'ally' | 'all_allies';
  kind: 'attack' | 'skill' | 'heal' | 'dragon_transform' | 'shaman_rebind' | 'defend';
  dragonFormId?: DragonFormId;
  description: string;
}

export type SignatureHookType =
  | 'ELEMENTAL_CONVERSION'
  | 'COMBO_CHAIN'
  | 'DRAGON_AP_DRAIN_REDUCTION'
  | 'COUNTER_STANCE';

export interface SignatureHookDef {
  type: SignatureHookType;
  label: string;
  description: string;
  element?: ElementType;
  comboChance?: number;
  comboDamageRatio?: number;
  apDrainMultiplier?: number;
  counterChance?: number;
  counterDamageRatio?: number;
}

export interface RelicScalingRule {
  stat: keyof StatBlock;
  base: number;
  perLevel: number;
  perLiberatedRegion: number;
  perShamanResonance: number;
  perLoyaltyTier?: number;
}

export interface ProgressionRelicDef {
  id: string;
  name: string;
  archetype: 'PROGRESSION_RELIC';
  slot: 'relic';
  lore: string;
  scalingRules: RelicScalingRule[];
  dragonApReductionPerRegion?: number;
}

export interface SignatureGearDef {
  id: string;
  name: string;
  archetype: 'SIGNATURE_GEAR';
  slot: 'weapon' | 'armor' | 'accessory';
  ownerId?: CharacterId;
  lore: string;
  flatStats: Partial<StatBlock>;
  hooks: SignatureHookDef[];
}

export type EquipmentItemDef = ProgressionRelicDef | SignatureGearDef;

export interface ScalingContext {
  characterLevel: number;
  liberatedRegions: number;
  shamanResonanceRank: number;
  loyalty: number;
}

export interface ComputedRelicEvaluation {
  relicId: string;
  name: string;
  bonuses: StatBlock;
  dragonApReductionRatio: number;
  formulaLines: string[];
}

export interface ComputedEquipmentSummary {
  flatBonuses: StatBlock;
  hooks: SignatureHookDef[];
  dragonApCostMultiplier: number;
  convertedAttackElement: ElementType | null;
  relicEvaluations: ComputedRelicEvaluation[];
}

export interface ShamanDefinition {
  id: ShamanId;
  name: string;
  element: ElementType;
  auraColor: string;
  statMultipliers: Partial<Record<keyof StatBlock, number>>;
  flatBonuses: Partial<StatBlock>;
  grantedCommands: CombatCommandDef[];
  lore: string;
}

export interface CombatantInput {
  id: CharacterId;
  name: string;
  level: number;
  hp: number;
  ap: number;
  baseStats: StatBlock;
  element: ElementType;
  spriteId: string;
  loyalty: number;
  equippedRelicIds: string[];
  equippedSignatureIds: string[];
  shamanIds: ShamanId[];
  isArmorBroken: boolean;
  armorBreakTurnsRemaining: number;
  commands: CombatCommandDef[];
}

export interface DecoratedCombatant {
  id: CharacterId;
  name: string;
  level: number;
  hp: number;
  ap: number;
  stats: StatBlock;
  element: ElementType;
  spriteId: string;
  auraColor: string | null;
  fusionTitle: string | null;
  shamanIds: ShamanId[];
  isArmorBroken: boolean;
  armorBreakTurnsRemaining: number;
  commands: CombatCommandDef[];
  equipmentSummary: ComputedEquipmentSummary;
}

export interface EnemyCombatant {
  instanceId: string;
  templateId: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  element: ElementType;
  weakness: ElementType;
  spriteId: string;
  aiState: EnemyAIState;
  xpReward: number;
  zennyReward: number;
}

export interface QueuedCombatAction {
  actorId: string;
  actorSide: 'party' | 'enemy';
  command: CombatCommandDef;
  targetIds: string[];
  speed: number;
}

export interface DragonFormState {
  activeForm: DragonFormId | null;
  turnsSustained: number;
  baseApPerTurn: number;
  baseSyncPerTurn: number;
  effectiveApPerTurn: number;
  effectiveSyncPerTurn: number;
}

export interface CombatLogEntry {
  turn: number;
  text: string;
  kind: 'action' | 'dragon' | 'shaman' | 'hook' | 'system';
}

export interface CombatState {
  phase: CombatPhase;
  turnNumber: number;
  party: DecoratedCombatant[];
  enemies: EnemyCombatant[];
  sharedSyncPool: number;
  maxSyncPool: number;
  dragonState: DragonFormState;
  selectedActorIndex: number;
  commandQueue: QueuedCombatAction[];
  log: CombatLogEntry[];
  victoryRewards: {
    xp: number;
    zenny: number;
  } | null;
}

export interface QuestObjectiveDef {
  id: string;
  description: string;
  completed: boolean;
}

export interface QuestDefinition {
  id: string;
  title: string;
  category: 'MAIN_STORY' | 'COMPANION_ARC' | 'ST_EVA_RUMOR';
  act: 1 | 2 | 3;
  companionId?: CharacterId;
  stage: QuestStage;
  summary: string;
  objectives: QuestObjectiveDef[];
  rewardRelicId?: string;
  rewardSignatureId?: string;
  unlocksFlags: string[];
}

export interface StEvaClue {
  id: string;
  title: string;
  location: string;
  summary: string;
  discovered: boolean;
  verified: boolean;
}

export type CampaignEndingPath = 'PENDING' | 'NORMAL' | 'TRUE_ENDING';

export interface ShamanModifierTableRow {
  shamanId: ShamanId;
  name: string;
  element: ElementType;
  auraColor: string;
  statMultipliers: Partial<Record<keyof StatBlock, number>>;
  flatBonuses: Partial<StatBlock>;
  grantedCommandIds: string[];
  synergyPair?: ShamanId;
  miracleTitleSuffix?: string;
}

export interface WorldStateRegistry {
  flags: Record<string, boolean>;
  currentAct: 1 | 2 | 3;
  liberatedRegions: string[];
  shamanResonanceRank: number;
  companionLoyalty: Record<CharacterId, number>;
  quests: Record<string, QuestDefinition>;
  stEvaClues: Record<string, StEvaClue>;
  recruitedCitizens: string[];
  townshipBuildings: string[];
  infinityUnlocked?: boolean;
  deathevanDefeated?: boolean;
  endingPath?: CampaignEndingPath;
}

export interface TrueEndingEvaluation {
  isUnlocked: boolean;
  evanCluesVerified: number;
  requiredClues: number;
  liberatedRegionsCount: number;
  requiredRegions: number;
  avgCompanionLoyalty: number;
  requiredLoyalty: number;
  shamanResonanceRank: number;
  infinityUnlocked?: boolean;
  deathevanDefeated?: boolean;
  endingPath?: CampaignEndingPath;
  missingConditions: string[];
}
