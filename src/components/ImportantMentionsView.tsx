import React, { useState } from 'react';
import { ImportantMention, MentionCategory } from '../types';
import { Bell, Filter, HelpCircle, ArrowRight, AlertTriangle, ShieldAlert, CheckCircle2, Sparkles, MessageCircleQuestion, Megaphone, Flame } from 'lucide-react';

interface ImportantMentionsViewProps {
  mentions: ImportantMention[];
  onNavigateToSource: (sourceMessageId: string) => void;
  onInspectWhy: (item: ImportantMention) => void;
}

export const ImportantMentionsView: React.FC<ImportantMentionsViewProps> = ({
  mentions,
  onNavigateToSource,
  onInspectWhy
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const questionsCount = mentions.filter(m => m.category === 'question').length;
  const blockersCount = mentions.filter(m => m.category === 'blocker').length;
  const announcementsCount = mentions.filter(m => m.category === 'announcement').length;
  const urgentCount = mentions.filter(m => m.category === 'urgent_request').length;

  const filteredMentions = mentions.filter(m => {
    if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'blocker':
        return <ShieldAlert size={16} className="text-danger" />;
      case 'urgent_request':
        return <Flame size={16} className="text-warning" />;
      case 'question':
        return <MessageCircleQuestion size={16} className="text-cyan" />;
      case 'announcement':
        return <Megaphone size={16} className="text-violet" />;
      default:
        return <Bell size={16} className="text-indigo" />;
    }
  };

  return (
    <div className="important-mentions-view">
      {/* Header Banner */}
      <div className="glass-card mb-6">
        <div className="flex-between mb-4 flex-wrap gap-4">
          <div>
            <div className="flex-align gap-2 mb-1">
              <div className="category-pill-icon icon-amber">
                <Bell size={18} />
              </div>
              <span className="category-tag-badge">Category C — High Signal</span>
            </div>
            <h2 className="text-2xl font-bold">Important Mentions & Blurbs</h2>
            <p className="text-xs text-muted">
              Direct questions, blockers, urgent broadcasts, and announcements that require attention.
            </p>
          </div>

          {/* Signal Stats Ribbon */}
          <div className="category-stats-ribbon">
            <div className="stat-pill">
              <span className="stat-num">{mentions.length}</span>
              <span className="stat-label">Total Signals</span>
            </div>
            {blockersCount > 0 && (
              <div className="stat-pill pill-danger">
                <span className="stat-num">{blockersCount}</span>
                <span className="stat-label">Blockers</span>
              </div>
            )}
            {questionsCount > 0 && (
              <div className="stat-pill pill-cyan">
                <span className="stat-num">{questionsCount}</span>
                <span className="stat-label">Questions</span>
              </div>
            )}
            {announcementsCount > 0 && (
              <div className="stat-pill pill-violet">
                <span className="stat-num">{announcementsCount}</span>
                <span className="stat-label">Announcements</span>
              </div>
            )}
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="filter-chips-row flex-wrap">
          <button
            className={`filter-chip ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            All Signals ({mentions.length})
          </button>
          {blockersCount > 0 && (
            <button
              className={`filter-chip ${categoryFilter === 'blocker' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('blocker')}
            >
              Blockers & Issues ({blockersCount})
            </button>
          )}
          {questionsCount > 0 && (
            <button
              className={`filter-chip ${categoryFilter === 'question' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('question')}
            >
              Questions ({questionsCount})
            </button>
          )}
          {urgentCount > 0 && (
            <button
              className={`filter-chip ${categoryFilter === 'urgent_request' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('urgent_request')}
            >
              Urgent Requests ({urgentCount})
            </button>
          )}
          {announcementsCount > 0 && (
            <button
              className={`filter-chip ${categoryFilter === 'announcement' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('announcement')}
            >
              Announcements ({announcementsCount})
            </button>
          )}
        </div>
      </div>

      {/* Mentions List / Empty State */}
      {filteredMentions.length === 0 ? (
        <div className="glass-card empty-state-container py-12">
          <div className="empty-state-icon-box box-amber">
            <Bell size={36} />
          </div>
          <h3 className="empty-state-title">
            {mentions.length === 0 ? 'No Mentions Extracted' : 'No Mentions Match Selected Filter'}
          </h3>
          <p className="empty-state-desc">
            {mentions.length === 0
              ? 'No questions, blockers, or direct mentions were detected in the active conversation.'
              : 'Try switching the category filter back to "All Signals".'}
          </p>
        </div>
      ) : (
        <div className="mentions-cards-list">
          {filteredMentions.map(item => {
            const sourceMsgId = item.sourceMessageIds[0];

            return (
              <div key={item.id} className={`mention-item-card mention-category-${item.category}`}>
                <div className="mention-header-row">
                  <div className="flex-align gap-2 flex-wrap">
                    <div className="mention-category-chip">
                      {getCategoryIcon(item.category)}
                      <span>{item.category.replace('_', ' ').toUpperCase()}</span>
                    </div>

                    <span className={`priority-pill priority-${item.priorityLabel}`}>
                      <span className="priority-dot" />
                      {item.priorityLabel.toUpperCase()} ({item.priorityScore})
                    </span>

                    <span className={`status-pill pill-${item.confidenceLabel === 'detected' ? 'parsed' : 'partial'}`}>
                      {item.confidenceLabel.toUpperCase()}
                    </span>
                  </div>

                  <span className="mention-id-tag font-mono">
                    {item.id}
                  </span>
                </div>

                {/* Excerpt Bubble */}
                <div className="mention-quote-bubble">
                  <p className="mention-quote-text">
                    "{item.excerpt}"
                  </p>
                </div>

                <p className="mention-reason-text">
                  <strong className="text-secondary">Evidence:</strong> {item.reason}
                </p>

                <div className="mention-footer-row">
                  <div className="mention-meta">
                    <span className="meta-subtag">
                      Audited by Rule Engine
                    </span>
                  </div>

                  <div className="mention-actions">
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => onInspectWhy(item)}
                      title="Inspect deterministic rule score breakdown"
                    >
                      <HelpCircle size={14} />
                      <span>Why this result?</span>
                    </button>

                    {sourceMsgId && (
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => onNavigateToSource(sourceMsgId)}
                        title="Jump to source message in chat"
                      >
                        <span>View Source</span>
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

