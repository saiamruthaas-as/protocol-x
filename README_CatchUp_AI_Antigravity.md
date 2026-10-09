# CatchUp AI --- The Unread Problem

> **Know what you missed. Know what matters. Know what to do next.**

CatchUp AI is a privacy-first micro-app that helps people catch up on
long, unread group conversations. It turns imported chat text into a
prioritized, evidence-linked view of summaries, decisions, tasks,
deadlines, changed plans, and unresolved questions.

This README is the product specification and implementation guide for
**Antigravity**. Follow it as the source of truth. Build the application
in small, testable phases and explain important implementation decisions
as you go.

------------------------------------------------------------------------

## 1. Product goal

People often return to a busy group chat and find hundreds of unread
messages. A normal summary may tell them what people discussed but fail
to answer the practical questions:

-   What is important to me?
-   Was I assigned a task?
-   What is the deadline?
-   Did a decision or meeting time change?
-   What still needs an answer?
-   Why is the app claiming this is important?

CatchUp AI must turn the conversation into **verifiable, actionable
catch-up information**, not just a paragraph summary.

### Product promise

After importing a conversation, the user should be able to quickly see:

1.  A concise conversation overview.
2.  High-priority items and the reasons they were prioritized.
3.  Tasks, assignees, deadlines, and task status.
4.  Decisions and possible changes to earlier decisions.
5.  Unresolved questions.
6.  The original messages supporting every important finding.
7.  What changed since the last review of the same conversation.

### Non-goals for the first version

Do **not** build these unless the core experience is working:

-   Direct WhatsApp/Telegram/Slack account integration.
-   Sending messages on the user's behalf.
-   A cloud database or user account system.
-   Multi-user collaboration.
-   A hosted LLM integration that uploads private conversation text.
-   A claim that rule-based processing understands every conversational
    nuance.

The MVP uses imported text files or pasted text. This is simpler to
implement, demo, and test.

------------------------------------------------------------------------

## 2. Critical implementation constraint: no Ollama

Do not install or depend on Ollama, llama.cpp, or a separate local model
server for this version.

Use a **browser-first, local-processing MVP** built with:

-   React + Vite for the interface.
-   TypeScript if the existing project supports it; otherwise use the
    project's current JavaScript convention consistently.
-   Browser-side parsing and deterministic extraction rules.
-   `date-fns` or native date utilities for date handling, if already
    installed or easy to add.
-   IndexedDB for persistent local data.
-   Vitest for unit tests if the project supports it.
-   No backend required for the first version.

### Important honesty about AI

Without a language model, the MVP uses rule-based extraction and
lightweight NLP patterns. This is useful for a fast, deterministic
prototype, but it cannot reliably infer all implied meanings, sarcasm,
indirect assignments, or nuanced decisions.

Do not label the app as having LLM-level semantic understanding. Use
transparent labels such as:

-   **Detected** --- a rule or pattern matched.
-   **Likely** --- evidence supports the finding, but it is not certain.
-   **Needs confirmation** --- the message is ambiguous.
-   **Not detected** --- no matching evidence was found; this does not
    prove nothing exists.

Keep the processing behind a replaceable `AnalysisProvider` interface so
a local model could be added later without rewriting the UI. Do not
implement a cloud provider in this MVP.

### Privacy requirements

For the MVP:

-   Do not send conversation content to any server or external API.
-   Do not add analytics, telemetry, remote logging, or third-party AI
    APIs.
-   Keep messages, summaries, tasks, decisions, and review checkpoints
    in browser-local storage (IndexedDB).
-   Do not put imported message text into URLs, query strings, console
    logs, or error reports.
-   Provide a **Clear all local data** control with confirmation.
-   Clearly explain that browser storage is local to that browser
    profile and may be lost if site data is cleared.
-   Do not claim that browser storage is encrypted or that the data is
    protected against someone who can access the same browser profile.
-   Avoid a service worker or cloud sync unless there is a specific,
    justified need.

A local-first implementation is not automatically secure in every threat
model. Explain the actual privacy boundary in the UI and README.

------------------------------------------------------------------------

## 3. Feature specification

