import React, { useState } from 'react';
import type { QuestDefinition, TrueEndingEvaluation, WorldStateRegistry } from '../../core/types';

export interface QuestChronicleDrawerProps {
  worldState: WorldStateRegistry;
  trueEnding: TrueEndingEvaluation;
  onInvestigateClue: (clueId: string) => void;
  onAdvanceQuestObjective?: (questId: string, objectiveId: string) => void;
  onClose: () => void;
}

type ChronicleTab = 'MAIN_STORY' | 'COMPANION_ARC' | 'ST_EVA_RUMOR';

const STAGE_BADGE_COLORS: Record<QuestDefinition['stage'], string> = {
  HIDDEN: '#64748b',
  DISCOVERED: '#38bdf8',
  ACTIVE: '#fbbf24',
  COMPLETED: '#4ade80',
};

/**
 * Mobile drawer for Main Story (Coursair Innocence + Acts I-III),
 * Companion Arcs (Dragon Tear & Coliseum Fang), and St. Eva Rumors / True Ending Meter.
 */
export const QuestChronicleDrawer: React.FC<QuestChronicleDrawerProps> = ({
  worldState,
  trueEnding,
  onInvestigateClue,
  onAdvanceQuestObjective,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ChronicleTab>('MAIN_STORY');

  const allQuests = Object.values(worldState.quests);
  const filteredQuests = allQuests.filter((q) => q.category === activeTab);
  const allClues = Object.values(worldState.stEvaClues);

  const readinessScore = Math.min(
    100,
    Math.round(
      ((trueEnding.evanCluesVerified / Math.max(1, trueEnding.requiredClues)) * 45 +
        (trueEnding.liberatedRegionsCount / Math.max(1, trueEnding.requiredRegions)) * 30 +
        (Math.min(trueEnding.avgCompanionLoyalty, trueEnding.requiredLoyalty) /
          Math.max(1, trueEnding.requiredLoyalty)) *
          25)
    )
  );

  return (
    <div
      className="bof-drawer-backdrop"
      data-testid="quest-chronicle-drawer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bof-drawer-sheet bof-panel">
        <div className="bof-drawer-header">
          <div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#fde68a' }}>
              📜 Quest Chronicle — Act {worldState.currentAct}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              Liberated Regions: {worldState.liberatedRegions.length} · Shaman Resonance Rank{' '}
              {worldState.shamanResonanceRank}
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-quests"
            className="bof-touch-btn"
            style={{ minWidth: '48px', minHeight: '48px' }}
            onClick={onClose}
          >
            ✕ Close
          </button>
        </div>

        {/* Category Tabs (>= 48px height) */}
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
            data-testid="tab-main-story"
            className={`bof-touch-btn ${activeTab === 'MAIN_STORY' ? 'bof-touch-btn--active' : ''}`}
            style={{ minHeight: '48px', flex: '1 1 130px' }}
            onClick={() => setActiveTab('MAIN_STORY')}
          >
            📖 Main Story
          </button>
          <button
            type="button"
            data-testid="tab-companion-arcs"
            className={`bof-touch-btn ${activeTab === 'COMPANION_ARC' ? 'bof-touch-btn--active' : ''}`}
            style={{ minHeight: '48px', flex: '1 1 130px' }}
            onClick={() => setActiveTab('COMPANION_ARC')}
          >
            🤝 Companion Arcs
          </button>
          <button
            type="button"
            data-testid="tab-st-eva-rumors"
            className={`bof-touch-btn ${activeTab === 'ST_EVA_RUMOR' ? 'bof-touch-btn--active' : ''}`}
            style={{ minHeight: '48px', flex: '1 1 130px' }}
            onClick={() => setActiveTab('ST_EVA_RUMOR')}
          >
            🕯️ St. Eva Rumors
          </button>
        </div>

        <div className="bof-drawer-body">
          {/* True Ending Readiness Meter (shown prominently on St. Eva Rumors tab, compact elsewhere) */}
          {activeTab === 'ST_EVA_RUMOR' && (
            <div
              data-testid="true-ending-meter"
              className="bof-panel"
              style={{
                padding: '10px 12px',
                borderRadius: '12px',
                borderColor: trueEnding.isUnlocked ? '#4ade80' : 'rgba(251, 191, 36, 0.45)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 700 }}>
                <span>✨ True Ending Readiness (Truth of St. Eva)</span>
                <span style={{ color: trueEnding.isUnlocked ? '#4ade80' : '#fde68a' }}>
                  {trueEnding.isUnlocked ? 'UNLOCKED' : `${readinessScore}%`}
                </span>
              </div>
              <div className="bof-bar-track" style={{ height: '8px' }}>
                <div
                  className="bof-bar-fill"
                  style={{
                    width: `${readinessScore}%`,
                    background: trueEnding.isUnlocked
                      ? '#4ade80'
                      : 'linear-gradient(90deg, #f59e0b 0%, #fde047 100%)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', fontSize: '11px', color: '#cbd5e1' }}>
                <span>
                  Verified Clues: {trueEnding.evanCluesVerified}/{trueEnding.requiredClues}
                </span>
                <span>
                  Regions: {trueEnding.liberatedRegionsCount}/{trueEnding.requiredRegions}
                </span>
                <span>
                  Avg Loyalty: {trueEnding.avgCompanionLoyalty.toFixed(1)}/{trueEnding.requiredLoyalty}
                </span>
              </div>
              {trueEnding.missingConditions.length > 0 && (
                <div style={{ fontSize: '11px', color: '#fca5a5' }}>
                  Remaining: {trueEnding.missingConditions.join(' · ')}
                </div>
              )}
            </div>
          )}

          {/* St. Eva Evidence Clues list */}
          {activeTab === 'ST_EVA_RUMOR' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>
                St. Eva Evidence Clues
              </div>
              {allClues.map((clue) => (
                <div
                  key={clue.id}
                  data-testid={`clue-card-${clue.id}`}
                  className="bof-panel"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    borderColor: clue.verified
                      ? 'rgba(74, 222, 128, 0.55)'
                      : clue.discovered
                      ? 'rgba(251, 191, 36, 0.55)'
                      : 'rgba(148, 163, 184, 0.25)',
                  }}
                >
                  <div style={{ flex: '1 1 240px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700 }}>
                      <span>{clue.title}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          background: clue.verified
                            ? 'rgba(34,197,94,0.2)'
                            : clue.discovered
                            ? 'rgba(251,191,36,0.2)'
                            : 'rgba(100,116,139,0.25)',
                          color: clue.verified
                            ? '#4ade80'
                            : clue.discovered
                            ? '#fde68a'
                            : '#94a3b8',
                        }}
                      >
                        {clue.verified ? 'VERIFIED' : clue.discovered ? 'DISCOVERED' : 'RUMOR'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      📍 {clue.location}
                    </div>
                    <div style={{ fontSize: '12px', color: '#e2e8f0', marginTop: '4px' }}>
                      {clue.summary}
                    </div>
                  </div>
                  {!clue.verified && (
                    <button
                      type="button"
                      data-testid={`btn-investigate-clue-${clue.id}`}
                      className="bof-touch-btn bof-touch-btn--primary"
                      style={{ minHeight: '48px', minWidth: '124px' }}
                      onClick={() => onInvestigateClue(clue.id)}
                    >
                      {clue.discovered ? '🔍 Verify Clue' : '🔎 Investigate'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quests list for selected tab */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredQuests.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#94a3b8', padding: '12px 0' }}>
                No quests recorded in this chronicle section yet.
              </div>
            ) : (
              filteredQuests.map((quest) => (
                <div
                  key={quest.id}
                  data-testid={`quest-card-${quest.id}`}
                  className="bof-panel"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#f8fafc' }}>
                      {quest.title}{' '}
                      <span style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8' }}>
                        (Act {quest.act})
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '9999px',
                        color: STAGE_BADGE_COLORS[quest.stage],
                        border: `1px solid ${STAGE_BADGE_COLORS[quest.stage]}`,
                      }}
                    >
                      {quest.stage}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1' }}>{quest.summary}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '2px' }}>
                    {quest.objectives.map((obj) => (
                      <div
                        key={obj.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          fontSize: '12px',
                          color: obj.completed ? '#86efac' : '#e2e8f0',
                        }}
                      >
                        <span>
                          {obj.completed ? '☑' : '☐'} {obj.description}
                        </span>
                        {!obj.completed && onAdvanceQuestObjective && (
                          <button
                            type="button"
                            data-testid={`btn-advance-obj-${obj.id}`}
                            className="bof-touch-btn"
                            style={{ minHeight: '48px', minWidth: '88px' }}
                            onClick={() => onAdvanceQuestObjective(quest.id, obj.id)}
                          >
                            Advance
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {(quest.rewardRelicId || quest.rewardSignatureId) && (
                    <div style={{ fontSize: '11px', color: '#fde68a', marginTop: '2px' }}>
                      🎁 Reward: {quest.rewardRelicId ?? quest.rewardSignatureId}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
