import type { EnemyAIState } from '../core/types';
import {
  CONTINENT_PLAYABLE_LIMIT,
  type Vec3Tuple,
} from '../data/verticalSliceContent';

export const PATROL_SIGHT_RADIUS = 16;
export const PATROL_SIGHT_CONE_COS = 0.25; // ~151 deg forward cone
export const PATROL_NOISE_RADIUS = 11;
export const AGGRO_DROP_RADIUS = 28;
export const AMBUSH_TRIGGER_RADIUS = 9;
export const AMBUSH_LUNGE_MULTIPLIER = 1.45;
export const COMBAT_ENGAGEMENT_RADIUS = 2.6;

export interface EnemyAIActor {
  id: string;
  templateId: string;
  position: Vec3Tuple;
  velocity: Vec3Tuple;
  facingAngle: number;
  aiState: EnemyAIState;
  homePos: Vec3Tuple;
  waypoints: Vec3Tuple[];
  waypointIndex: number;
  moveSpeed: number;
  camouflaged?: boolean;
  ambushTriggered?: boolean;
  sightRadius?: number;
  dropAggroRadius?: number;
  ambushRadius?: number;
  engagementRadius?: number;
}

export interface EnemyAIUpdateResult {
  enemy: EnemyAIActor;
  distanceToPlayer: number;
  shouldEngageCombat: boolean;
  stateChanged: boolean;
  previousState: EnemyAIState;
  nextState: EnemyAIState;
}

function clampCoord(v: number): number {
  return Math.max(-CONTINENT_PLAYABLE_LIMIT, Math.min(CONTINENT_PLAYABLE_LIMIT, v));
}

