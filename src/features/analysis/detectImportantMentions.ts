import { Message, ImportantMention, MentionCategory, UserSettings, ActionItem, Deadline } from "../../types";
import { calculatePriorityScore, getPriorityLabel } from "./calculatePriority";

const ANNOUNCEMENT_KEYWORDS = ['welcome', 'announcement', 'important:', 'release', 'launch', 'all hands', 'update:'];
const BLOCKER_KEYWORDS = ['blocked', 'blocker', 'cannot proceed', 'critical bug', 'issue:', 'failing'];
const URGENT_KEYWORDS = ['urgent', 'asap', 'immediately', 'critical', 'emergency'];

export function detectImportantMentionsFromMessages(
  messages: Message[],
  conversationId: string,
  userSettings?: UserSettings,
  actionItems: ActionItem[] = [],
  deadlines: Deadline[] = []
): ImportantMention[] {
  const mentions: ImportantMention[] = [];
  let index = 0;

  const currentUserName = userSettings?.userName?.toLowerCase();
  const currentUserAliases = (userSettings?.userAliases || []).map(a => a.toLowerCase());

  const actionMapByMsg = new Map<string, ActionItem>();
  for (const act of actionItems) {
    for (const msgId of act.sourceMessageIds) {
      actionMapByMsg.set(msgId, act);
    }
  }

  const deadlineMapByMsg = new Map<string, Deadline>();
  for (const dl of deadlines) {
    for (const msgId of dl.sourceMessageIds) {
      deadlineMapByMsg.set(msgId, dl);
    }
  }

  for (const msg of messages) {
    if (msg.parseStatus === "unparsed" || !msg.text) continue;

    const lowerText = msg.text.toLowerCase();
    let category: MentionCategory | null = null;
    let reason = "";

    // 1. Direct Mention (only if user identity configured)
    if (currentUserName) {
      const isMentioned = lowerText.includes(currentUserName) ||
        currentUserAliases.some(alias => lowerText.includes(alias));
      if (isMentioned) {
        category = "direct_mention";
        reason = `Directly mentions configured user name (${userSettings?.userName || ''}).`;
      }
    }

    // 2. Urgent Request
    if (!category && URGENT_KEYWORDS.some(kw => lowerText.includes(kw))) {
      category = "urgent_request";
      reason = `Message contains explicit urgency keywords (${URGENT_KEYWORDS.filter(kw => lowerText.includes(kw)).join(', ')}).`;
    }

    // 3. Workflow Blocker
    if (!category && BLOCKER_KEYWORDS.some(kw => lowerText.includes(kw))) {
      category = "blocker";
      reason = `Identified progress blocker or critical issue.`;
    }

    // 4. Question directed at user or team
    if (!category && (msg.text.includes('?') || lowerText.startsWith('does anyone') || lowerText.startsWith('can someone'))) {
      category = "question";
      reason = `Question posted in conversation requiring attention.`;
    }

    // 5. Important Announcement
    if (!category && ANNOUNCEMENT_KEYWORDS.some(kw => lowerText.includes(kw))) {
      category = "announcement";
      reason = `Announcement or major update broadcast to group.`;
    }

    if (category) {
      index++;
      const id = `ment_${conversationId}_${index}`;
      const relatedActionItem = actionMapByMsg.get(msg.id);
      const relatedDeadline = deadlineMapByMsg.get(msg.id);

      const scoreBreakdown = calculatePriorityScore({
        hasDeadline: !!relatedDeadline,
        isDeadlineNear: relatedDeadline ? relatedDeadline.resolutionType === "relative" : false,
        isUrgentPhrase: category === "urgent_request" || category === "blocker",
        isDirectMention: category === "direct_mention",
        isAssignedToUser: relatedActionItem ? relatedActionItem.assignee?.toLowerCase() === currentUserName : false,
        isDecisionOrBlocker: category === "blocker" || (category as string) === "decision"
      });

      const priorityScore = scoreBreakdown.finalScore;
      const priorityLabel = getPriorityLabel(priorityScore);

      mentions.push({
        id,
        conversationId,
        excerpt: msg.text.length > 120 ? msg.text.slice(0, 117) + "..." : msg.text,
        category,
        reason,
        priorityScore,
        priorityLabel,
        sourceMessageIds: [msg.id],
        relatedActionItemId: relatedActionItem ? relatedActionItem.id : null,
        relatedDeadlineId: relatedDeadline ? relatedDeadline.id : null,
        confidenceLabel: category === "direct_mention" ? "detected" : "likely",
        reasons: scoreBreakdown.matchedSignals,
        createdAt: new Date().toISOString()
      });
    }
  }

  return mentions;
}
