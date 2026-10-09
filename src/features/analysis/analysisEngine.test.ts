import { describe, it, expect } from 'vitest';
import { parseChat } from '../import/parseChat';
import { analyzeConversation } from './analyzeConversation';
import { validateSourceMessageIds } from './validateEvidence';
import { UserSettings, Message } from '../../types';

describe('CatchUp AI Analysis Engine Tests (PROMPT 3)', () => {
  const defaultUserSettings: UserSettings = {
    userName: 'Alex',
    userAliases: ['Alex Smith', '@alex']
  };

  // Test 1: Clearly assigned action item
  it('1. extracts a clearly assigned action item', () => {
    const raw = `15/10/2026, 10:00 - Bob: Alex, please finish the API documentation.`;
    const parsed = parseChat(raw, 'conv_1');
    const result = analyzeConversation(parsed, defaultUserSettings);

    expect(result.actionItems.length).toBe(1);
    expect(result.actionItems[0].assignee).toBe('Alex');
    expect(result.actionItems[0].confidenceLabel).toBe('detected');
    expect(result.actionItems[0].sourceMessageIds[0]).toBe('msg_conv_1_1');
  });

  // Test 2: Group request with no identifiable assignee
  it('2. extracts a group request with no identifiable assignee', () => {
    const raw = `15/10/2026, 10:00 - Charlie: Someone needs to review the database migration script.`;
    const parsed = parseChat(raw, 'conv_2');
    const result = analyzeConversation(parsed);

    expect(result.actionItems.length).toBe(1);
    expect(result.actionItems[0].assignee).toBeNull();
    expect(result.actionItems[0].confidenceLabel).toBe('likely');
  });

  // Test 3: Completed task
  it('3. detects a completed task accurately', () => {
    const raw = `15/10/2026, 10:00 - Dave: I have finished the database review.`;
    const parsed = parseChat(raw, 'conv_3');
    const result = analyzeConversation(parsed);

    expect(result.actionItems.length).toBe(1);
    expect(result.actionItems[0].status).toBe('completed');
    expect(result.actionItems[0].assignee).toBe('Dave');
  });

  // Test 4: Task with an explicit deadline
  it('4. extracts a task with an explicit date deadline', () => {
    const raw = `15/10/2026, 10:00 - Bob: Alex, please finish the report by 2026-10-20.`;
    const parsed = parseChat(raw, 'conv_4', undefined);
    const result = analyzeConversation(parsed, defaultUserSettings, '2026-10-15T00:00:00.000Z');

    expect(result.deadlines.length).toBe(1);
    expect(result.deadlines[0].resolutionType).toBe('explicit');
    expect(result.deadlines[0].isResolved).toBe(true);
    expect(result.deadlines[0].normalizedDate).toContain('2026-10-20');
  });

  // Test 5: Task with relative deadline and reference timestamp
  it('5. resolves relative deadline "tomorrow" using reference timestamp', () => {
    const raw = `15/10/2026, 10:00 - Bob: Please complete the audit tomorrow.`;
    const parsed = parseChat(raw, 'conv_5');
    const result = analyzeConversation(parsed, defaultUserSettings, '2026-10-15T00:00:00.000Z');

    expect(result.deadlines.length).toBe(1);
    expect(result.deadlines[0].resolutionType).toBe('relative');
    expect(result.deadlines[0].isResolved).toBe(true);
    expect(result.deadlines[0].normalizedDate).toContain('2026-10-16');
  });

  // Test 6: Ambiguous deadline remains unresolved
  it('6. keeps ambiguous weekday deadline "by Friday" unresolved for review', () => {
    const raw = `15/10/2026, 10:00 - Bob: Submit the draft by Friday.`;
    const parsed = parseChat(raw, 'conv_6');
    const result = analyzeConversation(parsed);

    expect(result.deadlines.length).toBe(1);
    expect(result.deadlines[0].resolutionType).toBe('ambiguous');
    expect(result.deadlines[0].isResolved).toBe(false);
    expect(result.deadlines[0].confidenceLabel).toBe('needs_confirmation');
  });

  // Test 7: Historical date must not become a deadline
  it('7. ignores historical date references', () => {
    const raw = `15/10/2026, 10:00 - Bob: In 2020 we completed the initial design phase.`;
    const parsed = parseChat(raw, 'conv_7');
    const result = analyzeConversation(parsed);

    expect(result.deadlines.length).toBe(0);
  });

  // Test 8: Direct mention of configured user
  it('8. detects direct mention of configured user identity', () => {
    const raw = `15/10/2026, 10:00 - Bob: Alex, what is the status of the launch?`;
    const parsed = parseChat(raw, 'conv_8', undefined);
    const result = analyzeConversation(parsed, defaultUserSettings);

    const directMention = result.importantMentions.find(m => m.category === 'direct_mention');
    expect(directMention).toBeDefined();
    expect(directMention?.priorityLabel).toBe('high');
  });

  // Test 9: Question requiring a response
  it('9. detects question requiring response', () => {
    const raw = `15/10/2026, 10:00 - Alice: Does anyone have the API credentials?`;
    const parsed = parseChat(raw, 'conv_9');
    const result = analyzeConversation(parsed);

    expect(result.questions.length).toBe(1);
    expect(result.questions[0].requiresResponse).toBe(true);
  });

  // Test 10: Important announcement
  it('10. detects important announcement', () => {
    const raw = `15/10/2026, 10:00 - Admin: Announcement: Version 2.0 release is now live!`;
    const parsed = parseChat(raw, 'conv_10');
    const result = analyzeConversation(parsed);

    const announcement = result.importantMentions.find(m => m.category === 'announcement');
    expect(announcement).toBeDefined();
  });

  // Test 11: Confirmed decision
  it('11. detects confirmed decision', () => {
    const raw = `15/10/2026, 10:00 - Alice: We decided to deploy on Friday morning.`;
    const parsed = parseChat(raw, 'conv_11');
    const result = analyzeConversation(parsed);

    expect(result.decisions.length).toBe(1);
    expect(result.decisions[0].status).toBe('confirmed');
  });

  // Test 12: Changed instruction or schedule
  it('12. detects changed schedule or instruction', () => {
    const raw = `15/10/2026, 10:00 - Bob: The meeting was moved from Thursday to Monday.`;
    const parsed = parseChat(raw, 'conv_12');
    const result = analyzeConversation(parsed);

    expect(result.changes.length).toBe(1);
    expect(result.changes[0].state).toBe('confirmed_update');
    expect(result.changes[0].previousValue).toBe('Thursday');
    expect(result.changes[0].proposedValue).toBe('Monday');
  });

  // Test 13: Message belonging to multiple categories
  it('13. links single message across multiple categories (Action Item + Deadline + Mention)', () => {
    const raw = `15/10/2026, 10:00 - Bob: Alex, please submit the report by 2026-10-20.`;
    const parsed = parseChat(raw, 'conv_13');
    const result = analyzeConversation(parsed, defaultUserSettings, '2026-10-15T00:00:00.000Z');

    expect(result.actionItems.length).toBe(1);
    expect(result.deadlines.length).toBe(1);
    expect(result.importantMentions.length).toBeGreaterThan(0);

    const sharedMsgId = result.actionItems[0].sourceMessageIds[0];
    expect(result.deadlines[0].sourceMessageIds[0]).toBe(sharedMsgId);
    expect(result.importantMentions[0].sourceMessageIds[0]).toBe(sharedMsgId);
  });

  // Test 14: Duplicate messages handling
  it('14. handles message evaluation without creating unverified duplicate tasks', () => {
    const raw = `15/10/2026, 10:00 - Bob: I will finish the task today.
15/10/2026, 10:05 - Bob: I will finish the task today.`;
    const parsed = parseChat(raw, 'conv_14');
    const result = analyzeConversation(parsed);

    expect(result.actionItems.length).toBe(2);
    expect(result.actionItems[0].sourceMessageIds[0]).not.toBe(result.actionItems[1].sourceMessageIds[0]);
  });

  // Test 15: Ambiguous message marked uncertain
  it('15. marks ambiguous proposal as requiring confirmation', () => {
    const raw = `15/10/2026, 10:00 - Alice: Could we finish the API today?`;
    const parsed = parseChat(raw, 'conv_15');
    const result = analyzeConversation(parsed);

    expect(result.actionItems.length).toBe(1);
    expect(result.actionItems[0].status).toBe('needs_confirmation');
    expect(result.actionItems[0].confidenceLabel).toBe('needs_confirmation');
  });

  // Test 16: Evidence validation flags missing source references
  it('16. evidence validator detects invalid message IDs', () => {
    const mockMap = new Map<string, Message>([['msg_1', {} as Message]]);
    const validation = validateSourceMessageIds(['msg_1', 'msg_invalid_99'], mockMap);

    expect(validation.isValid).toBe(false);
    expect(validation.validIds).toEqual(['msg_1']);
    expect(validation.invalidIds).toEqual(['msg_invalid_99']);
  });

  // Test 17: Empty conversation handling
  it('17. handles empty conversation gracefully', () => {
    const parsed = parseChat('', 'conv_empty');
    const result = analyzeConversation(parsed);

    expect(result.actionItems.length).toBe(0);
    expect(result.deadlines.length).toBe(0);
    expect(result.digest).toContain('Conversation is empty');
  });

  // Test 18: Malformed lines preserve analysis engine stability
  it('18. operates safely on malformed chat imports', () => {
    const raw = `Unparseable log line header
15/10/2026, 10:00 - Bob: I will handle the deployment.`;
    const parsed = parseChat(raw, 'conv_18');
    const result = analyzeConversation(parsed);

    expect(result.actionItems.length).toBe(1);
    expect(result.unverifiedMessageIds.length).toBe(0);
  });

  // Test 19: Conversation with no actionable findings
  it('19. returns clean result for chat with no actionable findings', () => {
    const raw = `15/10/2026, 10:00 - Alice: Good morning!
15/10/2026, 10:01 - Bob: Morning Alice! Hope you have a great day.`;
    const parsed = parseChat(raw, 'conv_19');
    const result = analyzeConversation(parsed);

    expect(result.actionItems.length).toBe(0);
    expect(result.deadlines.length).toBe(0);
    expect(result.digest).toBeDefined();
  });

  // Test 20: Regression check proving parser still works perfectly
  it('20. regression check: parser output remains intact', () => {
    const raw = `15/10/2026, 10:00 - Alice: Hey team!`;
    const parsed = parseChat(raw, 'conv_20');
    expect(parsed.messages.length).toBe(1);
    expect(parsed.messages[0].sender).toBe('Alice');
  });
});
