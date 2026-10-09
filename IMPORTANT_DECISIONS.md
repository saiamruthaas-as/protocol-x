# CatchUp AI — Architectural & Technical Decisions Log

> **Project:** CatchUp AI — Unread Conversation Intelligence  
> **Repository:** `d:\protocolx`  
> **Last Updated:** 2026-10-09  

This document logs all key architectural, technical, data model, testing, and safety decisions made during the planning and implementation of CatchUp AI.

---

## 1. Architectural & Privacy Decisions

| Decision | Context & Rationale | Status |
| :--- | :--- | :--- |
| **Local-First & Zero AI Cloud APIs** | Strictly execute all chat parsing, task extraction, date normalization, priority scoring, and change detection in the browser. Zero network requests for analysis. No external LLMs, Ollama, or llama.cpp. | **Enforced** |
| **Framework Choice: React + Vite + TypeScript** | Initialized directly in root directory `d:\protocolx` with modern TypeScript configuration. Ensures strong type safety across parser, storage repos, and UI components. | **Enforced** |
| **Separation of Computation and UI** | Core parser (`parseChat.ts`), analysis engine (`analyzeConversation.ts`), and IndexedDB storage layer (`db.ts`) are pure TypeScript modules completely decoupled from React hooks and UI components, making them 100% testable in CLI environment. | **Enforced** |

---

## 2. Parsing & Data Integrity Decisions

| Decision | Context & Rationale | Status |
| :--- | :--- | :--- |
| **Zero Content Loss & Unparsed Retention** | Malformed lines, system notifications, or unrecognized logs are never discarded. They are preserved as `Message` objects with `parseStatus: "unparsed"` and explicit line warnings. | **Enforced** |
| **Deterministic Message IDs & Fingerprints** | Message IDs use format `msg_<conversationId>_<order>`. Fingerprints use FNV-1a hash over `(conversationId, order, sender, timestamp, normalizedText)` for conservative deduplication. | **Enforced** |
| **Multi-Format Support** | Parser supports WhatsApp Standard (`DD/MM/YYYY, HH:mm - Sender:`), WhatsApp Brackets (`[MM/DD/YY, HH:mm:ss] Sender:`), ISO 8601 headers, time-only headers, and multi-line continuations. | **Enforced** |

---

## 3. Analysis Engine Decisions (Three Primary Categories)

| Category | Technical Implementation Decision |
| :--- | :--- |
| **Category A: Action Items** | Identifies tasks, commitments, and requests. Distinguishes direct assignments (`Alex, please do X`) from self-assignments (`I will do X`) and unassigned tasks (`someone needs to do X`). Tasks without owners set `assignee: null`. Detects task completion (`finished`, `done with`). |
| **Category B: Deadlines** | Parses explicit ISO/slash/text dates (`2026-10-20`, `15 October`) and relative expressions (`tomorrow`). Uses reference date for relative resolution. Flags ambiguous relative weekday dates (e.g. `by Friday`) as `isResolved: false`, `resolutionType: "ambiguous"`, `confidenceLabel: "needs_confirmation"`. Historical dates (e.g. `in 2020`) are explicitly ignored. |
| **Category C: Important Mentions** | Categories: `direct_mention`, `question`, `announcement`, `decision`, `changed_instruction`, `blocker`, `urgent_request`. Direct mentions require configured user identity (`userName` / `userAliases`). If user identity is unconfigured, direct mention scoring is disabled to avoid false identity claims. |

---

## 4. Priority Scoring & Uncertainty Handling

| Decision | Formula & Logic |
| :--- | :--- |
| **Deterministic Score Formula** | `priorityScore = 0.40 * urgency + 0.35 * personalRelevance + 0.25 * importance` (Range: 0–100). |
| **Score Bands** | `high` (>= 70), `medium` (40–69), `low` (< 40). Every score exports mathematical breakdown explanation and matched signals. |
| **Separation of Priority and Confidence** | High priority score does not imply high certainty. A high-priority item with ambiguous text is explicitly marked `confidenceLabel: "needs_confirmation"`. |

---

## 5. Cross-Linking & Evidence Validation

| Decision | Context & Rationale | Status |
| :--- | :--- | :--- |
| **Cross-Category Linking** | A single source message (e.g. *"Alex, please submit the report by 2026-10-20"*) creates linked records across Action Items, Deadlines, and Important Mentions, sharing `sourceMessageIds` and entity reference IDs (`deadlineId`, `relatedActionItemId`). | **Enforced** |
| **Evidence Validation** | `validateEvidence.ts` inspects all `sourceMessageIds` against the conversation message map, flagging any unverified or missing IDs. | **Enforced** |

---

## 6. Persistence & Duplicate Import Policy (PROMPT 4)

| Decision | Implementation Details | Status |
| :--- | :--- | :--- |
| **IndexedDB Multi-Store Architecture** | Uses `idb` library to manage 12 object stores: `conversations`, `messages`, `action_items`, `deadlines`, `important_mentions`, `decisions`, `questions`, `changes`, `findings`, `analysis_results`, `checkpoints`, `user_settings`. | **Enforced** |
| **Atomic Multi-Store Transactions** | Saving a conversation, its parsed messages, and all analysis findings executes inside a single atomic `readwrite` transaction. Prevents partial saves. | **Enforced** |
| **Duplicate Import Prevention** | Calculates conversation raw-text fingerprint (`createFingerprint(rawText)`). Re-importing identical chat content detects existing matching fingerprint, reuses original conversation ID, and replaces existing records instead of duplicating conversations or findings. | **Enforced** |
| **True Cascade Deletion** | Calling `deleteConversation(id)` performs multi-store key deletion, removing all associated messages, action items, deadlines, mentions, decisions, questions, changes, findings, analysis results, and review checkpoints. No orphaned records. | **Enforced** |

---

## 7. Production Dashboard UI & Information Architecture (PROMPT 5)

| Component / Feature | Implementation Strategy | Status |
| :--- | :--- | :--- |
| **Information Architecture** | Structured around the 3 primary categories: Action Items (`ActionItemsView.tsx`), Deadlines (`DeadlinesView.tsx`), and Important Mentions (`ImportantMentionsView.tsx`), supported by Overview Dashboard (`OverviewDashboard.tsx`), Conversation Explorer (`ConversationExplorer.tsx`), and Settings (`SettingsModal.tsx`). | **Enforced** |
| **Zero Hardcoded Data** | 100% of dashboard metrics, cards, task items, deadlines, and mentions are calculated dynamically from real stored IndexedDB analysis data. | **Enforced** |
| **Zero Inert Controls** | Every button, filter dropdown, task status toggle (`Mark Complete` / `Reopen`), search box, delete button, and modal trigger performs a functional action with state persistence. | **Enforced** |
| **Evidence Navigation** | Clicking "View Source" on any task, deadline, or mention sets `targetMessageId`, switches view to `ConversationExplorer.tsx`, and auto-scrolls to highlight the exact target message in context. | **Enforced** |
| **Inspectable "Why this result?" Modal** | `WhyThisResultModal.tsx` exposes priority score arithmetic ($0.40 \times \text{urgency} + 0.35 \times \text{relevance} + 0.25 \times \text{importance}$), matched rule signals, confidence label, uncertainty explanation, and source links. | **Enforced** |
| **Sophisticated CSS Design System** | `src/index.css` avoids AI template clichés; implements custom dark/light theme tokens, Plus Jakarta Sans & Outfit typography, glassmorphism overlays, and restrained micro-interactions. | **Enforced** |
