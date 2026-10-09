import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  saveConversationWithAnalysis,
  getConversationData,
  listConversations,
  deleteConversation,
  clearAllData,
  getUserSettings,
  saveUserSettings,
  saveReviewCheckpoint,
  getReviewCheckpoint
} from './db';
import { parseChat } from '../import/parseChat';
import { analyzeConversation } from '../analysis/analyzeConversation';
import { SAMPLE_WHATSAPP_CHAT } from '../import/fixtures/sampleChats';
import { UserSettings } from '../../types';

describe('IndexedDB Persistence Tests (PROMPT 4)', () => {
  const userSettings: UserSettings = {
    userName: 'Alice',
    userAliases: ['Alice Smith']
  };

  beforeEach(async () => {
    await clearAllData();
  });

  it('1. initializes DB and saves a conversation with analysis results', async () => {
    const parseResult = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_test_1', 'Project Sync');
    const analysisResult = analyzeConversation(parseResult, userSettings);

    const saveInfo = await saveConversationWithAnalysis(parseResult, analysisResult);
    expect(saveInfo.conversationId).toBe('conv_test_1');
    expect(saveInfo.isDuplicateUpdate).toBe(false);

    const stored = await getConversationData('conv_test_1');
    expect(stored).not.toBeNull();
    expect(stored?.conversation.title).toBe('Project Sync');
    expect(stored?.messages.length).toBe(6);
    expect(stored?.analysisResult).not.toBeNull();
  });

  it('2. persists and retrieves all three primary categories (Action Items, Deadlines, Important Mentions)', async () => {
    const aliceUserSettings: UserSettings = { userName: 'Alice', userAliases: ['Alice Smith'] };
    const rawText = `15/10/2026, 10:00 - Bob: Alice, please submit the audit report by 2026-10-20.`;
    const parseResult = parseChat(rawText, 'conv_cat_test', 'Category Check');
    const analysisResult = analyzeConversation(parseResult, aliceUserSettings, '2026-10-15T00:00:00.000Z');

    await saveConversationWithAnalysis(parseResult, analysisResult);

    const stored = await getConversationData('conv_cat_test');
    const analysis = stored?.analysisResult;

    expect(analysis?.actionItems.length).toBe(1);
    expect(analysis?.actionItems[0].assignee).toBe('Alice');

    expect(analysis?.deadlines.length).toBe(1);
    expect(analysis?.deadlines[0].originalDatePhrase).toBe('2026-10-20');

    expect(analysis?.importantMentions.length).toBeGreaterThan(0);
    expect(analysis?.importantMentions[0].category).toBe('direct_mention');
  });

  it('3. preserves message IDs and evidence references in persisted findings', async () => {
    const parseResult = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_ev_test');
    const analysisResult = analyzeConversation(parseResult, userSettings);

    await saveConversationWithAnalysis(parseResult, analysisResult);

    const stored = await getConversationData('conv_ev_test');
    const actItem = stored?.analysisResult?.actionItems[0];
    expect(actItem?.sourceMessageIds.length).toBeGreaterThan(0);

    const sourceMsgId = actItem?.sourceMessageIds[0];
    const matchingMsg = stored?.messages.find(m => m.id === sourceMsgId);
    expect(matchingMsg).toBeDefined();
  });

  it('4. handles duplicate imports by updating existing record instead of creating duplicate entries', async () => {
    const parseResult1 = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_dup_1', 'Original Chat');
    const analysisResult1 = analyzeConversation(parseResult1, userSettings);
    const save1 = await saveConversationWithAnalysis(parseResult1, analysisResult1);

    expect(save1.isDuplicateUpdate).toBe(false);

    // Re-import identical conversation text
    const parseResult2 = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_dup_2', 'Duplicate Chat');
    const analysisResult2 = analyzeConversation(parseResult2, userSettings);
    const save2 = await saveConversationWithAnalysis(parseResult2, analysisResult2);

    expect(save2.isDuplicateUpdate).toBe(true);
    expect(save2.conversationId).toBe('conv_dup_1');

    const allConvs = await listConversations();
    expect(allConvs.length).toBe(1);
  });

  it('5. performs cascade deletion of conversation and all related records', async () => {
    const parseResult = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_del_test');
    const analysisResult = analyzeConversation(parseResult, userSettings);
    await saveConversationWithAnalysis(parseResult, analysisResult);

    const beforeDel = await listConversations();
    expect(beforeDel.length).toBe(1);

    await deleteConversation('conv_del_test');

    const afterDel = await listConversations();
    expect(afterDel.length).toBe(0);

    const stored = await getConversationData('conv_del_test');
    expect(stored).toBeNull();
  });

  it('6. clears all application data cleanly', async () => {
    const parseResult = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_clear_test');
    const analysisResult = analyzeConversation(parseResult, userSettings);
    await saveConversationWithAnalysis(parseResult, analysisResult);
    await saveUserSettings({ userName: 'Tester', userAliases: [] });

    await clearAllData();

    const convs = await listConversations();
    expect(convs.length).toBe(0);

    const settings = await getUserSettings();
    expect(settings.userName).toBe('');
  });

  it('7. persists and retrieves user settings and review checkpoints', async () => {
    await saveUserSettings({ userName: 'John', userAliases: ['Johnny'], theme: 'dark' });
    const settings = await getUserSettings();
    expect(settings.userName).toBe('John');
    expect(settings.userAliases).toEqual(['Johnny']);

    await saveReviewCheckpoint({
      conversationId: 'conv_cp_1',
      lastReviewedMessageId: 'msg_conv_cp_1_3',
      lastReviewedAt: '2026-10-15T12:00:00.000Z',
      reviewedFindingIds: ['act_1']
    });

    const cp = await getReviewCheckpoint('conv_cp_1');
    expect(cp?.lastReviewedMessageId).toBe('msg_conv_cp_1_3');
  });
});
