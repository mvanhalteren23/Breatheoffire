import { World } from 'miniplex';
import type { CharacterId, EnemyAIState, TerrainTag } from '../core/types';
import {
  BIOME_LANDMARKS,
  ENEMY_TEMPLATES,
  OVERWORLD_ENEMY_SPAWNS,
  TOWNSHIP_CITIZENS,
  VERTICAL_SLICE_ROSTER,
  type Vec3Tuple,
} from '../data/verticalSliceContent';
import { updateEnemyAI, type EnemyAIActor } from './enemyAISystem';

export type WorldEntityKind =
  | 'player'
  | 'npc'
  | 'enemy'
  | 'landmark'
  | 'township_building';

export interface WorldEntity {
  id: string;
  kind: WorldEntityKind;
  position: Vec3Tuple;
  velocity: Vec3Tuple;
  facingAngle: number;
  spriteId: string;
  aiState?: EnemyAIState;
  terrainTag?: TerrainTag;
  label: string;
  // Optional enemy AI / quest metadata
  templateId?: string;
  homePos?: Vec3Tuple;
  waypoints?: Vec3Tuple[];
  waypointIndex?: number;
  moveSpeed?: number;
  camouflaged?: boolean;
  ambushTriggered?: boolean;
  linkedQuestId?: string;
  defeated?: boolean;
  citizenId?: string;
}

export const ecsWorld = new World<WorldEntity>();

export function buildDefaultOverworldEntities(
  leaderId: CharacterId = 'ryu',
  recruitedCitizens: string[] = ['kay']
): WorldEntity[] {
  const leader = VERTICAL_SLICE_ROSTER[leaderId];
  const entities: WorldEntity[] = [];

  // 1. Player lead entity
  entities.push({
    id: 'player_lead',
    kind: 'player',
    position: [0, 0, 8],
    velocity: [0, 0, 0],
    facingAngle: Math.PI,
    spriteId: leader.spriteId,
    terrainTag: 'TOWNSHIP_PLOT',
    label: leader.name,
  });

  // 2. Biome landmarks
  for (const lm of BIOME_LANDMARKS) {
    entities.push({
      id: lm.id,
      kind: 'landmark',
      position: [...lm.position],
      velocity: [0, 0, 0],
      facingAngle: 0,
      spriteId: `sprite_${lm.terrainTag.toLowerCase()}`,
      terrainTag: lm.terrainTag,
      label: lm.name,
    });
  }

  // 3. Frontier NPCs & Township citizens
  entities.push({
    id: 'npc_manillo_dock',
    kind: 'npc',
    position: [-36, 0, 22],
    velocity: [0, 0, 0],
    facingAngle: 0.4,
    spriteId: 'sprite_manillo',
    terrainTag: 'FISHING_SPOT',
    label: 'Manillo Angler',
  });

  for (const citizen of Object.values(TOWNSHIP_CITIZENS)) {
    const isRecruited = recruitedCitizens.includes(citizen.id);
    if (isRecruited) {
      entities.push({
        id: citizen.buildingId,
        kind: 'township_building',
        position: [...citizen.plotOffset],
        velocity: [0, 0, 0],
        facingAngle: 0,
        spriteId: `sprite_${citizen.buildingId}`,
        terrainTag: 'TOWNSHIP_PLOT',
        label: citizen.buildingName,
        citizenId: citizen.id,
      });
    }

    entities.push({
      id: `npc_citizen_${citizen.id}`,
      kind: 'npc',
      position: isRecruited
        ? [citizen.plotOffset[0] + 1.5, 0, citizen.plotOffset[2] + 1.5]
        : citizen.id === 'sana'
          ? [2, 0, -45]
          : citizen.id === 'barose'
            ? [55, 0, 34]
            : citizen.id === 'azuki'
              ? [-230, 0, 232]
              : citizen.id === 'leminton'
                ? [235, 0, -216]
                : [14, 0, 12],
      velocity: [0, 0, 0],
      facingAngle: 0,
      spriteId: `sprite_npc_${citizen.id}`,
      terrainTag: isRecruited ? 'TOWNSHIP_PLOT' : 'GRASS',
      label: `${citizen.name} (${citizen.roleTitle})`,
      citizenId: citizen.id,
    });
  }

  // 4. Enemy patrols & ambushers
  for (const spawn of OVERWORLD_ENEMY_SPAWNS) {
    const tpl = ENEMY_TEMPLATES[spawn.templateId];
    entities.push({
      id: spawn.instanceId,
      kind: 'enemy',
      position: [...spawn.homePos],
      velocity: [0, 0, 0],
      facingAngle: 0,
      spriteId: tpl.spriteId,
      aiState: tpl.initialAIState,
      terrainTag: 'GRASS',
      label: tpl.name,
      templateId: tpl.templateId,
      homePos: [...spawn.homePos],
      waypoints: spawn.waypoints.map((wp) => [...wp]),
      waypointIndex: 0,
      moveSpeed: tpl.moveSpeed,
      camouflaged: tpl.initialAIState === 'Ambush',
      ambushTriggered: false,
      linkedQuestId: spawn.linkedQuestId,
      defeated: false,
    });
  }

  return entities;
}