### Feature A --- Conversation import and parsing

**Purpose:** Turn raw exported chat text into a structured list of
messages.

Support: - Paste text into a text area. - Upload a `.txt` file. - Show a
preview before analysis. - Let the user name the conversation. - Show
the number of parsed messages and any lines that could not be parsed. -
Preserve original message text. - Give each message a stable local ID
and retain its source order. - Handle common timestamp/sender formats
where practical. - Keep unrecognized lines rather than silently
discarding them.

**Fallback:** If timestamps or sender names cannot be parsed, preserve
the line as message text and mark metadata as unknown. Do not invent
sender or time information.

**Acceptance criteria:** - The user can import or paste a sample
conversation. - The app shows a preview and parse warnings. - Original
message text is retained. - The app never silently claims that every
line parsed successfully.

### Feature B --- Summary

**Purpose:** Give a short overview of the conversation.

Because the MVP has no LLM, generate a **rule-based digest**: - Detect
recurring terms or topics using simple text-frequency methods. - Include
extracted decisions and action items in the digest when available. - Use
neutral language and avoid making unsupported claims. - If the rules
cannot create a useful summary, show: "A reliable summary could not be
generated from these patterns. Review the extracted items and original
messages."

Do not pretend a list of keywords is a human-quality semantic summary.
In the UI call this **Conversation digest (rule-based)**.

**Future extension:** A local or explicitly consented AI provider can
implement the same interface later. Never silently switch to remote
inference.

### Feature C --- Smart Attention Radar

**Purpose:** Rank extracted findings by attention priority.

Use a transparent, deterministic score rather than unexplained AI
labels.

Suggested initial score (each input is 0--100):

`priorityScore = 0.40 * urgency + 0.35 * personalRelevance + 0.25 * importance`

These weights are starting assumptions, not scientifically validated
constants. Keep them in one configuration module and test them against
sample cases.

Possible signals: - **Urgency:** explicit deadline, deadline proximity,
time-sensitive wording. - **Personal relevance:** direct mention of the
configured user name, explicit assignment, or clear reference to the
user's role. - **Importance:** confirmed decision, blocking task,
deadline, or unresolved question that blocks progress.

Rules: - Never assign a high score solely because a message contains the
word "urgent." - A joke, forwarded message, hypothetical, or negated
statement should not automatically become urgent. - If a deadline is not
stated, do not invent one. - Unknown user identity means personal
relevance must be marked unknown or scored conservatively. - Show the
reasons behind each priority label. - Priority must be applied primarily
to extracted findings, not indiscriminately to every message.

Suggested display bands (make configurable and test them): - `70–100`:
High - `40–69`: Medium - `0–39`: Low

Also support **Needs confirmation** as a separate confidence/review
state. A high priority score does not mean the extraction is certainly
correct.

### Feature D --- Personal Responsibility Tracker

**Purpose:** Extract tasks and show whether the user appears to be
responsible.

For each action item, store: - Task description. - Assignee (known name
or `unknown`). - Deadline (`null` if not explicitly supported). -
Status: `pending`, `completed`, `dismissed`, or `needs_confirmation`. -
Confidence/review state. - Supporting message IDs. - First-seen
timestamp and last-updated timestamp.

Detection examples: - "I will finish the API today." → possible
self-assignment to the speaker. - "Amrutha, can you finish the API
today?" → explicit assignment if the configured identity matches. -
"Someone should finish the API." → task detected, assignee unknown. -
"Could we finish the API today?" → possible proposal/request, not
automatically an assigned task.

Do not assume the current user is the assignee simply because a task
exists. Let users configure their name/aliases locally and confirm
ambiguous assignments.

**Drawback handling:** - If the assignee is unclear, show "Assignee
unknown." - If no deadline is stated, show "No deadline specified." - If
the text is a suggestion rather than a commitment, show "Needs
confirmation." - Users can edit, complete, dismiss, or confirm a task.

### Feature E --- Evidence-linked intelligence

**Purpose:** Make every important result verifiable.

Every extracted task, deadline, decision, or change must contain one or
more `sourceMessageIds`.

