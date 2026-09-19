# Phase 1 — Stabilization implementation log

## Current checkpoint: Chrome-managed AI routing

### Completed
- Replaced the Hugging Face-named all-in-one path with a provider runtime.
- Made Chrome-managed on-device AI the default provider.
- Removed the external local-server model from the default provider order.
- Added explicit privacy policies: `chrome-local-first`, `chrome-local-only`, and `cloud-only`.
- Added structured provider errors, timeout handling, and retry classification.
- Added capability status reporting for Chrome built-in AI states.
- Routed the MV3 background service worker through `generate()` and `getBackendStatus()`.
- Bounded chat context and kept cloud credentials in extension storage.
- Corrected popup response handling and persisted privacy mode.
- Removed duplicate JavaScript content-style injection.

## Chrome resource policy
ChromeMind does not download, install, or bundle a model. Chrome owns model preparation, hardware acceleration, processor selection, and availability. ChromeMind only detects the exposed built-in AI API and uses it when Chrome reports it is ready.

Cloud AI is an explicit opt-in fallback. `chrome-local-only` never sends prompts or page content to the cloud.

## Remaining Phase 1 work
- Add unit tests for provider policy and failure handling.
- Run CI validation and fix environment-specific issues.
- Perform an unpacked-extension Chrome smoke test.
- Improve content extraction and sensitive-page handling.
