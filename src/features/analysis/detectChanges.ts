import { Message, Change } from "../../types";

const CHANGE_PATTERNS = [
  { regex: /\b(?:moved|rescheduled)\s+from\s+(.*?)\s+to\s+(.*)/i, attr: 'time/date', state: 'confirmed_update' as const },
  { regex: /\bchanged\s+to\s+(.*)/i, attr: 'plan/time', state: 'possible_update' as const },
  { regex: /\binstead\b/i, attr: 'preference/schedule', state: 'possible_update' as const },
  { regex: /\bcorrection:?\s*(.*)/i, attr: 'correction', state: 'confirmed_update' as const },
  { regex: /\bcancelled\b/i, attr: 'event/task', state: 'cancelled' as const },
  { regex: /\bno\s+longer\b/i, attr: 'requirement', state: 'possible_update' as const },
  { regex: /\bignore\s+(?:my\s+)?previous\s+message\b/i, attr: 'instruction', state: 'confirmed_update' as const }
];

function cleanValue(str: string | undefined): string | null {
  if (!str) return null;
  return str.trim().replace(/[\.\,\!\?]+$/, '');
}

export function detectChangesFromMessages(
  messages: Message[],
  conversationId: string
): Change[] {
  const changes: Change[] = [];
  let index = 0;

  for (const msg of messages) {
    if (msg.parseStatus === "unparsed" || !msg.text) continue;

    for (const item of CHANGE_PATTERNS) {
      const match = msg.text.match(item.regex);
      if (match) {
        index++;
        const id = `chg_${conversationId}_${index}`;
        const proposedValue = cleanValue(match[2] || match[1]) || msg.text.trim();
        const previousValue = cleanValue(match[1] && match[2] ? match[1] : undefined);

        changes.push({
          id,
          conversationId,
          subject: msg.sender ? `Update from ${msg.sender}` : "Schedule/Plan Update",
          attribute: item.attr,
          previousValue,
          proposedValue,
          state: item.state,
          sourceMessageIds: [msg.id],
          explanation: `Change phrase matched in source text: "${msg.text.slice(0, 80)}"`,
          createdAt: new Date().toISOString()
        });
        break;
      }
    }
  }

  return changes;
}