The UI must: - Show a "View source" action. - Open the exact original
message(s). - Highlight the relevant message text where practical. -
Distinguish "Directly stated" from "Inferred / needs confirmation."

Rules: - A source link shows where a claim came from; it does not prove
the claim is true. - Never create a source ID that does not exist in the
imported message list. - If no supporting message can be linked, do not
present the finding as verified. - If multiple messages support a
decision, retain all relevant source IDs.

### Feature F --- Decision and change detector

**Purpose:** Detect possible changes to earlier plans, dates, and
decisions.

Start with explicit update phrases, such as: - "moved from ... to ..." -
"changed to ..." - "instead" - "correction" - "final decision" - "the
new time is ..." - "cancelled" - "no longer" - "ignore my previous
message"

Compare extracted items only when they appear to refer to the same
subject and attribute. Do not assume that every later message overrides
an earlier one.

Represent the result as: - Earlier value. - New proposed/current
value. - Change state: `confirmed_update`, `possible_update`,
`contradiction`, or `cancelled`. - Supporting source message IDs. -
Explanation of why it was detected.

**Drawback handling:** - "Maybe move the meeting to 4 PM" is a proposal,
not a confirmed change. - Two meetings at different times may be
different events; do not merge them without evidence. - A later message
is not automatically authoritative. - Relative dates can be ambiguous;
ask for confirmation or mark them uncertain. - Preserve old and new
values instead of deleting history.

For the MVP, prioritize explicit changes and label uncertain comparisons
"Possible change --- review."

### Feature G --- "What Changed Since I Last Checked?"

**Purpose:** Compare new imported messages and findings against the last
review checkpoint.

Store: - Conversation ID. - Stable message IDs or a local fingerprint. -
Last reviewed message ID/index or checkpoint timestamp. - Previous task
and decision states. - Newly detected items and changed fields.

On a new import: 1. Identify messages not seen previously. 2.
Deduplicate repeated messages where safe. 3. Analyze the new messages
and enough relevant prior context to detect updates. 4. Compare findings
with the saved state. 5. Show new tasks, changed deadlines, changed
decisions, and unresolved items. 6. Update the checkpoint only when the
user chooses **Mark as reviewed**.

Do not automatically mark everything reviewed immediately after
analysis; that could cause the user to lose the "what changed" view.

**Drawback handling:** - Exported chat files may not have stable
platform message IDs. Use a deterministic fingerprint based on
conversation ID, normalized timestamp, sender, text, and occurrence
index where necessary. - Two identical messages can be legitimate
separate messages. Do not deduplicate on text alone. - If the import
format changes or matching is ambiguous, show a possible duplicate
warning rather than silently dropping content. - If older messages are
edited in the source platform, a plain-text export may not reveal that
edit.

### Feature H --- Local task controls and data management

Provide: - Mark task complete. - Reopen task. - Dismiss false
positives. - Confirm or edit assignee/deadline. - Mark conversation
reviewed. - Delete one conversation. - Clear all local data with
confirmation. - Explain how to export a backup only if a safe export
feature is implemented.

------------------------------------------------------------------------

## 4. User experience and interface

Use a modern, polished dashboard. Avoid a plain unstyled form.

### Main screens

1.  **Welcome / Import**
    -   Product explanation.
    -   Paste text and upload `.txt`.
    -   Privacy statement.
    -   Sample conversation button for a quick demo.
2.  **Analysis progress**
    -   Show stages: parsing, extracting patterns, ranking findings,
        saving locally.
    -   Since the MVP is rule-based, do not display fake "AI thinking"
        or fake model progress.
    -   Show meaningful status messages only.
3.  **Catch-up dashboard**
    -   Conversation digest.
    -   High-priority items with reasons.
    -   Tasks and deadlines.
    -   Decisions and possible changes.
    -   Unresolved questions.
    -   "What changed since last review?"
    -   Source links.
4.  **Conversation viewer**
    -   Original messages in chronological order.
    -   Search/filter.
    -   Jump to source message from a finding.
5.  **Settings / Privacy**
    -   User display name and aliases, stored locally.
    -   Local data explanation.
    -   Clear all data action.

