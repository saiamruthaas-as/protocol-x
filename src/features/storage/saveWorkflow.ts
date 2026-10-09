import { parseChat } from '../import/parseChat';
import { analyzeConversation } from '../analysis/analyzeConversation';
import { saveConversationWithAnalysis } from './db';
import { ParseResult, AnalysisResult, UserSettings } from '../../types';

export interface WorkflowSaveResult {
  parseResult: ParseResult;
  analysisResult: AnalysisResult;
  saveInfo: {
    conversationId: string;
    isDuplicateUpdate: boolean;
  };
}

/**
 * End-to-end local import, analysis, and persistence workflow
 */
export async function processAndSaveConversation(
  rawText: string,
  title?: string,
  userSettings?: UserSettings,
  referenceDateStr?: string
): Promise<WorkflowSaveResult> {
  const tempConversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  // 1. Parse raw chat text
  const parseResult = parseChat(rawText, tempConversationId, title);
  if (parseResult.messages.length === 0) {
    throw new Error('Import failed: The provided text or file contained no valid messages.');
  }

  // 2. Run deterministic analysis engine
  const analysisResult = analyzeConversation(parseResult, userSettings, referenceDateStr);

  // 3. Persist transactionally to IndexedDB
  const saveInfo = await saveConversationWithAnalysis(parseResult, analysisResult);

  return {
    parseResult,
    analysisResult,
    saveInfo
  };
}
