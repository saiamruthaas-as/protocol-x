import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OverviewDashboard } from './OverviewDashboard';
import { ActionItemsView } from './ActionItemsView';
import { DeadlinesView } from './DeadlinesView';
import { ImportantMentionsView } from './ImportantMentionsView';
import { WhyThisResultModal } from './WhyThisResultModal';
import { Conversation, Message, AnalysisResult, ActionItem, Deadline, ImportantMention } from '../types';

const mockConversation: Conversation = {
  id: 'conv_dash_test',
  title: 'Dashboard Test Conversation',
  rawText: '15/10/2026, 10:00 - Bob: Alex, please submit the audit report by 2026-10-20.',
  importedAt: '2026-10-15T10:00:00.000Z',
  messageCount: 1,
  parsedCount: 1,
  unparsedCount: 0,
  partialCount: 0
};

const mockActionItem: ActionItem = {
  id: 'act_1',
  conversationId: 'conv_dash_test',
  description: 'Submit the audit report',
  assignee: 'Alex',
  status: 'pending',
  priorityScore: 85,
  priorityLabel: 'high',
  deadlineId: 'dl_1',
  sourceMessageIds: ['msg_1'],
  explanation: 'Explicit task assigned to Alex with deadline.',
  confidenceLabel: 'detected',
  reasons: ['Explicit task assigned to Alex', 'Deadline present'],
  createdAt: '2026-10-15T10:00:00.000Z',
  updatedAt: '2026-10-15T10:00:00.000Z'
};

const mockDeadline: Deadline = {
  id: 'dl_1',
  conversationId: 'conv_dash_test',
  originalDatePhrase: '2026-10-20',
  normalizedDate: '2026-10-20T00:00:00.000Z',
  isResolved: true,
  isOverdue: false,
  associatedActionItemId: 'act_1',
  sourceMessageIds: ['msg_1'],
  resolutionType: 'explicit',
  explanation: 'Extracted explicit date phrase 2026-10-20.',
  confidenceLabel: 'detected',
  createdAt: '2026-10-15T10:00:00.000Z'
};

const mockMention: ImportantMention = {
  id: 'ment_1',
  conversationId: 'conv_dash_test',
  excerpt: 'Alex, please submit the audit report',
  category: 'direct_mention',
  reason: 'Directly mentions configured user name (Alex).',
  priorityScore: 85,
  priorityLabel: 'high',
  sourceMessageIds: ['msg_1'],
  relatedActionItemId: 'act_1',
  relatedDeadlineId: 'dl_1',
  confidenceLabel: 'detected',
  reasons: ['Configured user name mentioned'],
  createdAt: '2026-10-15T10:00:00.000Z'
};

const mockAnalysisResult: AnalysisResult = {
  conversationId: 'conv_dash_test',
  digest: 'Conversation Digest (Rule-based): Analyzed 1 message across Bob.',
  actionItems: [mockActionItem],
  deadlines: [mockDeadline],
  importantMentions: [mockMention],
  decisions: [],
  questions: [],
  changes: [],
  findings: [],
  analyzedAt: '2026-10-15T10:00:00.000Z',
  unverifiedMessageIds: []
};

describe('Dashboard React UI Components Tests (PROMPT 5)', () => {
  it('1. OverviewDashboard renders real metric counts dynamically from analysis result', () => {
    const dummyNav = vi.fn();
    const dummySource = vi.fn();
    const dummyInspect = vi.fn();

    render(
      <OverviewDashboard
        conversations={[mockConversation]}
        activeAnalysis={mockAnalysisResult}
        activeConversation={mockConversation}
        onNavigateToTab={dummyNav}
        onNavigateToSource={dummySource}
        onInspectWhy={dummyInspect}
      />
    );

    expect(screen.getByText('Open Action Items')).toBeInTheDocument();
    expect(screen.getByText('Submit the audit report')).toBeInTheDocument();
    expect(screen.getByText('Score: 85')).toBeInTheDocument();
  });

  it('2. ActionItemsView renders tasks and handles status update click', () => {
    const mockUpdate = vi.fn();
    const dummySource = vi.fn();
    const dummyInspect = vi.fn();

    render(
      <ActionItemsView
        actionItems={[mockActionItem]}
        onUpdateTaskStatus={mockUpdate}
        onNavigateToSource={dummySource}
        onInspectWhy={dummyInspect}
      />
    );

    expect(screen.getByText('Submit the audit report')).toBeInTheDocument();
    const completeBtn = screen.getByText('Mark Complete');
    fireEvent.click(completeBtn);

    expect(mockUpdate).toHaveBeenCalledWith('act_1', 'completed');
  });

  it('3. DeadlinesView renders chronological deadlines and date phrases', () => {
    const dummySource = vi.fn();
    const dummyInspect = vi.fn();

    render(
      <DeadlinesView
        deadlines={[mockDeadline]}
        onNavigateToSource={dummySource}
        onInspectWhy={dummyInspect}
      />
    );

    expect(screen.getByText('Date Phrase: "2026-10-20"')).toBeInTheDocument();
    expect(screen.getByText('EXPLICIT')).toBeInTheDocument();
  });

  it('4. ImportantMentionsView renders mentions and category pills', () => {
    const dummySource = vi.fn();
    const dummyInspect = vi.fn();

    render(
      <ImportantMentionsView
        mentions={[mockMention]}
        onNavigateToSource={dummySource}
        onInspectWhy={dummyInspect}
      />
    );

    expect(screen.getByText('Category: DIRECT MENTION')).toBeInTheDocument();
    expect(screen.getByText('"Alex, please submit the audit report"')).toBeInTheDocument();
  });

  it('5. WhyThisResultModal renders arithmetic score breakdown and matched signals', () => {
    const dummyClose = vi.fn();

    render(
      <WhyThisResultModal
        item={mockActionItem}
        onClose={dummyClose}
      />
    );

    expect(screen.getByText('Why this result?')).toBeInTheDocument();
    expect(screen.getByText('✓ Explicit task assigned to Alex')).toBeInTheDocument();
    expect(screen.getByText('✓ Deadline present')).toBeInTheDocument();
  });
});
