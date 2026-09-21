# ChromeMind v1.2.0 — Privacy-First Browser Assistant (Portfolio Archive)

**Released:** 2026-09-21  
**Status:** Complete / Portfolio Archive  
**Manifest V3 · Chrome-managed on-device AI · BYOK cloud fallback**

---

## What this is

ChromeMind is a privacy-first Manifest V3 Chrome extension: a personal browser assistant that summarizes pages, translates, proofreads, rewrites, chats about the current page, and recommends useful activities based on coarse local browsing patterns.

This release marks the project's **portfolio archive** state — feature-complete against its 5-phase roadmap, documented, tested, and packaged. Not actively developed. Revivable per `docs/SOLIDIFY-ARCHIVE-REVIVE.md`.

---

## Highlights

### Local-first AI with explicit cloud fallback
- Chrome-managed on-device AI (Gemini Nano) attempted first under default policy.
- Three privacy modes: `chrome-local-only`, `chrome-local-first` (default), `cloud-only`.
- Every response carries `{ provider, privacy, fallbackUsed }` metadata — no silent transmission.

### Three BYOK cloud providers
- **Hugging Face** — serverless Inference API token.
- **OpenRouter** — default model `deepseek/deepseek-v4-flash`. **Live-verified HTTP 200 on 2026-09-21.**
- **Google Gemini API** — default model `gemini-3.6-flash`. **Live-verified HTTP 200 on 2026-09-21.**

### Privacy engineering
- Sensitive-page refusal (login, checkout, payment, billing, account settings).
- Sensitive control exclusion (password, email, tel, cc-*, ssn, textarea, contenteditable).
- Per-site extraction opt-out.
- Webpage content treated as untrusted data — passed as context, never as instructions.
- Prompt boundaries clarifying the data/instruction separation.

### Local activity intelligence
- Opt-in, coarse domain-level signals only (no URLs, no page content, no search terms).
- Sensitive-domain filtering (banking, auth, payment).
- Explainable rule-based recommendations with visible reasons.
- Dismissible, pausable, retention-controlled, wipeable.

### Engineering
- Provider runtime with structured `ProviderError` types and retry classification.
- Bounded chat history and request timeouts.
- Pure utility modules (`extractor-utils.js`, `activity-utils.js`) — no browser globals, fully testable.
- **28 unit tests**, all passing in CI on Node 22.
- GitHub Actions: lint, test, manifest validation on every push.
- `npm run pack` produces a clean distribution zip.

---

## Documentation

- **Lifecycle & revival:** `docs/SOLIDIFY-ARCHIVE-REVIVE.md`
- **Threat model:** `docs/phase-5/threat-model.md`
- **Data flow:** `docs/phase-5/data-flow.md`
- **Demo script:** `docs/phase-5/demo-script.md`
- **Release checklist:** `docs/phase-5/release-checklist.md`
- **Test results:** `docs/phase-5/test-results.md`
- **Phase logs 1–5:** `docs/phase-*/implementation-log.md`

---

## Distribution

`npm run pack` → `dist/chromemind-v1.2.0.zip`

Install as unpacked extension: `chrome://extensions` → Developer mode → Load unpacked → select repo root.

Cloud providers require user-supplied credentials. Chrome-managed AI availability depends on Chrome version, device, region, policy, and model readiness.

---

## Known limitations

- Chrome owns built-in model availability and preparation. ChromeMind cannot force-download Gemini Nano.
- Hugging Face default model path implemented and shape-tested but not live-verified in this release.
- Activity recommendations are intentionally coarse and rule-based.
- New-tab/dashboard experience is deferred to revival scope.
- Automated browser end-to-end tests are not included; unit tests and CI constitute current validation.
- This is an unpacked portfolio archive, not a Chrome Web Store listing.

---

## Phase summary

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Provider/runtime stabilization, structured errors, bounded chat, CI scaffolding | ✅ Complete |
| 2 | Privacy-aware content extraction, sensitive-page refusal, safe highlighting | ✅ Complete |
| 3 | Personalization controls, per-site opt-out, provider metadata in results | ✅ Complete |
| 4 | Local activity intelligence, explainable recommendations, retention controls | ✅ Complete |
| 5 | Portfolio presentation, pure module decoupling, expanded tests, release packaging | ✅ Complete |

---

## Reviving this project

See `docs/SOLIDIFY-ARCHIVE-REVIVE.md` for the full checklist. Quick version:

1. Checkout `v1.2.0`.
2. `npm install && npm test` — confirm 28 tests pass.
3. Load unpacked in Chrome; check Gemini Nano availability.
4. If cloud models have been deprecated upstream, update slugs in `src/config.js`.
5. Re-run `npm run smoke` with your own keys.
6. Decide scope: demo refresh vs. feature revival.

---

**Not actively maintained. Preserved as a portfolio and reference implementation.**