### Visual guidance

-   Modern card-based layout, rounded corners, clear visual hierarchy.
-   Use color sparingly and consistently: red/orange for urgency, blue
    for information, green for confirmed completion, neutral for
    uncertainty.
-   Do not rely on color alone; add labels and icons.
-   Accessible contrast, keyboard focus states, responsive design.
-   Provide empty, loading, success, and error states.
-   Avoid decorative charts that do not help the user make a decision.

------------------------------------------------------------------------

## 5. System workflow

The core flow is:

1.  User pastes text or uploads a `.txt` export.
2.  Parser converts lines into structured messages.
3.  Parser reports unrecognized lines and preserves raw text.
4.  Local extraction rules detect tasks, deadlines, mentions, candidate
    decisions, and explicit change phrases.
5.  Date parsing normalizes supported explicit dates using a known
    reference date and timezone; ambiguous dates are flagged.
6.  Validation checks every source message ID and rejects unsupported
    references.
7.  Priority engine scores each finding and records the reasons for the
    score.
8.  Change detector compares current findings with prior saved state.
9.  UI presents the digest, ranked findings, tasks, changes, and source
    messages.
10. User confirms or corrects ambiguous items.
11. User selects "Mark as reviewed" to update the checkpoint.
12. All data remains in IndexedDB.

### Logical architecture

``` text
React + Vite UI
  ├── Import and preview
  ├── Catch-up dashboard
  ├── Source message viewer
  ├── Task controls
  └── Privacy/settings
          |
          v
Browser-side application services
  ├── Chat parser
  ├── Rule-based extraction
  ├── Date normalization
  ├── Source/provenance validator
  ├── Priority scoring engine
  ├── Change detector
  └── AnalysisProvider interface
          |
          +--------------------+
          |                    |
          v                    v
  Browser computation     IndexedDB
  (no remote inference)   (messages, findings,
                           tasks, checkpoints)
```

### Suggested project structure

Adapt this structure to the existing repository rather than deleting or
replacing existing work blindly.

``` text
src/
  app/
    App.tsx
    routes.tsx
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
    conversation.ts
    message.ts
    finding.ts
    task.ts
  test/
    fixtures/
      sample-chat.txt
    integration/
  styles/
```

If the repository uses `.jsx`/`.js`, follow that convention instead of
introducing TypeScript everywhere. Keep business logic separate from
React components.

------------------------------------------------------------------------

## 6. Data model

Use typed, validated data structures. A suggested starting point:

### Message

``` ts
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
```

### Finding

``` ts
type Finding = {
  id: string;
  conversationId: string;
  type: "task" | "deadline" | "decision" | "change" | "question";
  title: string;
  description: string;
  priorityScore: number;
  priorityLabel: "high" | "medium" | "low";
  confidenceLabel: "detected" | "likely" | "needs_confirmation";
  reasons: string[];
  sourceMessageIds: string[];
  createdAt: string;
  updatedAt: string;
};
```

### Task

``` ts
type Task = {
  id: string;
  conversationId: string;
  title: string;
  assignee: string | null;
  deadline: string | null;
  status: "pending" | "completed" | "dismissed" | "needs_confirmation";
  sourceMessageIds: string[];
  confidenceLabel: "detected" | "likely" | "needs_confirmation";
  createdAt: string;
  updatedAt: string;
};
```

### Change

``` ts
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
```

### Review checkpoint

``` ts
type ReviewCheckpoint = {
  conversationId: string;
  lastReviewedMessageId: string | null;
  lastReviewedAt: string | null;
  reviewedFindingIds: string[];
};
```

Adjust schemas as implementation requires, but preserve the principles:
explicit uncertainty, source evidence, no invented metadata, and
versioned changes rather than destructive overwrites.

------------------------------------------------------------------------

## 7. Explainability: every important decision must be inspectable

The user asked the app to explain **why it made each decision**. This is
a product requirement.

Every priority label should have reasons such as: - "High priority
because an explicit deadline is within 24 hours." - "Personal relevance
increased because your configured name was directly mentioned." - "Task
detected because the message contains an explicit request and an action
verb." - "Assignee unknown because no person was explicitly assigned." -
"Possible change because a later message gives a different time but does
not clearly confirm the change." - "Deadline not set because the message
does not contain a supported date."

