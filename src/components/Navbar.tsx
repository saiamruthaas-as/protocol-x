import React from 'react';
import { LayoutDashboard, CheckSquare, Calendar, Bell, MessageSquare, Settings, Upload, Sparkles, ChevronDown } from 'lucide-react';
import { Conversation } from '../types';

export type TabType = 'overview' | 'action_items' | 'deadlines' | 'important_mentions' | 'explorer' | 'import';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  conversations: Conversation[];
  activeConversationId?: string | null;
  onSelectConversation: (id: string) => void;
  onOpenSettings: () => void;
  backendStatus?: 'connected' | 'offline' | 'checking';
  counts?: {
    actionItems: number;
    deadlines: number;
    mentions: number;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenSettings,
  backendStatus = 'checking',
  counts
}) => {
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand Group */}
        <div className="brand-group" onClick={() => onTabChange('overview')}>
          <div className="brand-icon">
            <Sparkles size={20} className="brand-sparkle-icon" />
          </div>
          <div className="brand-info">
            <div className="brand-title-row">
              <span className="brand-title">CatchUp<span className="brand-title-accent">AI</span></span>
              <span className="brand-shield-pill">
                <span className="shield-dot" />
                100% Local
              </span>
            </div>
            <span className="brand-subtitle">Conversation Intelligence</span>
          </div>
        </div>

        {/* Primary Tab Navigation */}
        <nav className="nav-links">
          <button
            className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => onTabChange('overview')}
          >
            <LayoutDashboard size={16} />
            <span>Overview</span>
          </button>

          <button
            className={`nav-link ${activeTab === 'action_items' ? 'active' : ''}`}
            onClick={() => onTabChange('action_items')}
          >
            <CheckSquare size={16} />
            <span>Action Items</span>
            {counts && counts.actionItems > 0 && (
              <span className="nav-pill-badge">{counts.actionItems}</span>
            )}
          </button>

          <button
            className={`nav-link ${activeTab === 'deadlines' ? 'active' : ''}`}
            onClick={() => onTabChange('deadlines')}
          >
            <Calendar size={16} />
            <span>Deadlines</span>
            {counts && counts.deadlines > 0 && (
              <span className="nav-pill-badge deadline-badge">{counts.deadlines}</span>
            )}
          </button>

          <button
            className={`nav-link ${activeTab === 'important_mentions' ? 'active' : ''}`}
            onClick={() => onTabChange('important_mentions')}
          >
            <Bell size={16} />
            <span>Mentions</span>
            {counts && counts.mentions > 0 && (
              <span className="nav-pill-badge mention-badge">{counts.mentions}</span>
            )}
          </button>

          <button
            className={`nav-link ${activeTab === 'explorer' ? 'active' : ''}`}
            onClick={() => onTabChange('explorer')}
          >
            <MessageSquare size={16} />
            <span>Messages</span>
          </button>
        </nav>

        {/* Right Nav Actions */}
        <div className="nav-actions">
          {conversations.length > 0 && (
            <div className="active-conv-dropdown">
              <select
                className="conv-select-pill"
                value={activeConversationId || ''}
                onChange={e => onSelectConversation(e.target.value)}
                aria-label="Active conversation"
              >
                {conversations.map(c => (
                  <option key={c.id} value={c.id}>
                    💬 {c.title}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="dropdown-arrow-icon" />
            </div>
          )}

          <button
            className="btn btn-outline btn-sm"
            onClick={() => onTabChange('import')}
          >
            <Upload size={15} />
            <span>Import Chat</span>
          </button>

          {/* Backend Status Pill */}
          <button
            className="badge badge-neutral cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onOpenSettings}
            title={backendStatus === 'connected' ? 'Express Backend v1.0.0 Connected' : 'Local-Only Mode (Backend Offline)'}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                display: 'inline-block',
                marginRight: 5,
                background:
                  backendStatus === 'connected'
                    ? 'var(--color-accent)'
                    : backendStatus === 'checking'
                    ? 'var(--color-amber)'
                    : '#71717a'
              }}
            />
            <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>
              {backendStatus === 'connected'
                ? 'API v1'
                : backendStatus === 'checking'
                ? 'Checking...'
                : 'Local Only'}
            </span>
          </button>

          <button
            className="btn-icon"
            onClick={onOpenSettings}
            aria-label="Open Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

