import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CharacterId } from './core/types';
import {
  PROGRESSION_RELICS,
  SHAMAN_DEFINITIONS,
  SIGNATURE_GEAR_CATALOG,
  decorateCombatant,
  evaluateRelicScaling,
} from './core';
import {
  ACTIVE_STARTER_PARTY_IDS,
  ALL_CHARACTER_IDS,
  ALL_DRAGON_FORMS,
  BIOME_LANDMARKS,
  CAMPFIRE_RECIPES,
  ENEMY_TEMPLATES,
  TOWNSHIP_CITIZENS,
  VERTICAL_SLICE_ROSTER,
} from './data/verticalSliceContent';
import { WorldCanvas, type WorldEntityProp, type WorldInteractableProp } from './engine/WorldCanvas';
import type { EngineTelemetry } from './engine/ChunkStreamer';
import { getChunkCoordsAtWorldPos, getChunkDefinition } from './engine/continentalChunks';
import { ecsWorld } from './systems/ecsWorld';
import { triggerFishingBiteHaptic } from './systems/capacitorBridge';
import { canRecruitCitizen, getTownshipSnapshot } from './systems/townshipSystem';
import { useGameStore } from './systems/gameStore';
import { MobileHUD } from './ui/MobileHUD';
import type {
  ContextualActionSpec,
  EquipmentCatalogState,
  HUDPartyMember,
  NearbyInteractable,
  ShamanCatalogItem,
  TownshipCampView,
} from './ui/hudTypes';

const ROLE_LABELS: Record<CharacterId, string> = {
  ryu: 'Dragon Vanguard',
  bow: 'Exiled Ranger',
  katt: 'Coliseum Striker',
  rand: 'Armadillo Sentinel',
  nina: 'Wyndian Mage',
  jean: 'Frog Cavalier',
  sten: 'Highlander Rogue',
  spar: 'Grassman Sage',
  bleu: 'Ancient Serpent Mage',
};

function normalizeSpriteId(spriteId: string): string {
  if (spriteId.startsWith('sprite_')) {
    return spriteId.slice('sprite_'.length);
  }
  return spriteId;
}

function getWindDirectionLabel(rad: number): string {
  const deg = ((rad * 180) / Math.PI + 360) % 360;
  if (deg < 45 || deg >= 315) return 'North-East Breeze';
  if (deg < 135) return 'Eastward Gale';
  if (deg < 225) return 'South-West Draft';
  return 'Westward Updraft';
}

