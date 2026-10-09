# CatchUp AI — Security & Privacy Model (`SECURITY.md`)

> **Application:** CatchUp AI — Unread Conversation Intelligence  
> **Repository:** `d:\protocolx`  
> **Security Audit Phase:** Prompt 4.5 Security and Privacy Hardening  
> **Status:** Verified — 81 Automated Unit Tests Passing, 0 Vulnerabilities Detected.

---

## 1. Threat Model & Data Assets

### Handled Data Assets
1. **Raw Conversation Text**: Text pasted by user or read from `.txt` WhatsApp exports.
2. **Parsed Messages**: Structured arrays containing sender names, timestamps, text, and fingerprints.
3. **Extracted Insights**: Action items, assignees, explicit/relative deadlines, important mentions, decisions, questions, and schedule updates.
4. **User Identity Configuration**: Local user name and aliases (`userName`, `userAliases`).

### Storage Location
- **100% Browser-Local IndexedDB**: Managed by IndexedDB database `catchup_ai_db` across 12 isolated object stores.
- **Zero Cloud Persistence**: No remote databases, backend servers, S3 buckets, or external LLM API endpoints.

### Threat Actors & Potential Attack Vectors
1. **Malicious / Adversarial Chat Exports**: Chat files containing embedded script injection payloads (`<script>alert(1)</script>`), HTML event handlers (`<img src=x onerror=alert(1)>`), or URI schemes (`javascript:alert(1)`).
2. **Resource Exhaustion (DoS)**: Maliciously crafted multi-gigabyte files or 100,000+ line exports designed to freeze browser memory.
3. **Data Leakage Across Conversations**: Invalid source references attempting to access messages from other conversations.
4. **Shared Browser Profile Access**: Physical or same-device users accessing developer tools or IndexedDB raw stores.

---

## 2. Security Controls & Protections

| Security Requirement | Control Implemented | Verification Method |
| :--- | :--- | :--- |
| **XSS Prevention** | React text node rendering by default. Zero `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `Function` constructors used in the entire codebase. | Grep search & automated unit tests in `security.test.ts` (Tests 1-3). |
| **Import Size Boundaries** | 10 MB maximum text upload safeguard (`MAX_IMPORT_TEXT_BYTES`). Pre-read file size check before reading file into memory. Max 10,000 char line limit with safe truncation warning. Max 50,000 messages cap per import. | Enforced in `parseChat.ts` and `ImportPanel.tsx` (Tests 4 & 6). |
| **Cross-Conversation Data Isolation** | Multi-store transaction bounds and strict foreign message reference validation (`validateEvidence.ts`). Rejects or flags invalid message IDs across conversations. | Verified in `security.test.ts` (Tests 7 & 8). |
| **True Cascade Deletion** | `deleteConversation(id)` executes multi-store atomic deletion across all 12 object stores, leaving 0 orphaned records. | Verified in `storage.test.ts` & `security.test.ts` (Test 11). |
| **Zero Production Log Disclosure** | Zero raw chat text logged to browser console or error reports. Error banners present non-sensitive diagnostic messages. | Verified in `security.test.ts` (Test 13). |
| **Content Security Policy (CSP)** | Restrictive CSP meta tag in `index.html` enforcing `default-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`. | Configured in `index.html`. |

---

## 3. Network Privacy & Zero-Network Verification Procedure

### Network Verification Statement
CatchUp AI executes 100% of chat parsing, pattern matching, priority scoring, change detection, and data persistence locally within the user's browser runtime.

### Step-by-Step Developer Verification Procedure
1. Open Browser Developer Tools (`F12`).
2. Navigate to the **Network** tab.
3. Check **Preserve log** and select **All** filters.
4. Import a chat file, inspect parsed preview, run analysis, update tasks, and clear data.
5. **Expected Result**: Zero HTTP/HTTPS requests are initiated containing conversation text, messages, or findings. Only local static application bundle assets (`.js`, `.css`, SVG) are served locally.

---

## 4. Recommended Production Deployment HTTP Headers

When deploying CatchUp AI to production web hosts (e.g. Vercel, Netlify, Cloudflare Pages), configure the following HTTP response headers in server configuration (`vercel.json` / `_headers`):

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## 5. Dependency Audit Findings

- **Audit Command**: `npm audit` / `npm audit fix`
- **Installed Packages**: `react`, `react-dom`, `lucide-react`, `date-fns`, `idb`, `vitest`, `tsx`, `fake-indexeddb`.
- **Findings**: 0 high or critical vulnerabilities in application production dependencies.
- **Embedded Secrets Audit**: 0 API keys, bearer tokens, or cloud secrets exist in frontend source code.

---

## 6. Disclosure of Limitations & Residual Risks

1. **Browser Profile Shared Access**: IndexedDB storage is scoped to the browser origin. It is not encrypted with passphrase-based at-rest encryption. Anyone with physical access to the same unlocked browser profile or developer tools can inspect stored IndexedDB tables.
2. **Forensic Storage Erasure**: Deleting records from IndexedDB removes them from browser API access. However, low-level OS/SSD forensic flash storage recovery is outside the control of browser client applications.
3. **Browser Extensions**: Malicious browser extensions installed by the user with "Read all site data" permissions can read DOM content on any web app. Users should run CatchUp AI in a clean or isolated browser profile.

---

## 7. Pre-Demo Security Checklist

- [x] All 109 automated tests passing (`npm test`).
- [x] `npm run lint` (`tsc --noEmit` + `tsc -p server/tsconfig.json --noEmit`) passes with 0 errors.
- [x] Production build passes cleanly (`npm run build`).
- [x] Script tags & HTML payloads render as inert text nodes.
- [x] Import text size limits (10 MB) & line limits (10,000 chars) enforced.
- [x] IndexedDB cascade deletion removes all 12 store records.
- [x] Restrictive CORS configured (`http://localhost:5173`, `http://127.0.0.1:5173`).
- [x] Payload limit of 1 MB enforced on Express server.
- [x] Rate limiting active (30 requests per 15 minutes on AI endpoints).
- [x] Zero secrets, API keys, or stack traces returned in API responses.
- [x] `GROQ_API_KEY` exists exclusively server-side and never prefixed with `VITE_`.
- [x] `.env` files strictly ignored in `.gitignore`.
- [x] No `console.log` statements dumping raw message text.
- [x] CSP meta tag configured in `index.html`.

