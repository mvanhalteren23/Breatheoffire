import React, { useMemo, useState } from 'react';
import type { TownshipBuildingView, TownshipCampView, TownshipCitizenView } from '../hudTypes';

export interface TownshipLayoutViewerProps {
  township: TownshipCampView;
  onRecruitCitizen: (citizenId: string) => void;
}

interface BlueprintBuildingSlot {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  col: number;
  row: number;
  buffRadius: number;
  citizenId?: string;
  isExpansion?: boolean;
  defaultBuff: string;
  blueprintNote: string;
}

const GRID_COLS = 8;
const GRID_ROWS = 6;
const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const TOWNSHIP_BLUEPRINT_SLOTS: BlueprintBuildingSlot[] = [
  {
    id: 'bldg_steva_archive',
    name: 'St. Eva Archive',
    shortName: 'Archive',
    icon: '📚',
    col: 1,
    row: 1,
    buffRadius: 2,
    citizenId: 'barose',
    defaultBuff: '+4% Party ATK & St. Eva Clue Verification',
    blueprintNote: 'Northwest stone vault built for cross-referencing Gate inscriptions.',
  },
  {
    id: 'bldg_shaman_shrine',
    name: 'Shaman Fusion Shrine',
    shortName: 'Shrine',
    icon: '✨',
    col: 4,
    row: 0,
    buffRadius: 2,
    citizenId: 'sana',
    defaultBuff: '+10 Max Sync & -15% Dragon AP Upkeep',
    blueprintNote: 'Northern ley-line altar channeling Flame-Wind Shaman resonance.',
  },
  {
    id: 'bldg_windia_windmill',
    name: 'Windia Windmill',
    shortName: 'Windmill',
    icon: '🌬️',
    col: 6,
    row: 1,
    buffRadius: 2,
    isExpansion: true,
    defaultBuff: 'Expansion Plot · +10% Wind/SPD Aura & Frontier Updraft Beacon',
    blueprintNote: 'Northeastern ridge expansion plot reserved for Wyndian windwrights.',
  },
  {
    id: 'bldg_campfire_hall',
    name: 'Campfire & Provision Hall',
    shortName: 'Campfire',
    icon: '🏕️',
    col: 1,
    row: 4,
    buffRadius: 2,
    citizenId: 'kay',
    defaultBuff: '+15 Max Sync Pool & Campfire Buff Recipes',
    blueprintNote: 'Heart of the frontier settlement where provisions and morale are forged.',
  },
  {
    id: 'bldg_armory_forge',
    name: 'Armory / Relic Reforge Forge',
    shortName: 'Forge',
    icon: '⚒️',
    col: 6,
    row: 3,
    buffRadius: 2,
    citizenId: 'hanz',
    defaultBuff: '+8% Party ATK & Relic Reforge Calibration',
    blueprintNote: 'Eastern smithy plot engineered for Progression Relic tempering.',
  },
  {
    id: 'bldg_manillo_dockhouse',
    name: 'Manillo Dockhouse',
    shortName: 'Dockhouse',
    icon: '🐟',
    col: 3,
    row: 5,
    buffRadius: 2,
    isExpansion: true,
    defaultBuff: 'Expansion Plot · +2 Fishing Luck & Manillo Koi Trade Pier',
    blueprintNote: 'Southern riverfront expansion plot linking Township to Manillo merchants.',
  },
];

interface ResolvedPlotState {
  col: number;
  row: number;
  coordLabel: string;
  slot: BlueprintBuildingSlot | null;
  building: TownshipBuildingView | null;
  citizen: TownshipCitizenView | null;
  isBuilt: boolean;
  level: number;
}

/**
 * Interactive 8 x 6 architectural blueprint layout viewer for the Township hub.
 * Displays built vs. vacant building slots, expansion plots, building levels,
 * passive party buff radii, and one-tap citizen recruitment / slot inspection.
 */
