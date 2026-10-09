import {
  ParseResult,
  UserSettings,
  AnalysisResult,
  Finding,
  Message
} from "../../types";
import { extractDeadlinesFromMessages } from "./extractDeadlines";
import { extractActionItemsFromMessages } from "./extractActionItems";
import { detectImportantMentionsFromMessages } from "./detectImportantMentions";
import { detectDecisionsFromMessages } from "./detectDecisions";
import { detectQuestionsFromMessages } from "./detectQuestions";
import { detectChangesFromMessages } from "./detectChanges";
import { generateRuleBasedDigest } from "./generateDigest";
import { validateSourceMessageIds } from "./validateEvidence";

/**
 * Public Orchestration Entry Point for the CatchUp AI Analysis Engine
 */
export function analyzeConversation(
  parseResult: ParseResult,
  userSettings?: UserSettings,
  referenceDateStr?: string
): AnalysisResult {
  const { conversation, messages } = parseResult;
  const messageMap = new Map<string, Message>(messages.map(m => [m.id, m]));
  const unverifiedMessageIds: string[] = [];

  // 1. Extract Primary Category B: Deadlines
  const deadlines = extractDeadlinesFromMessages(messages, conversation.id, referenceDateStr);

  // 2. Extract Primary Category A: Action Items
  const actionItems = extractActionItemsFromMessages(messages, conversation.id, deadlines, userSettings);

  // 3. Extract Primary Category C: Important Mentions
  const importantMentions = detectImportantMentionsFromMessages(
    messages,
    conversation.id,
    userSettings,
    actionItems,
    deadlines
  );

  // 4. Supporting Analysis Modules
  const decisions = detectDecisionsFromMessages(messages, conversation.id);
  const questions = detectQuestionsFromMessages(messages, conversation.id);
  const changes = detectChangesFromMessages(messages, conversation.id);

  // 5. Generate Rule-based Digest
  const digest = generateRuleBasedDigest(messages, actionItems, decisions, changes);

  // 6. Cross-Validate Evidence IDs
  const allFindingSources = [
    ...actionItems.flatMap(a => a.sourceMessageIds),
    ...deadlines.flatMap(d => d.sourceMessageIds),
    ...importantMentions.flatMap(m => m.sourceMessageIds),
    ...decisions.flatMap(d => d.sourceMessageIds),
    ...questions.flatMap(q => q.sourceMessageIds),
    ...changes.flatMap(c => c.sourceMessageIds)
  ];

  const validation = validateSourceMessageIds(allFindingSources, messageMap);
  if (validation.invalidIds.length > 0) {
    unverifiedMessageIds.push(...validation.invalidIds);
  }

  // 7. Aggregate Unified Finding objects for dashboard compatibility
  const findings: Finding[] = [];

  actionItems.forEach(item => {
    findings.push({
      id: `find_${item.id}`,
      conversationId: conversation.id,
      type: "task",
      title: `Task: ${item.description}`,
      description: item.explanation,
      priorityScore: item.priorityScore,
      priorityLabel: item.priorityLabel,
      confidenceLabel: item.confidenceLabel,
      reasons: item.reasons,
      sourceMessageIds: item.sourceMessageIds,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    });
  });

  deadlines.forEach(dl => {
    findings.push({
      id: `find_${dl.id}`,
      conversationId: conversation.id,
      type: "deadline",
      title: `Deadline: ${dl.originalDatePhrase}`,
      description: dl.explanation,
      priorityScore: dl.isResolved ? 65 : 40,
      priorityLabel: dl.isResolved ? "medium" : "low",
      confidenceLabel: dl.confidenceLabel,
      reasons: [dl.explanation],
      sourceMessageIds: dl.sourceMessageIds,
      createdAt: dl.createdAt,
      updatedAt: dl.createdAt
    });
  });

  importantMentions.forEach(ment => {
    findings.push({
      id: `find_${ment.id}`,
      conversationId: conversation.id,
      type: ment.category === "question" ? "question" : "task",
      title: `Mention (${ment.category}): ${ment.excerpt}`,
      description: ment.reason,
      priorityScore: ment.priorityScore,
      priorityLabel: ment.priorityLabel,
      confidenceLabel: ment.confidenceLabel,
      reasons: ment.reasons,
      sourceMessageIds: ment.sourceMessageIds,
      createdAt: ment.createdAt,
      updatedAt: ment.createdAt
    });
  });

  return {
    conversationId: conversation.id,
    digest,
    actionItems,
    deadlines,
    importantMentions,
    decisions,
    questions,
    changes,
    findings,
    analyzedAt: new Date().toISOString(),
    unverifiedMessageIds
  };
}
