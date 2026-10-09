# CatchUp AI — Final Requirements & Antigravity Prompt Pack

**Purpose:** This is the implementation contract for building CatchUp AI from the existing repository. Read this file together with `README_CatchUp_AI_Antigravity.md`. If there is a conflict, follow the newer explicit constraints in this file and explain the conflict before changing code.

**Product promise:** Turn imported conversations into useful, evidence-linked, prioritized catch-up information while keeping processing and data local.

---

# 0. Non-negotiable decisions

1. **Stack:** React + Vite + TypeScript for UI and application logic.
2. **No Ollama or llama.cpp.**
3. **No hosted LLM or external AI API in this version.**
4. **No cloud database, analytics, telemetry, or remote logging.**
5. **No fake or hardcoded product results.** Every displayed finding must be produced from imported data by actual implemented logic. Sample data is allowed only in an explicit, clearly labeled Demo mode.
6. **No inert controls.** Every button, filter, tab, link, and form must perform its advertised action. If a feature is not implemented, do not display a misleading working-looking control.
7. **Local-first:** message processing runs in the browser; persistent application data uses IndexedDB.
8. **Honest capabilities:** the MVP uses deterministic rules and lightweight text processing, not LLM-level semantic understanding. Label the summary as a rule-based digest.
9. **Evidence and uncertainty:** important findings must link to real source messages and expose why they were detected and what is uncertain.
10. **Incremental implementation:** inspect the repository first, preserve existing work, implement in phases, run tests, and report actual results. Never claim success without verification.

## Important technical boundary

The application must genuinely work with user-imported text, but rule-based analysis cannot reliably understand all indirect assignments, sarcasm, nuanced meaning, or conversational implications. Do not disguise this limitation. When confidence is low, mark a finding `needs_confirmation` rather than inventing certainty.

---

# 1. Product requirements

## 1.1 User problem

When someone returns to a busy group conversation, they need to know:
- What happened?
- What needs my attention?
- What tasks and deadlines were mentioned?
- What decisions were made?
- What changed since I last checked?
- What evidence supports each result?

## 1.2 Target workflow

1. User pastes conversation text or uploads a supported `.txt` export.
2. App previews parsed messages and warns about unrecognized lines.
3. User optionally configures their display name and aliases locally.
4. Browser-side code analyzes actual imported messages.
5. App extracts candidate tasks, explicit dates, decisions, questions, and possible changes.
6. Each finding is checked for valid source-message references.
7. Priority scoring runs using explicit, inspectable rules.
8. Current findings are compared with saved state and review checkpoints.
9. Dashboard displays findings, evidence, explanations, and uncertainty.
10. User confirms, edits, completes, or dismisses items.
11. User explicitly marks the conversation reviewed.
12. Data remains in browser-local IndexedDB until the user deletes it.

---

# 2. Functional requirements

## FR-01 — Import and parse conversations

- Accept pasted text and `.txt` file uploads.
- Allow a conversation name.
- Show an import preview before analysis.
- Parse supported timestamps and sender formats where possible.
- Preserve original message text and source order.
- Preserve lines that cannot be parsed and show warnings.
- Do not silently drop content.
- Provide helpful errors for empty or unsupported files.

**Acceptance:** An imported file with a mix of valid and malformed lines shows parsed messages plus explicit warnings. Original text remains accessible.

## FR-02 — Generate a rule-based conversation digest

- Build a concise digest from the actual imported conversation.
- Use text frequency/topic signals and extracted findings.
- Include supported tasks and decisions where appropriate.
- Avoid making claims unsupported by the source messages.
- Label the output `Rule-based conversation digest`.
- If there is not enough evidence for a useful digest, say so instead of generating a canned paragraph.

**Acceptance:** Different input conversations produce meaningfully different digests. No fixed sample summary is shown for real imports.

## FR-03 — Extract candidate tasks

Each task should include:
- Task title/description.
- Assignee, or `unknown`.
- Deadline, or `null`.
- Status.
- Confidence/review label.
- Source message IDs.
- Reasons for extraction.
- Created and updated timestamps.