export const TownshipLayoutViewer: React.FC<TownshipLayoutViewerProps> = ({
  township,
  onRecruitCitizen,
}) => {
  const [selectedCoord, setSelectedCoord] = useState<{ col: number; row: number }>({
    col: 1,
    row: 4,
  });

  const resolvedSlots = useMemo(() => {
    const slotMap = new Map<string, ResolvedPlotState>();

    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const slot =
          TOWNSHIP_BLUEPRINT_SLOTS.find((s) => s.col === col && s.row === row) ?? null;

        const building = slot
          ? township.buildings.find((b) => b.id === slot.id || b.name === slot.name) ?? null
          : null;

        const citizen =
          slot?.citizenId
            ? township.citizens.find((c) => c.id === slot.citizenId) ?? null
            : null;

        const isBuilt = Boolean(building) || Boolean(citizen?.recruited);
        const level = building ? building.level : isBuilt ? township.townshipLevel : 0;

        slotMap.set(`${col},${row}`, {
          col,
          row,
          coordLabel: `${COL_LABELS[col]}${row + 1}`,
          slot,
          building,
          citizen,
          isBuilt,
          level,
        });
      }
    }
    return slotMap;
  }, [township]);

  const selectedPlot =
    resolvedSlots.get(`${selectedCoord.col},${selectedCoord.row}`) ??
    resolvedSlots.get('1,4')!;

  const activeBuiltPlots = useMemo(
    () => Array.from(resolvedSlots.values()).filter((p) => p.isBuilt && p.slot),
    [resolvedSlots]
  );

  const isWithinSelectedRadius = (col: number, row: number): boolean => {
    if (!selectedPlot.slot) return false;
    return (
      Math.hypot(col - selectedPlot.col, row - selectedPlot.row) <=
      selectedPlot.slot.buffRadius
    );
  };

  const isCoveredByAnyBuiltAura = (col: number, row: number): boolean => {
    return activeBuiltPlots.some(
      (p) => p.slot && Math.hypot(col - p.col, row - p.row) <= p.slot.buffRadius
    );
  };

  const coveredCountForSelected = useMemo(() => {
    if (!selectedPlot.slot) return 0;
    let count = 0;
    for (let r = 0; r < GRID_ROWS; r += 1) {
      for (let c = 0; c < GRID_COLS; c += 1) {
        if (Math.hypot(c - selectedPlot.col, r - selectedPlot.row) <= selectedPlot.slot.buffRadius) {
          count += 1;
        }
      }
    }
    return count;
  }, [selectedPlot]);

  return (
    <div
      data-testid="township-layout-viewer"
      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
    >
      {/* Header & Legend */}
      <div
        className="bof-panel"
        style={{
          padding: '8px 12px',
          borderRadius: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          fontSize: '11px',
        }}
      >
        <div>
          <strong style={{ color: '#fde68a', fontSize: '13px' }}>
            📐 Township 8×6 Architectural Blueprint
          </strong>
          <div style={{ color: '#94a3b8' }}>
            Tap any plot to inspect building level, passive buff radius, or recruit settlers.
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <span style={{ color: '#4ade80' }}>■ Built ({activeBuiltPlots.length})</span>
          <span style={{ color: '#fbbf24' }}>▢ Vacant Citizen Plot</span>
          <span style={{ color: '#38bdf8' }}>◇ Expansion Plot</span>
        </div>
      </div>

      {/* Quick Building Selector Row (>= 48px touch targets) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {TOWNSHIP_BLUEPRINT_SLOTS.map((slot) => {
          const plot = resolvedSlots.get(`${slot.col},${slot.row}`);
          const isSelected =
            selectedPlot.col === slot.col && selectedPlot.row === slot.row;
          return (
            <button
              key={slot.id}
              type="button"
              data-testid={`btn-blueprint-jump-${slot.id}`}
              className={`bof-touch-btn ${isSelected ? 'bof-touch-btn--active' : ''}`}
              style={{
                minHeight: '48px',
                padding: '4px 10px',
                borderColor: plot?.isBuilt
                  ? 'rgba(74, 222, 128, 0.55)'
                  : slot.isExpansion
                    ? 'rgba(56, 189, 248, 0.5)'
                    : 'rgba(251, 191, 36, 0.45)',
              }}
              onClick={() => setSelectedCoord({ col: slot.col, row: slot.row })}
            >
              <span>{slot.icon}</span>
              <span>{slot.shortName}</span>
              <span
                style={{
                  fontSize: '10px',
                  color: plot?.isBuilt ? '#4ade80' : slot.isExpansion ? '#38bdf8' : '#fbbf24',
                }}
              >
                {plot?.isBuilt ? `Lv.${plot.level}` : slot.isExpansion ? 'EXP' : 'VACANT'}
              </span>
            </button>
          );
        })}
      </div>

      {/* 8 x 6 Blueprint Plot Grid */}
      <div
        style={{
          overflowX: 'auto',
          paddingBottom: '4px',
        }}
      >
        <div
          data-testid="township-blueprint-grid"
          role="grid"
          aria-label="Township 8 by 6 Architectural Plot Grid"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLS}, minmax(52px, 1fr))`,
            gap: '4px',
            minWidth: '448px',
            padding: '8px',
            borderRadius: '12px',
            background:
              'linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(12, 24, 48, 0.96) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            backgroundImage:
              'radial-gradient(rgba(56, 189, 248, 0.14) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        >
          {Array.from({ length: GRID_ROWS }).map((_, row) =>
            Array.from({ length: GRID_COLS }).map((__, col) => {
              const plot = resolvedSlots.get(`${col},${row}`)!;
              const isSelected =
                selectedPlot.col === col && selectedPlot.row === row;
              const inSelectedAura = isWithinSelectedRadius(col, row);
              const inBuiltAura = isCoveredByAnyBuiltAura(col, row);

              const borderColor = isSelected
                ? '#fde047'
                : plot.isBuilt
                  ? 'rgba(74, 222, 128, 0.72)'
                  : plot.slot?.isExpansion
                    ? 'rgba(56, 189, 248, 0.6)'
                    : plot.slot
                      ? 'rgba(251, 191, 36, 0.58)'
                      : inSelectedAura
                        ? 'rgba(74, 222, 128, 0.48)'
                        : 'rgba(148, 163, 184, 0.2)';

              const bg = plot.isBuilt
                ? 'rgba(20, 83, 45, 0.55)'
                : plot.slot?.isExpansion
                  ? 'rgba(14, 116, 144, 0.26)'
                  : plot.slot
                    ? 'rgba(120, 53, 15, 0.34)'
                    : inSelectedAura
                      ? 'rgba(34, 197, 94, 0.16)'
                      : inBuiltAura
                        ? 'rgba(34, 197, 94, 0.08)'
                        : 'rgba(15, 23, 42, 0.6)';

              return (
                <button
                  key={`${col}-${row}`}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  data-testid={
                    plot.slot
                      ? `blueprint-slot-${plot.slot.id}`
                      : `blueprint-cell-${col}-${row}`
                  }
                  onClick={() => setSelectedCoord({ col, row })}
                  style={{
                    minWidth: '48px',
                    minHeight: '52px',
                    padding: '3px',
                    borderRadius: '8px',
                    border: `${plot.slot && !plot.isBuilt ? '1.5px dashed' : '1.5px solid'} ${borderColor}`,
                    background: bg,
                    color: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1px',
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                    boxShadow: isSelected
                      ? '0 0 0 2px rgba(253, 224, 71, 0.55)'
                      : undefined,
                  }}
                  title={
                    plot.slot
                      ? `${plot.slot.name} (${plot.coordLabel})`
                      : `Frontier Plot ${plot.coordLabel}`
                  }
                >
                  <span style={{ fontSize: '9px', color: '#94a3b8', lineHeight: 1 }}>
                    {plot.coordLabel}
                  </span>
                  {plot.slot ? (
                    <>
                      <span style={{ fontSize: '15px', lineHeight: 1.1 }}>{plot.slot.icon}</span>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 800,
                          color: plot.isBuilt
                            ? '#86efac'
                            : plot.slot.isExpansion
                              ? '#7dd3fc'
                              : '#fde68a',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {plot.isBuilt ? `Lv.${plot.level}` : plot.slot.isExpansion ? 'EXP' : 'OPEN'}
                      </span>
                    </>
                  ) : (
                    <span
                      style={{
                        fontSize: '10px',
                        color: inSelectedAura ? '#4ade80' : '#475569',
                      }}
                    >
                      {inSelectedAura ? '✦' : '·'}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Selected Slot Inspector & One-Tap Recruitment */}
      <div
        data-testid="township-slot-inspector"
        className="bof-panel"
        style={{
          padding: '10px 12px',
          borderRadius: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#fde68a' }}>
              {selectedPlot.slot
                ? `${selectedPlot.slot.icon} ${selectedPlot.slot.name}`
                : `🌿 Open Frontier Plot (${selectedPlot.coordLabel})`}
            </span>
            <span
              data-testid="slot-status-badge"
              style={{
                padding: '2px 8px',
                borderRadius: '9999px',
                fontSize: '10px',
                fontWeight: 800,
                background: selectedPlot.isBuilt
                  ? 'rgba(34, 197, 94, 0.22)'
                  : selectedPlot.slot?.isExpansion
                    ? 'rgba(56, 189, 248, 0.2)'
                    : 'rgba(251, 191, 36, 0.2)',
                color: selectedPlot.isBuilt
                  ? '#86efac'
                  : selectedPlot.slot?.isExpansion
                    ? '#7dd3fc'
                    : '#fde68a',
              }}
            >
              {selectedPlot.isBuilt
                ? `BUILT · Lv.${selectedPlot.level}`
                : selectedPlot.slot?.isExpansion
                  ? 'VACANT EXPANSION PLOT'
                  : selectedPlot.slot
                    ? 'VACANT PLOT'
                    : 'UNASSIGNED TURF'}
            </span>
          </div>

          {selectedPlot.slot ? (
            <>
              <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                {selectedPlot.slot.blueprintNote}
              </div>
              <div style={{ fontSize: '11px', color: '#86efac' }}>
                Passive Party Buff:{' '}
                <strong>
                  {selectedPlot.building?.bonusDescription ?? selectedPlot.slot.defaultBuff}
                </strong>{' '}
                · Buff Radius: <strong>{selectedPlot.slot.buffRadius} plots</strong> (
                {coveredCountForSelected} cells)
              </div>
              {selectedPlot.citizen && (
                <div style={{ fontSize: '11px', color: '#fde68a' }}>
                  Assigned Citizen: <strong>{selectedPlot.citizen.name}</strong> ({selectedPlot.citizen.role}) —{' '}
                  {selectedPlot.citizen.recruited ? 'Settled Resident' : 'Awaiting Recruitment'}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Open Township ground at {selectedPlot.coordLabel}.{' '}
              {isCoveredByAnyBuiltAura(selectedPlot.col, selectedPlot.row)
                ? 'Currently bathed in active Township building buff aura.'
                : 'Outside current building buff radii.'}
            </div>
          )}
        </div>

        {selectedPlot.citizen && !selectedPlot.citizen.recruited && (
          <button
            type="button"
            data-testid={`btn-layout-recruit-${selectedPlot.citizen.id}`}
            className="bof-touch-btn bof-touch-btn--primary"
            style={{ minHeight: '48px', minWidth: '160px' }}
            disabled={!selectedPlot.citizen.canRecruit}
            onClick={() => onRecruitCitizen(selectedPlot.citizen!.id)}
          >
            {selectedPlot.citizen.canRecruit
              ? `Recruit ${selectedPlot.citizen.name}`
              : 'Requirements Unmet'}
          </button>
        )}
      </div>
    </div>
  );
};
