# Phase 1 — Stabilization implementation log

## Current checkpoint: Chrome-managed AI routing and policy enforcement

### Completed
- Replaced the stale Hugging Face all-in-one implementation with a provider runtime.
- Prioritized Chrome-managed on-device AI as the default backend.
- Removed the external local-server model from the default provider order.
- Added explicit privacy policies: `chrome-local-first`, `chrome-local-only`, and `cloud-only`.
- Added structured provider errors, timeout handling, and retry classification.
- Added provider capability detection for Chrome built-in AI states.
- Routed the MV3 background service worker through `generate()` and `getBackendStatus()`.
- Bounded chat context and kept cloud credentials in extension storage.
- Corrected popup response handling and persisted privacy mode.
- Removed duplicate JavaScript content-style injection.
- Added provider-order tests, retry classification checks, and error metadata checks.

### Browser resource policy
ChromeMind does not download, install, or bundle a model. Chrome owns model preparation, hardware acceleration, processor selection, and availability. ChromeMind only detects the exposed built-in AI API and uses it when Chrome reports it is ready.

Cloud AI remains an explicit opt-in fallback. `chrome-local-only` and `chrome-local-first` avoid sending prompts to the cloud when the browser model is available or selected.

### Remaining Phase 1 work
- Verify static validation with the repository toolchain when local or CI execution is available.
- Add an actual GitHub Actions workflow for `npm test` and `npm run lint` if the repository is configured to allow it.
- Perform an unpacked-extension browser smoke test when a local Chrome instance is available.
- Improve content extraction, sensitive-page filtering, and provider-fallback UX.
