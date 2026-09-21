# ChromeMind

**Privacy-first personal AI for Chrome**

ChromeMind is a Manifest V3 browser assistant that uses Chrome-managed on-device AI when available, keeps browsing insights local, and makes cloud fallback explicit and user-controlled.

## What it does

- Summarizes readable page content.
- Translates, proofreads, and rewrites text.
- Chats with bounded conversation context.
- Detects sensitive pages and avoids extracting them by default.
- Uses Chrome-managed on-device AI first when Chrome exposes it.
- Supports explicit cloud fallback: Hugging Face, OpenRouter, or Google Gemini API — BYOK.
- Stores coarse activity signals locally for explainable recommendations.
- Lets users pause activity insights, disable page extraction, dismiss recommendations, and delete local data.

## Privacy model

ChromeMind is local-first, not cloud-first:

1. Chrome-managed on-device AI is preferred.
2. Chrome controls model availability, preparation, hardware acceleration, and processor usage.
3. ChromeMind cannot force-install or silently download Gemini Nano.
4. Cloud fallback is policy-controlled and never silent.
5. Sensitive page extraction is blocked by default.
6. Activity insights are opt-in and store coarse hostnames/categories only.
7. API keys, conversations, preferences, activity signals, and dismissals remain in `chrome.storage.local`.
8. Stored browser data is not presented as a guaranteed secure secret vault.

## Privacy modes

| Mode | Behavior |
|---|---|
| Chrome on-device only | Use Chrome's built-in AI only; stop if unavailable. |
| Chrome on-device first | Try Chrome AI first, then use configured cloud fallback. |
| Cloud only | Use the configured cloud provider directly. |

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

## Install for development

1. Clone this repository.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Select **Load unpacked**.
5. Choose the repository directory.
6. Open ChromeMind from the toolbar.

Cloud fallback requires user-provided credentials (Hugging Face, OpenRouter, or Google Gemini API). Chrome-managed AI availability depends on Chrome version, device, region, policy, and model readiness.

## Per-Provider Setup (BYOK)

When on-device AI is unavailable or you configure cloud fallback, choose your provider under **Settings** in the extension popup:

| Provider | Key Acquisition | Default Model | Details |
|---|---|---|---|
| **Hugging Face** | [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) | `Qwen/Qwen2.5-7B-Instruct` | Serverless Inference API token |
| **OpenRouter** | [openrouter.ai/keys](https://openrouter.ai/keys) | `openai/gpt-4o-mini` | OpenAI-compatible endpoint with hundreds of models |
| **Google Gemini API** | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) | `gemini-2.0-flash` | Google Generative Language API |

You can also specify an optional model override string in Settings (e.g. `anthropic/claude-3.5-haiku` on OpenRouter or `gemini-1.5-pro` on Gemini API).

## Project status

ChromeMind is an experimental portfolio project. The implementation is organized into progressive phases:

- Phase 1 — provider/runtime stabilization.
- Phase 2 — privacy-aware content intelligence.
- Phase 3 — personalization controls and contextual intelligence.
- Phase 4 — local activity intelligence and recommendations.
- Phase 5 — portfolio presentation, release quality, and demo readiness.

Automated execution and browser smoke testing are tracked separately and may be deferred in development environments.

## Known limitations

- Chrome owns built-in model availability and preparation.
- The extension cannot guarantee Gemini Nano availability.
- Cloud providers require user-supplied credentials.
- Activity recommendations are intentionally coarse and rule-based.
- The dashboard/new-tab experience is planned separately.
- This repository is not yet a Chrome Web Store release artifact.

## Portfolio demo story

A strong demo should show:

1. A page summarized with the provider marked on-device.
2. Chrome AI unavailable, followed by a visible cloud fallback choice.
3. A sensitive page refused without extracting form content.
4. Activity insights enabled with a transparent recommendation reason.
5. The user dismissing a recommendation and deleting local data.

## Documentation

- [Phase 1 logs](docs/phase-1/implementation-log.md)
- [Phase 2 logs](docs/phase-2/implementation-log.md)
- [Phase 3 logs](docs/phase-3/implementation-log.md)
- [Phase 4 logs](docs/phase-4/implementation-log.md)
- [Phase 5 implementation log](docs/phase-5/implementation-log.md)
- [Phase 5 release checklist](docs/phase-5/release-checklist.md)
- [Solidify, Archive, Revive](docs/SOLIDIFY-ARCHIVE-REVIVE.md) — project lifecycle and revival guide

## License

See [LICENSE](LICENSE).
