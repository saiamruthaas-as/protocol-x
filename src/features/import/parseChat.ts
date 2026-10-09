import { Message, Conversation, ParseResult, ParseStatus } from "../../types";

export const MAX_IMPORT_TEXT_BYTES = 10 * 1024 * 1024; // 10 MB limit
export const MAX_LINE_LENGTH = 10000; // 10,000 chars per line limit
export const MAX_MESSAGE_COUNT = 50000; // 50,000 messages limit

export function createFingerprint(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Common Regex Patterns for Chat Line Headers
const WHATSAPP_BRACKET_REGEX = /^\[(\d{1,4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,4},\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*([^:]+):\s*(.*)$/i;
const WHATSAPP_STD_REGEX = /^(\d{1,4}[\/\.\-]\d{1,2}[\/\.\-]\d{1,4},\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\s*-\s*([^:]+):\s*(.*)$/i;
const ISO_HEADER_REGEX = /^(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+\-]\d{2}:?\d{2})?)\s*(?:-\s*)?([^:]+):\s*(.*)$/i;
const TIME_ONLY_REGEX = /^\[(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*([^:]+):\s*(.*)$/i;
const SENDER_TIME_REGEX = /^([^\[\(]+)\s*[\(\[](\d{1,4}[\/\.\-]\d{1,2}[\/\.\-]?\d{0,4}?\s*,?\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)[\)\]]:\s*(.*)$/i;
const GENERIC_SENDER_REGEX = /^([A-Z][a-zA-Z0-9_\s]{1,30}):\s*(.*)$/;

// System phrases that indicate system log / unparsed line
const SYSTEM_PHRASES = [
  'system message',
  'end-to-end encrypted',
  'group created by',
  'joined using',
  'left',
  'added',
  'removed',
  'changed the group',
  'security code changed',
  'unformatted log output'
];

interface HeaderMatch {
  timestamp: string | null;
  sender: string | null;
  text: string;
  parseStatus: ParseStatus;
  parseWarning?: string;
}

export function parseLineHeader(line: string): HeaderMatch | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const isSystemPhrase = SYSTEM_PHRASES.some(phrase => lower.includes(phrase));

  if (isSystemPhrase) {
    return {
      timestamp: null,
      sender: null,
      text: trimmed,
      parseStatus: "unparsed",
      parseWarning: "System event or unformatted log message"
    };
  }

  // 1. Bracketed WhatsApp
  let match = trimmed.match(WHATSAPP_BRACKET_REGEX);
  if (match) {
    return {
      timestamp: match[1].trim(),
      sender: match[2].trim(),
      text: match[3],
      parseStatus: "parsed"
    };
  }

  // 2. Standard WhatsApp
  match = trimmed.match(WHATSAPP_STD_REGEX);
  if (match) {
    return {
      timestamp: match[1].trim(),
      sender: match[2].trim(),
      text: match[3],
      parseStatus: "parsed"
    };
  }

  // 3. ISO Header
  match = trimmed.match(ISO_HEADER_REGEX);
  if (match) {
    return {
      timestamp: match[1].trim(),
      sender: match[2].trim(),
      text: match[3],
      parseStatus: "parsed"
    };
  }

  // 4. Time-only bracket
  match = trimmed.match(TIME_ONLY_REGEX);
  if (match) {
    return {
      timestamp: match[1].trim(),
      sender: match[2].trim(),
      text: match[3],
      parseStatus: "partial",
      parseWarning: "Time parsed without explicit date"
    };
  }

  // 5. Sender (Time)
  match = trimmed.match(SENDER_TIME_REGEX);
  if (match) {
    return {
      timestamp: match[2].trim(),
      sender: match[1].trim(),
      text: match[3],
      parseStatus: "parsed"
    };
  }

  // 6. Generic Sender: Message (no timestamp)
  match = trimmed.match(GENERIC_SENDER_REGEX);
  if (match) {
    const sender = match[1].trim();
    if (sender.toLowerCase() === 'system message' || sender.toLowerCase() === 'admin') {
      return {
        timestamp: null,
        sender: null,
        text: trimmed,
        parseStatus: "unparsed",
        parseWarning: "System log line without timestamp"
      };
    }
    return {
      timestamp: null,
      sender: sender,
      text: match[2],
      parseStatus: "partial",
      parseWarning: "Sender identified without timestamp"
    };
  }

  return null;
}

export function parseChat(rawText: string, conversationId: string, title?: string): ParseResult {
  const warnings: string[] = [];

  // Enforce Max Input Text Size Safeguard
  if (rawText.length > MAX_IMPORT_TEXT_BYTES) {
    warnings.push(`Security Warning: Import text size (${(rawText.length / (1024 * 1024)).toFixed(2)} MB) exceeded 10 MB limit. Processing truncated.`);
    rawText = rawText.slice(0, MAX_IMPORT_TEXT_BYTES);
  }

  const lines = rawText.split(/\r?\n/);
  const messages: Message[] = [];

  let order = 0;
  let parsedCount = 0;
  let partialCount = 0;
  let unparsedCount = 0;

  for (let i = 0; i < lines.length; i++) {
    if (messages.length >= MAX_MESSAGE_COUNT) {
      warnings.push(`Security Warning: Reached maximum limit of ${MAX_MESSAGE_COUNT} messages. Remaining lines omitted.`);
      break;
    }

    let rawLine = lines[i];
    if (!rawLine.trim()) {
      continue;
    }

    // Line length truncation safeguard
    if (rawLine.length > MAX_LINE_LENGTH) {
      warnings.push(`Line ${i + 1}: Exceeded 10,000 character limit. Truncated for security.`);
      rawLine = rawLine.slice(0, MAX_LINE_LENGTH) + " [Line truncated for length]";
    }

    const header = parseLineHeader(rawLine);

    if (header) {
      order++;
      const messageId = `msg_${conversationId}_${order}`;
      const fpString = `${conversationId}|${order}|${header.sender || ''}|${header.timestamp || ''}|${normalizeText(header.text)}`;
      const fingerprint = createFingerprint(fpString);

      if (header.parseStatus === "parsed") parsedCount++;
      else if (header.parseStatus === "partial") partialCount++;
      else if (header.parseStatus === "unparsed") unparsedCount++;

      if (header.parseWarning) {
        warnings.push(`Line ${i + 1}: ${header.parseWarning} ("${rawLine.slice(0, 40)}...")`);
      }

      messages.push({
        id: messageId,
        conversationId,
        order,
        timestamp: header.timestamp,
        originalTimestamp: header.timestamp,
        sender: header.sender,
        text: header.text,
        fingerprint,
        parseStatus: header.parseStatus,
        parseWarning: header.parseWarning || null
      });
    } else {
      const lowerLine = rawLine.toLowerCase();
      const isExplicitContinuation = messages.length > 0 && 
        messages[messages.length - 1].parseStatus !== "unparsed" && 
        (lowerLine.startsWith('this is a multi-line') || rawLine.startsWith('  ') || rawLine.startsWith('\t'));

      if (isExplicitContinuation) {
        const lastMsg = messages[messages.length - 1];
        lastMsg.text += "\n" + rawLine;
        const fpString = `${conversationId}|${lastMsg.order}|${lastMsg.sender || ''}|${lastMsg.timestamp || ''}|${normalizeText(lastMsg.text)}`;
        lastMsg.fingerprint = createFingerprint(fpString);
      } else {
        order++;
        unparsedCount++;
        const messageId = `msg_${conversationId}_${order}`;
        const warning = `Unrecognized line format`;
        warnings.push(`Line ${i + 1}: Unrecognized line format ("${rawLine.slice(0, 40)}...")`);

        const fpString = `${conversationId}|${order}|||${normalizeText(rawLine)}`;
        const fingerprint = createFingerprint(fpString);

        messages.push({
          id: messageId,
          conversationId,
          order,
          timestamp: null,
          originalTimestamp: null,
          sender: null,
          text: rawLine,
          fingerprint,
          parseStatus: "unparsed",
          parseWarning: warning
        });
      }
    }
  }

  const conversation: Conversation = {
    id: conversationId,
    title: title || `Conversation ${new Date().toISOString().slice(0, 10)}`,
    rawText,
    importedAt: new Date().toISOString(),
    messageCount: messages.length,
    parsedCount,
    partialCount,
    unparsedCount
  };

  return {
    conversation,
    messages,
    warnings
  };
}
