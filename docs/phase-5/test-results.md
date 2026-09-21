# Phase 5 — Test Results & Verification Record

Date: 2026-09-21  
Release Target: v1.2.0  
Status: Passed (All 28 tests passing across 3 test suites)

---

## 1. Test Run Summary

```text
Ran 28 tests across 3 files.
✔ test/activity.test.js (9 tests)
✔ test/content.test.js (10 tests)
✔ test/providers.test.js (9 tests)

Total: 28 pass, 0 fail
Duration: ~75ms
```

### Full Test Output

```text
test/activity.test.js:
✔ isSensitiveDomain flags banking, payment, and authentication domains
✔ isSensitiveDomain permits non-sensitive content and platform domains
✔ isSensitiveDomain handles invalid and boundary inputs
✔ categorizeDomain accurately classifies supported domains
✔ pruneSignals filters expired records beyond retention window
✔ pruneSignals strips sensitive domains even if recent
✔ pruneSignals enforces maximum domain capacity
✔ buildRecommendations groups by category, filters general, and requires visits >= 2
✔ buildRecommendations excludes dismissed recommendation IDs

test/content.test.js:
✔ isSensitiveUrl detects auth, payment, and account credential endpoints
✔ isSensitiveUrl permits non-sensitive public and content URLs
✔ isSensitiveUrl safely handles invalid and empty inputs
✔ isSensitiveControl detects sensitive inputs and editable areas
✔ isSensitiveControl works with DOM element getAttribute interface
✔ isSensitiveControl permits safe and non-sensitive controls
✔ chunkText splits text within CHUNK_LENGTH boundaries
✔ chunkText enforces MAX_TEXT_LENGTH boundary
✔ chunkText supports custom max and chunkSize boundaries
✔ scoreContentNode weighs text length and paragraph frequency

test/providers.test.js:
✔ messagesToPrompt preserves roles and bounds content
✔ provider policy keeps Chrome AI first by default
✔ retry classification excludes authentication failures
✔ ProviderError retains policy-relevant metadata
✔ messagesToGemini transform converts user and assistant to model with parts
✔ missing-key availability tests for openrouter, gemini, and huggingface
✔ mocked fetch verifies OpenRouter request URL, headers, and body shape
✔ mocked fetch verifies Gemini API request URL with key and body shape
✔ provider-selection dispatch routes to selected cloud adapter
```

---

## 2. Test Coverage & Module Decoupling

Following Step 5 pure utility extraction, all pure business logic is decoupled from browser globals (`window`, `document`, `chrome`), enabling deterministic unit testing via standard test runners without DOM polyfills or chrome namespace mocks.

### Content Intelligence (`src/content/extractor-utils.js`)
- **Sensitive URL Detection (`isSensitiveUrl`)**: Verified against authentication routes (`/login`, `/signin`), payments (`/checkout`, `/billing`, `/payment`), credential management (`/account/settings`, `/reset-password`), while allowing benign research and documentation URLs.
- **Sensitive Control Detection (`isSensitiveControl`)**: Verified detection of password inputs, email/phone fields, credit card autocomplete attributes (`cc-number`, `cc-csc`, `cc-exp`), sensitive form field names (`card`, `cvv`, `ssn`), textareas, and contenteditable elements. Supports both plain object descriptors and DOM Element `getAttribute` interfaces.
- **Text Chunking Boundaries (`chunkText`)**: Verified boundary slicing at `CHUNK_LENGTH = 2400`, max text capping at `MAX_TEXT_LENGTH = 12000`, empty input handling, and custom max/chunk boundaries.
- **Content Scoring (`scoreContentNode`)**: Verified content candidate ranking combining text character length and paragraph count weighting (`+200` per paragraph). Tested with plain objects and mock DOM nodes.

### Activity Intelligence (`src/activity/activity-utils.js`)
- **Sensitive Domain Filtering (`isSensitiveDomain`)**: Verified against financial, authentication, and payment domains (`bank`, `paypal`, `auth`, `login`, `checkout`).
- **Domain Categorization (`categorizeDomain`)**: Verified heuristic classification into `software-development`, `research`, `communication`, `shopping`, and `general`.
- **Signal Pruning (`pruneSignals`)**: Verified retention window cutoff enforcement (`cutoff = now - retentionDays * 86400000`), sensitive domain exclusion during pruning, and maximum domain cap enforcement (default 50) sorting by most recent visit.
- **Proactive Recommendations (`buildRecommendations`)**: Verified grouping by category, visit threshold (`visits >= 2`), exclusion of `general` browsing, descending sort by visit frequency, top-3 cap, and filtering of dismissed recommendation IDs.

### Cloud & Local AI Providers (`src/providers/`)
- **OpenRouter Adapter**: Request URL, authorization bearer headers, project metadata headers (`HTTP-Referer`, `X-Title`), default model (`deepseek/deepseek-v4-flash`), and response extraction.
- **Gemini API Adapter**: Request URL query key authentication, body structure transformation (`messagesToGemini` mapping user/model roles and parts), and default model (`gemini-3.6-flash`).
- **Provider Routing & Policies**: Chrome AI local-first prioritization, cloud fallback dispatch, error classification, and retry eligibility.

---

## 3. Live Provider Smoke Test Statement

On **2026-09-21**, live smoke tests were executed using `scripts/smoke-test-providers.js` against upstream cloud inference endpoints with live API credentials:
- **OpenRouter (`deepseek/deepseek-v4-flash`)**: Successfully connected, authenticated, and returned HTTP `200` with expected test reply.
- **Google Gemini API (`gemini-3.6-flash`)**: Successfully connected, authenticated, and returned HTTP `200` with expected test reply.

CI test execution remains strictly hermetic with zero API key dependencies and zero network calls, verifying all adapters and parsing via mocked transports.
