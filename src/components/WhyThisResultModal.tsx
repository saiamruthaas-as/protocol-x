import React from 'react';
import { ActionItem, ImportantMention, Deadline } from '../types';
import { HelpCircle, CheckCircle, AlertTriangle, X, ShieldAlert, ArrowRight } from 'lucide-react';

interface WhyThisResultModalProps {
  item: ActionItem | ImportantMention | Deadline | null;
  onClose: () => void;
  onNavigateToSource?: (sourceMessageId: string) => void;
}

export const WhyThisResultModal: React.FC<WhyThisResultModalProps> = ({
  item,
  onClose,
  onNavigateToSource
}) => {
  if (!item) return null;

  const isActionItem = 'description' in item;
  const isMention = 'category' in item;
  const isDeadline = 'originalDatePhrase' in item;

  const title = isActionItem ? item.description : (isMention ? item.excerpt : item.originalDatePhrase);
  const priorityScore = isActionItem || isMention ? item.priorityScore : undefined;
  const confidenceLabel = item.confidenceLabel;
  const reasons = (isActionItem || isMention) ? item.reasons : [item.explanation];
  const explanation = isActionItem ? item.explanation : (isMention ? item.reason : item.explanation);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex-between gap-2">
            <HelpCircle className="text-accent" size={24} />
            <div>
              <h3 className="text-lg font-semibold">Why this result?</h3>
              <p className="text-xs text-muted">Inspectable Rule-Based Evidence Breakdown</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Finding Subject */}
          <div className="item-card mb-4">
            <span className="text-xs text-muted uppercase font-semibold">Finding Target</span>
            <p className="item-title mt-1">"{title}"</p>
          </div>

          {/* Priority Score Breakdown (if scored) */}
          {priorityScore !== undefined && (
            <div className="form-group mb-4">
              <span className="form-label">Priority Score Arithmetic</span>
              <div className="item-card bg-input">
                <div className="flex-between mb-2">
                  <span className="font-semibold text-sm">Calculated Priority Score</span>
                  <span className={`badge badge-${priorityScore >= 70 ? 'high' : (priorityScore >= 40 ? 'medium' : 'low')}`}>
                    {priorityScore} / 100 ({priorityScore >= 70 ? 'High' : (priorityScore >= 40 ? 'Medium' : 'Low')})
                  </span>
                </div>
                <p className="text-xs text-muted">{explanation}</p>
              </div>
            </div>
          )}

          {/* Matched Rule Signals */}
          <div className="form-group mb-4">
            <span className="form-label">Matched Signals & Evidence Rules</span>
            <ul className="item-card warning-list">
              {reasons.map((r, i) => (
                <li key={i} className="text-xs text-secondary mb-1">
                  ✓ {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Confidence & Uncertainty Explanation */}
          <div className="form-group mb-4">
            <span className="form-label">Confidence & Known Uncertainty</span>
            <div className={`alert-banner ${confidenceLabel === 'detected' ? 'success-banner' : 'warning-banner'}`}>
              {confidenceLabel === 'detected' ? (
                <CheckCircle size={18} className="text-success" />
              ) : (
                <AlertTriangle size={18} className="text-warning" />
              )}
              <div className="text-xs">
                <span className="font-semibold uppercase">Confidence: {confidenceLabel}</span>
                <p className="mt-1">
                  {confidenceLabel === 'detected' && 'Strong evidence directly stated in raw text.'}
                  {confidenceLabel === 'likely' && 'Extracted with high likelihood, but subject to conversational context.'}
                  {confidenceLabel === 'needs_confirmation' && 'Ambiguous or request phrasing. User confirmation recommended.'}
                </p>
              </div>
            </div>
          </div>

          {/* Source Message References */}
          <div className="form-group">
            <span className="form-label">Supporting Source Messages ({item.sourceMessageIds.length})</span>
            <div className="flex-between gap-2 mt-1">
              <span className="text-xs text-muted font-mono">
                Message IDs: {item.sourceMessageIds.join(', ')}
              </span>
              {onNavigateToSource && item.sourceMessageIds.length > 0 && (
                <button
                  className="btn btn-secondary btn-xs"
                  onClick={() => {
                    onNavigateToSource(item.sourceMessageIds[0]);
                    onClose();
                  }}
                >
                  <span>Jump to Source Message</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
};