Implement decision records, not just labels. A useful interface is a
**Why this result?** expandable panel containing: 1. The detected
signals. 2. The rule that matched. 3. The score calculation, where
applicable. 4. The supporting source messages. 5. The uncertainty or
limitation. 6. The action the user can take to correct it.

Do not reveal fictional chain-of-thought or claim the system has a
human-like internal reasoning process. Show concise, verifiable reasons
based on actual rules, input fields, and evidence.

### Example priority calculation

Suppose a finding has: - Urgency = 90 - Personal relevance = 80 -
Importance = 70

Then:

`0.40 × 90 + 0.35 × 80 + 0.25 × 70 = 82.5`

Display: - Priority: High - Score: 82.5/100 - Reasons: deadline is near;
user is directly mentioned; item is an action task.

These weights are illustrative and must be kept consistent with the
actual implementation.

------------------------------------------------------------------------

## 8. Handling common failure cases

  -----------------------------------------------------------------------
  Failure case                        Required behavior
  ----------------------------------- -----------------------------------
  Unknown sender                      Preserve the message and mark
                                      sender unknown.

  No explicit deadline                Store `null`; show "No deadline
                                      specified."

  Ambiguous assignee                  Mark "Assignee unknown" and offer
                                      confirmation.

  Suggestion mistaken for decision    Mark "Possible" or "Needs
                                      confirmation."

  Sarcasm or keyword false positive   Avoid relying on one keyword; show
                                      the matched rule and allow
                                      dismissal.

  Conflicting meeting times           Preserve both values and source
                                      messages; do not automatically
                                      choose the latest unless an update
                                      is explicit.

  Missing source message              Reject or flag the finding as
                                      unverified.

  Duplicate import                    Match fingerprints conservatively
                                      and warn when uncertain.

  Invalid date                        Keep the original date phrase and
                                      mark it unresolved.

  Large conversation                  Process in chunks and keep the UI
                                      responsive; never silently
                                      truncate.

  Empty or unsupported file           Show a helpful error and preserve
                                      the user's ability to retry.

  Storage unavailable/full            Show an actionable error; do not
                                      claim data was saved.

  User clears browser data            Explain that browser-local data may
                                      be lost; do not promise cloud
                                      recovery.
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 9. Testing plan

Create a small fixture conversation that contains: - An explicit
deadline. - A direct assignment to the configured user. - An unassigned
task. - A proposed meeting time change. - A confirmed meeting time
change. - A contradictory statement. - An irrelevant message containing
the word "urgent." - An ambiguous date. - Two identical-looking but
legitimate separate messages. - A message with an unknown sender.

Test at least the following:

### Parser tests

-   Correctly parse supported formats.
-   Preserve unparsed lines.
-   Preserve source order and original text.
-   Handle empty files and malformed lines.

### Extraction tests

-   Extract explicit tasks and dates.
-   Do not invent assignees or deadlines.
-   Distinguish proposals from confirmed decisions.
-   Attach valid source message IDs.

### Priority tests

-   Produce the same score for the same inputs.
-   Explain every score with actual matched signals.
-   Avoid high priority from a single generic keyword.
-   Test boundaries for High, Medium, and Low.

### Change-detection tests

-   Detect explicit time changes.
-   Flag ambiguous changes for confirmation.
-   Avoid merging different events without evidence.
-   Avoid duplicate tasks on repeated imports.

### Privacy tests

-   Confirm no API calls are made with conversation content.
-   Confirm the app works without a network connection after the app
    assets are available, if the chosen setup supports it.
-   Confirm clear-data actions delete the app's stored conversation
    records.
-   Do not claim offline capability until it has been tested.

### UX tests

-   Test import, analysis, source navigation, task updates,
    checkpointing, and clearing data.
-   Test keyboard access and responsive layout.
-   Test empty, error, and storage-failure states.

------------------------------------------------------------------------

## 10. Implementation phases for Antigravity

