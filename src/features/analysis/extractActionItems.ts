import { Message, ActionItem, TaskStatus, ConfidenceLabel, Deadline, UserSettings } from "../../types";
import { calculatePriorityScore, getPriorityLabel } from "./calculatePriority";

// Direct Assignment regex: "Alex, please finish X" or "Alex can you do X" or "Assigning to Alex: X"
const DIRECT_ASSIGN_REGEX = /^([A-Z][a-zA-Z0-9_\s]{1,20})[,\:]\s+(?:please|can you|could you|must|should|is assigned to)\s+(.*)$/i;

// Self Assignment regex: "I will finish X", "I'll do X", "I am working on X"
const SELF_ASSIGN_REGEX = /\b(?:I\s+will|I'll|I\s+am\s+working\s+on|I'm\s+handling|I\s+can\s+do|I\s+take)\s+(.*)$/i;

// Group / Unassigned Task regex: "someone needs to", "we need to", "team should", "action item:"
const UNASSIGNED_TASK_REGEX = /\b(?:someone\s+needs\s+to|someone\s+should|we\s+need\s+to|need\s+someone\s+to|action\s+item:?|todo:?)\s+(.*)$/i;

// General Request regex: "please review", "could we", "can someone"
const REQUEST_REGEX = /\b(?:please|could\s+we|can\s+someone|can\s+you)\s+(.*)$/i;

// Task Completion regex: "finished", "completed", "done with", "resolved", "fixed"
const COMPLETION_REGEX = /\b(?:I\s+have\s+|already\s+)?(?:finished|completed|done\s+with|fixed|resolved)\s+(.*)$/i;

export function extractActionItemsFromMessages(
  messages: Message[],
  conversationId: string,
  deadlines: Deadline[] = [],
  userSettings?: UserSettings
): ActionItem[] {
  const actionItems: ActionItem[] = [];
  let index = 0;

  const currentUserName = userSettings?.userName?.toLowerCase();
  const currentUserAliases = (userSettings?.userAliases || []).map(a => a.toLowerCase());

  const deadlineMapByMsg = new Map<string, Deadline>();
  for (const dl of deadlines) {
    for (const msgId of dl.sourceMessageIds) {
      deadlineMapByMsg.set(msgId, dl);
    }
  }

  for (const msg of messages) {
    if (msg.parseStatus === "unparsed" || !msg.text) continue;

    const trimmed = msg.text.trim();
    let description: string | null = null;
    let assignee: string | null = null;
    let status: TaskStatus = "pending";
    let confidenceLabel: ConfidenceLabel = "detected";
    let explanation = "";

    // Check Completion first
    const completionMatch = trimmed.match(COMPLETION_REGEX);
    if (completionMatch) {
      description = completionMatch[1];
      status = "completed";
      assignee = msg.sender || null;
      confidenceLabel = "detected";
      explanation = `Task completion confirmed by ${msg.sender || 'sender'}.`;
    }

    // Direct Assignment
    if (!description) {
      const directMatch = trimmed.match(DIRECT_ASSIGN_REGEX);
      if (directMatch) {
        assignee = directMatch[1].trim();
        description = directMatch[2].trim();
        confidenceLabel = "detected";
        explanation = `Explicit task assigned to ${assignee}.`;
      }
    }

    // Self Assignment
    if (!description) {
      const selfMatch = trimmed.match(SELF_ASSIGN_REGEX);
      if (selfMatch) {
        assignee = msg.sender || "Speaker";
        description = selfMatch[1].trim();
        confidenceLabel = "detected";
        explanation = `Self-commitment made by ${assignee}.`;
      }
    }

    // Unassigned Task
    if (!description) {
      const unassignedMatch = trimmed.match(UNASSIGNED_TASK_REGEX);
      if (unassignedMatch) {
        assignee = null;
        description = unassignedMatch[1].trim();
        confidenceLabel = "likely";
        explanation = `Unassigned task detected without specific owner.`;
      }
    }

    // General Request
    if (!description) {
      const requestMatch = trimmed.match(REQUEST_REGEX);
      if (requestMatch) {
        assignee = null;
        description = requestMatch[1].trim();
        status = "needs_confirmation";
        confidenceLabel = "needs_confirmation";
        explanation = `General request or proposal; requires confirmation.`;
      }
    }

    if (description) {
      index++;
      const id = `act_${conversationId}_${index}`;
      const associatedDeadline = deadlineMapByMsg.get(msg.id);
      const deadlineId = associatedDeadline ? associatedDeadline.id : null;

      if (associatedDeadline) {
        associatedDeadline.associatedActionItemId = id;
      }

      // Priority Scoring calculation
      const isAssignedToUser = assignee ? (
        (currentUserName && assignee.toLowerCase() === currentUserName) ||
        currentUserAliases.some(alias => assignee!.toLowerCase().includes(alias))
      ) : false;

      const isDirectMention = currentUserName ? (
        msg.text.toLowerCase().includes(currentUserName) ||
        currentUserAliases.some(alias => msg.text.toLowerCase().includes(alias))
      ) : false;

      const scoreBreakdown = calculatePriorityScore({
        hasDeadline: !!deadlineId,
        isDeadlineNear: associatedDeadline ? associatedDeadline.resolutionType === "relative" : false,
        isUrgentPhrase: msg.text.toLowerCase().includes('urgent') || msg.text.toLowerCase().includes('asap'),
        isAssignedToUser,
        isDirectMention,
        isDecisionOrBlocker: false
      });

      const priorityScore = scoreBreakdown.finalScore;
      const priorityLabel = getPriorityLabel(priorityScore);

      actionItems.push({
        id,
        conversationId,
        description,
        assignee,
        status,
        priorityScore,
        priorityLabel,
        deadlineId,
        sourceMessageIds: [msg.id],
        explanation: `${explanation} ${scoreBreakdown.explanation}`,
        confidenceLabel,
        reasons: scoreBreakdown.matchedSignals,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  return actionItems;
}
