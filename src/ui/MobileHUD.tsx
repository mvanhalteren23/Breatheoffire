import React, { Suspense, lazy } from 'react';
import './hud.css';
import { CombatOverlayHUD } from './CombatOverlayHUD';
import { ContextualActionCluster } from './ContextualActionCluster';
import type { MobileHUDProps } from './hudTypes';
import { PartyHotSwapBar } from './PartyHotSwapBar';
import { VirtualThumbstick } from './VirtualThumbstick';

const EquipmentSynergyDrawer = lazy(() =>
  import('./drawers/EquipmentSynergyDrawer').then((m) => ({
    default: m.EquipmentSynergyDrawer,
  })),
);
const QuestChronicleDrawer = lazy(() =>
  import('./drawers/QuestChronicleDrawer').then((m) => ({
    default: m.QuestChronicleDrawer,
  })),
);
const ShamanFusionDrawer = lazy(() =>
  import('./drawers/ShamanFusionDrawer').then((m) => ({
    default: m.ShamanFusionDrawer,
  })),
);
const TownshipCampDrawer = lazy(() =>
  import('./drawers/TownshipCampDrawer').then((m) => ({
    default: m.TownshipCampDrawer,
  })),
);

export type {
  CampRecipeView,
  ContextualActionSpec,
  EquipmentCatalogState,
  HUDDrawerId,
  HUDPartyMember,
  MobileHUDProps,
  NearbyInteractable,
  ShamanCatalogItem,
  TelemetryData,
  ThumbstickVector,
  TownshipBuildingView,
  TownshipCampView,
  TownshipCitizenView,
} from './hudTypes';

/**
 * Full-screen mobile-first Touch HUD overlay (`safe-area-shell`, pointer-events pass-through),
 * top-right telemetry pill (`FPS` + `Draw Calls < 150` + active biome/terrainTag),
 * portrait-mode "Rotate to Landscape" guard, Overworld HUD, Combat Overlay HUD,
 * and mobile drawers.
 */
