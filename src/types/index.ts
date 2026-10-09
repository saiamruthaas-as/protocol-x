export type ParseStatus = "parsed" | "partial" | "unparsed";
export type ConfidenceLabel = "detected" | "likely" | "needs_confirmation";
export type PriorityLabel = "high" | "medium" | "low";
export type TaskStatus = "pending" | "completed" | "dismissed" | "needs_confirmation";
export type ChangeState = "confirmed_update" | "possible_update" | "contradiction" | "cancelled";
export type FindingType = "task" | "deadline" | "decision" | "change" | "question";

export type MentionCategory = 
  | "direct_mention" 
  | "question" 
  | "announcement" 
  | "decision" 
  | "changed_instruction" 
  | "blocker" 
  | "urgent_request";

export interface Message {
  id: string;
  conversationId: string;
  order: number;
  timestamp: string | null;
  originalTimestamp?: string | null;
  sender: string | null;
  text: string;
  fingerprint: string;
  parseStatus: ParseStatus;
  parseWarning?: string | null;
}

export interface Conversation {
  id: string;
  title: string;
  rawText: string;
  importedAt: string;
  messageCount: number;
  parsedCount: number;
  unparsedCount: number;
  partialCount: number;
  fingerprint?: string;
}

export interface ActionItem {
  id: string;
  conversationId: string;
  description: string;
  assignee: string | null;
  status: TaskStatus;
  priorityScore: number;
  priorityLabel: PriorityLabel;
  deadlineId: string | null;
  sourceMessageIds: string[];
  explanation: string;
  confidenceLabel: ConfidenceLabel;
  reasons: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Deadline {
  id: string;
  conversationId: string;
  originalDatePhrase: string;
  normalizedDate: string | null; // ISO Date String or null if unresolved
  isResolved: boolean;
  isOverdue: boolean;
  associatedActionItemId: string | null;
  sourceMessageIds: string[];
  resolutionType: "explicit" | "relative" | "ambiguous" | "unresolved";
  explanation: string;
  confidenceLabel: ConfidenceLabel;
  createdAt: string;
}

export interface ImportantMention {
  id: string;
  conversationId: string;
  excerpt: string;
  category: MentionCategory;
  reason: string;
  priorityScore: number;
  priorityLabel: PriorityLabel;
  sourceMessageIds: string[];
  relatedActionItemId: string | null;
  relatedDeadlineId: string | null;
  confidenceLabel: ConfidenceLabel;
  reasons: string[];
  createdAt: string;
}

export interface Decision {
  id: string;
  conversationId: string;
  topic: string;
  decision: string;
  status: "confirmed" | "proposed";
  sourceMessageIds: string[];
  explanation: string;
  confidenceLabel: ConfidenceLabel;
  createdAt: string;
}

export interface Question {
  id: string;
  conversationId: string;
  questionText: string;
  asker: string | null;
  target: string | null;
  requiresResponse: boolean;
  sourceMessageIds: string[];
  confidenceLabel: ConfidenceLabel;
  createdAt: string;
}

export interface PriorityScoreBreakdown {
  urgency: number;
  personalRelevance: number;
  importance: number;
  finalScore: number;
  matchedSignals: string[];
  explanation: string;
}

export interface Finding {
  id: string;
  conversationId: string;
  type: FindingType;
  title: string;
  description: string;
  priorityScore: number;
  priorityLabel: PriorityLabel;
  confidenceLabel: ConfidenceLabel;
  reasons: string[];
  sourceMessageIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  conversationId: string;
  title: string;
  assignee: string | null;
  deadline: string | null;
  originalDatePhrase?: string | null;
  status: TaskStatus;
  sourceMessageIds: string[];
  confidenceLabel: ConfidenceLabel;
  reasons: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Change {
  id: string;
  conversationId: string;
  subject: string;
  attribute: string;
  previousValue: string | null;
  proposedValue: string | null;
  state: ChangeState;
  sourceMessageIds: string[];
  explanation: string;
  createdAt: string;
}

export interface ReviewCheckpoint {
  conversationId: string;
  lastReviewedMessageId: string | null;
  lastReviewedAt: string | null;
  reviewedFindingIds: string[];
}

export interface UserSettings {
  userName: string;
  userAliases: string[];
  theme?: "dark" | "light" | "system";
}

export interface ParseResult {
  conversation: Conversation;
  messages: Message[];
  warnings: string[];
}

export interface AnalysisResult {
  conversationId: string;
  digest: string;
  actionItems: ActionItem[];
  deadlines: Deadline[];
  importantMentions: ImportantMention[];
  decisions: Decision[];
  questions: Question[];
  changes: Change[];
  findings: Finding[];
  analyzedAt: string;
  unverifiedMessageIds: string[];
}
