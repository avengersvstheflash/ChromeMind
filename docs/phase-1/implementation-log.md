# Phase 1 — Stabilization implementation log

## Scope
Provider orchestration, structured provider failures, request timeouts, truthful backend status, privacy-aware runtime selection, bounded chat requests, duplicate CSS removal, and basic automated validation.

## Implemented
- Replaced the Hugging Face-named all-in-one path with `src/providers/runtime.js`.
- Added local, Gemini Nano capability detection, and Hugging Face providers behind one `generate()` contract.
- Added privacy policies: `local-only`, `local-preferred`, and `cloud-only`.
- Added typed provider errors and retry classification.
- Added request timeouts and limited retry behavior to retryable failures.
- Added `getBackendStatus` for the popup to consume and render honest backend health.
- Updated the popup to use provider-aware status rather than a single API-key check.
- Added a privacy mode selector to the settings UI so user policy is persisted and enforced.
- Bounded chat requests to the configured recent-message limit.
- Removed JavaScript CSS injection so the manifest-declared stylesheet is authoritative.
- Added package scripts and an initial provider prompt test.

## Notes
The Chrome built-in AI API remains capability-detected only. The extension cannot force-install or silently download Gemini Nano; Chrome controls model availability and preparation.

## Remaining Phase 1 work
Add CI validation against the extension files, improve content extraction quality, and expand tests for storage, retry handling, and provider selection.
