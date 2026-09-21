# ChromeMind

[![Status: Complete / Portfolio Archive](https://img.shields.io/badge/Status-Complete%20%2F%20Portfolio%20Archive-blue)](docs/SOLIDIFY-ARCHIVE-REVIVE.md)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-success)](manifest.json)
[![Version 1.2.0](https://img.shields.io/badge/Version-1.2.0-informational)](package.json)

**Privacy-first personal AI for Chrome**

ChromeMind is complete and archived — preserved as an honest portfolio piece and reference implementation of a privacy-first browser assistant. It is revivable according to our lifecycle guidelines, but is not under active development. The extension is built on Manifest V3, using Chrome-managed on-device AI when available, keeping browsing insights local, and making cloud fallback explicit and user-controlled.

## What it does

- Summarizes readable page content.
- Translates, proofreads, and rewrites text.
- Chats with bounded conversation context.
- Detects sensitive pages and avoids extracting them by default.
- Uses Chrome-managed on-device AI first when Chrome exposes it.
- Supports explicit cloud fallback: Hugging Face, OpenRouter (DeepSeek V4 Flash), and Google Gemini API (Gemini 3.6 Flash) — all BYOK. OpenRouter and Gemini live-verified HTTP 200 on 2026-09-21.
- Stores coarse activity signals locally for explainable recommendations.
- Lets users pause activity insights, disable page extraction, dismiss recommendations, and delete local data.

## Privacy Model

ChromeMind routes every request through the user's selected privacy mode, set once in the popup and persisted locally:

| Mode | Behavior |
|------|----------|
| Chrome on-device only (`chrome-local-only`) | All requests use Chrome's built-in Gemini Nano. If unavailable, no AI response is returned. Cloud is never contacted. |
| Chrome on-device first (`chrome-local-first`, default) | Attempts Gemini Nano first. If unavailable, automatically falls back to the user-configured cloud provider. |
| Cloud only (`cloud-only`) | Uses only the configured cloud provider. Gemini Nano is never invoked. |

Every response includes metadata:
```json
{
  "provider": "gemini-nano" | "huggingface" | "openrouter" | "gemini-api",
  "privacy": "on-device" | "cloud",
  "fallbackUsed": true | false
}
```

In `chrome-local-first` mode, cloud fallback is automatic and not preceded by a per-request confirmation prompt. The privacy mode acts as persistent consent; every fallback is visible via `fallbackUsed: true`. Users who require strict no-cloud transmission should select `chrome-local-only`.

Cloud providers are BYOK. ChromeMind does not ship keys and does not proxy through any third-party service. Verified as of v1.2.0:
- Hugging Face — user-supplied token
- OpenRouter — default `deepseek/deepseek-v4-flash`, live-verified HTTP 200 on 2026-09-21
- Google Gemini API — default `gemini-3.6-flash`, live-verified HTTP 200 on 2026-09-21

Sensitive pages (login, checkout, payment, billing, account settings) are refused by extraction by default. Browsing activity is stored locally as coarse domain-level signals only, opt-in, and can be paused or wiped at any time.


## Architecture

```text
Popup / content script
        |
        v
Manifest V3 service worker
        |
        v
Provider runtime + privacy policy
   |                    |
   v                    v
Chrome built-in AI     Explicit cloud fallback
        |
        v
Local storage: settings, bounded sessions, activity aggregates
```

The extension treats webpage text as untrusted data. Page content is passed as context, never as executable instructions.

## Distribution Packaging

ChromeMind produces a clean distribution zip suitable for manual or developer mode installation:

```bash
npm run pack
```

This executes `scripts/pack.js` to bundle `manifest.json` and the runtime `src/` directory into:
```text
dist/chromemind-v1.2.0.zip
```
Non-runtime development files (tests, documentation, scripts, and dotfiles) are excluded.

## Install for development

1. Clone this repository.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Select **Load unpacked**.
5. Choose the repository directory.
6. Open ChromeMind from the toolbar.

Cloud fallback requires user-provided credentials: Hugging Face, OpenRouter (DeepSeek V4 Flash), and Google Gemini API (Gemini 3.6 Flash) — all BYOK. OpenRouter and Gemini live-verified HTTP 200 on 2026-09-21. Chrome-managed AI availability depends on Chrome version, device, region, policy, and model readiness.

## Per-Provider Setup (BYOK)

When on-device AI is unavailable or you configure cloud fallback, choose your provider under **Settings** in the extension popup:

| Provider | Key Acquisition | Default Model | Details |
|---|---|---|---|
| **Hugging Face** | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | `Qwen/Qwen2.5-7B-Instruct` | Serverless Inference API token |
| **OpenRouter** | [openrouter.ai/keys](https://openrouter.ai/keys) | `deepseek/deepseek-v4-flash` | OpenAI-compatible endpoint with hundreds of models |
| **Google Gemini API** | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | `gemini-3.6-flash` | Google Generative Language API |

You can also specify an optional model override string in Settings (e.g. `anthropic/claude-3.5-haiku` on OpenRouter or `gemini-1.5-pro` on Gemini API).

## Revival Guide Summary

If reviving ChromeMind for active development or Chrome Web Store publication:
1. Review the full lifecycle specification in [docs/SOLIDIFY-ARCHIVE-REVIVE.md](docs/SOLIDIFY-ARCHIVE-REVIVE.md).
2. Validate extension manifest conformity using `node scripts/validate-manifest.js`.
3. Verify test suites pass cleanly with `npm test` (28 unit tests across content, activity, and providers).
4. Verify upstream cloud endpoints using `npm run smoke` with valid API keys.
5. Address deferred features: new-tab dashboard interface and automated browser end-to-end tests.

## Documentation

- [Solidify, Archive, Revive](docs/SOLIDIFY-ARCHIVE-REVIVE.md) — project lifecycle, archive state, and revival guide
- [Threat Model](docs/phase-5/threat-model.md) — security architecture and privacy boundaries
- [Data Flow](docs/phase-5/data-flow.md) — data flow diagrams and trust boundaries
- [Demo Script](docs/phase-5/demo-script.md) — reproducible portfolio walkthrough
- [Release Checklist](docs/phase-5/release-checklist.md) — release qualification and publication readiness
- [Test Results](docs/phase-5/test-results.md) — unit test coverage and smoke test verification record
- [Phase 1 logs](docs/phase-1/implementation-log.md)
- [Phase 2 logs](docs/phase-2/implementation-log.md)
- [Phase 3 logs](docs/phase-3/implementation-log.md)
- [Phase 4 logs](docs/phase-4/implementation-log.md)
- [Phase 5 implementation log](docs/phase-5/implementation-log.md)

## Project status

ChromeMind is an experimental portfolio project. The implementation has concluded Phase 5 release quality and stabilization:

- Phase 1 — provider/runtime stabilization.
- Phase 2 — privacy-aware content intelligence.
- Phase 3 — personalization controls and contextual intelligence.
- Phase 4 — local activity intelligence and recommendations.
- Phase 5 — portfolio presentation, release quality, pure module decoupling, and demo readiness.

## Known limitations

- Chrome owns built-in model availability and preparation.
- The extension cannot guarantee Gemini Nano availability.
- Cloud providers require user-supplied credentials.
- Activity recommendations are intentionally coarse and rule-based.
- The dashboard/new-tab experience is planned separately for revival.
- This repository is an unpacked portfolio archive, not an active Web Store listing.

## Portfolio demo story

A strong demo should show:

1. A page summarized with the provider marked on-device.
2. Chrome AI unavailable, followed by a visible cloud fallback choice.
3. A sensitive page refused without extracting form content.
4. Activity insights enabled with a transparent recommendation reason.
5. The user dismissing a recommendation and deleting local data.

## License

See [LICENSE](LICENSE).
