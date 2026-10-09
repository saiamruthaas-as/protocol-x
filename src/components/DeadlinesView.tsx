import React, { useState } from 'react';
import { Deadline } from '../types';
import { Calendar, AlertTriangle, CheckCircle, Clock, ArrowRight, HelpCircle, Sparkles, Filter, CalendarDays, Upload } from 'lucide-react';

interface DeadlinesViewProps {
  deadlines: Deadline[];
  onNavigateToSource: (sourceMessageId: string) => void;
  onInspectWhy: (item: Deadline) => void;
}

export const DeadlinesView: React.FC<DeadlinesViewProps> = ({
  deadlines,
  onNavigateToSource,
  onInspectWhy
}) => {
  const [resolutionFilter, setResolutionFilter] = useState<string>('all');

  const resolvedCount = deadlines.filter(d => d.isResolved).length;
  const ambiguousCount = deadlines.filter(d => !d.isResolved).length;
  const overdueCount = deadlines.filter(d => d.isOverdue).length;

  const filteredDeadlines = deadlines.filter(d => {
    if (resolutionFilter === 'resolved' && !d.isResolved) return false;
    if (resolutionFilter === 'ambiguous' && d.isResolved) return false;
    if (resolutionFilter === 'overdue' && !d.isOverdue) return false;
    return true;
  });

  const formatDateChip = (normalizedDate?: string | null) => {
    if (!normalizedDate) return { month: 'TBD', day: '?', dow: 'REVIEW' };
    try {
      const d = new Date(normalizedDate);
      if (isNaN(d.getTime())) return { month: 'DATE', day: normalizedDate.slice(8, 10) || '?', dow: 'NORM' };
      const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      const day = d.getDate().toString().padStart(2, '0');
      const dow = d.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
      return { month, day, dow };
    } catch {
      return { month: 'DATE', day: '?', dow: 'NORM' };
    }
  };

  return (
    <div className="deadlines-view">
      {/* Header Banner */}
      <div className="glass-card mb-6">
        <div className="flex-between mb-4 flex-wrap gap-4">
          <div>
            <div className="flex-align gap-2 mb-1">
              <div className="category-pill-icon icon-emerald">
                <Calendar size={18} />
              </div>
              <span className="category-tag-badge">Category B — Timelines</span>
            </div>
            <h2 className="text-2xl font-bold">Deadlines & Deliverables</h2>
            <p className="text-xs text-muted">
              Chronological roadmap of explicit milestones, relative date phrases, and commitments.
            </p>
          </div>

          {/* Metric Summary Counters */}
          <div className="category-stats-ribbon">
            <div className="stat-pill">
              <span className="stat-num">{deadlines.length}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-pill pill-success">
              <span className="stat-num">{resolvedCount}</span>
              <span className="stat-label">Resolved</span>
            </div>
            {ambiguousCount > 0 && (
              <div className="stat-pill pill-warning">
                <span className="stat-num">{ambiguousCount}</span>
                <span className="stat-label">Needs Review</span>
              </div>
            )}
            {overdueCount > 0 && (
              <div className="stat-pill pill-danger">
                <span className="stat-num">{overdueCount}</span>
                <span className="stat-label">Overdue</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="filter-chips-row">
          <button
            className={`filter-chip ${resolutionFilter === 'all' ? 'active' : ''}`}
            onClick={() => setResolutionFilter('all')}
          >
            All Timelines ({deadlines.length})
          </button>
          <button
            className={`filter-chip ${resolutionFilter === 'resolved' ? 'active' : ''}`}
            onClick={() => setResolutionFilter('resolved')}
          >
            Explicit / Resolved ({resolvedCount})
          </button>
          <button
            className={`filter-chip ${resolutionFilter === 'ambiguous' ? 'active' : ''}`}
            onClick={() => setResolutionFilter('ambiguous')}
          >
            Needs Confirmation ({ambiguousCount})
          </button>
          {overdueCount > 0 && (
            <button
              className={`filter-chip ${resolutionFilter === 'overdue' ? 'active' : ''}`}
              onClick={() => setResolutionFilter('overdue')}
            >
              Overdue ({overdueCount})
            </button>
          )}
        </div>
      </div>

      {/* Deadlines List / Empty State */}
      {filteredDeadlines.length === 0 ? (
        <div className="glass-card empty-state-container py-12">
          <div className="empty-state-icon-box box-emerald">
            <CalendarDays size={36} />
          </div>
          <h3 className="empty-state-title">
            {deadlines.length === 0 ? 'No Deadlines Extracted' : 'No Deadlines Match Selected Filter'}
          </h3>
          <p className="empty-state-desc">
            {deadlines.length === 0
              ? 'No deadlines or relative date expressions were detected in the active conversation.'
              : 'Try switching the filter back to "All Timelines" to view all extracted dates.'}
          </p>
        </div>
      ) : (
        <div className="timeline-cards-list">
          {filteredDeadlines.map(item => {
            const sourceMsgId = item.sourceMessageIds[0];
            const chip = formatDateChip(item.normalizedDate);

            return (
              <div key={item.id} className="timeline-item-card">
                {/* Visual Calendar Date Chip */}
                <div className={`calendar-chip ${item.isResolved ? 'chip-resolved' : 'chip-ambiguous'}`}>
                  <span className="cal-month">{chip.month}</span>
                  <span className="cal-day">{chip.day}</span>
                  <span className="cal-dow">{chip.dow}</span>
                </div>

                {/* Timeline Main Content */}
                <div className="timeline-card-main">
                  <div className="timeline-header-row">
                    <div className="flex-align gap-2 flex-wrap">
                      <span className="date-phrase-badge">
                        “{item.originalDatePhrase}”
                      </span>
                      <span className={`status-pill ${item.isResolved ? 'pill-parsed' : 'pill-partial'}`}>
                        {item.resolutionType.replace('_', ' ').toUpperCase()}
                      </span>
                      {item.isOverdue && (
                        <span className="badge badge-danger-pill flex-align gap-1">
                          <AlertTriangle size={12} />
                          OVERDUE
                        </span>
                      )}
                    </div>

                    <span className="normalized-date-tag font-mono">
                      {item.normalizedDate ? item.normalizedDate.replace('T', ' ').slice(0, 16) : 'Unresolved Date'}
                    </span>
                  </div>

                  <p className="timeline-explanation-text">
                    {item.explanation}
                  </p>

                  <div className="timeline-footer-row">
                    <div className="timeline-meta-tags">
                      <span className="meta-subtag">
                        Status: {item.isResolved ? 'Strictly Resolved' : 'Requires User Confirmation'}
                      </span>
                    </div>

                    <div className="timeline-actions">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => onInspectWhy(item)}
                        title="View deterministic scoring rules"
                      >
                        <HelpCircle size={14} />
                        <span>Why this result?</span>
                      </button>

                      {sourceMsgId && (
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => onNavigateToSource(sourceMsgId)}
                          title="View source message in chat"
                        >
                          <span>View Source</span>
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
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

