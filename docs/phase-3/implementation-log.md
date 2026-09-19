# Phase 3 — Personalization, privacy controls, and contextual intelligence

## Initial checkpoint

Phase 3 makes privacy decisions visible and makes long-page context useful without sending the entire page to a provider.

## Implemented
- Added a visible privacy-mode selector in the popup.
- Added a local page-extraction toggle.
- Added a per-site extraction opt-out stored by hostname.
- Added current-site display in Settings.
- Added provider/privacy/fallback metadata to summary, translation, improvement, and chat result cards.
- Added relevance-based chunk selection using query-term scoring before summarization.
- Added an explicit prompt boundary telling providers that webpage content is untrusted data.
- Kept Chrome-managed AI as the default provider through `CONFIG.DEFAULT_PRIVACY_MODE`.

## Privacy behavior
- Site opt-outs are stored locally in `siteOptOuts` and are keyed by hostname.
- The extension never treats a webpage’s embedded instructions as assistant instructions.
- Provider metadata tells the user whether processing was on-device or cloud and whether fallback occurred.
- Automated execution remains deferred by project direction.

## Remaining Phase 3 work
- Make the content script enforce hostname opt-outs directly before extraction/highlighting.
- Add persistent conversation sessions and approved memory records.
- Add stronger relevance ranking and chunk overlap handling.
- Add export/delete controls for personalization data.