export function resetEcsWorld(
  worldInstance: World<WorldEntity> = ecsWorld,
  leaderId: CharacterId = 'ryu',
  recruitedCitizens: string[] = ['kay']
): World<WorldEntity> {
  worldInstance.clear();
  const entities = buildDefaultOverworldEntities(leaderId, recruitedCitizens);
  for (const entity of entities) {
    worldInstance.add(entity);
  }
  return worldInstance;
}

export function syncPlayerEntityInWorld(
  worldInstance: World<WorldEntity>,
  playerPos: Vec3Tuple,
  velocity: Vec3Tuple,
  facingAngle: number,
  leaderId: CharacterId,
  terrainTag: TerrainTag
): void {
  const leader = VERTICAL_SLICE_ROSTER[leaderId];
  const player = worldInstance.entities.find((e) => e.id === 'player_lead');
  if (!player) return;
  player.position = [...playerPos];
  player.velocity = [...velocity];
  player.facingAngle = facingAngle;
  player.spriteId = leader.spriteId;
  player.label = leader.name;
  player.terrainTag = terrainTag;
}

export function stepEnemyEntitiesInWorld(
  worldInstance: World<WorldEntity>,
  playerPos: Vec3Tuple,
  playerVelocity: Vec3Tuple,
  dt: number
): { engagedEnemy: WorldEntity | null } {
  let engagedEnemy: WorldEntity | null = null;

  for (const entity of worldInstance.with('kind', 'aiState')) {
    if (entity.kind !== 'enemy' || entity.defeated) continue;

    const actor: EnemyAIActor = {
      id: entity.id,
      templateId: entity.templateId ?? 'harpy_scout',
      position: entity.position,
      velocity: entity.velocity,
      facingAngle: entity.facingAngle,
      aiState: entity.aiState,
      homePos: entity.homePos ?? entity.position,
      waypoints: entity.waypoints ?? [entity.position],
      waypointIndex: entity.waypointIndex ?? 0,
      moveSpeed: entity.moveSpeed ?? 4.2,
      camouflaged: entity.camouflaged,
      ambushTriggered: entity.ambushTriggered,
    };

    const result = updateEnemyAI(actor, playerPos, playerVelocity, dt);
    entity.position = result.enemy.position;
    entity.velocity = result.enemy.velocity;
    entity.facingAngle = result.enemy.facingAngle;
    entity.aiState = result.enemy.aiState;
    entity.waypointIndex = result.enemy.waypointIndex;
    entity.camouflaged = result.enemy.camouflaged;
    entity.ambushTriggered = result.enemy.ambushTriggered;

    if (result.shouldEngageCombat && !engagedEnemy) {
      engagedEnemy = entity;
    }
  }

  return { engagedEnemy };
}

// Initialize the singleton ECS world on module load
resetEcsWorld(ecsWorld);
