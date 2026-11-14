import React from 'react';
import type { CharacterId, TerrainTag } from '../core/types';
import type {
  ContextualActionSpec,
  HUDDrawerId,
  NearbyInteractable,
} from './hudTypes';

export interface ContextualActionClusterProps {
  leaderId: CharacterId;
  terrainTag: TerrainTag;
  nearbyInteractable?: NearbyInteractable | null;
  activeDrawer: HUDDrawerId;
  onContextualAction: (action: ContextualActionSpec) => void;
  onEngageCombat: () => void;
  onOpenDrawer: (drawer: HUDDrawerId) => void;
  onCampfire?: () => void;
}

const CONTINENTAL_TERRAIN_DESCRIPTIONS: Partial<Record<TerrainTag, { label: string; description: string }>> = {
  GATE_FISSURE: {
    label: 'Inspect Gate Fissure',
    description: 'Ancient Gate seal (Ryu Dragon Sight or Bleu Arcane Warp)',
  },
  WIND_UPDRAFT: {
    label: 'Inspect Wind Updraft',
    description: 'Windia thermal current (Nina Wind Glide)',
  },
  HIGHFORT_GEAR: {
    label: 'Inspect Highfort Gear',
    description: 'Highfort clockwork mechanism (Sten Grapple or Rand Terrain Roll)',
  },
  SIMAFORT_MIRE: {
    label: 'Inspect SimaFort Mire',
    description: 'Flooded marshland crossing (Jean Water Leap or Spar Commune)',
  },
  TUNLAN_TIDE: {
    label: 'Inspect Tunlan Tide',
    description: 'Tunlan coastal tideway (Jean Water Leap or Ryu Cast Line)',
  },
  CAPITAN_SHORE: {
    label: 'Inspect Capitan Shore',
    description: 'Capitan coastal shore (Ryu Cast Line, Rand Roll, or Bleu Arcane Warp)',
  },
  INFINITY_VOID: {
    label: 'Inspect Infinity Void',
    description: 'Spatial tear inside Infinity (Bleu Arcane Warp or Ryu Dragon Sight)',
  },
};

/**
 * Resolves the primary contextual action based on the active party leader,
 * current terrain tag, and any nearby interactable entity.
 */
