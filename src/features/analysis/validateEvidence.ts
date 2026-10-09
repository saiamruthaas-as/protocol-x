import { Message } from "../../types";

export interface EvidenceValidationResult {
  validIds: string[];
  invalidIds: string[];
  isValid: boolean;
}

/**
 * Validates that all source message IDs referenced in a finding exist in the conversation
 */
export function validateSourceMessageIds(
  sourceIds: string[],
  messageMap: Map<string, Message>
): EvidenceValidationResult {
  const validIds: string[] = [];
  const invalidIds: string[] = [];

  for (const id of sourceIds) {
    if (messageMap.has(id)) {
      validIds.push(id);
    } else {
      invalidIds.push(id);
    }
  }

  return {
    validIds,
    invalidIds,
    isValid: invalidIds.length === 0 && validIds.length > 0
  };
}