export const MobileHUD: React.FC<MobileHUDProps> = ({
  leaderId,
  party,
  sharedSyncPool,
  maxSyncPool,
  combatState,
  worldState,
  trueEnding,
  telemetry,
  nearbyInteractable,
  statusBanner,
  activeDrawer,
  shamans,
  equipment,
  township,
  availableDragonForms,
  onMoveVector,
  onSelectLeader,
  onContextualAction,
  onEngageCombat,
  onSetActiveDrawer,
  onQueueCombatCommand,
  onExecuteCombatTurn,
  onCancelCombatAction,
  onRevertDragonForm,
  onExitCombat,
  onInvestigateClue,
  onAdvanceQuestObjective,
  onFuseShaman,
  onUnfuseShaman,
  onEquipRelic,
  onUnequipRelic,
  onEquipSignatureGear,
  onUnequipSignatureGear,
  onRecruitCitizen,
  onStartHunt,
  onCastFishingLine,
  onFishingBite,
  onCookRecipe,
  onRestAtCampfire,
}) => {
  const drawCallsHealthy = telemetry.drawCalls < 150;

  return (
    <div
      data-testid="mobile-hud-shell"
      className="bof-hud-root safe-area-shell"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        pointerEvents: 'none',
      }}
    >
      {/* Portrait Orientation Guard (hidden in landscape via CSS media query) */}
      <div
        data-testid="landscape-guard-banner"
        className="landscape-guard"
        aria-live="polite"
      >
        <div className="landscape-guard-card">
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>📱↻</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#fde68a', marginBottom: '6px' }}>
            Rotate to Landscape
          </div>
          <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.45 }}>
            Breath of Fire II: Rekindled is designed for landscape dual-thumb play with
            real-time HD-2D terrain navigation and tactical Shaman combat.
          </div>
        </div>
      </div>

      {/* Combat Overlay HUD when combatState !== null */}
      {combatState !== null ? (
        <CombatOverlayHUD
          combatState={combatState}
          availableDragonForms={availableDragonForms}
          onQueueCommand={onQueueCombatCommand}
          onExecuteTurn={onExecuteCombatTurn}
          onCancelAction={onCancelCombatAction}
          onRevertDragonForm={onRevertDragonForm}
          onExitCombat={onExitCombat}
        />
      ) : (
        <>
          {/* Top Overworld Strip: Party Hot-Swap Bar (left) + Telemetry Pill (right) */}
          <div className="bof-top-bar">
            <PartyHotSwapBar
              leaderId={leaderId}
              party={party}
              sharedSyncPool={sharedSyncPool}
              maxSyncPool={maxSyncPool}
              onSelectLeader={onSelectLeader}
            />

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '6px',
              }}
            >
              {/* Top-right Telemetry Pill */}
              <div
                data-testid="telemetry-pill"
                className="bof-panel bof-hud-interactive"
                style={{
                  padding: '6px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '2px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                  <span style={{ color: '#4ade80' }}>{Math.round(telemetry.fps)} FPS</span>
                  <span style={{ color: '#64748b' }}>|</span>
                  <span
                    style={{
                      color: drawCallsHealthy ? '#7dd3fc' : '#f87171',
                    }}
                  >
                    DC {telemetry.drawCalls} (&lt; 150)
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#fde68a', fontWeight: 600 }}>
                  {telemetry.biomeName} · {telemetry.terrainTag}
                </div>
              </div>

              {nearbyInteractable && (
                <div
                  data-testid="nearby-interactable-pill"
                  className="bof-panel bof-hud-interactive"
                  style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    borderColor: 'rgba(251, 191, 36, 0.55)',
                    color: '#fef3c7',
                  }}
                >
                  ✨ Nearby: {nearbyInteractable.label}
                </div>
              )}
            </div>
          </div>

          {/* Optional Floating Status Toast */}
          {statusBanner && (
            <div
              data-testid="hud-status-banner"
              className="bof-panel"
              style={{
                alignSelf: 'center',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#fef3c7',
                borderColor: 'rgba(251, 191, 36, 0.65)',
              }}
            >
              {statusBanner}
            </div>
          )}

          {/* Bottom Overworld Thumb Zones: Virtual Thumbstick (left) + Contextual Action Cluster (right) */}
          <div className="bof-bottom-bar">
            <VirtualThumbstick
              onChange={onMoveVector}
              disabled={activeDrawer !== null}
            />

            <ContextualActionCluster
              leaderId={leaderId}
              terrainTag={telemetry.terrainTag}
              nearbyInteractable={nearbyInteractable}
              activeDrawer={activeDrawer}
              onContextualAction={onContextualAction}
              onEngageCombat={onEngageCombat}
              onOpenDrawer={onSetActiveDrawer}
            />
          </div>
        </>
      )}

      {/* Active Mobile Drawer (lazy-loaded on demand to keep cold-start bundle small) */}
      <Suspense fallback={null}>
        {activeDrawer === 'quests' && (
          <QuestChronicleDrawer
            worldState={worldState}
            trueEnding={trueEnding}
            onInvestigateClue={onInvestigateClue}
            onAdvanceQuestObjective={onAdvanceQuestObjective}
            onClose={() => onSetActiveDrawer(null)}
          />
        )}

        {activeDrawer === 'shamans' && (
          <ShamanFusionDrawer
            party={party}
            initialCharacterId={leaderId}
            shamans={shamans}
            onFuseShaman={onFuseShaman}
            onUnfuseShaman={onUnfuseShaman}
            onClose={() => onSetActiveDrawer(null)}
          />
        )}

        {activeDrawer === 'relics' && (
          <EquipmentSynergyDrawer
            party={party}
            initialCharacterId={leaderId}
            equipment={equipment}
            onEquipRelic={onEquipRelic}
            onUnequipRelic={onUnequipRelic}
            onEquipSignatureGear={onEquipSignatureGear}
            onUnequipSignatureGear={onUnequipSignatureGear}
            onClose={() => onSetActiveDrawer(null)}
          />
        )}

        {activeDrawer === 'township' && (
          <TownshipCampDrawer
            township={township}
            onRecruitCitizen={onRecruitCitizen}
            onStartHunt={onStartHunt}
            onCastFishingLine={onCastFishingLine}
            onFishingBite={onFishingBite}
            onCookRecipe={onCookRecipe}
            onRestAtCampfire={onRestAtCampfire}
            onClose={() => onSetActiveDrawer(null)}
          />
        )}
      </Suspense>
    </div>
  );
};
