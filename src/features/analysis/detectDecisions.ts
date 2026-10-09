import { Message, Decision } from "../../types";

const CONFIRMED_DECISION_PATTERNS = [
  /\bwe\s+decided\s+(to\s+.*)/i,
  /\bfinal\s+decision:?\s*(.*)/i,
  /\bagreed\s+(?:that|to)\s+(.*)/i,
  /\bapproved\s+(.*)/i,
  /\bconfirmed\s+that\s+(.*)/i
];

const PROPOSED_DECISION_PATTERNS = [
  /\bhow\s+about\s+(.*)\?/i,
  /\bcould\s+we\s+(.*)\?/i,
  /\bshould\s+we\s+(.*)\?/i,
  /\bproposal:?\s*(.*)/i,
  /\bmaybe\s+(?:we|move)\s+(.*)/i
];

export function detectDecisionsFromMessages(
  messages: Message[],
  conversationId: string
): Decision[] {
  const decisions: Decision[] = [];
  let index = 0;

  for (const msg of messages) {
    if (msg.parseStatus === "unparsed" || !msg.text) continue;

    // Check confirmed decisions
    for (const pattern of CONFIRMED_DECISION_PATTERNS) {
      const match = msg.text.match(pattern);
      if (match) {
        index++;
        decisions.push({
          id: `dec_${conversationId}_${index}`,
          conversationId,
          topic: "Decision",
          decision: match[1].trim(),
          status: "confirmed",
          sourceMessageIds: [msg.id],
          explanation: `Explicit confirmed decision phrase matched in text.`,
          confidenceLabel: "detected",
          createdAt: new Date().toISOString()
        });
        break;
      }
    }

    // Check proposed decisions
    for (const pattern of PROPOSED_DECISION_PATTERNS) {
      const match = msg.text.match(pattern);
      if (match) {
        index++;
        decisions.push({
          id: `dec_${conversationId}_${index}`,
          conversationId,
          topic: "Proposal",
          decision: match[1].trim(),
          status: "proposed",
          sourceMessageIds: [msg.id],
          explanation: `Proposal phrase detected; not yet confirmed.`,
          confidenceLabel: "needs_confirmation",
          createdAt: new Date().toISOString()
        });
        break;
      }
    }
  }

  return decisions;
}
