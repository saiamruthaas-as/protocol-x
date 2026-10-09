import { openDB, IDBPDatabase } from 'idb';
import {
  Conversation,
  Message,
  ParseResult,
  AnalysisResult,
  ActionItem,
  Deadline,
  ImportantMention,
  Decision,
  Question,
  Change,
  Finding,
  ReviewCheckpoint,
  UserSettings
} from '../../types';
import { createFingerprint } from '../import/parseChat';

const DB_NAME = 'catchup_ai_db';
const DB_VERSION = 1;

export interface StoredConversationData {
  conversation: Conversation;
  messages: Message[];
  analysisResult: AnalysisResult | null;
  checkpoint: ReviewCheckpoint | null;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(customIndexedDB?: any): Promise<IDBPDatabase> {
  if (dbPromise && !customIndexedDB) return dbPromise;

  const promise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // 1. Conversations store
      if (!db.objectStoreNames.contains('conversations')) {
        const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
        convStore.createIndex('fingerprint', 'fingerprint', { unique: false });
        convStore.createIndex('importedAt', 'importedAt', { unique: false });
      }

      // 2. Messages store
      if (!db.objectStoreNames.contains('messages')) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
        msgStore.createIndex('conversationId', 'conversationId', { unique: false });
        msgStore.createIndex('order', 'order', { unique: false });
      }

      // 3. Action Items store
      if (!db.objectStoreNames.contains('action_items')) {
        const actStore = db.createObjectStore('action_items', { keyPath: 'id' });
        actStore.createIndex('conversationId', 'conversationId', { unique: false });
      }

      // 4. Deadlines store
      if (!db.objectStoreNames.contains('deadlines')) {
        const dlStore = db.createObjectStore('deadlines', { keyPath: 'id' });
        dlStore.createIndex('conversationId', 'conversationId', { unique: false });
      }

      // 5. Important Mentions store
      if (!db.objectStoreNames.contains('important_mentions')) {
        const mentStore = db.createObjectStore('important_mentions', { keyPath: 'id' });
        mentStore.createIndex('conversationId', 'conversationId', { unique: false });
      }

      // 6. Decisions store
      if (!db.objectStoreNames.contains('decisions')) {
        const decStore = db.createObjectStore('decisions', { keyPath: 'id' });
        decStore.createIndex('conversationId', 'conversationId', { unique: false });
      }

      // 7. Questions store
      if (!db.objectStoreNames.contains('questions')) {
        const qStore = db.createObjectStore('questions', { keyPath: 'id' });
        qStore.createIndex('conversationId', 'conversationId', { unique: false });
      }

      // 8. Changes store
      if (!db.objectStoreNames.contains('changes')) {
        const chgStore = db.createObjectStore('changes', { keyPath: 'id' });
        chgStore.createIndex('conversationId', 'conversationId', { unique: false });
      }

      // 9. Legacy Findings store
      if (!db.objectStoreNames.contains('findings')) {
        const findStore = db.createObjectStore('findings', { keyPath: 'id' });
        findStore.createIndex('conversationId', 'conversationId', { unique: false });
      }

      // 10. Analysis Results store
      if (!db.objectStoreNames.contains('analysis_results')) {
        db.createObjectStore('analysis_results', { keyPath: 'conversationId' });
      }

      // 11. Checkpoints store
      if (!db.objectStoreNames.contains('checkpoints')) {
        db.createObjectStore('checkpoints', { keyPath: 'conversationId' });
      }

      // 12. User Settings store
      if (!db.objectStoreNames.contains('user_settings')) {
        db.createObjectStore('user_settings', { keyPath: 'id' });
      }
    }
  });

  if (!customIndexedDB) {
    dbPromise = promise;
  }
  return promise;
}

/**
 * Duplicate-Detection Policy & Save Operation:
 * Computes conversation fingerprint (FNV-1a hash of raw text).
 * If a conversation with matching fingerprint exists, reuses existing conversation ID
 * and replaces associated messages & findings instead of creating duplicate records.
 */
