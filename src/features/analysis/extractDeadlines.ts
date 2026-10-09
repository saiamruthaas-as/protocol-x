import { Message, Deadline, ConfidenceLabel } from "../../types";
import { parseISO, addDays, format, isValid } from "date-fns";

// Explicit Date Patterns
const EXPLICIT_ISO_REGEX = /\b(\d{4}-\d{2}-\d{2})\b/;
const EXPLICIT_SLASH_REGEX = /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/;
const EXPLICIT_TEXT_DATE_REGEX = /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:\d{2,4})?)\b/i;

// Relative Date Patterns
const RELATIVE_DAY_REGEX = /\b(today|tomorrow|yesterday|tonight)\b/i;
const RELATIVE_WEEKDAY_REGEX = /\b(?:by|on|before|this|next)?\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i;
const TIME_REGEX = /\b(?:at|by)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i;

// Historical context markers (should not be treated as active deadlines)
const HISTORICAL_MARKERS = ['in 2020', 'in 2021', 'in 2022', 'in 2023', 'last year', 'years ago', 'was completed on'];

export function extractDeadlinesFromMessages(
  messages: Message[],
  conversationId: string,
  referenceDateStr: string = "2026-10-15T00:00:00.000Z"
): Deadline[] {
  const deadlines: Deadline[] = [];
  let index = 0;

  const baseRefDate = parseISO(referenceDateStr);
  const validRefDate = isValid(baseRefDate) ? baseRefDate : new Date(2026, 9, 15);

  for (const msg of messages) {
    if (msg.parseStatus === "unparsed" || !msg.text) continue;

    const lowerText = msg.text.toLowerCase();

    // Skip historical references
    if (HISTORICAL_MARKERS.some(marker => lowerText.includes(marker))) {
      continue;
    }

    let originalPhrase: string | null = null;
    let normalizedDate: string | null = null;
    let resolutionType: "explicit" | "relative" | "ambiguous" | "unresolved" = "unresolved";
    let confidenceLabel: ConfidenceLabel = "needs_confirmation";
    let isResolved = false;

    // 1. Explicit ISO Date (e.g. 2026-10-15)
    let match = msg.text.match(EXPLICIT_ISO_REGEX);
    if (match) {
      originalPhrase = match[1];
      const parsed = parseISO(originalPhrase);
      if (isValid(parsed)) {
        normalizedDate = parsed.toISOString();
        isResolved = true;
        resolutionType = "explicit";
        confidenceLabel = "detected";
      }
    }

    // 2. Explicit Slash Date (e.g. 15/10/2026 or 10/15/2026)
    if (!originalPhrase) {
      match = msg.text.match(EXPLICIT_SLASH_REGEX);
      if (match) {
        originalPhrase = match[1];
        const parts = originalPhrase.split('/');
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[0], 10);
        const parsed = new Date(year, month, day);
        if (isValid(parsed)) {
          normalizedDate = parsed.toISOString();
          isResolved = true;
          resolutionType = "explicit";
          confidenceLabel = "detected";
        }
      }
    }

    // 3. Explicit Text Date (e.g. 15 October 2026)
    if (!originalPhrase) {
      match = msg.text.match(EXPLICIT_TEXT_DATE_REGEX);
      if (match) {
        originalPhrase = match[1];
        const parsed = new Date(originalPhrase);
        if (isValid(parsed)) {
          normalizedDate = parsed.toISOString();
          isResolved = true;
          resolutionType = "explicit";
          confidenceLabel = "detected";
        }
      }
    }

    // 4. Relative Day (e.g. "tomorrow", "today")
    if (!originalPhrase) {
      match = msg.text.match(RELATIVE_DAY_REGEX);
      if (match) {
        originalPhrase = match[1];
        const word = originalPhrase.toLowerCase();
        let targetDate = validRefDate;
        if (word === 'tomorrow') {
          targetDate = addDays(validRefDate, 1);
        } else if (word === 'yesterday') {
          targetDate = addDays(validRefDate, -1);
        }
        normalizedDate = targetDate.toISOString();
        isResolved = true;
        resolutionType = "relative";
        confidenceLabel = "likely";
      }
    }

    // 5. Relative Weekday (e.g. "by Friday", "next Monday")
    if (!originalPhrase) {
      match = msg.text.match(RELATIVE_WEEKDAY_REGEX);
      if (match) {
        originalPhrase = match[0];
        // If exact day offset cannot be guaranteed, mark as ambiguous
        resolutionType = "ambiguous";
        confidenceLabel = "needs_confirmation";
        isResolved = false;
        normalizedDate = null;
      }
    }

    // 6. Time only (e.g. "at 5 PM")
    if (!originalPhrase) {
      match = msg.text.match(TIME_REGEX);
      if (match) {
        originalPhrase = match[0];
        resolutionType = "ambiguous";
        confidenceLabel = "needs_confirmation";
        isResolved = false;
        normalizedDate = null;
      }
    }

    if (originalPhrase) {
      index++;
      const id = `dl_${conversationId}_${index}`;
      const isOverdue = isResolved && normalizedDate ? new Date(normalizedDate) < validRefDate : false;

      let explanation = `Extracted date phrase "${originalPhrase}" (${resolutionType}).`;
      if (isResolved && normalizedDate) {
        explanation += ` Resolved to ${format(parseISO(normalizedDate), 'yyyy-MM-dd')}.`;
      } else {
        explanation += ` Ambiguous reference requires confirmation.`;
      }

      deadlines.push({
        id,
        conversationId,
        originalDatePhrase: originalPhrase,
        normalizedDate,
        isResolved,
        isOverdue,
        associatedActionItemId: null,
        sourceMessageIds: [msg.id],
        resolutionType,
        explanation,
        confidenceLabel,
        createdAt: new Date().toISOString()
      });
    }
  }

  return deadlines;
}
