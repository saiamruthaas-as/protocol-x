import React, { useState, useEffect } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { ActionItemsView } from './components/ActionItemsView';
import { DeadlinesView } from './components/DeadlinesView';
import { ImportantMentionsView } from './components/ImportantMentionsView';
import { ConversationExplorer } from './components/ConversationExplorer';
import { ImportPanel } from './components/ImportPanel';
import { ImportPreviewModal } from './components/ImportPreviewModal';
import { WhyThisResultModal } from './components/WhyThisResultModal';
import { SettingsModal } from './components/SettingsModal';

import {
  listConversations,
  getConversationData,
  deleteConversation,
  getUserSettings,
  saveConversationWithAnalysis,
  saveReviewCheckpoint,
  getDB
} from './features/storage/db';

import { processAndSaveConversation } from './features/storage/saveWorkflow';
import { apiClient } from './services/apiClient';

import {
  Conversation,
  Message,
  AnalysisResult,
  ParseResult,
  UserSettings,
  ActionItem,
  ImportantMention,
  Deadline,
  TaskStatus,
  ReviewCheckpoint
} from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisResult | null>(null);
  const [checkpoint, setCheckpoint] = useState<ReviewCheckpoint | null>(null);

  const [userSettings, setUserSettings] = useState<UserSettings>({ userName: '', userAliases: [] });
  const [pendingParseResult, setPendingParseResult] = useState<ParseResult | null>(null);

  const [targetMessageId, setTargetMessageId] = useState<string | null>(null);
  const [inspectItem, setInspectItem] = useState<ActionItem | ImportantMention | Deadline | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [loading, setLoading] = useState(true);

  // Load Initial Data and Check Backend Health on Mount
  useEffect(() => {
    loadInitialData();
    checkBackendStatus();
  }, []);

  const checkBackendStatus = async () => {
    try {
      const isOk = await apiClient.isAvailable(2500);
      setBackendStatus(isOk ? 'connected' : 'offline');
    } catch {
      setBackendStatus('offline');
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const settings = await getUserSettings();
      setUserSettings(settings);

      const convList = await listConversations();
      setConversations(convList);

      if (convList.length > 0) {
        const targetId = activeConversationId && convList.some(c => c.id === activeConversationId)
          ? activeConversationId
          : convList[0].id;
        await loadConversation(targetId);
      } else {
        setActiveConversation(null);
        setMessages([]);
        setActiveAnalysis(null);
        setCheckpoint(null);
        setActiveConversationId(null);
      }
    } catch (err) {
      console.error('Failed to load storage data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (conversationId: string) => {
    const data = await getConversationData(conversationId);
    if (data) {
      setActiveConversationId(conversationId);
      setActiveConversation(data.conversation);
      setMessages(data.messages);
      setActiveAnalysis(data.analysisResult);
      setCheckpoint(data.checkpoint);
    }
  };

  const handleMarkReviewed = async () => {
    if (!activeConversationId || !activeAnalysis) return;
    const newCheckpoint: ReviewCheckpoint = {
      conversationId: activeConversationId,
      lastReviewedMessageId: messages[messages.length - 1]?.id || null,
      lastReviewedAt: new Date().toISOString(),
      reviewedFindingIds: activeAnalysis.findings?.map(f => f.id) || []
    };
    await saveReviewCheckpoint(newCheckpoint);
    setCheckpoint(newCheckpoint);
  };

  const handleSelectConversation = async (conversationId: string) => {
    await loadConversation(conversationId);
  };

  const handleParseComplete = (result: ParseResult) => {
    setPendingParseResult(result);
  };

  const handleConfirmImport = async () => {
    if (!pendingParseResult) return;
    try {
      setLoading(true);
      const res = await processAndSaveConversation(
        pendingParseResult.conversation.rawText,
        pendingParseResult.conversation.title,
        userSettings
      );

      setPendingParseResult(null);
      await loadInitialData();
      await loadConversation(res.saveInfo.conversationId);
      setActiveTab('overview');
    } catch (err) {
      console.error('Import processing failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (!activeAnalysis || !activeConversationId) return;

    // Update in-memory AnalysisResult object
    const updatedActionItems = activeAnalysis.actionItems.map(item =>
      item.id === taskId ? { ...item, status: newStatus, updatedAt: new Date().toISOString() } : item
    );

    const updatedAnalysis: AnalysisResult = {
      ...activeAnalysis,
      actionItems: updatedActionItems
    };

    setActiveAnalysis(updatedAnalysis);

    // Persist to IndexedDB
    const db = await getDB();
    const tx = db.transaction(['action_items', 'analysis_results'], 'readwrite');
    const taskItem = updatedActionItems.find(a => a.id === taskId);
    if (taskItem) {
      await tx.objectStore('action_items').put(taskItem);
    }
    await tx.objectStore('analysis_results').put(updatedAnalysis);
    await tx.done;
  };

  const handleDeleteConversation = async (conversationId: string) => {
    await deleteConversation(conversationId);
    await loadInitialData();
  };

  const handleNavigateToSource = (sourceMessageId: string) => {
    setTargetMessageId(sourceMessageId);
    setActiveTab('explorer');
  };

  const handleDataCleared = async () => {
    await loadInitialData();
  };

  const navCounts = activeAnalysis ? {
    actionItems: activeAnalysis.actionItems.filter(a => a.status === 'pending').length,
    deadlines: activeAnalysis.deadlines.length,
    mentions: activeAnalysis.importantMentions.length
  } : undefined;

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        backendStatus={backendStatus}
        counts={navCounts}
      />

      {/* Main Content View Container */}
      <main className="main-content">
        {loading ? (
          <div className="glass-card text-center py-16">
            <div className="loading-spinner mx-auto mb-4" />
            <p className="text-secondary text-sm font-semibold">Processing conversation locally...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewDashboard
                conversations={conversations}
                activeAnalysis={activeAnalysis}
                activeConversation={activeConversation}
                onNavigateToTab={setActiveTab}
                onNavigateToSource={handleNavigateToSource}
                onInspectWhy={setInspectItem}
                checkpoint={checkpoint}
                onMarkReviewed={handleMarkReviewed}
              />
            )}

            {activeTab === 'action_items' && (
              <ActionItemsView
                actionItems={activeAnalysis?.actionItems || []}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onNavigateToSource={handleNavigateToSource}
                onInspectWhy={setInspectItem}
              />
            )}

            {activeTab === 'deadlines' && (
              <DeadlinesView
                deadlines={activeAnalysis?.deadlines || []}
                onNavigateToSource={handleNavigateToSource}
                onInspectWhy={setInspectItem}
              />
            )}

            {activeTab === 'important_mentions' && (
              <ImportantMentionsView
                mentions={activeAnalysis?.importantMentions || []}
                onNavigateToSource={handleNavigateToSource}
                onInspectWhy={setInspectItem}
              />
            )}

            {activeTab === 'explorer' && (
              <ConversationExplorer
                conversations={conversations}
                activeConversation={activeConversation}
                messages={messages}
                targetMessageId={targetMessageId}
                onSelectConversation={handleSelectConversation}
                onDeleteConversation={handleDeleteConversation}
                onClearTargetMessageId={() => setTargetMessageId(null)}
              />
            )}

            {activeTab === 'import' && (
              <ImportPanel onParseComplete={handleParseComplete} />
            )}
          </>
        )}
      </main>


      {/* Import Preview Modal */}
      {pendingParseResult && (
        <ImportPreviewModal
          parseResult={pendingParseResult}
          onConfirm={handleConfirmImport}
          onCancel={() => setPendingParseResult(null)}
        />
      )}

      {/* "Why this result?" Evidence Inspection Modal */}
      {inspectItem && (
        <WhyThisResultModal
          item={inspectItem}
          onClose={() => setInspectItem(null)}
          onNavigateToSource={handleNavigateToSource}
        />
      )}

      {/* User Settings & Storage Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onDataCleared={handleDataCleared}
        backendStatus={backendStatus}
        onRefreshBackendStatus={checkBackendStatus}
      />
    </div>
  );
};