export async function saveConversationWithAnalysis(
  parseResult: ParseResult,
  analysisResult: AnalysisResult
): Promise<{ conversationId: string; isDuplicateUpdate: boolean }> {
  const db = await getDB();
  const rawFingerprint = createFingerprint(parseResult.conversation.rawText);

  // Check existing conversation by fingerprint
  const existingConvTx = db.transaction('conversations', 'readonly');
  const existingConvs = await existingConvTx.store.index('fingerprint').getAll(rawFingerprint);
  let targetConversationId = parseResult.conversation.id;
  let isDuplicateUpdate = false;

  if (existingConvs.length > 0) {
    targetConversationId = existingConvs[0].id;
    isDuplicateUpdate = true;
  }

  // Update conversation record
  const conversationToSave: Conversation = {
    ...parseResult.conversation,
    id: targetConversationId,
    fingerprint: rawFingerprint,
    importedAt: new Date().toISOString()
  };

  // Re-map messages & findings to targetConversationId
  const messagesToSave: Message[] = parseResult.messages.map(m => ({
    ...m,
    conversationId: targetConversationId,
    id: `msg_${targetConversationId}_${m.order}`
  }));

  const analysisToSave: AnalysisResult = {
    ...analysisResult,
    conversationId: targetConversationId
  };

  // Atomic Multi-Store Transaction
  const stores = [
    'conversations', 'messages', 'action_items', 'deadlines',
    'important_mentions', 'decisions', 'questions', 'changes',
    'findings', 'analysis_results'
  ];

  const tx = db.transaction(stores, 'readwrite');

  // Clear existing items for this conversation if updating
  if (isDuplicateUpdate) {
    const msgStore = tx.objectStore('messages');
    const existingMsgs = await msgStore.index('conversationId').getAllKeys(targetConversationId);
    for (const key of existingMsgs) await msgStore.delete(key);

    const actStore = tx.objectStore('action_items');
    const existingActs = await actStore.index('conversationId').getAllKeys(targetConversationId);
    for (const key of existingActs) await actStore.delete(key);

    const dlStore = tx.objectStore('deadlines');
    const existingDls = await dlStore.index('conversationId').getAllKeys(targetConversationId);
    for (const key of existingDls) await dlStore.delete(key);

    const mentStore = tx.objectStore('important_mentions');
    const existingMents = await mentStore.index('conversationId').getAllKeys(targetConversationId);
    for (const key of existingMents) await mentStore.delete(key);
  }

  // Save Conversation & Messages
  await tx.objectStore('conversations').put(conversationToSave);
  for (const msg of messagesToSave) {
    await tx.objectStore('messages').put(msg);
  }

  // Save Category A: Action Items
  for (const item of analysisToSave.actionItems) {
    await tx.objectStore('action_items').put({ ...item, conversationId: targetConversationId });
  }

  // Save Category B: Deadlines
  for (const dl of analysisToSave.deadlines) {
    await tx.objectStore('deadlines').put({ ...dl, conversationId: targetConversationId });
  }

  // Save Category C: Important Mentions
  for (const ment of analysisToSave.importantMentions) {
    await tx.objectStore('important_mentions').put({ ...ment, conversationId: targetConversationId });
  }

  // Save Decisions, Questions, Changes, Findings & Analysis Summary
  for (const dec of analysisToSave.decisions) {
    await tx.objectStore('decisions').put({ ...dec, conversationId: targetConversationId });
  }
  for (const q of analysisToSave.questions) {
    await tx.objectStore('questions').put({ ...q, conversationId: targetConversationId });
  }
  for (const chg of analysisToSave.changes) {
    await tx.objectStore('changes').put({ ...chg, conversationId: targetConversationId });
  }
  for (const f of analysisToSave.findings) {
    await tx.objectStore('findings').put({ ...f, conversationId: targetConversationId });
  }
  await tx.objectStore('analysis_results').put(analysisToSave);

  await tx.done;

  return { conversationId: targetConversationId, isDuplicateUpdate };
}

/**
 * Retrieves full conversation data including parsed messages, analysis results, and review checkpoint.
 */
export async function getConversationData(conversationId: string): Promise<StoredConversationData | null> {
  const db = await getDB();
  const conversation = await db.get('conversations', conversationId);
  if (!conversation) return null;

  const messages = await db.getAllFromIndex('messages', 'conversationId', conversationId);
  messages.sort((a, b) => a.order - b.order);

  const analysisResult = await db.get('analysis_results', conversationId) || null;
  const checkpoint = await db.get('checkpoints', conversationId) || null;

  return {
    conversation,
    messages,
    analysisResult,
    checkpoint
  };
}

/**
 * Lists all stored conversations sorted by import timestamp descending.
 */
export async function listConversations(): Promise<Conversation[]> {
  const db = await getDB();
  const convs = await db.getAll('conversations');
  return convs.sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime());
}

/**
 * Cascade deletion: completely removes a conversation and all associated records across all stores.
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const db = await getDB();
  const stores = [
    'conversations', 'messages', 'action_items', 'deadlines',
    'important_mentions', 'decisions', 'questions', 'changes',
    'findings', 'analysis_results', 'checkpoints'
  ];

  const tx = db.transaction(stores, 'readwrite');

  // Delete from main stores
  await tx.objectStore('conversations').delete(conversationId);
  await tx.objectStore('analysis_results').delete(conversationId);
  await tx.objectStore('checkpoints').delete(conversationId);

  // Cascade delete indexed items
  const deleteByConvId = async (storeName: string) => {
    const store = tx.objectStore(storeName);
    const keys = await store.index('conversationId').getAllKeys(conversationId);
    for (const k of keys) await store.delete(k);
  };

  await deleteByConvId('messages');
  await deleteByConvId('action_items');
  await deleteByConvId('deadlines');
  await deleteByConvId('important_mentions');
  await deleteByConvId('decisions');
  await deleteByConvId('questions');
  await deleteByConvId('changes');
  await deleteByConvId('findings');

  await tx.done;
}

/**
 * Clears all application data across all IndexedDB stores.
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const stores = [
    'conversations', 'messages', 'action_items', 'deadlines',
    'important_mentions', 'decisions', 'questions', 'changes',
    'findings', 'analysis_results', 'checkpoints', 'user_settings'
  ];

  const tx = db.transaction(stores, 'readwrite');
  for (const name of stores) {
    await tx.objectStore(name).clear();
  }
  await tx.done;
}

/**
 * User Settings Repository Operations
 */
export async function getUserSettings(): Promise<UserSettings> {
  const db = await getDB();
  const saved = await db.get('user_settings', 'current_settings');
  if (saved) {
    return { userName: saved.userName, userAliases: saved.userAliases, theme: saved.theme };
  }
  return { userName: '', userAliases: [], theme: 'system' };
}

export async function saveUserSettings(settings: UserSettings): Promise<void> {
  const db = await getDB();
  await db.put('user_settings', { id: 'current_settings', ...settings });
}

/**
 * Checkpoints Repository Operations
 */
export async function saveReviewCheckpoint(checkpoint: ReviewCheckpoint): Promise<void> {
  const db = await getDB();
  await db.put('checkpoints', checkpoint);
}

export async function getReviewCheckpoint(conversationId: string): Promise<ReviewCheckpoint | null> {
  const db = await getDB();
  const res = await db.get('checkpoints', conversationId);
  return res || null;
}
