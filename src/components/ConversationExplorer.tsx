import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message } from '../types';
import { MessageSquare, Search, Trash2, ArrowLeft, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ConversationExplorerProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  targetMessageId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => Promise<void>;
  onClearTargetMessageId: () => void;
}

export const ConversationExplorer: React.FC<ConversationExplorerProps> = ({
  conversations,
  activeConversation,
  messages,
  targetMessageId,
  onSelectConversation,
  onDeleteConversation,
  onClearTargetMessageId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState(false);

  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Auto-scroll and highlight target message ID
  useEffect(() => {
    if (targetMessageId && messageRefs.current.has(targetMessageId)) {
      const el = messageRefs.current.get(targetMessageId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [targetMessageId, messages]);

  const filteredMessages = messages.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.text.toLowerCase().includes(q) || (m.sender && m.sender.toLowerCase().includes(q));
  });

  const handleDelete = async () => {
    if (!activeConversation) return;
    setDeleting(true);
    try {
      await onDeleteConversation(activeConversation.id);
    } finally {
      setDeleting(false);
    }
  };

  if (conversations.length === 0) {
    return (
      <div className="glass-card text-center py-10">
        <MessageSquare size={44} className="text-muted mx-auto mb-4" />
        <h3 className="text-lg font-bold mb-2">No Saved Conversations</h3>
        <p className="text-sm text-muted">Import a chat export to explore messages and jump to source evidence.</p>
      </div>
    );
  }

  return (
    <div className="conversation-explorer">
      {/* Top Selector & Search Bar */}
      <div className="glass-card mb-6">
        <div className="flex-between mb-4 flex-wrap gap-4">
          <div className="flex-between gap-2 flex-1 min-w-xs">
            <MessageSquare size={22} className="text-accent" />
            <select
              className="form-select flex-1"
              value={activeConversation?.id || ''}
              onChange={e => onSelectConversation(e.target.value)}
            >
              {conversations.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.messageCount} msgs — {c.importedAt.slice(0, 10)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-between gap-2">
            <button
              className="btn btn-danger btn-sm"
              disabled={deleting || !activeConversation}
              onClick={handleDelete}
            >
              <Trash2 size={16} />
              <span>Delete Conversation</span>
            </button>
          </div>
        </div>

        {/* Message Search Filter */}
        <div className="form-group">
          <div className="flex-between gap-2">
            <Search size={16} className="text-muted" />
            <input
              type="text"
              className="form-input w-full"
              placeholder="Search message text or sender..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Target Message Active Highlight Banner */}
      {targetMessageId && (
        <div className="alert-banner warning-banner mb-4 flex-between">
          <div className="flex-between gap-2">
            <AlertCircle size={18} className="text-warning" />
            <span>Targeting source message: <strong>{targetMessageId}</strong></span>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClearTargetMessageId}>
            Clear Target Focus
          </button>
        </div>
      )}

      {/* Chronological Messages Container */}
      <div className="messages-container">
        {filteredMessages.map(msg => {
          const isTarget = msg.id === targetMessageId;

          return (
            <div
              key={msg.id}
              ref={el => {
                if (el) messageRefs.current.set(msg.id, el);
                else messageRefs.current.delete(msg.id);
              }}
              className={`item-card ${isTarget ? 'message-highlighted' : ''} parse-status-${msg.parseStatus}`}
            >
              <div className="item-header">
                <div className="flex-between gap-2">
                  <span className="badge badge-neutral">#{msg.order}</span>
                  {msg.sender ? (
                    <span className="badge badge-sender">{msg.sender}</span>
                  ) : (
                    <span className="badge badge-unknown">Unknown Sender</span>
                  )}
                  {msg.timestamp && (
                    <span className="text-xs text-muted font-mono">{msg.timestamp}</span>
                  )}
                </div>

                <span className={`status-pill pill-${msg.parseStatus}`}>
                  {msg.parseStatus}
                </span>
              </div>

              {/* Untrusted message text rendered strictly as text node */}
              <div className="item-description whitespace-pre-line font-normal text-primary mt-2">
                {msg.text}
              </div>

              {msg.parseWarning && (
                <div className="text-xs text-warning mt-1">⚠️ {msg.parseWarning}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
