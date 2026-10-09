import { Message, ActionItem, Decision, Change } from "../../types";

export function generateRuleBasedDigest(
  messages: Message[],
  actionItems: ActionItem[],
  decisions: Decision[],
  changes: Change[]
): string {
  if (messages.length === 0) {
    return "A reliable summary could not be generated: conversation is empty.";
  }

  const senders = Array.from(new Set(messages.map(m => m.sender).filter(Boolean)));
  const parsedCount = messages.filter(m => m.parseStatus === "parsed").length;

  let digest = `Conversation Digest (Rule-based):\n`;
  digest += `Analyzed ${messages.length} total lines (${parsedCount} parsed messages) across ${senders.length > 0 ? senders.join(', ') : 'unknown senders'}.\n`;

  if (actionItems.length > 0) {
    digest += `• Action Items (${actionItems.length}): ${actionItems.map(a => `${a.description} [Assignee: ${a.assignee || 'Unknown'}]`).slice(0, 3).join('; ')}.\n`;
  } else {
    digest += `• Action Items: No explicit commitments detected.\n`;
  }

  if (decisions.length > 0) {
    digest += `• Key Decisions (${decisions.length}): ${decisions.map(d => d.decision).slice(0, 2).join('; ')}.\n`;
  }

  if (changes.length > 0) {
    digest += `• Schedule / Plan Updates (${changes.length}): ${changes.map(c => c.proposedValue).slice(0, 2).join('; ')}.\n`;
  }

  return digest.trim();
}