Rules:
- Explicit assignment is stronger evidence than a general suggestion.
- “Someone should do X” must not assign the task to the current user.
- “Could we do X?” may be a suggestion, not a confirmed assignment.
- Do not invent missing assignees or deadlines.
- Let the user confirm or correct uncertain results.

## FR-04 — Detect deadlines

- Detect supported explicit date/time patterns.
- Normalize dates only when interpretation is reliable.
- Use a documented reference date and local timezone for relative date parsing.
- Preserve the original date phrase.
- Mark ambiguous dates for confirmation.
- Never invent a deadline when no date is present.

## FR-05 — Smart Attention Radar

Use a configurable, transparent starting score:

`priorityScore = 0.40 * urgency + 0.35 * personalRelevance + 0.25 * importance`

Each input is in the range 0–100. These weights are starting assumptions, not scientifically proven values.

Suggested labels:
- 70–100: High
- 40–69: Medium
- 0–39: Low

Required behavior:
- Explain each component of the score.
- Show matched signals and source evidence.
- Do not give high priority solely because the word “urgent” appears.
- Handle negation, hypothetical language, and obvious irrelevant uses conservatively.
- If the user's identity is not configured, do not pretend to know personal relevance.
- Confidence is separate from priority: a high-priority item can still need confirmation.

## FR-06 — Evidence-linked intelligence

- Every important finding must include one or more valid source message IDs.
- A `View source` action must navigate to the actual message(s).
- Highlight relevant source text where practical.
- Distinguish direct statements from inferred findings.
- Validate IDs before displaying an item as evidence-linked.
- Never fabricate a source reference.
- If evidence is missing, label the result unverified or omit it from verified findings.

## FR-07 — Decision extraction

- Detect candidate decisions using explicit phrases and simple patterns.
- Keep proposals separate from confirmed decisions.
- Preserve the messages supporting a decision.
- Avoid merging two unrelated events merely because they contain similar dates or words.
- Show uncertainty where the text does not establish a final decision.

## FR-08 — Decision and change detector

Start with explicit change phrases such as:
- “moved from … to …”
- “changed to …”
- “instead”
- “correction”
- “final decision”
- “new time”
- “cancelled”
- “no longer”
- “ignore my previous message”

Each change must store:
- Subject.
- Attribute.
- Previous value.
- New or proposed value.
- Change state.
- Explanation.
- Source message IDs.

Change states:
- `confirmed_update`
- `possible_update`
- `contradiction`
- `cancelled`

Do not automatically assume the latest message wins. A suggestion is not a confirmed change. Preserve both values and their sources.

## FR-09 — Personal Responsibility Tracker

- Allow user to configure their name and aliases locally.
- Track task, assignee, deadline, status, evidence, and uncertainty.
- Support `pending`, `completed`, `dismissed`, and `needs_confirmation`.
- Allow edit, confirm, complete, reopen, and dismiss actions.
- Persist changes to IndexedDB.
- Never infer that the current user owns every unassigned task.

## FR-10 — What Changed Since I Last Checked?

- Save review checkpoints per conversation.
- Compare newly imported messages and findings against previous state.
- Detect new tasks and changed task/decision fields.
- Deduplicate repeated imports conservatively.
- Do not deduplicate solely by message text.
- Do not automatically mark a conversation reviewed when analysis finishes.
- Advance the checkpoint only when the user chooses `Mark as reviewed`.
- If import matching is ambiguous, warn the user instead of silently dropping messages.

## FR-11 — Local persistence and deletion

Use IndexedDB for:
- Conversations.
- Messages.
- Findings.
- Tasks.
- Decisions and changes.
- Review checkpoints.
- User settings.

Requirements:
- Handle failed writes and quota errors.
- Allow deleting a conversation and its related records.
- Provide `Clear all local data` with confirmation.
- Do not claim browser storage is encrypted.
- Explain that browser data may be lost if site data is cleared.

## FR-12 — Dynamic user interface

Required screens:
1. Import / welcome.
2. Import preview and parsing warnings.
3. Analysis status.
4. Catch-up dashboard.
5. Original conversation viewer.
6. Task management.
7. Privacy/settings.

Dashboard should include:
- Rule-based digest.
- High-priority findings and reasons.
- Tasks and deadlines.
- Decisions and possible changes.
- Unresolved questions if detected.
- Changes since last review.
- Source navigation.
- Empty, loading, success, and error states.

