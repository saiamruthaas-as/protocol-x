import { parseChat, createFingerprint } from '../features/import/parseChat';
import { SAMPLE_WHATSAPP_CHAT, SAMPLE_BRACKET_CHAT, SAMPLE_MALFORMED_CHAT } from '../features/import/fixtures/sampleChats';

console.log('========================================');
console.log('RUNNING CHAT PARSER SUITE (PROMPT 2)');
console.log('========================================\n');

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

// Test 1: Standard WhatsApp Format
try {
  const result = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_123', 'Project Sync');
  assert(result.conversation.id === 'conv_123', 'Conversation ID preserved');
  assert(result.conversation.title === 'Project Sync', 'Conversation title preserved');
  assert(result.messages.length === 6, `Parsed exact message count (expected 6, got ${result.messages.length})`);

  const firstMsg = result.messages[0];
  assert(firstMsg.sender === 'Alice', 'First message sender is Alice');
  assert(firstMsg.timestamp === '15/10/2024, 14:30', 'First message timestamp parsed');
  assert(firstMsg.text === 'Hey team, welcome to the project discussion!', 'First message text matches');
  assert(firstMsg.parseStatus === 'parsed', 'First message status is parsed');
} catch (e: any) {
  console.error(`❌ FAIL: Standard WhatsApp Format - ${e.message}`);
  failed++;
}

// Test 2: Multi-line Continuation
try {
  const result = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_123');
  const bobMsg = result.messages[4];
  assert(bobMsg.sender === 'Bob', 'Multi-line message sender is Bob');
  assert(bobMsg.text.includes("Someone needs to review the database migration script."), 'Multi-line first paragraph preserved');
  assert(bobMsg.text.includes("This is a multi-line continuation of Bob's message."), 'Multi-line second paragraph appended');
} catch (e: any) {
  console.error(`❌ FAIL: Multi-line Continuation - ${e.message}`);
  failed++;
}

// Test 3: Bracket Timestamp Format
try {
  const result = parseChat(SAMPLE_BRACKET_CHAT, 'conv_456');
  assert(result.messages.length === 3, `Bracket format message count (expected 3, got ${result.messages.length})`);
  assert(result.messages[0].sender === 'Sarah Connor', 'Bracket sender parsed');
  assert(result.messages[0].timestamp === '10/15/24, 09:00:15 AM', 'Bracket timestamp parsed');
  assert(result.messages[0].parseStatus === 'parsed', 'Bracket parse status is parsed');
} catch (e: any) {
  console.error(`❌ FAIL: Bracket Timestamp Format - ${e.message}`);
  failed++;
}

// Test 4: Malformed and Unparsed Line Retention
try {
  const result = parseChat(SAMPLE_MALFORMED_CHAT, 'conv_789');
  assert(result.messages.length >= 3, 'Malformed chat preserves all lines');
  const unparsed = result.messages.filter(m => m.parseStatus === 'unparsed');
  assert(unparsed.length > 0, `Unparsed lines detected (got ${unparsed.length})`);
  assert(result.warnings.length > 0, `Warnings generated for unparsed lines (got ${result.warnings.length})`);
  assert(unparsed.some(m => m.text.includes('Some random unformatted log output')), 'Unparsed line text preserved faithfully');
} catch (e: any) {
  console.error(`❌ FAIL: Malformed Line Retention - ${e.message}`);
  failed++;
}

// Test 5: Deterministic Fingerprint Consistency
try {
  const fp1 = createFingerprint('conv_1|1|Alice|15/10/2024|hello world');
  const fp2 = createFingerprint('conv_1|1|Alice|15/10/2024|hello world');
  const fp3 = createFingerprint('conv_1|1|Alice|15/10/2024|different text');
  assert(fp1 === fp2, 'Identical inputs produce identical fingerprint hashes');
  assert(fp1 !== fp3, 'Different inputs produce distinct fingerprint hashes');
} catch (e: any) {
  console.error(`❌ FAIL: Fingerprint Consistency - ${e.message}`);
  failed++;
}

// Test 6: Empty Input Handling
try {
  const result = parseChat('', 'conv_empty');
  assert(result.messages.length === 0, 'Empty input yields 0 messages');
  assert(result.conversation.messageCount === 0, 'Empty conversation messageCount is 0');
  assert(result.conversation.unparsedCount === 0, 'Empty conversation unparsedCount is 0');
} catch (e: any) {
  console.error(`❌ FAIL: Empty Input Handling - ${e.message}`);
  failed++;
}

console.log('\n========================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================\n');

if (failed > 0) {
  process.exit(1);
}
