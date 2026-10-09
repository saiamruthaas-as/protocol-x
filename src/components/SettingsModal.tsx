import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { getUserSettings, saveUserSettings, clearAllData, listConversations } from '../features/storage/db';
import { Settings, Shield, Trash2, Save, X, Check, Server, Activity, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { apiClient, HealthResponseData } from '../services/apiClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataCleared: () => void;
  backendStatus?: 'connected' | 'offline' | 'checking';
  onRefreshBackendStatus?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onDataCleared,
  backendStatus = 'checking',
  onRefreshBackendStatus
}) => {
  const [userName, setUserName] = useState('');
  const [userAliases, setUserAliases] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [conversationCount, setConversationCount] = useState(0);

  // Backend test state
  const [isTestingBackend, setIsTestingBackend] = useState(false);
  const [backendHealth, setBackendHealth] = useState<HealthResponseData | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getUserSettings().then(settings => {
        setUserName(settings.userName || '');
        setUserAliases((settings.userAliases || []).join(', '));
      });
      listConversations().then(convs => {
        setConversationCount(convs.length);
      });
      setSavedSuccess(false);
      setShowClearConfirm(false);
      testBackendHealth();
    }
  }, [isOpen]);

  const testBackendHealth = async () => {
    setIsTestingBackend(true);
    setBackendError(null);
    try {
      const data = await apiClient.checkHealth(3500);
      setBackendHealth(data);
      if (onRefreshBackendStatus) onRefreshBackendStatus();
    } catch (err: unknown) {
      setBackendHealth(null);
      const msg = err instanceof Error ? err.message : String(err);
      setBackendError(msg);
      if (onRefreshBackendStatus) onRefreshBackendStatus();
    } finally {
      setIsTestingBackend(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    const aliases = userAliases
      .split(',')
      .map(a => a.trim())
      .filter(Boolean);

    await saveUserSettings({
      userName: userName.trim(),
      userAliases: aliases
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleClearData = async () => {
    await clearAllData();
    setShowClearConfirm(false);
    onDataCleared();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex-between gap-2">
            <Settings className="text-accent" size={24} />
            <div>
              <h3 className="text-lg font-semibold">Privacy & Application Settings</h3>
              <p className="text-xs text-muted">Manage Profile Identity & Browser Storage</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {savedSuccess && (
            <div className="alert-banner success-banner mb-4">
              <Check size={18} />
              <span>User identity settings saved successfully.</span>
            </div>
          )}

          {/* User Profile Configuration */}
          <div className="form-group mb-4">
            <label className="form-label" htmlFor="userNameInput">
              Your Display Name
            </label>
            <input
              id="userNameInput"
              type="text"
              className="form-input"
              placeholder="e.g. Alex"
              value={userName}
              onChange={e => setUserName(e.target.value)}
            />
            <span className="text-xs text-muted">
              Used to score personal relevance and detect direct mentions in chat.
            </span>
          </div>

          <div className="form-group mb-6">
            <label className="form-label" htmlFor="userAliasesInput">
              Aliases or Handles (Comma-separated)
            </label>
            <input
              id="userAliasesInput"
              type="text"
              className="form-input"
              placeholder="e.g. Alex Smith, @alex, alex_dev"
              value={userAliases}
              onChange={e => setUserAliases(e.target.value)}
            />
          </div>

          <div className="flex-end mb-6">
            <button className="btn btn-primary btn-sm" onClick={handleSave}>
              <Save size={16} />
              <span>Save Settings</span>
            </button>
          </div>

          {/* Local Privacy Guarantee Box */}
          <div className="item-card bg-input mb-6">
            <div className="flex-between mb-2">
              <span className="font-semibold text-sm flex-between gap-2">
                <Shield size={18} className="text-accent" />
                Browser-Local Privacy Guarantee
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              All parsed chat content, action items, deadlines, and review checkpoints remain 100% inside your browser's IndexedDB storage. Zero data is transmitted to external servers, cloud databases, or remote LLM APIs by default.
            </p>
          </div>

          {/* Backend & AI Readiness Diagnostic */}
          <div className="item-card bg-input mb-6">
            <div className="flex-between mb-2">
              <span className="font-semibold text-sm flex-between gap-2">
                <Server size={18} className="text-accent" />
                Express Backend & Optional AI Status
              </span>
              <button
                className="btn btn-outline btn-xs flex-align gap-1"
                onClick={testBackendHealth}
                disabled={isTestingBackend}
              >
                <RefreshCw size={12} className={isTestingBackend ? 'animate-spin' : ''} />
                <span>{isTestingBackend ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>

            <div className="text-xs text-muted mb-3">
              Endpoint: <code className="text-accent font-mono">{apiClient.getBaseUrl()}</code>
            </div>

            {backendHealth ? (
              <div className="p-3 rounded bg-surface border border-border">
                <div className="flex-align gap-2 text-xs font-semibold text-success mb-1">
                  <CheckCircle2 size={15} />
                  <span>Backend Connected (Status: {backendHealth.status}, v{backendHealth.version})</span>
                </div>
                <div className="text-xs text-muted space-y-1">
                  <div>Environment: <span className="text-primary font-mono">{backendHealth.environment}</span> • Uptime: <span className="font-mono">{backendHealth.uptime}s</span></div>
                  <div>
                    Groq Cloud AI Service:{' '}
                    {backendHealth.services.groqConfigured ? (
                      <span className="badge badge-accent text-xs">Configured & Ready</span>
                    ) : (
                      <span className="badge badge-neutral text-xs">Not Configured (Using Local Engine)</span>
                    )}
                  </div>
                </div>
              </div>
            ) : backendError ? (
              <div className="p-3 rounded bg-surface border border-border">
                <div className="flex-align gap-2 text-xs font-semibold text-amber mb-1">
                  <AlertCircle size={15} />
                  <span>Backend Offline (Local Engine Active)</span>
                </div>
                <p className="text-xs text-muted mb-2">
                  Could not reach Express server: {backendError}. The app continues operating 100% offline using the built-in browser rule-based engine.
                </p>
                <span className="text-xs text-secondary font-mono">
                  Tip: Start backend with npm run dev:server
                </span>
              </div>
            ) : (
              <div className="text-xs text-muted">Checking connection...</div>
            )}

            <p className="text-xs text-muted mt-3 italic">
              Notice: The local deterministic engine never sends chats over the network. If an optional AI operation is explicitly requested in the future, chat text leaves the browser to be processed by the server.
            </p>
          </div>

          {/* Clear All Data Section */}
          <div className="form-group">
            <span className="form-label text-danger">Danger Zone</span>
            <div className="item-card border-danger">
              <div className="flex-between">
                <div>
                  <span className="font-semibold text-sm text-danger">Clear All Local Data</span>
                  <p className="text-xs text-muted mt-1">
                    Permanently delete all {conversationCount} saved conversation(s), messages, tasks, deadlines, and checkpoints.
                  </p>
                </div>
                {!showClearConfirm ? (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setShowClearConfirm(true)}
                  >
                    <Trash2 size={16} />
                    <span>Clear All Data</span>
                  </button>
                ) : (
                  <div className="flex-between gap-2">
                    <button
                      className="btn btn-secondary btn-xs"
                      onClick={() => setShowClearConfirm(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-danger btn-xs"
                      onClick={handleClearData}
                    >
                      Confirm Delete All
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
