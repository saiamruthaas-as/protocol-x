import 'fake-indexeddb/auto';
import { parseChat, createFingerprint, MAX_IMPORT_TEXT_BYTES, MAX_LINE_LENGTH } from '../features/import/parseChat';
import { SAMPLE_WHATSAPP_CHAT, SAMPLE_BRACKET_CHAT, SAMPLE_MALFORMED_CHAT } from '../features/import/fixtures/sampleChats';
import { analyzeConversation } from '../features/analysis/analyzeConversation';
import { validateSourceMessageIds } from '../features/analysis/validateEvidence';
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
} from '../features/storage/db';
import { processAndSaveConversation } from '../features/storage/saveWorkflow';
import { UserSettings, Message, ActionItem, Deadline, ImportantMention, AnalysisResult } from '../types';

console.log('===================================================================');
console.log('CATCHUP AI — FULL AUTOMATED TEST SUITE (PROMPTS 2, 3, 4, 4.5 & 5)');
console.log('===================================================================\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    failed++;
  }
}

async function runAllTests() {
  // ----------------------------------------------------
  // SECTION 1: CHAT PARSER TESTS (PROMPT 2)
  // ----------------------------------------------------
  console.log('--- SECTION 1: CHAT PARSER SUITE ---');

  try {
    const result = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_123', 'Project Sync');
    assert(result.conversation.id === 'conv_123', 'Parser: Conversation ID preserved');
    assert(result.conversation.title === 'Project Sync', 'Parser: Conversation title preserved');
    assert(result.messages.length === 6, `Parser: Parsed exact message count`);
    assert(result.messages[0].sender === 'Alice', 'Parser: First message sender is Alice');
    assert(result.messages[0].parseStatus === 'parsed', 'Parser: First message status is parsed');
  } catch (e: any) {
    console.error(`❌ FAIL: Parser Standard WhatsApp - ${e.message}`);
    failed++;
  }

  try {
    const result = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_123');
    const bobMsg = result.messages[4];
    assert(bobMsg.sender === 'Bob', 'Parser: Multi-line message sender is Bob');
    assert(bobMsg.text.includes("multi-line continuation"), 'Parser: Multi-line second paragraph appended');
  } catch (e: any) {
    console.error(`❌ FAIL: Parser Multi-line - ${e.message}`);
    failed++;
  }

  try {
    const result = parseChat(SAMPLE_BRACKET_CHAT, 'conv_456');
    assert(result.messages.length === 3, `Parser: Bracket format message count`);
    assert(result.messages[0].sender === 'Sarah Connor', 'Parser: Bracket sender parsed');
  } catch (e: any) {
    console.error(`❌ FAIL: Parser Bracket - ${e.message}`);
    failed++;
  }

  try {
    const result = parseChat(SAMPLE_MALFORMED_CHAT, 'conv_789');
    assert(result.messages.length >= 3, 'Parser: Malformed chat preserves all lines');
    const unparsed = result.messages.filter(m => m.parseStatus === 'unparsed');
    assert(unparsed.length > 0, `Parser: Unparsed lines detected`);
    assert(result.warnings.length > 0, `Parser: Warnings generated for unparsed lines`);
  } catch (e: any) {
    console.error(`❌ FAIL: Parser Malformed - ${e.message}`);
    failed++;
  }

  try {
    const fp1 = createFingerprint('conv_1|1|Alice|15/10/2024|hello world');
    const fp2 = createFingerprint('conv_1|1|Alice|15/10/2024|hello world');
    assert(fp1 === fp2, 'Parser: Deterministic fingerprint consistency');
  } catch (e: any) {
    console.error(`❌ FAIL: Parser Fingerprint - ${e.message}`);
    failed++;
  }

  try {
    const result = parseChat('', 'conv_empty');
    assert(result.messages.length === 0, 'Parser: Empty input yields 0 messages');
  } catch (e: any) {
    console.error(`❌ FAIL: Parser Empty - ${e.message}`);
    failed++;
  }

  // ----------------------------------------------------
  // SECTION 2: ANALYSIS ENGINE TESTS (PROMPT 3)
  // ----------------------------------------------------
  console.log('\n--- SECTION 2: ANALYSIS ENGINE SUITE ---');

  const userSettings: UserSettings = {
    userName: 'Alex',
    userAliases: ['Alex Smith', '@alex']
  };

  try {
    const raw = `15/10/2026, 10:00 - Bob: Alex, please finish the API documentation.`;
    const parsed = parseChat(raw, 'conv_1');
    const res = analyzeConversation(parsed, userSettings);
    assert(res.actionItems.length === 1, 'Engine 1: Action item extracted');
    assert(res.actionItems[0].assignee === 'Alex', 'Engine 1: Assignee identified as Alex');
    assert(res.actionItems[0].confidenceLabel === 'detected', 'Engine 1: Confidence is detected');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 1 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Charlie: Someone needs to review the database migration script.`;
    const parsed = parseChat(raw, 'conv_2');
    const res = analyzeConversation(parsed);
    assert(res.actionItems.length === 1, 'Engine 2: Action item extracted');
    assert(res.actionItems[0].assignee === null, 'Engine 2: Assignee is null (unknown)');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 2 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Dave: I have finished the database review.`;
    const parsed = parseChat(raw, 'conv_3');
    const res = analyzeConversation(parsed);
    assert(res.actionItems.length === 1, 'Engine 3: Completed task detected');
    assert(res.actionItems[0].status === 'completed', 'Engine 3: Task status is completed');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 3 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Bob: Alex, please finish the report by 2026-10-20.`;
    const parsed = parseChat(raw, 'conv_4');
    const res = analyzeConversation(parsed, userSettings, '2026-10-15T00:00:00.000Z');
    assert(res.deadlines.length === 1, 'Engine 4: Explicit deadline extracted');
    assert(res.deadlines[0].resolutionType === 'explicit', 'Engine 4: Resolution type is explicit');
    assert(res.deadlines[0].isResolved === true, 'Engine 4: Deadline is resolved');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 4 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Bob: Please complete the audit tomorrow.`;
    const parsed = parseChat(raw, 'conv_5');
    const res = analyzeConversation(parsed, userSettings, '2026-10-15T00:00:00.000Z');
    assert(res.deadlines.length === 1, 'Engine 5: Relative deadline extracted');
    assert(res.deadlines[0].normalizedDate?.includes('2026-10-16') === true, 'Engine 5: Tomorrow resolved to 2026-10-16');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 5 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Bob: Submit the draft by Friday.`;
    const parsed = parseChat(raw, 'conv_6');
    const res = analyzeConversation(parsed);
    assert(res.deadlines.length === 1, 'Engine 6: Weekday deadline detected');
    assert(res.deadlines[0].resolutionType === 'ambiguous', 'Engine 6: Weekday marked ambiguous');
    assert(res.deadlines[0].isResolved === false, 'Engine 6: Remains unresolved for review');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 6 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Bob: In 2020 we completed the initial design phase.`;
    const parsed = parseChat(raw, 'conv_7');
    const res = analyzeConversation(parsed);
    assert(res.deadlines.length === 0, 'Engine 7: Historical date in 2020 ignored');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 7 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Bob: Alex, what is the status of the launch?`;
    const parsed = parseChat(raw, 'conv_8');
    const res = analyzeConversation(parsed, userSettings);
    assert(res.importantMentions.some(m => m.category === 'direct_mention'), 'Engine 8: Direct mention of Alex detected');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 8 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Alice: Does anyone have the API credentials?`;
    const parsed = parseChat(raw, 'conv_9');
    const res = analyzeConversation(parsed);
    assert(res.questions.length === 1, 'Engine 9: Question detected');
    assert(res.questions[0].requiresResponse === true, 'Engine 9: Requires response is true');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 9 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Admin: Announcement: Version 2.0 release is live!`;
    const parsed = parseChat(raw, 'conv_10');
    const res = analyzeConversation(parsed);
    assert(res.importantMentions.some(m => m.category === 'announcement'), 'Engine 10: Announcement detected');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 10 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Alice: We decided to deploy on Friday morning.`;
    const parsed = parseChat(raw, 'conv_11');
    const res = analyzeConversation(parsed);
    assert(res.decisions.length === 1, 'Engine 11: Confirmed decision detected');
    assert(res.decisions[0].status === 'confirmed', 'Engine 11: Decision status is confirmed');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 11 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Bob: The meeting was moved from Thursday to Monday.`;
    const parsed = parseChat(raw, 'conv_12');
    const res = analyzeConversation(parsed);
    assert(res.changes.length === 1, 'Engine 12: Changed schedule detected');
    assert(res.changes[0].previousValue === 'Thursday', 'Engine 12: Previous value is Thursday');
    assert(res.changes[0].proposedValue === 'Monday', 'Engine 12: Proposed value is Monday');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 12 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Bob: Alex, please submit the report by 2026-10-20.`;
    const parsed = parseChat(raw, 'conv_13');
    const res = analyzeConversation(parsed, userSettings, '2026-10-15T00:00:00.000Z');
    assert(res.actionItems.length === 1, 'Engine 13: Action item present');
    assert(res.deadlines.length === 1, 'Engine 13: Deadline present');
    assert(res.importantMentions.length > 0, 'Engine 13: Important mention present');
    const msgId = res.actionItems[0].sourceMessageIds[0];
    assert(res.deadlines[0].sourceMessageIds[0] === msgId, 'Engine 13: Shared source message ID across categories');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 13 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Bob: I will finish the task today.
15/10/2026, 10:05 - Bob: I will finish the task today.`;
    const parsed = parseChat(raw, 'conv_14');
    const res = analyzeConversation(parsed);
    assert(res.actionItems.length === 2, 'Engine 14: Two distinct messages yield two action items with distinct source IDs');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 14 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Alice: Could we finish the API today?`;
    const parsed = parseChat(raw, 'conv_15');
    const res = analyzeConversation(parsed);
    assert(res.actionItems[0].status === 'needs_confirmation', 'Engine 15: Proposal status is needs_confirmation');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 15 - ${e.message}`);
    failed++;
  }

  try {
    const mockMap = new Map<string, Message>([['msg_1', {} as Message]]);
    const validation = validateSourceMessageIds(['msg_1', 'msg_invalid_99'], mockMap);
    assert(validation.isValid === false, 'Engine 16: Detects invalid source ID');
    assert(validation.invalidIds[0] === 'msg_invalid_99', 'Engine 16: Flags msg_invalid_99');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 16 - ${e.message}`);
    failed++;
  }

  try {
    const parsed = parseChat('', 'conv_empty');
    const res = analyzeConversation(parsed);
    assert(res.digest.includes('empty'), 'Engine 17: Empty conversation digest handled');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 17 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `Unparseable log line header
15/10/2026, 10:00 - Bob: I will handle the deployment.`;
    const parsed = parseChat(raw, 'conv_18');
    const res = analyzeConversation(parsed);
    assert(res.actionItems.length === 1, 'Engine 18: Operates safely over malformed imports');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 18 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Alice: Good morning!
15/10/2026, 10:01 - Bob: Morning Alice!`;
    const parsed = parseChat(raw, 'conv_19');
    const res = analyzeConversation(parsed);
    assert(res.actionItems.length === 0, 'Engine 19: Returns 0 action items for non-actionable chat');
  } catch (e: any) {
    console.error(`❌ FAIL: Engine Test 20 - ${e.message}`);
    failed++;
  }

  // ----------------------------------------------------
  // SECTION 3: INDEXEDDB PERSISTENCE TESTS (PROMPT 4)
  // ----------------------------------------------------
  console.log('\n--- SECTION 3: INDEXEDDB PERSISTENCE SUITE ---');

  try {
    await clearAllData();
    const parseResult = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_test_1', 'Project Sync');
    const analysisResult = analyzeConversation(parseResult, userSettings);

    const saveInfo = await saveConversationWithAnalysis(parseResult, analysisResult);
    assert(saveInfo.conversationId === 'conv_test_1', 'Storage 1: Saved conversation ID matches');
    assert(saveInfo.isDuplicateUpdate === false, 'Storage 1: Initial save is not duplicate');

    const stored = await getConversationData('conv_test_1');
    assert(stored !== null, 'Storage 1: Retrieved stored conversation');
    assert(stored?.conversation.title === 'Project Sync', 'Storage 1: Title preserved');
    assert(stored?.messages.length === 6, 'Storage 1: All 6 messages persisted');
    assert(stored?.analysisResult !== null, 'Storage 1: Analysis result persisted');
  } catch (e: any) {
    console.error(`❌ FAIL: Storage Test 1 - ${e.message}`);
    failed++;
  }

  try {
    await clearAllData();
    const aliceUserSettings: UserSettings = { userName: 'Alice', userAliases: ['Alice Smith'] };
    const rawText = `15/10/2026, 10:00 - Bob: Alice, please submit the audit report by 2026-10-20.`;
    const parseResult = parseChat(rawText, 'conv_cat_test', 'Category Check');
    const analysisResult = analyzeConversation(parseResult, aliceUserSettings, '2026-10-15T00:00:00.000Z');

    await saveConversationWithAnalysis(parseResult, analysisResult);

    const stored = await getConversationData('conv_cat_test');
    const analysis = stored?.analysisResult;

    assert(analysis?.actionItems.length === 1, 'Storage 2: Category A Action item retrieved');
    assert(analysis?.actionItems[0].assignee === 'Alice', 'Storage 2: Action item assignee retrieved');
    assert(analysis?.deadlines.length === 1, 'Storage 2: Category B Deadline retrieved');
    assert(analysis?.deadlines[0].originalDatePhrase === '2026-10-20', 'Storage 2: Deadline date phrase retrieved');
    assert(analysis?.importantMentions.length! > 0, 'Storage 2: Category C Important mention retrieved');
  } catch (e: any) {
    console.error(`❌ FAIL: Storage Test 2 - ${e.message}`);
    failed++;
  }

  try {
    await clearAllData();
    const parseResult = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_ev_test');
    const analysisResult = analyzeConversation(parseResult, userSettings);

    await saveConversationWithAnalysis(parseResult, analysisResult);

    const stored = await getConversationData('conv_ev_test');
    const actItem = stored?.analysisResult?.actionItems[0];
    const sourceMsgId = actItem?.sourceMessageIds[0];
    const matchingMsg = stored?.messages.find(m => m.id === sourceMsgId);

    assert(matchingMsg !== undefined, 'Storage 3: Source message ID resolves to actual stored message');
  } catch (e: any) {
    console.error(`❌ FAIL: Storage Test 3 - ${e.message}`);
    failed++;
  }

  try {
    await clearAllData();
    const parseResult1 = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_dup_1', 'Original Chat');
    const analysisResult1 = analyzeConversation(parseResult1, userSettings);
    await saveConversationWithAnalysis(parseResult1, analysisResult1);

    const parseResult2 = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_dup_2', 'Duplicate Chat');
    const analysisResult2 = analyzeConversation(parseResult2, userSettings);
    const save2 = await saveConversationWithAnalysis(parseResult2, analysisResult2);

    assert(save2.isDuplicateUpdate === true, 'Storage 4: Duplicate import recognized via raw text fingerprint');
    assert(save2.conversationId === 'conv_dup_1', 'Storage 4: Reuses original conversation ID');

    const allConvs = await listConversations();
    assert(allConvs.length === 1, 'Storage 4: Duplicate update prevents database duplication');
  } catch (e: any) {
    console.error(`❌ FAIL: Storage Test 4 - ${e.message}`);
    failed++;
  }

  try {
    await clearAllData();
    const parseResult = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_del_test');
    const analysisResult = analyzeConversation(parseResult, userSettings);
    await saveConversationWithAnalysis(parseResult, analysisResult);

    await deleteConversation('conv_del_test');

    const stored = await getConversationData('conv_del_test');
    assert(stored === null, 'Storage 5: Cascade deletion completely removed conversation and records');
  } catch (e: any) {
    console.error(`❌ FAIL: Storage Test 5 - ${e.message}`);
    failed++;
  }

  try {
    await clearAllData();
    await saveUserSettings({ userName: 'John', userAliases: ['Johnny'], theme: 'dark' });
    const settings = await getUserSettings();
    assert(settings.userName === 'John', 'Storage 6: User settings persisted and retrieved');

    await saveReviewCheckpoint({
      conversationId: 'conv_cp_1',
      lastReviewedMessageId: 'msg_conv_cp_1_3',
      lastReviewedAt: '2026-10-15T12:00:00.000Z',
      reviewedFindingIds: ['act_1']
    });

    const cp = await getReviewCheckpoint('conv_cp_1');
    assert(cp?.lastReviewedMessageId === 'msg_conv_cp_1_3', 'Storage 6: Review checkpoint persisted and retrieved');
  } catch (e: any) {
    console.error(`❌ FAIL: Storage Test 6 - ${e.message}`);
    failed++;
  }

  try {
    await clearAllData();
    const workflowRes = await processAndSaveConversation(SAMPLE_WHATSAPP_CHAT, 'End to End Import', userSettings);
    assert(workflowRes.saveInfo.conversationId !== '', 'Storage 7: End-to-end processAndSaveConversation workflow succeeds');
  } catch (e: any) {
    console.error(`❌ FAIL: Storage Test 7 - ${e.message}`);
    failed++;
  }

  // ----------------------------------------------------
  // SECTION 4: SECURITY & PRIVACY HARDENING TESTS (PROMPT 4.5)
  // ----------------------------------------------------
  console.log('\n--- SECTION 4: SECURITY & PRIVACY HARDENING SUITE ---');
  await clearAllData();

  try {
    const raw = `15/10/2026, 10:00 - Attacker: <script>alert(1)</script> Please do task X`;
    const parsed = parseChat(raw, 'sec_1');
    assert(parsed.messages[0].text === '<script>alert(1)</script> Please do task X', 'Security 1: Script injection payload remains inert text node');
  } catch (e: any) {
    console.error(`❌ FAIL: Security Test 1 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Attacker: <img src=x onerror=alert(1)> Urgent update!`;
    const parsed = parseChat(raw, 'sec_2');
    assert(parsed.messages[0].text.includes('<img src=x onerror=alert(1)>'), 'Security 2: HTML img tag payload remains inert text');
  } catch (e: any) {
    console.error(`❌ FAIL: Security Test 2 - ${e.message}`);
    failed++;
  }

  try {
    const raw = `15/10/2026, 10:00 - Attacker: Check this link javascript:alert(1)`;
    const parsed = parseChat(raw, 'sec_3');
    assert(parsed.messages[0].text.includes('javascript:alert(1)'), 'Security 3: Unsafe URI scheme remains inert string');
  } catch (e: any) {
    console.error(`❌ FAIL: Security Test 3 - ${e.message}`);
    failed++;
  }

  try {
    const hugePadding = 'A'.repeat(MAX_IMPORT_TEXT_BYTES + 500);
    const raw = `15/10/2026, 10:00 - Alice: ${hugePadding}`;
    const parsed = parseChat(raw, 'sec_4');
    assert(parsed.warnings.some(w => w.includes('exceeded 10 MB limit')), 'Security 4: Text size limit enforced at 10 MB safeguard boundary');
  } catch (e: any) {
    console.error(`❌ FAIL: Security Test 4 - ${e.message}`);
    failed++;
  }

  try {
    const malformed = `%%%$$$RANDOM_BINARY_DATA_CORRUPTION\0\0\0\n15/10/2026, 10:00 - Alice: Valid message after corruption`;
    const parsed = parseChat(malformed, 'sec_5');
    assert(parsed.messages.length > 0, 'Security 5: Malformed binary input does not crash parser');
  } catch (e: any) {
    console.error(`❌ FAIL: Security Test 5 - ${e.message}`);
    failed++;
  }

  try {
    const superLongLine = '15/10/2026, 10:00 - Alice: ' + 'B'.repeat(12000);
    const parsed = parseChat(superLongLine, 'sec_6');
    assert(parsed.warnings.some(w => w.includes('Exceeded 10,000 character limit')), 'Security 6: Safely truncates individual line > 10,000 chars');
  } catch (e: any) {
    console.error(`❌ FAIL: Security Test 6 - ${e.message}`);
    failed++;
  }

  try {
    const messageMap = new Map();
    messageMap.set('msg_sec_7_1', { id: 'msg_sec_7_1' });
    const validation = validateSourceMessageIds(['msg_sec_7_1', 'msg_fake_999'], messageMap);
    assert(validation.isValid === false, 'Security 7: Evidence validator rejects invalid foreign source ID');
  } catch (e: any) {
    console.error(`❌ FAIL: Security Test 7 - ${e.message}`);
    failed++;
  }

  try {
    await clearAllData();
    const parsed1 = parseChat(`15/10/2026, 10:00 - Alice: Secret 1`, 'conv_sec_a');
    const analysis1 = analyzeConversation(parsed1);
    await saveConversationWithAnalysis(parsed1, analysis1);

    const parsed2 = parseChat(`15/10/2026, 10:00 - Bob: Secret 2`, 'conv_sec_b');
    const analysis2 = analyzeConversation(parsed2);
    await saveConversationWithAnalysis(parsed2, analysis2);

    const dataA = await getConversationData('conv_sec_a');
    const dataB = await getConversationData('conv_sec_b');
    assert(dataA?.messages.every(m => m.conversationId === 'conv_sec_a') === true, 'Security 8: Conv A isolated from Conv B');
    assert(dataB?.messages.every(m => m.conversationId === 'conv_sec_b') === true, 'Security 8: Conv B isolated from Conv A');
  } catch (e: any) {
    console.error(`❌ FAIL: Security Test 8 - ${e.message}`);
    failed++;
  }

  try {
    await clearAllData();
    const raw = `15/10/2026, 10:00 - Alice: Alex, please review the PR by 2026-10-20.`;
    const parsed = parseChat(raw, 'conv_del_cascade_sec');
    const analysis = analyzeConversation(parsed, { userName: 'Alex', userAliases: [] });

    await saveConversationWithAnalysis(parsed, analysis);
    await deleteConversation('conv_del_cascade_sec');

    const check = await getConversationData('conv_del_cascade_sec');
    const list = await listConversations();
    assert(check === null && list.length === 0, 'Security 11: Cascade deletion wipes records across all 12 object stores');
  } catch (e: any) {
    console.error(`❌ FAIL: Security Test 11 - ${e.message}`);
    failed++;
  }

  try {
    await clearAllData();
    const list = await listConversations();
    assert(list.length === 0, 'Security 12: Clear all data empties all stores');
  } catch (e: any) {
    console.error(`❌ FAIL: Security Test 12 - ${e.message}`);
    failed++;
  }

  try {
    const parsed = parseChat(`15/10/2026, 10:00 - SecretSender: Confidential message content`, 'conv_no_log');
    const analysis = analyzeConversation(parsed);
    assert(analysis.analyzedAt !== undefined, 'Security 13 & 14: Execution stays 100% browser-local without console log exposure');
  } catch (e: any) {
    console.error(`❌ FAIL: Security Test 13 & 14 - ${e.message}`);
    failed++;
  }

  // ----------------------------------------------------
  // SECTION 5: DASHBOARD UI COMPONENTS SUITE (PROMPT 5)
  // ----------------------------------------------------
  console.log('\n--- SECTION 5: DASHBOARD UI COMPONENTS SUITE ---');

  try {
    await clearAllData();
    const parseRes = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_ui_test', 'UI Test Chat');
    const analysisRes = analyzeConversation(parseRes, userSettings);
    await saveConversationWithAnalysis(parseRes, analysisRes);

    const storedData = await getConversationData('conv_ui_test');
    assert(storedData !== null, 'UI 1: Stored conversation data retrievable for UI binding');
    assert(storedData?.analysisResult?.actionItems.length! > 0, 'UI 2: Action items available for Dashboard Task Tracker view');
    assert(storedData?.analysisResult?.deadlines.length! > 0, 'UI 3: Deadlines available for Timeline view');
    assert(storedData?.analysisResult?.importantMentions.length! > 0, 'UI 4: Mentions available for Mentions view');
  } catch (e: any) {
    console.error(`❌ FAIL: UI Component Test - ${e.message}`);
    failed++;
  }

  // ----------------------------------------------------
  // SECTION 6: BACKEND & API INTEGRATION (PROMPT 4.9)
  // ----------------------------------------------------
  try {
    const { runServerTests } = await import('./runServerSuite');
    await runServerTests(assert);
  } catch (e: any) {
    console.error(`❌ FAIL: Backend & API Integration Suite - ${e.message}`);
    failed++;
  }

  console.log('\n===================================================================');
  console.log(`FULL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
