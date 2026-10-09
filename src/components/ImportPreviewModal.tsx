import React from 'react';
import { ParseResult } from '../types';
import { CheckCircle2, AlertTriangle, FileText, ArrowRight, X } from 'lucide-react';

interface ImportPreviewModalProps {
  parseResult: ParseResult;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  parseResult,
  onConfirm,
  onCancel
}) => {
  const { conversation, messages, warnings } = parseResult;

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card">
        <div className="modal-header">
          <div className="modal-title-group">
            <FileText className="icon-accent" size={24} />
            <div>
              <h2 className="text-xl font-bold">Import & Parsing Preview</h2>
              <p className="text-muted text-sm">{conversation.title}</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onCancel} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Lines / Msgs</span>
            <span className="stat-value">{conversation.messageCount}</span>
          </div>
          <div className="stat-card border-success">
            <span className="stat-label">Fully Parsed</span>
            <span className="stat-value text-success">{conversation.parsedCount}</span>
          </div>
          <div className="stat-card border-warning">
            <span className="stat-label">Partial Lines</span>
            <span className="stat-value text-warning">{conversation.partialCount}</span>
          </div>
          <div className="stat-card border-danger">
            <span className="stat-label">Unparsed Lines</span>
            <span className="stat-value text-danger">{conversation.unparsedCount}</span>
          </div>
        </div>

        {/* Warnings Banner */}
        {warnings.length > 0 && (
          <div className="alert-banner warning-banner">
            <AlertTriangle className="text-warning flex-shrink-0" size={20} />
            <div className="banner-content">
              <span className="font-semibold">Parsing Warnings Detected ({warnings.length}):</span>
              <ul className="warning-list">
                {warnings.slice(0, 5).map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
                {warnings.length > 5 && <li>...and {warnings.length - 5} more warnings</li>}
              </ul>
              <p className="text-xs text-muted mt-1">
                Note: Unparsed lines are preserved in raw text order and will not be silently discarded.
              </p>
            </div>
          </div>
        )}

        {/* Messages Preview Table */}
        <div className="preview-container">
          <h3 className="text-sm font-semibold mb-2 text-muted">Parsed Messages Preview (First 50 messages)</h3>
          <div className="preview-list">
            {messages.slice(0, 50).map((msg) => (
              <div
                key={msg.id}
                className={`preview-item parse-status-${msg.parseStatus}`}
              >
                <div className="preview-item-meta">
                  <span className="badge badge-neutral">#{msg.order}</span>
                  {msg.sender ? (
                    <span className="badge badge-sender">{msg.sender}</span>
                  ) : (
                    <span className="badge badge-unknown">Unknown Sender</span>
                  )}
                  {msg.timestamp && (
                    <span className="text-xs text-muted">{msg.timestamp}</span>
                  )}
                  <span className={`status-pill pill-${msg.parseStatus}`}>
                    {msg.parseStatus}
                  </span>
                </div>
                <div className="preview-item-text">{msg.text}</div>
                {msg.parseWarning && (
                  <div className="preview-item-warning">⚠️ {msg.parseWarning}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel & Edit Input
          </button>
          <button className="btn btn-primary" onClick={onConfirm}>
            <span>Proceed to Analysis</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
