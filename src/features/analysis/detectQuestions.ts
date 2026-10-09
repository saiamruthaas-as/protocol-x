import { Message, Question } from "../../types";

export function detectQuestionsFromMessages(
  messages: Message[],
  conversationId: string
): Question[] {
  const questions: Question[] = [];
  let index = 0;

  for (const msg of messages) {
    if (msg.parseStatus === "unparsed" || !msg.text) continue;

    if (msg.text.includes('?')) {
      index++;
      const id = `q_${conversationId}_${index}`;
      
      // Determine if targeted at a person ("Alice, where is...?")
      const targetMatch = msg.text.match(/^([A-Z][a-zA-Z0-9_\s]{1,15})[,\:]\s*(.*\?)/);
      const target = targetMatch ? targetMatch[1].trim() : null;

      questions.push({
        id,
        conversationId,
        questionText: msg.text.trim(),
        asker: msg.sender || null,
        target,
        requiresResponse: true,
        sourceMessageIds: [msg.id],
        confidenceLabel: target ? "detected" : "likely",
        createdAt: new Date().toISOString()
      });
    }
  }

  return questions;
}
