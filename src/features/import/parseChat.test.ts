import { describe, it, expect } from 'vitest';
import { parseChat, createFingerprint, parseLineHeader } from './parseChat';
import { SAMPLE_WHATSAPP_CHAT, SAMPLE_BRACKET_CHAT, SAMPLE_MALFORMED_CHAT } from './fixtures/sampleChats';

describe('parseChat - Chat Parser Unit Tests', () => {
  it('correctly parses standard WhatsApp format messages', () => {
    const result = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_123', 'Project Sync');
    expect(result.conversation.id).toBe('conv_123');
    expect(result.conversation.title).toBe('Project Sync');
    expect(result.messages.length).toBe(6);

    const firstMsg = result.messages[0];
    expect(firstMsg.sender).toBe('Alice');
    expect(firstMsg.timestamp).toBe('15/10/2024, 14:30');
    expect(firstMsg.text).toBe('Hey team, welcome to the project discussion!');
    expect(firstMsg.parseStatus).toBe('parsed');
    expect(firstMsg.id).toBe('msg_conv_123_1');
  });

  it('handles multi-line text continuations properly', () => {
    const result = parseChat(SAMPLE_WHATSAPP_CHAT, 'conv_123');
    const bobMsg = result.messages[4]; // Bob's database review message
    expect(bobMsg.sender).toBe('Bob');
    expect(bobMsg.text).toContain("Someone needs to review the database migration script.");
    expect(bobMsg.text).toContain("This is a multi-line continuation of Bob's message.");
  });

  it('correctly parses bracket timestamp format', () => {
    const result = parseChat(SAMPLE_BRACKET_CHAT, 'conv_456');
    expect(result.messages.length).toBe(3);
    expect(result.messages[0].sender).toBe('Sarah Connor');
    expect(result.messages[0].timestamp).toBe('10/15/24, 09:00:15 AM');
    expect(result.messages[0].parseStatus).toBe('parsed');
  });

  it('preserves malformed and unrecognized lines without dropping them', () => {
    const result = parseChat(SAMPLE_MALFORMED_CHAT, 'conv_789');
    // Lines:
    // 1: System message: Group created by Admin -> generic sender or unparsed
    // 2: [15/10/24, 10:00] Alice: Valid message here -> parsed
    // 3: Some random unformatted log output from server -> unparsed
    // 4: 15/10/24, 10:05 - Bob: Another valid message -> parsed

    expect(result.messages.length).toBeGreaterThanOrEqual(3);
    const unparsed = result.messages.filter(m => m.parseStatus === 'unparsed');
    expect(unparsed.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    
    // Ensure raw text of unparsed lines is strictly preserved
    const unparsedText = unparsed.map(m => m.text);
    expect(unparsedText.some(t => t.includes('Some random unformatted log output'))).toBe(true);
  });

  it('generates deterministic fingerprints for identical inputs', () => {
    const fp1 = createFingerprint('conv_1|1|Alice|15/10/2024|hello world');
    const fp2 = createFingerprint('conv_1|1|Alice|15/10/2024|hello world');
    const fp3 = createFingerprint('conv_1|1|Alice|15/10/2024|different text');

    expect(fp1).toBe(fp2);
    expect(fp1).not.toBe(fp3);
  });

  it('handles empty input gracefully', () => {
    const result = parseChat('', 'conv_empty');
    expect(result.messages.length).toBe(0);
    expect(result.conversation.messageCount).toBe(0);
    expect(result.conversation.unparsedCount).toBe(0);
  });
});