Do not try to implement every feature in one unreviewed change.

### Phase 1 --- Inspect and plan

-   Inspect the existing repository, framework, package scripts, and
    current UI.
-   Do not delete existing files or replace the project without a
    reason.
-   Summarize the current state and propose a file-level implementation
    plan.
-   Identify missing dependencies before installing anything.
-   Confirm the no-Ollama/no-cloud-AI constraint.

### Phase 2 --- Types, parser, and fixtures

-   Implement message and finding types.
-   Implement import parsing and preview.
-   Create sample fixtures and parser tests.
-   Preserve malformed lines and report parse warnings.

### Phase 3 --- Analysis pipeline

-   Implement rule-based task, deadline, decision, and question
    extraction.
-   Add source-message validation.
-   Implement priority scoring with reasons.
-   Implement change detection.
-   Add tests for false positives and ambiguous cases.

### Phase 4 --- Local persistence

-   Add IndexedDB repositories.
-   Persist conversations, findings, tasks, and review checkpoints.
-   Handle failed writes and clear-data actions.
-   Verify that imports and analysis do not transmit conversation text
    externally.

### Phase 5 --- UI integration

-   Build the import flow and dashboard.
-   Show priorities, reasons, source links, task controls, and changes
    since review.
-   Add empty, loading, error, and uncertainty states.
-   Keep components small and business logic outside components.

### Phase 6 --- Verify and polish

-   Run the available lint, type-check, and test commands.
-   Fix errors rather than hiding them.
-   Manually test the complete demo flow.
-   Report what works, what remains incomplete, and any known
    limitations.
-   Never claim a feature or test works unless it has been implemented
    and verified.

------------------------------------------------------------------------

## 11. Master prompt for Antigravity

Copy and paste the following prompt into Antigravity after opening the
project repository:

> **Act as a senior frontend engineer and pragmatic product engineer.
> Build CatchUp AI according to this README.**
>
> Before coding, inspect the repository and report the existing
> framework, important files, available scripts, and current state. Do
> not overwrite or delete existing work blindly. Propose a phased plan
> and identify any assumptions.
>
> Build a polished browser-first application using the existing
> React/Vite setup where available. Do not use Ollama, llama.cpp, a
> hosted LLM API, a cloud database, telemetry, or any service that sends
> conversation content off-device. The MVP must use local browser-side
> parsing and rule-based extraction. Be honest that this is not
> equivalent to LLM-level semantic understanding.
>
> Implement these features: 1. Import pasted conversation text or a
> `.txt` file and preview parsed messages. 2. Generate a clearly labeled
> rule-based conversation digest. 3. Extract tasks, explicit deadlines,
> candidate decisions, and unresolved questions. 4. Track assignees
> conservatively; never assume an unknown task belongs to the user. 5.
> Rank findings with a transparent score and show the exact reasons for
> each score. 6. Link every important finding to valid original source
> message IDs. 7. Detect explicit changes to decisions and deadlines,
> while treating ambiguous proposals as possible changes. 8. Show what
> changed since the last review using local checkpoints. 9. Persist data
> with IndexedDB and provide clear-data controls. 10. Handle false
> positives, unknown fields, malformed input, duplicates, invalid dates,
> and storage errors.
>
> Keep parsing, extraction, scoring, evidence validation, change
> detection, storage, and UI components separate. Create tests for the
> core logic. Follow the data models and acceptance criteria in this
> README, adapting them only when necessary and documenting the reason.
>
> **Explainability is mandatory:** each important finding must show the
> source message, matched signals or rules, score calculation where
> applicable, confidence/review status, and known uncertainty. Show
> concise evidence-based explanations, not invented reasoning.
>
> Do not fake progress, test results, AI capabilities, or privacy
> guarantees. Do not silently discard messages. Do not invent assignees,
> deadlines, or final decisions. Do not add a feature that conflicts
> with local-first privacy.
>
> Work in phases. After each phase, summarize files changed, decisions
> made and why, tests run and their actual results, limitations, and the
> next phase. Run the repository's existing checks and fix issues
> introduced by your changes. If a requirement is ambiguous, choose the
> safest simple behavior, document the assumption, and keep the user in
> control.
>
> Start with **Phase 1: repository inspection and implementation plan**.
> Do not generate the entire application in one uncontrolled rewrite.