function distanceXZ(a: Vec3Tuple, b: Vec3Tuple): number {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

function moveTowardXZ(
  origin: Vec3Tuple,
  target: Vec3Tuple,
  speed: number,
  dt: number
): { position: Vec3Tuple; velocity: Vec3Tuple; facingAngle: number } {
  const dx = target[0] - origin[0];
  const dz = target[2] - origin[2];
  const dist = Math.hypot(dx, dz);

  if (dist < 1e-5 || speed <= 0 || dt <= 0) {
    return {
      position: [origin[0], origin[1], origin[2]],
      velocity: [0, 0, 0],
      facingAngle: dist >= 1e-5 ? Math.atan2(dx, dz) : 0,
    };
  }

  const nx = dx / dist;
  const nz = dz / dist;
  const step = Math.min(dist, speed * dt);

  return {
    position: [
      clampCoord(origin[0] + nx * step),
      origin[1],
      clampCoord(origin[2] + nz * step),
    ],
    velocity: [nx * speed, 0, nz * speed],
    facingAngle: Math.atan2(nx, nz),
  };
}

function isPlayerInsideSightCone(
  enemyPos: Vec3Tuple,
  enemyFacingAngle: number,
  playerPos: Vec3Tuple,
  playerVelocity: Vec3Tuple,
  sightRadius: number
): boolean {
  const dx = playerPos[0] - enemyPos[0];
  const dz = playerPos[2] - enemyPos[2];
  const dist = Math.hypot(dx, dz);
  if (dist > sightRadius) {
    return false;
  }
  if (dist < 4.5) {
    return true;
  }

  // Sprinting players create audible trail noise inside closer perimeter
  const playerSpeed = Math.hypot(playerVelocity[0], playerVelocity[2]);
  if (playerSpeed >= 6.5 && dist <= PATROL_NOISE_RADIUS) {
    return true;
  }

  const forwardX = Math.sin(enemyFacingAngle);
  const forwardZ = Math.cos(enemyFacingAngle);
  const dirX = dx / dist;
  const dirZ = dz / dist;
  const dot = forwardX * dirX + forwardZ * dirZ;
  return dot >= PATROL_SIGHT_CONE_COS;
}

export function updateEnemyAI(
  enemy: EnemyAIActor,
  playerPos: Vec3Tuple,
  playerVelocity: Vec3Tuple,
  dt: number
): EnemyAIUpdateResult {
  const safeDt = Math.max(0, Math.min(dt, 0.1));
  const sightRadius = enemy.sightRadius ?? PATROL_SIGHT_RADIUS;
  const dropAggroRadius = enemy.dropAggroRadius ?? AGGRO_DROP_RADIUS;
  const ambushRadius = enemy.ambushRadius ?? AMBUSH_TRIGGER_RADIUS;
  const engagementRadius = enemy.engagementRadius ?? COMBAT_ENGAGEMENT_RADIUS;

  const previousState = enemy.aiState;
  const distToPlayer = distanceXZ(enemy.position, playerPos);

  let nextState: EnemyAIState = enemy.aiState;
  let nextPos: Vec3Tuple = [enemy.position[0], enemy.position[1], enemy.position[2]];
  let nextVel: Vec3Tuple = [0, 0, 0];
  let nextFacing = enemy.facingAngle;
  let nextWaypointIdx = enemy.waypointIndex;
  let camouflaged = enemy.camouflaged ?? enemy.aiState === 'Ambush';
  let ambushTriggered = enemy.ambushTriggered ?? false;

  if (enemy.aiState === 'Patrol') {
    camouflaged = false;
    ambushTriggered = false;

    const spotted = isPlayerInsideSightCone(
      enemy.position,
      enemy.facingAngle,
      playerPos,
      playerVelocity,
      sightRadius
    );

    if (spotted) {
      nextState = 'Aggro_Sight';
    } else {
      const waypoints =
        enemy.waypoints.length > 0 ? enemy.waypoints : [enemy.homePos];
      const safeIdx =
        ((enemy.waypointIndex % waypoints.length) + waypoints.length) %
        waypoints.length;
      const targetWaypoint = waypoints[safeIdx];

      if (distanceXZ(enemy.position, targetWaypoint) <= 0.65) {
        nextWaypointIdx = (safeIdx + 1) % waypoints.length;
      }

      const activeWaypoint = waypoints[nextWaypointIdx] ?? enemy.homePos;
      const moved = moveTowardXZ(
        enemy.position,
        activeWaypoint,
        enemy.moveSpeed * 0.65,
        safeDt
      );
      nextPos = moved.position;
      nextVel = moved.velocity;
      if (Math.hypot(moved.velocity[0], moved.velocity[2]) > 0.01) {
        nextFacing = moved.facingAngle;
      }
    }
  }

  if (nextState === 'Aggro_Sight') {
    camouflaged = false;
    if (distToPlayer > dropAggroRadius) {
      nextState = 'Patrol';
      const returnMove = moveTowardXZ(
        enemy.position,
        enemy.homePos,
        enemy.moveSpeed * 0.75,
        safeDt
      );
      nextPos = returnMove.position;
      nextVel = returnMove.velocity;
      nextFacing = returnMove.facingAngle;
    } else {
      // Slight deterministic lead using player velocity
      const leadTarget: Vec3Tuple = [
        clampCoord(playerPos[0] + playerVelocity[0] * 0.2),
        playerPos[1],
        clampCoord(playerPos[2] + playerVelocity[2] * 0.2),
      ];
      const chaseTarget = distToPlayer < 4.5 ? playerPos : leadTarget;
      const moved = moveTowardXZ(
        enemy.position,
        chaseTarget,
        enemy.moveSpeed,
        safeDt
      );
      nextPos = moved.position;
      nextVel = moved.velocity;
      nextFacing = moved.facingAngle;
    }
  } else if (nextState === 'Ambush') {
    if (!ambushTriggered) {
      if (distToPlayer <= ambushRadius) {
        ambushTriggered = true;
        camouflaged = false;
      } else {
        camouflaged = true;
        nextVel = [0, 0, 0];
        nextFacing = Math.atan2(
          playerPos[0] - enemy.position[0],
          playerPos[2] - enemy.position[2]
        );
      }
    }

    if (ambushTriggered) {
      if (distToPlayer > dropAggroRadius) {
        // Reset ambush back to camouflaged home anchor if player escapes far away
        ambushTriggered = false;
        camouflaged = true;
        const resetMove = moveTowardXZ(
          enemy.position,
          enemy.homePos,
          enemy.moveSpeed,
          safeDt
        );
        nextPos = resetMove.position;
        nextVel = resetMove.velocity;
        nextFacing = resetMove.facingAngle;
      } else {
        camouflaged = false;
        const lungeMove = moveTowardXZ(
          enemy.position,
          playerPos,
          enemy.moveSpeed * AMBUSH_LUNGE_MULTIPLIER,
          safeDt
        );
        nextPos = lungeMove.position;
        nextVel = lungeMove.velocity;
        nextFacing = lungeMove.facingAngle;
      }
    }
  }

  const updatedDist = distanceXZ(nextPos, playerPos);
  const shouldEngageCombat =
    updatedDist <= engagementRadius &&
    (nextState === 'Aggro_Sight' ||
      (nextState === 'Ambush' && ambushTriggered));

  const updatedEnemy: EnemyAIActor = {
    ...enemy,
    position: nextPos,
    velocity: nextVel,
    facingAngle: nextFacing,
    aiState: nextState,
    waypointIndex: nextWaypointIdx,
    camouflaged,
    ambushTriggered,
  };

  return {
    enemy: updatedEnemy,
    distanceToPlayer: updatedDist,
    shouldEngageCombat,
    stateChanged: previousState !== nextState,
    previousState,
    nextState,
  };
}
