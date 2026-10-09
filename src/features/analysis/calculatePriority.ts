import { PriorityLabel, PriorityScoreBreakdown } from "../../types";

export interface ScoreInputs {
  hasDeadline?: boolean;
  isDeadlineNear?: boolean; // Within 24-48 hours
  isUrgentPhrase?: boolean; // explicit urgency phrase
  isDirectMention?: boolean; // matches configured user name/alias
  isAssignedToUser?: boolean;
  isDecisionOrBlocker?: boolean;
  isQuestionToUser?: boolean;
}

/**
 * Deterministically computes priority score and provides arithmetic transparency
 */
export function calculatePriorityScore(inputs: ScoreInputs): PriorityScoreBreakdown {
  const matchedSignals: string[] = [];

  // 1. Urgency Component (0..100)
  let urgency = 10;
  if (inputs.isDeadlineNear) {
    urgency += 70;
    matchedSignals.push("Urgent deadline within 48h (+70 urgency)");
  } else if (inputs.hasDeadline) {
    urgency += 40;
    matchedSignals.push("Explicit deadline present (+40 urgency)");
  }
  if (inputs.isUrgentPhrase) {
    urgency += 20;
    matchedSignals.push("Time-sensitive / urgency wording matched (+20 urgency)");
  }
  urgency = Math.min(100, Math.max(0, urgency));

  // 2. Personal Relevance Component (0..100)
  let personalRelevance = 0;
  if (inputs.isAssignedToUser) {
    personalRelevance += 80;
    matchedSignals.push("Task directly assigned to user (+80 relevance)");
  }
  if (inputs.isDirectMention) {
    personalRelevance += 60;
    matchedSignals.push("Configured user name/alias directly mentioned (+60 relevance)");
  }
  if (inputs.isQuestionToUser) {
    personalRelevance += 40;
    matchedSignals.push("Question directed at user (+40 relevance)");
  }
  if (!inputs.isAssignedToUser && !inputs.isDirectMention && !inputs.isQuestionToUser) {
    personalRelevance = 10; // Baseline general relevance
  }
  personalRelevance = Math.min(100, Math.max(0, personalRelevance));

  // 3. Importance Component (0..100)
  let importance = 20;
  if (inputs.isDecisionOrBlocker) {
    importance += 70;
    matchedSignals.push("Key decision, policy change, or workflow blocker (+70 importance)");
  }
  if (inputs.hasDeadline || inputs.isAssignedToUser) {
    importance += 30;
    matchedSignals.push("Actionable responsibility or commitment (+30 importance)");
  }
  importance = Math.min(100, Math.max(0, importance));

  // Formula: 0.40 * urgency + 0.35 * personalRelevance + 0.25 * importance
  const rawScore = 0.40 * urgency + 0.35 * personalRelevance + 0.25 * importance;
  const finalScore = Math.round(rawScore * 10) / 10;

  const explanation = `Score ${finalScore}/100 calculated as: 0.40 × urgency (${urgency}) + 0.35 × personalRelevance (${personalRelevance}) + 0.25 × importance (${importance}).`;

  return {
    urgency,
    personalRelevance,
    importance,
    finalScore,
    matchedSignals,
    explanation
  };
}

export function getPriorityLabel(score: number): PriorityLabel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}