------------------------------------------------------------------------

## 12. Follow-up prompts for Antigravity

Use these prompts one at a time after reviewing each phase.

### Prompt A --- Build and test the analysis engine

> Implement the parsing and rule-based analysis engine specified in the
> README. Keep the code independent of React. Add fixture-based tests
> for explicit tasks, unknown assignees, missing deadlines, proposed
> versus confirmed changes, ambiguous dates, source IDs, and misleading
> urgency keywords. For each extraction rule, document what it detects,
> what it can miss, and the conditions that trigger "Needs
> confirmation." Do not build UI until the analysis functions and tests
> are in place. Report the actual test results.

### Prompt B --- Build the dashboard

> Build the CatchUp AI dashboard on top of the existing analysis engine.
> Include import preview, rule-based digest, priority list, tasks,
> decisions, possible changes, unresolved questions, and a
> source-message viewer. Each finding must have a "Why this result?"
> panel showing real matched signals, evidence, score calculation where
> applicable, and uncertainty. Do not hardcode sample findings into the
> production dashboard; use fixtures only in an explicit demo mode. Make
> the layout responsive and accessible.

### Prompt C --- Add persistence and review checkpoints

> Implement IndexedDB persistence for conversations, messages, findings,
> tasks, and review checkpoints. Re-importing the same conversation must
> not silently duplicate all findings. Add a "Mark as reviewed" action
> and a "What changed since last review?" view. Do not advance the
> checkpoint automatically when analysis finishes. Handle ambiguous
> duplicate matches safely, report storage errors, and implement
> confirmed deletion of a conversation and all local data.

### Prompt D --- Privacy and correctness audit

> Audit the application against the README. Search the code for network
> requests, remote APIs, analytics, console logging of conversation
> content, invented fallback data, unsupported claims of AI
> understanding, and source references that do not exist. Test that no
> conversation content leaves the device in the MVP. Check whether all
> important findings have valid source IDs and transparent explanations.
> Run the available tests, lint, and type checks. Fix real issues and
> produce a concise audit report separating verified behavior from
> unverified assumptions.

### Prompt E --- Demo readiness

> Prepare a deterministic demo using a realistic sample conversation
> with 100--200 messages and at least five planted cases: an explicit
> deadline, a personal assignment, an unknown assignee, a confirmed
> meeting-time change, and an ambiguous proposal. Add a few irrelevant
> messages and an urgency keyword false positive. Make the demo
> repeatable. Do not fabricate evaluation metrics. Show the actual
> extracted results, evidence, limitations, and the user actions needed
> to correct mistakes.

------------------------------------------------------------------------

## 13. Definition of done

The MVP is ready for a hackathon demo only when:

-   [ ] A user can paste or upload a supported chat export.
-   [ ] Parsing problems are visible and messages are not silently
    discarded.
-   [ ] The digest is honestly labeled as rule-based.
-   [ ] Tasks and deadlines are extracted without inventing missing
    information.
-   [ ] Every important finding links to real source messages.
-   [ ] Priority labels include explanations.
-   [ ] Proposals and confirmed decisions are distinguished.
-   [ ] Changes since the last review can be inspected.
-   [ ] Task corrections and completion states persist locally.
-   [ ] Repeated imports do not silently create duplicate tasks.
-   [ ] Clear-data controls work.
-   [ ] No conversation content is sent to external services.
-   [ ] Tests and checks have been run, with real results reported.
-   [ ] Known limitations are documented and visible where relevant.

------------------------------------------------------------------------

## 14. Final product principle

CatchUp AI should optimize for **trustworthy catch-up**, not for
producing the largest number of AI-looking features.

A smaller system that says "I found a likely task, here is the original
message, and the assignee is uncertain" is better than a flashy system
that confidently invents a deadline.

The product's defining combination is:

**Understand the conversation as far as the available methods allow →
identify actionable information → explain why it matters → show the
evidence → let the user correct uncertainty → remember what changed.**
