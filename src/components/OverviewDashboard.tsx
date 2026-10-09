import React from 'react';
import { AnalysisResult, Conversation, ActionItem, ImportantMention, Deadline, ReviewCheckpoint } from '../types';
import { 
  CheckSquare, Calendar, Bell, FileText, ArrowRight, HelpCircle, 
  Sparkles, Zap, ShieldCheck, Clock, CheckCircle2, ChevronRight,
  TrendingUp, Users, MessageSquareCode, Check, BookmarkCheck
} from 'lucide-react';

interface OverviewDashboardProps {
  conversations: Conversation[];
  activeAnalysis: AnalysisResult | null;
  activeConversation: Conversation | null;
  onNavigateToTab: (tab: 'action_items' | 'deadlines' | 'important_mentions' | 'explorer' | 'import') => void;
  onNavigateToSource: (msgId: string) => void;
  onInspectWhy: (item: ActionItem | ImportantMention | Deadline) => void;
  checkpoint?: ReviewCheckpoint | null;
  onMarkReviewed?: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  conversations,
  activeAnalysis,
  activeConversation,
  onNavigateToTab,
  onNavigateToSource,
  onInspectWhy,
  checkpoint,
  onMarkReviewed
}) => {
  if (conversations.length === 0 || !activeAnalysis) {
    return (
      <div className="onboarding-hero-container">
        <div className="hero-banner-card">
          <div className="hero-badge">
            <Sparkles size={14} className="sparkle-pulse" />
            <span>100% Client-Side Intelligence • Zero Cloud Storage</span>
          </div>

          <h1 className="hero-title">
            CatchUp AI — <span className="hero-gradient-text">Unread Conversation Intelligence</span>
          </h1>

          <p className="hero-description">
            Extract action items, extract deadlines, and detect important mentions locally in your browser. All processing is deterministic and private.
          </p>

          <div className="flex-align gap-3 justify-center mb-8 flex-wrap">
            <button 
              className="btn btn-primary btn-lg"
              onClick={() => onNavigateToTab('import')}
            >
              <FileText size={18} />
              <span>Import Conversation to Analyze</span>
            </button>
          </div>

          {/* Real Privacy & Engine Guarantees */}
          <div className="hero-features-ribbon">
            <div className="feature-pill">
              <ShieldCheck size={16} className="text-emerald" />
              <span>Zero Cloud Sync & Zero External AI APIs</span>
            </div>
            <div className="feature-pill">
              <CheckCircle2 size={16} className="text-indigo" />
              <span>Deterministic Rule-Based Processing</span>
            </div>
            <div className="feature-pill">
              <Sparkles size={16} className="text-amber" />
              <span>100% Browser-Local IndexedDB Storage</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const openTasks = activeAnalysis.actionItems.filter(a => a.status === 'pending');
  const completedTasks = activeAnalysis.actionItems.filter(a => a.status === 'completed');
  const resolvedDeadlines = activeAnalysis.deadlines.filter(d => d.isResolved);
  const mentionsCount = activeAnalysis.importantMentions.length;
  const decisionsCount = activeAnalysis.decisions?.length || 0;

  const highPriorityItems = [
    ...activeAnalysis.actionItems.filter(a => a.priorityLabel === 'high'),
    ...activeAnalysis.importantMentions.filter(m => m.priorityLabel === 'high')
  ];

  return (
    <div className="overview-dashboard">
      {/* Top Context Header Bar */}
      <div className="glass-card overview-header-banner mb-6">
        <div className="header-info-col">
          <div className="flex-align gap-2 mb-1">
            <span className="status-indicator-live" />
            <span className="header-label-badge">Active Conversation</span>
            {checkpoint ? (
              <span className="badge badge-success-pill flex-align gap-1 font-mono text-xs">
                <BookmarkCheck size={12} />
                Reviewed {checkpoint.lastReviewedAt ? new Date(checkpoint.lastReviewedAt).toLocaleDateString() : ''}
              </span>
            ) : (
              <span className="badge badge-warning-pill text-xs">
                Unreviewed
              </span>
            )}
          </div>
          <h2 className="header-title">{activeConversation?.title || 'Loaded Conversation'}</h2>
          <p className="header-subtext">
            Imported and analyzed browser-locally with deterministic scoring rules.
          </p>
        </div>

        <div className="header-actions-col">
          {onMarkReviewed && (
            <button 
              className="btn btn-primary btn-sm"
              onClick={onMarkReviewed}
              title="Save a review checkpoint for this conversation"
            >
              <CheckCircle2 size={15} />
              <span>{checkpoint ? 'Update Review Checkpoint' : 'Mark as Reviewed'}</span>
            </button>
          )}
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateToTab('explorer')}
          >
            <MessageSquareCode size={15} />
            <span>Inspect All Messages</span>
          </button>
          <button 
            className="btn btn-outline btn-sm"
            onClick={() => onNavigateToTab('import')}
          >
            <span>+ Import Another Chat</span>
          </button>
        </div>
      </div>

      {/* Real Metric Summary Cards */}
      <div className="metrics-grid">
        {/* Action Items Card */}
        <div className="metric-card metric-card-tasks cursor-pointer" onClick={() => onNavigateToTab('action_items')}>
          <div className="metric-header-row">
            <span className="metric-label">Action Items</span>
            <div className="metric-icon-box box-indigo">
              <CheckSquare size={20} />
            </div>
          </div>
          <div className="metric-body-row">
            <span className="metric-value">{openTasks.length}</span>
            <span className="metric-sublabel">Open Tasks</span>
          </div>
          <div className="metric-footer-bar">
            <div className="progress-track">
              <div 
                className="progress-fill fill-indigo" 
                style={{ width: `${activeAnalysis.actionItems.length > 0 ? (completedTasks.length / activeAnalysis.actionItems.length) * 100 : 0}%` }} 
              />
            </div>
            <span className="progress-caption">{completedTasks.length} / {activeAnalysis.actionItems.length} completed</span>
          </div>
        </div>

        {/* Deadlines Card */}
        <div className="metric-card metric-card-deadlines cursor-pointer" onClick={() => onNavigateToTab('deadlines')}>
          <div className="metric-header-row">
            <span className="metric-label">Deadlines</span>
            <div className="metric-icon-box box-emerald">
              <Calendar size={20} />
            </div>
          </div>
          <div className="metric-body-row">
            <span className="metric-value">{resolvedDeadlines.length}</span>
            <span className="metric-sublabel">Resolved Timelines</span>
          </div>
          <div className="metric-footer-bar">
            <span className="metric-chip chip-emerald">
              {activeAnalysis.deadlines.length} Total Extracted Dates
            </span>
          </div>
        </div>

        {/* Important Mentions Card */}
        <div className="metric-card metric-card-mentions cursor-pointer" onClick={() => onNavigateToTab('important_mentions')}>
          <div className="metric-header-row">
            <span className="metric-label">Signal Mentions</span>
            <div className="metric-icon-box box-amber">
              <Bell size={20} />
            </div>
          </div>
          <div className="metric-body-row">
            <span className="metric-value">{mentionsCount}</span>
            <span className="metric-sublabel">High Signal Alerts</span>
          </div>
          <div className="metric-footer-bar">
            <span className="metric-chip chip-amber">
              Questions & Blockers Detected
            </span>
          </div>
        </div>

        {/* Intelligence Radar Metric */}
        <div className="metric-card metric-card-decisions cursor-pointer" onClick={() => onNavigateToTab('explorer')}>
          <div className="metric-header-row">
            <span className="metric-label">Decisions Logged</span>
            <div className="metric-icon-box box-teal">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="metric-body-row">
            <span className="metric-value">{decisionsCount}</span>
            <span className="metric-sublabel">Key Consensus Points</span>
          </div>
          <div className="metric-footer-bar">
            <span className="metric-chip chip-teal">
              100% Browser Local Storage
            </span>
          </div>
        </div>
      </div>

      {/* Conversation Rule-Based Digest Card */}
      <div className="glass-card digest-card mb-6">
        <div className="digest-header">
          <div className="flex-align gap-2">
            <div className="digest-icon-badge">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="digest-title">Rule-Based Executive Digest</h3>
              <p className="digest-subtitle">Deterministic summary derived strictly from conversation text</p>
            </div>
          </div>
          <span className="digest-timestamp font-mono">
            Analyzed {activeAnalysis.analyzedAt.slice(0, 10)}
          </span>
        </div>
        <div className="digest-content-box">
          <p className="digest-text">
            {activeAnalysis.digest}
          </p>
        </div>
      </div>

      {/* High Priority Attention Radar */}
      <div className="glass-card radar-card mb-6">
        <div className="flex-between mb-4 flex-wrap gap-3">
          <div>
            <div className="flex-align gap-2">
              <span className="radar-pulse-dot" />
              <h3 className="text-lg font-bold">Smart Attention Radar</h3>
            </div>
            <p className="text-xs text-muted">High-priority findings ranked by urgency, commitments & explicit blockers</p>
          </div>
          <span className="badge badge-high-pill">{highPriorityItems.length} Urgent Findings</span>
        </div>

        {highPriorityItems.length === 0 ? (
          <div className="radar-empty-box">
            <CheckCircle2 size={32} className="text-emerald mx-auto mb-2 opacity-60" />
            <p className="text-sm text-secondary font-medium">All clear! No high-urgency blockers detected in this chat.</p>
            <p className="text-xs text-muted mt-1">Review standard action items and upcoming deadlines in their respective tabs.</p>
          </div>
        ) : (
          <div className="priority-list-grid">
            {highPriorityItems.map(item => {
              const isAction = 'description' in item;
              const title = isAction ? item.description : item.excerpt;
              const sourceMsgId = item.sourceMessageIds[0];

              return (
                <div key={item.id} className="priority-item-card">
                  <div className="priority-item-top">
                    <div className="priority-rank-badge">
                      <span className="priority-score-number">{item.priorityScore}</span>
                      <span className="priority-score-caption">Score</span>
                    </div>
                    <div className="priority-item-content">
                      <h4 className="priority-item-title">{title}</h4>
                      <p className="priority-item-explanation">
                        {isAction ? item.explanation : item.reason}
                      </p>
                    </div>
                  </div>

                  <div className="priority-item-bottom">
                    <div className="priority-meta-group">
                      <span className="meta-pill">
                        {isAction ? `Assignee: ${item.assignee || 'Unassigned'}` : `Category: ${item.category}`}
                      </span>
                      <span className={`confidence-pill confidence-${item.confidenceLabel}`}>
                        {item.confidenceLabel.toUpperCase()}
                      </span>
                    </div>

                    <div className="priority-actions-group">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => onInspectWhy(item)}
                        title="Explain rule logic and scoring"
                      >
                        <HelpCircle size={14} />
                        <span>Why this result?</span>
                      </button>

                      {sourceMsgId && (
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => onNavigateToSource(sourceMsgId)}
                          title="Jump directly to source message in chat"
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

      {/* Confirmed Decisions & Plan Updates Section */}
      {((activeAnalysis.decisions && activeAnalysis.decisions.length > 0) || (activeAnalysis.changes && activeAnalysis.changes.length > 0)) && (
        <div className="glass-card mb-6">
          <div className="flex-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold">Confirmed Decisions & Plan Updates</h3>
              <p className="text-xs text-muted">Auditable record of team agreements, meeting shifts, and schedule changes</p>
            </div>
            <span className="badge badge-accent">
              {(activeAnalysis.decisions?.length || 0) + (activeAnalysis.changes?.length || 0)} Signals Detected
            </span>
          </div>

          <div className="priority-list-grid">
            {activeAnalysis.decisions?.map(d => (
              <div key={d.id} className="priority-item-card" style={{ borderLeftColor: '#10b981' }}>
                <div className="flex-between mb-1">
                  <span className="status-pill pill-parsed">CONFIRMED DECISION</span>
                  <span className="text-xs text-muted font-mono">{d.id}</span>
                </div>
                <h4 className="priority-item-title">{d.decision}</h4>
                <p className="priority-item-explanation">{d.explanation}</p>
                {d.sourceMessageIds[0] && (
                  <div className="flex-end mt-2">
                    <button 
                      className="btn btn-outline btn-xs"
                      onClick={() => onNavigateToSource(d.sourceMessageIds[0])}
                    >
                      <span>View Source</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {activeAnalysis.changes?.map(c => (
              <div key={c.id} className="priority-item-card" style={{ borderLeftColor: '#8b5cf6' }}>
                <div className="flex-between mb-1">
                  <span className="status-pill pill-partial">PLAN / SCHEDULE UPDATE</span>
                  <span className="text-xs text-muted font-mono">{c.id}</span>
                </div>
                <h4 className="priority-item-title">{c.subject}: {c.attribute}</h4>
                <p className="priority-item-explanation">{c.explanation}</p>
                <div className="flex-between mt-2 flex-wrap gap-2">
                  <span className="meta-pill">Previous: {c.previousValue || 'N/A'} → New: {c.proposedValue}</span>
                  {c.sourceMessageIds[0] && (
                    <button 
                      className="btn btn-outline btn-xs"
                      onClick={() => onNavigateToSource(c.sourceMessageIds[0])}
                    >
                      <span>View Source</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