export function resolveContextualAction(
  leaderId: CharacterId,
  terrainTag: TerrainTag,
  nearbyInteractable?: NearbyInteractable | null
): ContextualActionSpec {
  if (
    leaderId === 'ryu' &&
    (terrainTag === 'FISHING_SPOT' ||
      terrainTag === 'TUNLAN_TIDE' ||
      terrainTag === 'CAPITAN_SHORE')
  ) {
    return {
      actionId: 'fishing',
      label: 'Cast Line',
      icon: '🎣',
      accentColor: '#38bdf8',
      description:
        terrainTag === 'TUNLAN_TIDE'
          ? 'Cast Manillo lure into Tunlan tidal pools'
          : terrainTag === 'CAPITAN_SHORE'
            ? 'Cast Manillo lure along Capitan Shore'
            : 'Manillo fishing at calm riverbank',
      available: true,
    };
  }
  if (
    leaderId === 'ryu' &&
    (terrainTag === 'DRAGON_SHRINE' ||
      terrainTag === 'GATE_FISSURE' ||
      terrainTag === 'INFINITY_VOID')
  ) {
    return {
      actionId: 'dragon_sight',
      label: 'Dragon Sight',
      icon: '🐉',
      accentColor: '#f59e0b',
      description:
        terrainTag === 'GATE_FISSURE'
          ? 'Resonate with ancient Gate Fissure seal'
          : terrainTag === 'INFINITY_VOID'
            ? 'Pierce Infinity Void distortions with Dragon Sight'
            : 'Resonate with ancient Dragon Tear Shrine',
      available: true,
    };
  }
  if (
    leaderId === 'bleu' &&
    (terrainTag === 'INFINITY_VOID' ||
      terrainTag === 'GATE_FISSURE' ||
      terrainTag === 'CAPITAN_SHORE')
  ) {
    return {
      actionId: 'arcane_warp',
      label: 'Arcane Warp',
      icon: '🔮',
      accentColor: '#c084fc',
      description:
        terrainTag === 'INFINITY_VOID'
          ? 'Bridge Infinity Void spatial tears with Arcane Warp'
          : terrainTag === 'GATE_FISSURE'
            ? 'Phase across ancient Gate Fissure rift'
            : 'Warp across Capitan sea-cavern reefs',
      available: true,
    };
  }
  if (leaderId === 'katt' && terrainTag === 'HUNTING_TRAIL') {
    return {
      actionId: 'hunting_shot',
      label: 'Track & Hunt',
      icon: '🐾',
      accentColor: '#fb7185',
      description: 'Stalk downwind game along hunting trail',
      available: true,
    };
  }
  if (leaderId === 'bow' && terrainTag === 'HUNTING_TRAIL') {
    return {
      actionId: 'hunting_shot',
      label: 'Precision Shot',
      icon: '🏹',
      accentColor: '#34d399',
      description: 'Snipe downwind prey without alerting herd',
      available: true,
    };
  }
  if (
    leaderId === 'rand' &&
    (terrainTag === 'BOULDER_CRACK' ||
      terrainTag === 'HIGHFORT_GEAR' ||
      terrainTag === 'CAPITAN_SHORE')
  ) {
    return {
      actionId: 'terrain_roll',
      label: 'Terrain Roll',
      icon: '🪨',
      accentColor: '#f97316',
      description:
        terrainTag === 'HIGHFORT_GEAR'
          ? 'Roll past Highfort clockwork gear barricades'
          : terrainTag === 'CAPITAN_SHORE'
            ? 'Smash coastal boulders along Capitan Shore'
            : 'Shatter cracked boulders and roll across ridge',
      available: true,
    };
  }
  if (
    leaderId === 'nina' &&
    (terrainTag === 'CLIFF_GAP' || terrainTag === 'WIND_UPDRAFT')
  ) {
    return {
      actionId: 'wind_glide',
      label: 'Wind Glide',
      icon: '🪽',
      accentColor: '#60a5fa',
      description:
        terrainTag === 'WIND_UPDRAFT'
          ? 'Soar across Windia thermal updrafts'
          : 'Soar across cliff updrafts with Wing Clan wings',
      available: true,
    };
  }
  if (
    leaderId === 'jean' &&
    (terrainTag === 'SHALLOW_WATER' ||
      terrainTag === 'SIMAFORT_MIRE' ||
      terrainTag === 'TUNLAN_TIDE')
  ) {
    return {
      actionId: 'water_leap',
      label: 'Water Leap',
      icon: '🐸',
      accentColor: '#22d3ee',
      description:
        terrainTag === 'SIMAFORT_MIRE'
          ? 'Vault cleanly across SimaFort mire channels'
          : terrainTag === 'TUNLAN_TIDE'
            ? 'Leap across Tunlan coastal tideways'
            : 'Vault across river shallows',
      available: true,
    };
  }
  if (
    leaderId === 'sten' &&
    (terrainTag === 'CHASM_POST' || terrainTag === 'HIGHFORT_GEAR')
  ) {
    return {
      actionId: 'grapple_reach',
      label: 'Grapple',
      icon: '🪝',
      accentColor: '#facc15',
      description:
        terrainTag === 'HIGHFORT_GEAR'
          ? 'Hook onto Highfort clockwork gears to swing across'
          : 'Swing across chasm anchor post',
      available: true,
    };
  }
  if (
    leaderId === 'spar' &&
    (terrainTag === 'FOREST_THICKET' || terrainTag === 'SIMAFORT_MIRE')
  ) {
    return {
      actionId: 'forest_commune',
      label: 'Commune',
      icon: '🌿',
      accentColor: '#4ade80',
      description:
        terrainTag === 'SIMAFORT_MIRE'
          ? 'Part SimaFort mire reeds and toxic bog vines'
          : 'Ask forest spirits to part ancient briars',
      available: true,
    };
  }

  if (
    terrainTag === 'TOWNSHIP_PLOT' ||
    terrainTag === 'COURSAIR_GATE' ||
    nearbyInteractable?.kind === 'npc' ||
    nearbyInteractable?.kind === 'clue' ||
    nearbyInteractable?.kind === 'township' ||
    nearbyInteractable?.kind === 'gate'
  ) {
    return {
      actionId: 'interact',
      label: 'Interact / Investigate',
      icon: '🔍',
      accentColor: '#fbbf24',
      description: nearbyInteractable
        ? `Inspect ${nearbyInteractable.label}`
        : 'Investigate nearby landmark',
      available: true,
    };
  }

  if (nearbyInteractable) {
    return {
      actionId: 'interact',
      label: 'Interact / Investigate',
      icon: '🔍',
      accentColor: '#fbbf24',
      description: `Inspect ${nearbyInteractable.label}`,
      available: true,
    };
  }

  if (leaderId === 'katt') {
    return {
      actionId: 'daunting_dash',
      label: 'Daunting Dash',
      icon: '⚡',
      accentColor: '#fb7185',
      description: 'Sprint burst across open ground',
      available: true,
    };
  }

  if (leaderId === 'bleu') {
    return {
      actionId: 'arcane_warp',
      label: 'Arcane Warp',
      icon: '🔮',
      accentColor: '#c084fc',
      description: 'Blink across arcane rifts and continental ley lines',
      available: true,
    };
  }

  const continentalMeta = CONTINENTAL_TERRAIN_DESCRIPTIONS[terrainTag];
  if (continentalMeta) {
    return {
      actionId: 'interact',
      label: continentalMeta.label,
      icon: '🧭',
      accentColor: '#38bdf8',
      description: continentalMeta.description,
      available: true,
    };
  }

  return {
    actionId: 'dragon_sight',
    label: 'Dragon Sight',
    icon: '👁️',
    accentColor: '#94a3b8',
    description: 'Scan nearby landmarks & clues',
    available: leaderId === 'ryu',
  };
}

