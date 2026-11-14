import React, { useState } from 'react';
import type { TownshipCampView } from '../hudTypes';
import { FishingGestureGame } from '../minigames/FishingGestureGame';
import { HuntingGestureGame } from '../minigames/HuntingGestureGame';
import { TownshipLayoutViewer } from './TownshipLayoutViewer';

export type TownshipCampTab = 'overview' | 'blueprint' | 'hunt' | 'fish';

export interface TownshipCampDrawerProps {
  township: TownshipCampView;
  initialTab?: TownshipCampTab;
  onRecruitCitizen: (citizenId: string) => void;
  onStartHunt?: (params?: { approachAngle: number; distance: number }) => void;
  onCastFishingLine?: (castScore?: number) => void;
  onFishingBite?: () => void;
  onCookRecipe: (recipeId: string) => void;
  onRestAtCampfire: () => void;
  onClose: () => void;
}

/**
 * Mobile drawer for Diegetic Township Plot status (citizens Hanz, Sana, Barose, Kay;
 * instantiated buildings; active party buffs), interactive 8x6 Township Blueprint,
 * gesture-based Wind/Scent Hunting & Manillo Fishing mini-games, and Campfire Cooking.
 */
export const TownshipCampDrawer: React.FC<TownshipCampDrawerProps> = ({
  township,
  initialTab = 'overview',
  onRecruitCitizen,
  onStartHunt,
  onCastFishingLine,
  onFishingBite,
  onCookRecipe,
  onRestAtCampfire,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TownshipCampTab>(initialTab);

  return (
    <div
      className="bof-drawer-backdrop"
      data-testid="township-camp-drawer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bof-drawer-sheet bof-panel">
        <div className="bof-drawer-header">
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#fde68a' }}>
              🏕️ {township.plotName} &amp; Field Camp
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Township Tier {township.townshipLevel} · {township.zenny} Zenny
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-township"
            className="bof-touch-btn"
            style={{ minWidth: '48px', minHeight: '48px' }}
            onClick={onClose}
          >
            ✕ Close
          </button>
        </div>

        {/* Drawer Tab Switcher (>= 48px height) */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '8px 14px',
            borderBottom: '1px solid rgba(148,163,184,0.16)',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            data-testid="tab-township-overview"
            className={`bof-touch-btn ${activeTab === 'overview' ? 'bof-touch-btn--active' : ''}`}
            style={{ minHeight: '48px', flex: '1 1 130px' }}
            onClick={() => setActiveTab('overview')}
          >
            🏕️ Overview &amp; Camp
          </button>
          <button
            type="button"
            data-testid="tab-township-blueprint"
            className={`bof-touch-btn ${activeTab === 'blueprint' ? 'bof-touch-btn--active' : ''}`}
            style={{ minHeight: '48px', flex: '1 1 130px' }}
            onClick={() => setActiveTab('blueprint')}
          >
            📐 Township Blueprint
          </button>
          <button
            type="button"
            data-testid="tab-township-hunt"
            className={`bof-touch-btn ${activeTab === 'hunt' ? 'bof-touch-btn--active' : ''}`}
            style={{ minHeight: '48px', flex: '1 1 130px' }}
            onClick={() => setActiveTab('hunt')}
          >
            🏹 Hunt Mini-Game
          </button>
          <button
            type="button"
            data-testid="tab-township-fish"
            className={`bof-touch-btn ${activeTab === 'fish' ? 'bof-touch-btn--active' : ''}`}
            style={{ minHeight: '48px', flex: '1 1 130px' }}
            onClick={() => setActiveTab('fish')}
          >
            🎣 Fish Mini-Game
          </button>
        </div>

        <div className="bof-drawer-body">
          {activeTab === 'blueprint' && (
            <TownshipLayoutViewer
              township={township}
              onRecruitCitizen={onRecruitCitizen}
            />
          )}

          {activeTab === 'hunt' && (
            <HuntingGestureGame
              windDirection={township.huntingStatus.windDirection}
              windAngle={township.huntingStatus.windAngle}
              scentIntensity={township.huntingStatus.scentIntensity}
              available={township.huntingStatus.available}
              lastCatch={township.huntingStatus.lastCatch}
              onCompleteHunt={({ approachAngle, distance }) =>
                onStartHunt?.({ approachAngle, distance })
              }
            />
          )}

          {activeTab === 'fish' && (
            <FishingGestureGame
              baitCount={township.fishingStatus.baitCount}
              spotActive={township.fishingStatus.spotActive}
              lastCatch={township.fishingStatus.lastCatch}
              onBiteCue={onFishingBite}
              onCompleteCast={(castScore) => onCastFishingLine?.(castScore)}
            />
          )}

          {activeTab === 'overview' && (
            <>
              {/* Active Party Buffs */}
          <div
            data-testid="township-active-buffs"
            className="bof-panel"
            style={{
              padding: '8px 12px',
              borderRadius: '12px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
            }}
          >
            <strong style={{ color: '#4ade80' }}>Active Party Buffs:</strong>
            {township.activeBuffs.length === 0 ? (
              <span style={{ color: '#94a3b8' }}>None active — cook a meal or build Township structures</span>
            ) : (
              township.activeBuffs.map((buff, idx) => (
                <span
                  key={`${buff}-${idx}`}
                  style={{
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(74, 222, 128, 0.45)',
                    color: '#bbf7d0',
                    fontSize: '11px',
                  }}
                >
                  {buff}
                </span>
              ))
            )}
          </div>

          {/* Field Activities: Wind/Scent Hunting, Manillo Fishing, Campfire Rest */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '8px',
            }}
          >
            {/* Wind/Scent Hunting */}
            <div
              data-testid="panel-wind-hunting"
              className="bof-panel"
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#fca5a5' }}>
                  🏹 Wind / Scent Hunting
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '3px' }}>
                  Wind: <strong>{township.huntingStatus.windDirection}</strong> · Scent:{' '}
                  <strong>{township.huntingStatus.scentIntensity}</strong>
                </div>
                {township.huntingStatus.lastCatch && (
                  <div style={{ fontSize: '11px', color: '#fde68a', marginTop: '2px' }}>
                    Last Catch: {township.huntingStatus.lastCatch}
                  </div>
                )}
              </div>
              <button
                type="button"
                data-testid="btn-start-hunt"
                className="bof-touch-btn bof-touch-btn--primary"
                style={{ minHeight: '48px', width: '100%' }}
                disabled={!township.huntingStatus.available}
                onClick={() => onStartHunt?.()}
              >
                {township.huntingStatus.available ? 'Track Downwind Prey' : 'Trail Cooling Down'}
              </button>
            </div>

            {/* Manillo Fishing */}
            <div
              data-testid="panel-manillo-fishing"
              className="bof-panel"
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#7dd3fc' }}>
                  🎣 Manillo Fishing
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '3px' }}>
                  Bait Available: <strong>{township.fishingStatus.baitCount}</strong> · Spot:{' '}
                  <strong>{township.fishingStatus.spotActive ? 'Rippling' : 'Calm'}</strong>
                </div>
                {township.fishingStatus.lastCatch && (
                  <div style={{ fontSize: '11px', color: '#fde68a', marginTop: '2px' }}>
                    Last Catch: {township.fishingStatus.lastCatch}
                  </div>
                )}
              </div>
              <button
                type="button"
                data-testid="btn-cast-fishing"
                className="bof-touch-btn bof-touch-btn--primary"
                style={{ minHeight: '48px', width: '100%' }}
                disabled={township.fishingStatus.baitCount <= 0}
                onClick={() => onCastFishingLine?.()}
              >
                {township.fishingStatus.baitCount > 0 ? 'Cast Manillo Line' : 'Out of Bait'}
              </button>
            </div>

            {/* Campfire Rest */}
            <div
              data-testid="panel-campfire-rest"
              className="bof-panel"
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#fdba74' }}>
                  🔥 Campfire Sanctuary
                </div>
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '3px' }}>
                  Restore full party HP/AP, replenish Dragon Sync, and converse with companions.
                </div>
              </div>
              <button
                type="button"
                data-testid="btn-rest-campfire"
                className="bof-touch-btn"
                style={{
                  minHeight: '48px',
                  width: '100%',
                  borderColor: 'rgba(251, 146, 60, 0.7)',
                }}
                onClick={onRestAtCampfire}
              >
                Rest &amp; Restore Party
              </button>
            </div>
          </div>

          {/* Campfire Cooking Recipes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#fdba74' }}>
              🍲 Campfire Cooking
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: '8px',
              }}
            >
              {township.recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  data-testid={`recipe-card-${recipe.id}`}
                  className="bof-panel"
                  style={{
                    padding: '9px 10px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '6px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700 }}>{recipe.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {recipe.ingredientsLabel}
                    </div>
                    <div style={{ fontSize: '11px', color: '#86efac' }}>{recipe.effectLabel}</div>
                  </div>
                  <button
                    type="button"
                    data-testid={`btn-cook-${recipe.id}`}
                    className="bof-touch-btn"
                    style={{ minHeight: '48px', width: '100%' }}
                    disabled={!recipe.canCook}
                    onClick={() => onCookRecipe(recipe.id)}
                  >
                    {recipe.canCook ? 'Cook Meal' : 'Need Ingredients'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Diegetic Township Citizens & Instantiated Buildings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#fde68a' }}>
              🏘️ Township Citizens &amp; Instantiated Buildings
            </div>

            {township.buildings.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {township.buildings.map((b) => (
                  <div
                    key={b.id}
                    data-testid={`township-building-${b.id}`}
                    className="bof-panel"
                    style={{
                      padding: '6px 10px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      borderColor: 'rgba(251, 191, 36, 0.45)',
                    }}
                  >
                    <strong>
                      🏛️ {b.name} (Lv.{b.level})
                    </strong>
                    <div style={{ color: '#cbd5e1' }}>{b.bonusDescription}</div>
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '8px',
              }}
            >
              {township.citizens.map((citizen) => (
                <div
                  key={citizen.id}
                  data-testid={`citizen-card-${citizen.id}`}
                  className="bof-panel"
                  style={{
                    padding: '9px 10px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '6px',
                    borderColor: citizen.recruited
                      ? 'rgba(74, 222, 128, 0.55)'
                      : 'rgba(148, 163, 184, 0.25)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                      <span>{citizen.name}</span>
                      <span style={{ color: citizen.recruited ? '#4ade80' : '#94a3b8', fontSize: '10px' }}>
                        {citizen.recruited ? 'RESIDENT' : 'RECRUITABLE'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#fde68a' }}>
                      {citizen.role} → {citizen.buildingName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1' }}>{citizen.specialty}</div>
                  </div>
                  {!citizen.recruited && (
                    <button
                      type="button"
                      data-testid={`btn-recruit-${citizen.id}`}
                      className="bof-touch-btn bof-touch-btn--primary"
                      style={{ minHeight: '48px', width: '100%' }}
                      disabled={!citizen.canRecruit}
                      onClick={() => onRecruitCitizen(citizen.id)}
                    >
                      {citizen.canRecruit ? `Recruit ${citizen.name}` : 'Requirements Unmet'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