export const App: React.FC = () => {
  const playerPos = useGameStore((s) => s.playerPos);
  const playerVelocity = useGameStore((s) => s.playerVelocity);
  const leaderId = useGameStore((s) => s.leaderId);
  const facingAngle = useGameStore((s) => s.facingAngle);
  const activeTerrainTag = useGameStore((s) => s.activeTerrainTag);
  const inputVector = useGameStore((s) => s.inputVector);
  const activeDrawer = useGameStore((s) => s.activeDrawer);
  const worldRegistry = useGameStore((s) => s.worldRegistry);
  const partyRoster = useGameStore((s) => s.partyRoster);
  const activePartyIds = useGameStore((s) => s.activePartyIds);
  const equippedRelics = useGameStore((s) => s.equippedRelics);
  const equippedSignatures = useGameStore((s) => s.equippedSignatures);
  const fusedShamans = useGameStore((s) => s.fusedShamans);
  const unlockedShamans = useGameStore((s) => s.unlockedShamans);
  const ownedEquipmentIds = useGameStore((s) => s.ownedEquipmentIds);
  const inventory = useGameStore((s) => s.inventory);
  const zenny = useGameStore((s) => s.zenny);
  const sharedSyncPool = useGameStore((s) => s.sharedSyncPool);
  const windAngle = useGameStore((s) => s.windAngle);
  const activeMealBuff = useGameStore((s) => s.activeMealBuff);
  const lastCatchLabel = useGameStore((s) => s.lastCatchLabel);
  const statusBanner = useGameStore((s) => s.statusBanner);
  const combatState = useGameStore((s) => s.combatState);
  const fpsTelemetry = useGameStore((s) => s.fpsTelemetry);

  const setInputVector = useGameStore((s) => s.setInputVector);
  const setActiveDrawer = useGameStore((s) => s.setActiveDrawer);
  const movePlayer = useGameStore((s) => s.movePlayer);
  const hotSwapLeader = useGameStore((s) => s.hotSwapLeader);
  const triggerContextualFieldAction = useGameStore((s) => s.triggerContextualFieldAction);
  const startEncounter = useGameStore((s) => s.startEncounter);
  const submitCombatCommand = useGameStore((s) => s.submitCombatCommand);
  const runCombatTurn = useGameStore((s) => s.runCombatTurn);
  const exitCombat = useGameStore((s) => s.exitCombat);
  const toggleShamanFusion = useGameStore((s) => s.toggleShamanFusion);
  const equipItem = useGameStore((s) => s.equipItem);
  const recruitCitizen = useGameStore((s) => s.recruitCitizen);
  const discoverOrAdvanceClue = useGameStore((s) => s.discoverOrAdvanceClue);
  const advanceQuestObjective = useGameStore((s) => s.advanceQuestObjective);
  const startHunt = useGameStore((s) => s.startHunt);
  const castFishingLine = useGameStore((s) => s.castFishingLine);
  const cookMeal = useGameStore((s) => s.cookMeal);
  const updateFpsTelemetry = useGameStore((s) => s.updateFpsTelemetry);
  const getScalingContext = useGameStore((s) => s.getScalingContext);
  const getTrueEndingEvaluation = useGameStore((s) => s.getTrueEndingEvaluation);

  const [hitFlashActive, setHitFlashActive] = useState(false);
  const inputRef = useRef(inputVector);
  inputRef.current = inputVector;
  const combatRef = useRef(combatState);
  combatRef.current = combatState;

  // Fixed-step overworld movement driver
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const vec = inputRef.current;
      if (!combatRef.current && (Math.abs(vec.x) > 0.02 || Math.abs(vec.y) > 0.02)) {
        movePlayer(vec.x, vec.y, dt);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [movePlayer]);

  // Keep telemetry synced cleanly from R3F engine
  const handleEngineTelemetry = useMemo(() => {
    return (t: EngineTelemetry) => {
      updateFpsTelemetry(t.fps, t.drawCalls, t.fps > 0 ? 1000 / t.fps : 16.6);
    };
  }, [updateFpsTelemetry]);

  // Decorated HUD party list
  const hudParty = useMemo<HUDPartyMember[]>(() => {
    return ALL_CHARACTER_IDS.map((id) => {
      const base = partyRoster[id] ?? VERTICAL_SLICE_ROSTER[id];
      const ctx = getScalingContext(id);
      const decorated = decorateCombatant(base, ctx);
      const isActiveParty =
        activePartyIds.includes(id) || ACTIVE_STARTER_PARTY_IDS.includes(id);

      return {
        id,
        name: decorated.name,
        role: ROLE_LABELS[id],
        isActiveParty,
        level: decorated.level,
        hp: decorated.hp,
        maxHp: decorated.stats.maxHp,
        ap: decorated.ap,
        maxAp: decorated.stats.maxAp,
        element: decorated.element,
        shamanIds: decorated.shamanIds,
        fusionTitle: decorated.fusionTitle,
        auraColor: decorated.auraColor,
        isArmorBroken: decorated.isArmorBroken,
        armorBreakTurnsRemaining: decorated.armorBreakTurnsRemaining,
        loyalty: worldRegistry.companionLoyalty[id] ?? base.loyalty,
        equippedRelicIds: equippedRelics[id] ?? [],
        equippedSignatureIds: equippedSignatures[id] ?? [],
        computedStats: decorated.stats,
        relicEvaluations: decorated.equipmentSummary.relicEvaluations,
        activeHooks: decorated.equipmentSummary.hooks,
      };
    });
  }, [
    partyRoster,
    activePartyIds,
    equippedRelics,
    equippedSignatures,
    worldRegistry,
    getScalingContext,
  ]);

  const leaderDecorated = useMemo(() => {
    const base = partyRoster[leaderId];
    return decorateCombatant(base, getScalingContext(leaderId));
  }, [partyRoster, leaderId, getScalingContext]);

  const playerSpriteId = useMemo(() => {
    if (combatState?.dragonState.activeForm && leaderId === 'ryu') {
      return 'ryu_dragon';
    }
    return normalizeSpriteId(leaderDecorated.spriteId);
  }, [combatState, leaderId, leaderDecorated.spriteId]);

  const partyFollowerProps = useMemo<WorldEntityProp[]>(() => {
    const inCombat = combatState !== null;
    const combatOrigin = playerPos;
    const followerIds = activePartyIds.filter((id) => id !== leaderId);

    return followerIds.map((id, idx) => {
      const base = partyRoster[id];
      const dec = decorateCombatant(base, getScalingContext(id));
      const combatMember = combatState?.party.find((p) => p.id === id);

      const offsetX = inCombat ? (idx === 0 ? -2.2 : 2.2) : idx === 0 ? -2.1 : 2.1;
      const offsetZ = inCombat ? 1.8 : 1.7;

      return {
        id,
        spriteId: normalizeSpriteId(dec.spriteId),
        name: dec.name,
        position: [
          combatOrigin[0] + offsetX,
          0,
          combatOrigin[2] + offsetZ,
        ],
        facingAngle,
        isMoving: Math.hypot(playerVelocity[0], playerVelocity[2]) > 0.1,
        auraColor: dec.auraColor,
        auraIntensity: dec.shamanIds.length > 0 ? 0.7 : 0,
        hitFlash: combatMember && combatMember.hp <= 0 ? 0.7 : 0,
      };
    });
  }, [
    combatState,
    playerPos,
    activePartyIds,
    leaderId,
    partyRoster,
    facingAngle,
    playerVelocity,
    getScalingContext,
  ]);

  const worldEnemyProps = useMemo<WorldEntityProp[]>(() => {
    if (combatState) {
      return combatState.enemies
        .filter((e) => e.hp > 0)
        .map((enemy, idx, arr) => {
          const spread = (idx - (arr.length - 1) / 2) * 2.6;
          return {
            id: enemy.instanceId,
            spriteId: normalizeSpriteId(enemy.spriteId),
            name: enemy.name,
            position: [playerPos[0] + spread, 0, playerPos[2] - 5.2],
            facingAngle: 0,
            isMoving: false,
            scale: enemy.templateId === 'augus_enforcer' ? 2.25 : 1.95,
            hitFlash: hitFlashActive ? 0.85 : 0,
          };
        });
    }

    return ecsWorld.entities
      .filter((e) => e.kind === 'enemy' && !e.defeated)
      .map((e) => ({
        id: e.id,
        spriteId: normalizeSpriteId(e.spriteId),
        name: e.label,
        position: e.position,
        facingAngle: e.facingAngle,
        isMoving: Math.hypot(e.velocity[0], e.velocity[2]) > 0.05,
        scale: e.templateId === 'augus_enforcer' ? 2.25 : 1.95,
        auraColor: e.aiState === 'Aggro_Sight' ? '#ef4444' : e.aiState === 'Ambush' ? '#a855f7' : null,
        auraIntensity: e.aiState === 'Patrol' ? 0 : 0.45,
      }));
  }, [combatState, playerPos, hitFlashActive, worldRegistry]);

  const worldNpcProps = useMemo<WorldEntityProp[]>(() => {
    return [
      {
        id: 'npc_sana',
        spriteId: 'sana',
        name: 'Sana (Flame Shaman)',
        position: [-2.5, 0, -49],
        facingAngle: 0,
        auraColor: '#ff7029',
        auraIntensity: 0.75,
      },
      {
        id: 'npc_seso',
        spriteId: 'seso',
        name: 'Seso (Water Shaman)',
        position: [-62, 0, 44],
        facingAngle: 0.25,
        auraColor: '#38bdf8',
        auraIntensity: 0.75,
      },
      {
        id: 'npc_hanz',
        spriteId: 'citizen',
        name: 'Hanz (Township Steward)',
        position: [-8, 0, 2],
        facingAngle: 0.35,
      },
      {
        id: 'npc_barose',
        spriteId: 'citizen',
        name: 'Barose (St. Eva Archivist)',
        position: [54, 0, 34],
        facingAngle: -0.4,
      },
    ];
  }, []);

  const interactables = useMemo<WorldInteractableProp[]>(() => {
    const colorMap: Record<string, string> = {
      TOWNSHIP_PLOT: '#a78bfa',
      FISHING_SPOT: '#38bdf8',
      DRAGON_SHRINE: '#facc15',
      HUNTING_TRAIL: '#4ade80',
      COURSAIR_GATE: '#fb923c',
      SHALLOW_WATER: '#22d3ee',
      BOULDER_CRACK: '#d97706',
      CLIFF_GAP: '#60a5fa',
      CHASM_POST: '#c084fc',
      FOREST_THICKET: '#34d399',
    };
    return BIOME_LANDMARKS.map((lm) => ({
      id: lm.id,
      label: lm.name,
      terrainTag: lm.terrainTag,
      position: lm.position,
      color: colorMap[lm.terrainTag] ?? '#facc15',
    }));
  }, []);

  const nearbyInteractable = useMemo<NearbyInteractable | null>(() => {
    let closest: { dist: number; item: NearbyInteractable } | null = null;
    for (const lm of BIOME_LANDMARKS) {
      const dist = Math.hypot(
        playerPos[0] - lm.position[0],
        playerPos[2] - lm.position[2]
      );
      if (dist <= lm.radius + 3 && (!closest || dist < closest.dist)) {
        const kindMap: Record<string, NearbyInteractable['kind']> = {
          TOWNSHIP_PLOT: 'township',
          FISHING_SPOT: 'fishing',
          DRAGON_SHRINE: 'shrine',
          HUNTING_TRAIL: 'hunting',
          COURSAIR_GATE: 'gate',
        };
        closest = {
          dist,
          item: {
            id: lm.id,
            label: lm.name,
            kind: kindMap[lm.terrainTag] ?? 'obstacle',
          },
        };
      }
    }
    return closest?.item ?? null;
  }, [playerPos]);

  const shamanCatalog = useMemo<ShamanCatalogItem[]>(() => {
    return Object.values(SHAMAN_DEFINITIONS).map((def) => {
      const bondedChar =
        (Object.keys(fusedShamans) as CharacterId[]).find((charId) =>
          fusedShamans[charId]?.includes(def.id)
        ) ?? null;

      return {
        ...def,
        unlocked: unlockedShamans.includes(def.id),
        bondedToCharacterId: bondedChar,
      };
    });
  }, [fusedShamans, unlockedShamans]);

  const equipmentCatalog = useMemo<EquipmentCatalogState>(() => {
    const ctx = getScalingContext(leaderId);
    return {
      relics: Object.values(PROGRESSION_RELICS).map((relic) => ({
        ...relic,
        unlocked: ownedEquipmentIds.includes(relic.id) || relic.id === 'relic_dragon_tear',
        evaluation: evaluateRelicScaling(relic, ctx),
      })),
      signatureGear: Object.values(SIGNATURE_GEAR_CATALOG).map((gear) => ({
        ...gear,
        unlocked:
          ownedEquipmentIds.includes(gear.id) ||
          gear.id === 'sig_coliseum_fang' ||
          gear.id === 'sig_rangers_alibi',
      })),
      scalingContext: ctx,
    };
  }, [leaderId, ownedEquipmentIds, getScalingContext]);

  const townshipView = useMemo<TownshipCampView>(() => {
    const snap = getTownshipSnapshot(worldRegistry);
    const activeBuffs: string[] = [];
    if (snap.passiveBuffs.atkPercent > 0) {
      activeBuffs.push(`Party ATK +${snap.passiveBuffs.atkPercent}%`);
    }
    if (snap.passiveBuffs.syncMaxBonus > 0) {
      activeBuffs.push(`Max Sync +${snap.passiveBuffs.syncMaxBonus}`);
    }
    if (snap.passiveBuffs.dragonApDiscountPercent > 0) {
      activeBuffs.push(`Dragon AP -${snap.passiveBuffs.dragonApDiscountPercent}%`);
    }
    if (activeMealBuff) {
      activeBuffs.push(
        `${activeMealBuff.name} (+${activeMealBuff.atkBonus} ATK / +${activeMealBuff.defBonus} DEF)`
      );
    }

    return {
      plotName: 'Township Starter Plot',
      townshipLevel: snap.townshipLevel,
      zenny,
      citizens: Object.values(TOWNSHIP_CITIZENS).map((c) => {
        const check = canRecruitCitizen(worldRegistry, c.id);
        return {
          id: c.id,
          name: c.name,
          role: c.roleTitle,
          specialty: c.passiveBuffLabel,
          buildingName: c.buildingName,
          recruited: worldRegistry.recruitedCitizens.includes(c.id),
          canRecruit: check.allowed && zenny >= c.zennyCost,
        };
      }),
      buildings: snap.activeBuildings.map((b) => ({
        id: b.buildingId,
        name: b.buildingName,
        level: snap.townshipLevel,
        bonusDescription: b.passiveBuffLabel,
      })),
      activeBuffs,
      huntingStatus: {
        windDirection: getWindDirectionLabel(windAngle),
        windAngle,
        scentIntensity: activeTerrainTag === 'HUNTING_TRAIL' ? 'Strong Trail' : 'Ambient Breeze',
        lastCatch: lastCatchLabel,
        available: true,
      },
      fishingStatus: {
        spotActive: activeTerrainTag === 'FISHING_SPOT',
        baitCount: (inventory.manillo_tokens ?? 0) + 3,
        lastCatch: lastCatchLabel,
      },
      recipes: Object.values(CAMPFIRE_RECIPES).map((r) => ({
        id: r.id,
        name: r.name,
        ingredientsLabel: Object.entries(r.ingredients)
          .map(([k, qty]) => `${qty}× ${k.replace(/_/g, ' ')}`)
          .join(', '),
        effectLabel: `+${r.hpRestore} HP, +${r.apRestore} AP, +${r.syncRestore} Sync`,
        canCook: Object.entries(r.ingredients).every(
          ([k, qty]) => (inventory[k] ?? 0) >= Number(qty)
        ),
      })),
    };
  }, [worldRegistry, zenny, activeMealBuff, windAngle, activeTerrainTag, lastCatchLabel, inventory]);

  const trueEnding = getTrueEndingEvaluation();
  const townshipSnapshot = getTownshipSnapshot(worldRegistry);
  const maxSyncPool = 100 + townshipSnapshot.passiveBuffs.syncMaxBonus;

  const handleContextualAction = (_spec: ContextualActionSpec) => {
    triggerContextualFieldAction();
  };

  const handleEngageCombat = () => {
    startEncounter();
  };

  const handleExecuteCombatTurn = () => {
    setHitFlashActive(true);
    runCombatTurn();
    setTimeout(() => setHitFlashActive(false), 260);
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <WorldCanvas
        mode={combatState ? 'COMBAT' : 'OVERWORLD'}
        playerPosition={playerPos}
        playerFacing={facingAngle}
        playerIsMoving={Math.hypot(playerVelocity[0], playerVelocity[2]) > 0.1}
        playerSpriteId={playerSpriteId}
        playerAuraColor={leaderDecorated.auraColor}
        playerAuraIntensity={leaderDecorated.shamanIds.length > 0 ? 0.75 : 0}
        playerHitFlash={0}
        partyMembers={partyFollowerProps}
        enemies={worldEnemyProps}
        npcs={worldNpcProps}
        interactables={interactables}
        townshipBuildings={worldRegistry.townshipBuildings}
        activeCombatActorId={
          combatState
            ? combatState.party[combatState.selectedActorIndex]?.id ?? null
            : null
        }
        combatAnchor={playerPos}
        onEntityClick={(id, kind) => {
          if (kind === 'enemy' && !combatState) {
            const ecsEnemy = ecsWorld.entities.find((e) => e.id === id);
            startEncounter(
              (ecsEnemy?.templateId as keyof typeof ENEMY_TEMPLATES) ?? 'harpy_scout',
              id
            );
          } else if (kind === 'npc' || kind === 'interactable') {
            triggerContextualFieldAction();
          }
        }}
        onTelemetry={handleEngineTelemetry}
      />

      <MobileHUD
        leaderId={leaderId}
        party={hudParty}
        sharedSyncPool={combatState ? combatState.sharedSyncPool : sharedSyncPool}
        maxSyncPool={combatState ? combatState.maxSyncPool : maxSyncPool}
        combatState={combatState}
        worldState={worldRegistry}
        trueEnding={trueEnding}
        telemetry={{
          fps: fpsTelemetry.fps,
          drawCalls: fpsTelemetry.drawCalls,
          biomeName: (() => {
            const [cx, cz] = getChunkCoordsAtWorldPos(playerPos[0], playerPos[2]);
            return getChunkDefinition(cx, cz).name;
          })(),
          terrainTag: activeTerrainTag,
        }}
        nearbyInteractable={nearbyInteractable}
        statusBanner={statusBanner}
        activeDrawer={activeDrawer}
        shamans={shamanCatalog}
        equipment={equipmentCatalog}
        township={townshipView}
        availableDragonForms={ALL_DRAGON_FORMS}
        onMoveVector={setInputVector}
        onSelectLeader={hotSwapLeader}
        onContextualAction={handleContextualAction}
        onEngageCombat={handleEngageCombat}
        onSetActiveDrawer={setActiveDrawer}
        onQueueCombatCommand={(actorId, cmd, targetIds) =>
          submitCombatCommand(actorId, cmd.id, targetIds)
        }
        onExecuteCombatTurn={handleExecuteCombatTurn}
        onRevertDragonForm={() => {
          if (!combatState) return;
          submitCombatCommand('ryu', 'dragon_revert', ['ryu']);
        }}
        onExitCombat={exitCombat}
        onInvestigateClue={discoverOrAdvanceClue}
        onAdvanceQuestObjective={advanceQuestObjective}
        onFuseShaman={(charId, shamanId) => toggleShamanFusion(charId, shamanId)}
        onUnfuseShaman={(charId, shamanId) => toggleShamanFusion(charId, shamanId)}
        onEquipRelic={(charId, relicId) => equipItem(charId, relicId, 'equip')}
        onUnequipRelic={(charId, relicId) => equipItem(charId, relicId, 'unequip')}
        onEquipSignatureGear={(charId, gearId) => equipItem(charId, gearId, 'equip')}
        onUnequipSignatureGear={(charId, gearId) => equipItem(charId, gearId, 'unequip')}
        onRecruitCitizen={(id) => recruitCitizen(id)}
        onStartHunt={(params) => startHunt(params)}
        onCastFishingLine={(castScore) => castFishingLine(castScore)}
        onFishingBite={() => void triggerFishingBiteHaptic('bite')}
        onCookRecipe={(recipeId) => cookMeal(recipeId as 'dragon_skewers' | 'ranger_stew' | 'shaman_broth')}
        onRestAtCampfire={() => {
          useGameStore.setState({ activeTerrainTag: 'TOWNSHIP_PLOT' });
          triggerContextualFieldAction();
        }}
      />
    </div>
  );
};

export default App;