No hardcoded findings, counts, deadlines, or summary cards in real conversation mode. All values must derive from stored and analyzed data.

## FR-13 — Explainability

Every important finding must expose a `Why this result?` panel with:
1. Actual matched signals/rules.
2. Score components and arithmetic, if priority-scored.
3. Source messages.
4. Confidence/review status.
5. Known limitation or ambiguity.
6. User correction actions.

Do not display fictional chain-of-thought. Provide concise explanations grounded in implemented rules and evidence.

## FR-14 — Privacy

- No external AI calls.
- No network transmission of conversation text.
- No analytics or telemetry.
- No logging of message content to the console.
- No message text in URLs.
- Do not add cloud sync.
- Audit dependencies and network requests.
- Clearly describe the browser-local privacy boundary.

---

# 3. Non-functional requirements

- **Correctness:** no invented task owners, deadlines, source IDs, or final decisions.
- **Explainability:** every important classification has inspectable reasons.
- **Privacy:** imported content remains in the browser.
- **Reliability:** malformed input and storage errors do not silently corrupt data.
- **Performance:** large conversations are processed in chunks or yield control so the interface remains responsive; do not silently truncate input.
- **Accessibility:** keyboard navigation, visible focus, accessible labels, and color-independent status cues.
- **Maintainability:** separate parsing, extraction, scoring, evidence validation, change detection, persistence, and UI.
- **Testability:** core analysis logic can be unit-tested without rendering React.
- **Responsive design:** usable on desktop and smaller screens.
- **Honest reporting:** do not claim tests passed, privacy verified, or a feature complete unless checked.

---

# 4. Recommended architecture

```text
React + Vite + TypeScript
  ├── Import / preview UI
  ├── Catch-up dashboard
  ├── Task controls
  ├── Source message viewer
  └── Privacy settings
           |
           v
Browser-side application services
  ├── Chat parser
  ├── Rule-based digest
  ├── Task and date extraction
  ├── Decision/question extraction
  ├── Evidence validator
  ├── Priority scoring
  ├── Change detector
  └── AnalysisProvider interface
           |
           +----------------------+
           |                      |
           v                      v
  Browser computation        IndexedDB
                             Conversations
                             Messages
                             Findings
                             Tasks
                             Checkpoints
```

No backend is required for this MVP.

Suggested project structure; adapt to the existing repository rather than blindly replacing it:

```text
src/
  app/
  components/
    ImportPanel.tsx
    ConversationDigest.tsx
    PriorityList.tsx
    TaskList.tsx
    DecisionList.tsx
    ChangeList.tsx
    SourceMessageViewer.tsx
    PrivacySettings.tsx
  features/
    import/
      parseChat.ts
      parseChat.test.ts
    analysis/
      AnalysisProvider.ts
      ruleBasedProvider.ts
      extractTasks.ts
      extractDates.ts
      extractDecisions.ts
      detectChanges.ts
      scorePriority.ts
      validateEvidence.ts
    storage/
      db.ts
      conversationsRepo.ts
      tasksRepo.ts
      checkpointsRepo.ts
  types/
  test/
    fixtures/
  styles/
```

If the repository uses JavaScript/JSX already, inspect it first and explain whether a gradual TypeScript migration is worthwhile. Do not rewrite working code just to match this example.

---

# 5. Core data contracts

Adapt names if necessary, but preserve the fields and invariants.

