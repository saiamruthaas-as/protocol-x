import React, { useState } from 'react';
import { ActionItem, TaskStatus, PriorityLabel } from '../types';
import { CheckSquare, CheckCircle, Clock, HelpCircle, ArrowRight, Search, Sparkles, Filter, CheckCircle2, RotateCcw, AlertTriangle, User } from 'lucide-react';

interface ActionItemsViewProps {
  actionItems: ActionItem[];
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onNavigateToSource: (sourceMessageId: string) => void;
  onInspectWhy: (item: ActionItem) => void;
}

export const ActionItemsView: React.FC<ActionItemsViewProps> = ({
  actionItems,
  onUpdateTaskStatus,
  onNavigateToSource,
  onInspectWhy
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const pendingCount = actionItems.filter(i => i.status === 'pending').length;
  const completedCount = actionItems.filter(i => i.status === 'completed').length;
  const highPriorityCount = actionItems.filter(i => i.priorityLabel === 'high').length;
  const reviewCount = actionItems.filter(i => i.status === 'needs_confirmation').length;

  const filteredItems = actionItems.filter(item => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && item.priorityLabel !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.description.toLowerCase().includes(q) ||
        (item.assignee && item.assignee.toLowerCase().includes(q));
    }
    return true;
  });

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    setUpdatingTaskId(taskId);
    try {
      await onUpdateTaskStatus(taskId, newStatus);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const getAvatarGradient = (name?: string | null) => {
    const gradients = [
      'linear-gradient(135deg, #6366f1, #8b5cf6)',
      'linear-gradient(135deg, #14b8a6, #06b6d4)',
      'linear-gradient(135deg, #f59e0b, #ef4444)',
      'linear-gradient(135deg, #ec4899, #8b5cf6)',
      'linear-gradient(135deg, #10b981, #14b8a6)'
    ];
    if (!name) return gradients[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div className="action-items-view">
      {/* Top Header Card */}
      <div className="glass-card mb-6">
        <div className="flex-between mb-4 flex-wrap gap-4">
          <div>
            <div className="flex-align gap-2 mb-1">
              <div className="category-pill-icon icon-indigo">
                <CheckSquare size={18} />
              </div>
              <span className="category-tag-badge">Category A — Tasks</span>
            </div>
            <h2 className="text-2xl font-bold">Action Items & Commitments</h2>
            <p className="text-xs text-muted">
              Concrete responsibilities, task assignments, and commitments extracted with evidence.
            </p>
          </div>

          {/* Stats Counters Ribbon */}
          <div className="category-stats-ribbon">
            <div className="stat-pill">
              <span className="stat-num">{actionItems.length}</span>
              <span className="stat-label">Total Tasks</span>
            </div>
            <div className="stat-pill pill-indigo">
              <span className="stat-num">{pendingCount}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-pill pill-success">
              <span className="stat-num">{completedCount}</span>
              <span className="stat-label">Completed</span>
            </div>
            {highPriorityCount > 0 && (
              <div className="stat-pill pill-danger">
                <span className="stat-num">{highPriorityCount}</span>
                <span className="stat-label">High Priority</span>
              </div>
            )}
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="filter-toolbar-grid">
          {/* Search Box */}
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Search tasks, descriptions, or assignees..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter Chips */}
          <div className="filter-chips-row flex-1">
            <button
              className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All ({actionItems.length})
            </button>
            <button
              className={`filter-chip ${statusFilter === 'pending' ? 'active' : ''}`}
              onClick={() => setStatusFilter('pending')}
            >
              Pending ({pendingCount})
            </button>
            <button
              className={`filter-chip ${statusFilter === 'completed' ? 'active' : ''}`}
              onClick={() => setStatusFilter('completed')}
            >
              Completed ({completedCount})
            </button>
            {reviewCount > 0 && (
              <button
                className={`filter-chip ${statusFilter === 'needs_confirmation' ? 'active' : ''}`}
                onClick={() => setStatusFilter('needs_confirmation')}
              >
                Needs Review ({reviewCount})
              </button>
            )}
          </div>

          {/* Priority Select */}
          <select
            className="form-select select-priority-pill"
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Task Cards List / Empty State */}
      {filteredItems.length === 0 ? (
        <div className="glass-card empty-state-container py-12">
          <div className="empty-state-icon-box box-indigo">
            <CheckSquare size={36} />
          </div>
          <h3 className="empty-state-title">
            {actionItems.length === 0 ? 'No Action Items Extracted' : 'No Tasks Match Current Filters'}
          </h3>
          <p className="empty-state-desc">
            {actionItems.length === 0
              ? 'No actionable tasks or commitments were detected in the active conversation.'
              : 'Try clearing your search query or switching filters back to "All" to view all tasks.'}
          </p>
        </div>
      ) : (
        <div className="task-cards-list">
          {filteredItems.map(item => {
            const sourceMsgId = item.sourceMessageIds[0];
            const isUpdating = updatingTaskId === item.id;
            const isCompleted = item.status === 'completed';

            return (
              <div 
                key={item.id} 
                className={`task-item-card ${isCompleted ? 'task-completed' : ''} priority-border-${item.priorityLabel}`}
              >
                <div className="task-main-row">
                  {/* Interactive Checkbox */}
                  <button
                    className={`custom-task-checkbox ${isCompleted ? 'checked' : ''}`}
                    disabled={isUpdating}
                    onClick={() => handleStatusChange(item.id, isCompleted ? 'pending' : 'completed')}
                    aria-label={isCompleted ? 'Mark as pending' : 'Mark as completed'}
                  >
                    {isCompleted && <CheckCircle2 size={16} />}
                  </button>

                  {/* Task Content */}
                  <div className="task-content-area">
                    <div className="task-header-meta">
                      <div className="flex-align gap-2 flex-wrap">
                        {/* Assignee Avatar Pill */}
                        <div className="assignee-pill">
                          <div 
                            className="assignee-avatar-circle"
                            style={{ background: getAvatarGradient(item.assignee) }}
                          >
                            {getInitials(item.assignee)}
                          </div>
                          <span className="assignee-name">{item.assignee || 'Unassigned'}</span>
                        </div>

                        {/* Priority Badge */}
                        <span className={`priority-pill priority-${item.priorityLabel}`}>
                          <span className="priority-dot" />
                          {item.priorityLabel.toUpperCase()} ({item.priorityScore})
                        </span>

                        {/* Confidence Badge */}
                        <span className={`status-pill pill-${item.confidenceLabel === 'detected' ? 'parsed' : 'partial'}`}>
                          {item.confidenceLabel.toUpperCase()}
                        </span>

                        {item.deadlineId && (
                          <span className="deadline-linked-pill">
                            <Clock size={12} />
                            Deadline Linked
                          </span>
                        )}
                      </div>

                      <span className="task-id-tag font-mono">
                        {item.id}
                      </span>
                    </div>

                    <h3 className={`task-title-text ${isCompleted ? 'task-title-strikethrough' : ''}`}>
                      {item.description}
                    </h3>

                    <p className="task-explanation-text">
                      {item.explanation}
                    </p>
                  </div>
                </div>

                {/* Task Footer Actions */}
                <div className="task-footer-bar">
                  <div className="task-status-info">
                    {item.status === 'needs_confirmation' && (
                      <span className="text-xs text-warning flex-align gap-1 font-medium">
                        <AlertTriangle size={14} />
                        Requires human verification
                      </span>
                    )}
                  </div>

                  <div className="task-actions-row">
                    {item.status === 'needs_confirmation' && (
                      <button
                        className="btn btn-outline btn-xs text-success"
                        disabled={isUpdating}
                        onClick={() => handleStatusChange(item.id, 'pending')}
                      >
                        <CheckCircle size={14} />
                        <span>Confirm Task</span>
                      </button>
                    )}

                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => onInspectWhy(item)}
                      title="Inspect rule engine logic"
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
            );
          })}
        </div>
      )}
    </div>
  );
};

