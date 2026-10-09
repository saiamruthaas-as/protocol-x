import { parseChat, createFingerprint } from '../features/import/parseChat';
import { SAMPLE_WHATSAPP_CHAT, SAMPLE_BRACKET_CHAT, SAMPLE_MALFORMED_CHAT } from '../features/import/fixtures/sampleChats';
import { analyzeConversation } from '../features/analysis/analyzeConversation';
import { validateSourceMessageIds } from '../features/analysis/validateEvidence';
import { UserSettings, Message } from '../types';

console.log('====================================================');
console.log('CATCHUP AI — FULL AUTOMATED TEST SUITE (PROMPTS 2 & 3)');
console.log('====================================================\n');

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

// ----------------------------------------------------
// SECTION 1: CHAT PARSER TESTS (PROMPT 2)
// ----------------------------------------------------
console.log('--- SECTION 1: CHAT PARSER SUITE ---');

try {
  const result = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_123', 'Project Sync');
  assert(result.conversation.id === 'conv_123', 'Parser: Conversation ID preserved');
  assert(result.conversation.title === 'Project Sync', 'Parser: Conversation title preserved');
  assert(result.messages.length === 6, `Parser: Parsed exact message count (expected 6, got ${result.messages.length})`);
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

// Test 1: Clearly assigned action item
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

// Test 2: Group request with no identifiable assignee
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

// Test 3: Completed task
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

// Test 4: Task with explicit deadline
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

// Test 5: Relative deadline "tomorrow"
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

// Test 6: Ambiguous deadline "by Friday"
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

// Test 7: Historical date ignored
try {
  const raw = `15/10/2026, 10:00 - Bob: In 2020 we completed the initial design phase.`;
  const parsed = parseChat(raw, 'conv_7');
  const res = analyzeConversation(parsed);
  assert(res.deadlines.length === 0, 'Engine 7: Historical date in 2020 ignored');
} catch (e: any) {
  console.error(`❌ FAIL: Engine Test 7 - ${e.message}`);
  failed++;
}

// Test 8: Direct mention of user
try {
  const raw = `15/10/2026, 10:00 - Bob: Alex, what is the status of the launch?`;
  const parsed = parseChat(raw, 'conv_8');
  const res = analyzeConversation(parsed, userSettings);
  assert(res.importantMentions.some(m => m.category === 'direct_mention'), 'Engine 8: Direct mention of Alex detected');
} catch (e: any) {
  console.error(`❌ FAIL: Engine Test 8 - ${e.message}`);
  failed++;
}

// Test 9: Question requiring response
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

// Test 10: Announcement
try {
  const raw = `15/10/2026, 10:00 - Admin: Announcement: Version 2.0 release is live!`;
  const parsed = parseChat(raw, 'conv_10');
  const res = analyzeConversation(parsed);
  assert(res.importantMentions.some(m => m.category === 'announcement'), 'Engine 10: Announcement detected');
} catch (e: any) {
  console.error(`❌ FAIL: Engine Test 10 - ${e.message}`);
  failed++;
}

// Test 11: Confirmed decision
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

// Test 12: Changed schedule
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

// Test 13: Multiple categories cross-linked
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

// Test 14: Duplicate message evaluation
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

// Test 15: Ambiguous proposal
try {
  const raw = `15/10/2026, 10:00 - Alice: Could we finish the API today?`;
  const parsed = parseChat(raw, 'conv_15');
  const res = analyzeConversation(parsed);
  assert(res.actionItems[0].status === 'needs_confirmation', 'Engine 15: Proposal status is needs_confirmation');
} catch (e: any) {
  console.error(`❌ FAIL: Engine Test 15 - ${e.message}`);
  failed++;
}

// Test 16: Evidence validator
try {
  const mockMap = new Map<string, Message>([['msg_1', {} as Message]]);
  const validation = validateSourceMessageIds(['msg_1', 'msg_invalid_99'], mockMap);
  assert(validation.isValid === false, 'Engine 16: Detects invalid source ID');
  assert(validation.invalidIds[0] === 'msg_invalid_99', 'Engine 16: Flags msg_invalid_99');
} catch (e: any) {
  console.error(`❌ FAIL: Engine Test 16 - ${e.message}`);
  failed++;
}

// Test 17: Empty conversation
try {
  const parsed = parseChat('', 'conv_empty');
  const res = analyzeConversation(parsed);
  assert(res.digest.includes('empty'), 'Engine 17: Empty conversation digest handled');
} catch (e: any) {
  console.error(`❌ FAIL: Engine Test 17 - ${e.message}`);
  failed++;
}

// Test 18: Malformed lines safety
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

// Test 19: No actionable findings
try {
  const raw = `15/10/2026, 10:00 - Alice: Good morning!
15/10/2026, 10:01 - Bob: Morning Alice!`;
  const parsed = parseChat(raw, 'conv_19');
  const res = analyzeConversation(parsed);
  assert(res.actionItems.length === 0, 'Engine 19: Returns 0 action items for non-actionable chat');
} catch (e: any) {
  console.error(`❌ FAIL: Engine Test 19 - ${e.message}`);
  failed++;
}

// Test 20: Parser regression
try {
  const raw = `15/10/2026, 10:00 - Alice: Hey team!`;
  const parsed = parseChat(raw, 'conv_20');
  assert(parsed.messages.length === 1, 'Engine 20: Parser regression check passed');
} catch (e: any) {
  console.error(`❌ FAIL: Engine Test 20 - ${e.message}`);
  failed++;
}

console.log('\n====================================================');
console.log(`FULL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
}