```ts
type Message = {
  id: string;
  conversationId: string;
  order: number;
  timestamp: string | null;
  sender: string | null;
  text: string;
  fingerprint: string;
  parseStatus: "parsed" | "partial" | "unparsed";
};

type ConfidenceLabel = "detected" | "likely" | "needs_confirmation";

type Finding = {
  id: string;
  conversationId: string;
  type: "task" | "deadline" | "decision" | "change" | "question";
  title: string;
  description: string;
  priorityScore: number;
  priorityLabel: "high" | "medium" | "low";
  confidenceLabel: ConfidenceLabel;
  reasons: string[];
  sourceMessageIds: string[];
  createdAt: string;
  updatedAt: string;
};

type Task = {
  id: string;
  conversationId: string;
  title: string;
  assignee: string | null;
  deadline: string | null;
  status: "pending" | "completed" | "dismissed" | "needs_confirmation";
  sourceMessageIds: string[];
  confidenceLabel: ConfidenceLabel;
  createdAt: string;
  updatedAt: string;
};

type Change = {
  id: string;
  conversationId: string;
  subject: string;
  attribute: string;
  previousValue: string | null;
  proposedValue: string | null;
  state: "confirmed_update" | "possible_update" | "contradiction" | "cancelled";
  sourceMessageIds: string[];
  explanation: string;
  createdAt: string;
};

type ReviewCheckpoint = {
  conversationId: string;
  lastReviewedMessageId: string | null;
  lastReviewedAt: string | null;
  reviewedFindingIds: string[];
};
```

Use runtime validation at data boundaries. Ensure all `sourceMessageIds` resolve to messages in the same conversation. Keep date fields nullable and uncertainty explicit.

---

# 6. Testing requirements

Build fixtures with:
- Explicit deadline.
- Direct assignment to configured user.
- Task with unknown assignee.
- No-deadline task.
- Suggested versus confirmed meeting change.
- Contradictory statements.
- Irrelevant message containing “urgent.”
- Ambiguous relative date.
- Two identical-looking legitimate messages.
- Unknown sender.
- Malformed line.
- Repeated import.
- Missing source reference.
- Empty file.
- Storage failure simulation where feasible.

Test:
- Parser correctness and preservation of raw text.
- Task/date extraction.
- No invented metadata.
- Priority score determinism and explanations.
- Valid source references.
- Proposal versus confirmation.
- Change detection and duplicate handling.
- Task state persistence.
- Manual review checkpoint behavior.
- Clear-data behavior.
- Absence of external transmission of message content.

Run existing lint, type-check, and test scripts. Report the actual commands and results. Do not make up passing results.

---

# 7. Antigravity prompt sequence

Run these prompts in order. Do not paste all of them as one giant instruction. Review the output after each phase.

## PROMPT 1 — Repository inspection and plan

> Act as a senior engineer. Read `README_CatchUp_AI_Antigravity.md` and `CATCHUP_AI_REQUIREMENTS_AND_PROMPTS.md` completely before making changes. Inspect the existing repository, framework, scripts, dependencies, UI, and current functionality. Do not edit files yet. Report:
> 1. Current architecture and key files.
> 2. What already works and what is missing.
> 3. Whether the repository uses JavaScript or TypeScript and the safest approach.
> 4. A phased file-level plan.
> 5. Dependencies that are actually needed.
> 6. Risks or conflicts with these requirements.
>
> Constraints: no Ollama, no llama.cpp, no hosted LLM, no cloud database, no telemetry, no hardcoded production results. React + Vite + TypeScript is the target where practical, but do not destroy existing work. Stop after the plan and wait for review.

## PROMPT 2 — Implement import and parser

> Implement the import and parsing phase only. Support pasted text and `.txt` uploads. Show a preview, preserve raw text and message order, parse supported timestamps and senders, and visibly report unparsed lines. Create deterministic message IDs and conservative fingerprints suitable for local deduplication. Never silently discard malformed lines. Add parser unit tests and fixtures. Keep parser logic outside React components. Do not create fake analysis results. Run the relevant tests and report actual outcomes.

## PROMPT 3 — Implement analysis engine

> Implement a browser-side, deterministic analysis engine with no model server and no external API. Build separate modules for rule-based digest, task extraction, explicit date extraction, candidate decision/question extraction, priority scoring, evidence validation, and change detection. Each finding must contain source IDs and actual rule-based explanations. Treat uncertain assignments, deadlines, proposals, and conflicting decisions conservatively. Never invent missing values. Implement the data contracts and unit tests in the requirements file. Do not build the full dashboard until the engine tests are in place. Report actual test results and known limitations.

## PROMPT 4 — Implement IndexedDB persistence