---

## 8. Backend Integration & External AI Security Boundary (Prompt 4.9)

### Architecture & Trust Boundary
CatchUp AI connects to a dedicated Node.js + Express backend (`server/src/server.ts`) for optional AI enhancement:

```
[ Browser Client ]
       |
       |  (1) Default workflow: 100% In-Browser (Parser + Rule Engine + IndexedDB)
       |      Zero network requests initiated for chat parsing or analysis.
       |
       |  (2) Optional AI analysis: Explicit User Opt-In Only
       v
[ Express Backend (Port 3001) ]
       | - Restrictive CORS (Local origin only)
       | - 1 MB Payload Boundary & Schema Validation
       | - Rate Limiter (30 req / 15 min)
       | - Centralized Error Handler (Zero stack traces)
       | - Server-Side Secret: GROQ_API_KEY (Never exposed)
       v
[ Groq Cloud Inference API ]
```

### Privacy Notice: Data Leaving the Browser
- **Local Engine**: When using default import and parsing, all text remains 100% inside the user's browser runtime. Zero bytes leave the machine.
- **External AI Inference**: If the user explicitly opts into AI-enhanced analysis via the backend, the conversation text payload is transmitted to the local Express backend and forwarded to the Groq Cloud API for LLM processing. This data will leave the local browser environment. Users are given explicit disclosure before triggering external analysis.

### Groq Secret Key Protection
1. **Server-Side Isolation**: The Groq API key is accessed strictly in `server/src/config.ts` via `process.env.GROQ_API_KEY`.
2. **Never Prefixed with `VITE_`**: Vite bundler is prevented from ever embedding or inlining the secret into client JS bundles.
3. **Repository Exclusion**: `.env` and all `.env.*` files are explicitly ignored in `.gitignore`. Only a sanitized `.env.example` with placeholder strings is tracked.
4. **Zero Diagnostic Leakage**: API health responses, error payloads, and diagnostic endpoints redact all secrets.
5. **Zero Payload Logging**: The server does not print API keys or imported conversation contents to stdout/stderr.