/**
 * Bottom-right thumb-zone action cluster with >= 52px primary & >= 48px quick buttons.
 */
export const ContextualActionCluster: React.FC<ContextualActionClusterProps> = ({
  leaderId,
  terrainTag,
  nearbyInteractable,
  activeDrawer,
  onContextualAction,
  onEngageCombat,
  onOpenDrawer,
  onCampfire,
}) => {
  const primary = resolveContextualAction(leaderId, terrainTag, nearbyInteractable);
  const showKattDashSecondary = leaderId === 'katt' && terrainTag === 'HUNTING_TRAIL';

  const handleCampfire = () => {
    if (onCampfire) {
      onCampfire();
    } else {
      onOpenDrawer(activeDrawer === 'township' ? null : 'township');
    }
  };

  return (
    <div
      data-testid="contextual-action-cluster"
      className="bof-hud-interactive"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        maxWidth: '340px',
      }}
    >
      {/* Secondary quick-access drawer & utility row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          gap: '6px',
        }}
      >
        <button
          type="button"
          data-testid="btn-quick-quests"
          className={`bof-touch-btn ${activeDrawer === 'quests' ? 'bof-touch-btn--active' : ''}`}
          style={{ minWidth: '52px', minHeight: '52px' }}
          onClick={() => onOpenDrawer(activeDrawer === 'quests' ? null : 'quests')}
          aria-label="Open Quests"
        >
          <span>📜</span>
          <span>Quests</span>
        </button>

        <button
          type="button"
          data-testid="btn-quick-shamans"
          className={`bof-touch-btn ${activeDrawer === 'shamans' ? 'bof-touch-btn--active' : ''}`}
          style={{ minWidth: '52px', minHeight: '52px' }}
          onClick={() => onOpenDrawer(activeDrawer === 'shamans' ? null : 'shamans')}
          aria-label="Open Shamans"
        >
          <span>✨</span>
          <span>Shamans</span>
        </button>

        <button
          type="button"
          data-testid="btn-quick-relics"
          className={`bof-touch-btn ${activeDrawer === 'relics' ? 'bof-touch-btn--active' : ''}`}
          style={{ minWidth: '52px', minHeight: '52px' }}
          onClick={() => onOpenDrawer(activeDrawer === 'relics' ? null : 'relics')}
          aria-label="Open Relics"
        >
          <span>💎</span>
          <span>Relics</span>
        </button>

        <button
          type="button"
          data-testid="btn-quick-campfire"
          className={`bof-touch-btn ${activeDrawer === 'township' ? 'bof-touch-btn--active' : ''}`}
          style={{ minWidth: '52px', minHeight: '52px' }}
          onClick={handleCampfire}
          aria-label="Open Campfire and Township"
        >
          <span>🔥</span>
          <span>Campfire</span>
        </button>
      </div>

      {/* Primary Thumb Arc: Engage + optional Katt Dash + Contextual Action */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px',
        }}
      >
        {showKattDashSecondary && (
          <button
            type="button"
            data-testid="btn-katt-daunting-dash"
            className="bof-touch-btn"
            style={{
              minWidth: '52px',
              minHeight: '52px',
              borderColor: 'rgba(251, 113, 133, 0.65)',
              background: 'rgba(136, 19, 55, 0.72)',
            }}
            onClick={() =>
              onContextualAction({
                actionId: 'daunting_dash',
                label: 'Daunting Dash',
                icon: '⚡',
                accentColor: '#fb7185',
                description: 'Burst sprint along trail',
                available: true,
              })
            }
          >
            <span>⚡</span>
            <span>Daunting Dash</span>
          </button>
        )}

        <button
          type="button"
          data-testid="btn-engage-combat"
          className="bof-touch-btn"
          style={{
            minWidth: '64px',
            minHeight: '56px',
            borderRadius: '9999px',
            borderColor: 'rgba(248, 113, 113, 0.65)',
            background: 'linear-gradient(135deg, rgba(153, 27, 27, 0.88), rgba(127, 29, 29, 0.94))',
            padding: '0 14px',
          }}
          onClick={onEngageCombat}
        >
          <span>⚔️</span>
          <span>Engage</span>
        </button>

        <button
          type="button"
          data-testid="btn-contextual-primary"
          className="bof-touch-btn bof-touch-btn--primary"
          style={{
            minWidth: '132px',
            minHeight: '60px',
            borderRadius: '9999px',
            borderColor: primary.accentColor,
            padding: '8px 16px',
            fontSize: '13px',
            boxShadow: `0 8px 22px rgba(0,0,0,0.5), 0 0 14px ${primary.accentColor}44`,
          }}
          onClick={() => onContextualAction(primary)}
          title={primary.description}
        >
          <span style={{ fontSize: '18px' }}>{primary.icon}</span>
          <span>{primary.label}</span>
        </button>
      </div>
    </div>
  );
};