> Implement IndexedDB persistence for conversations, messages, findings, tasks, decisions/changes, user settings, and review checkpoints. Use repositories or a clearly separated data-access layer. Add safe migrations/versioning where needed, error handling for unavailable/full storage, deletion of one conversation, and a confirmed clear-all-data action. Repeated imports must not silently duplicate messages or tasks. Do not deduplicate only by text. Do not advance the review checkpoint automatically after analysis. Add persistence tests and report what was actually verified.

## PROMPT 5 — Build the real dashboard

> Build the React dashboard using actual parsed, analyzed, and persisted data. Include import preview, rule-based digest, priority radar, task tracker, decisions, possible changes, unresolved questions, source viewer, and “What changed since last review?” Each result must link to its real source message and have a “Why this result?” panel with matched rules, actual score calculation where applicable, confidence state, and uncertainty. Every button, filter, tab, and form must work. No hardcoded cards, fake counters, fixed sample results, or decorative inert controls in normal mode. Demo fixtures may be available only through a clearly labeled Demo mode. Add responsive and accessible states, including empty, loading, error, and storage-failure states.

## PROMPT 6 — Complete interaction audit

> Inspect every visible interactive element. For each button, link, form, filter, tab, and task control, identify its actual handler and expected result. Fix any inert, decorative, placeholder, or misleading controls. Verify that task edits persist, source links open the right message, filters affect displayed data, review checkpoints update only after user confirmation, and deleting data removes related records. Return a checklist of controls and the result of testing each one. Do not claim an interaction works without testing it.

## PROMPT 7 — Privacy and correctness audit

> Audit the whole repository against the requirements. Search for external network requests, remote AI APIs, analytics, telemetry, conversation text in console logs, message text in URLs, hardcoded production findings, fabricated progress indicators, fake metrics, invalid source IDs, invented deadlines/assignees, and unsupported privacy claims. Verify all analysis stays in the browser and conversation content is not transmitted externally. Test local persistence and clear-data behavior. Run available lint, type-check, and test commands. Fix issues introduced by the app and report verified behavior separately from anything not tested.

## PROMPT 8 — Demo and evaluation readiness

> Create a deterministic demo mode using a realistic fixture conversation with 100–200 messages. Include an explicit deadline, a direct assignment, an unknown assignee, a confirmed time change, an ambiguous proposal, contradictory information, and irrelevant messages with urgency keywords. Demo mode must be clearly labeled and must not contaminate normal user data. Use the real parser and analysis pipeline on the fixture; do not hardcode the expected output into dashboard cards. Add an evaluation report for actual extraction results, false positives, missed cases, valid source references, and runtime. Do not invent accuracy claims. Explain limitations and how to reproduce the demo.

## PROMPT 9 — Final readiness review

> Compare the implemented repository against every functional requirement, non-functional requirement, and definition of done in the requirements files. Produce a requirement-by-requirement status of `Verified`, `Partially implemented`, `Not implemented`, or `Not tested`, with file references and test evidence. Run all available checks and fix feasible issues. Identify remaining defects honestly. Do not add last-minute features that risk breaking working functionality. Recommend only the changes necessary for a reliable hackathon demo.

---

# 8. Definition of done

The MVP is not complete until:
- [ ] Actual user text can be imported or pasted.
- [ ] Parsing issues are visible and raw text is preserved.
- [ ] Different conversations generate results from their own content.
- [ ] Digest is labeled rule-based.
- [ ] Tasks and deadlines are extracted without invented metadata.
- [ ] Important findings link to valid original messages.
- [ ] Priority labels show their reasons and score components.
- [ ] Proposed changes are distinguished from confirmed updates.
- [ ] New findings and changed items are compared with the previous review.
- [ ] Review checkpoints update only when the user chooses to mark reviewed.
- [ ] Task edits persist across reloads.
- [ ] Re-importing does not silently duplicate all data.
- [ ] All visible controls perform their advertised actions.
- [ ] Clear-data controls work and handle errors.
- [ ] No conversation content is sent to external services.
- [ ] Tests and repository checks have real, reported outcomes.
- [ ] Known limitations are documented.

---

# 9. Final engineering principle

Optimize for trustworthy results, not the number of features.

A correct result with a source link and an honest “needs confirmation” label is better than a confident invented answer. The product must be genuinely functional, locally processed, evidence-linked, and transparent about the limits of rule-based text understanding.
