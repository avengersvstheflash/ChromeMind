# ChromeMind data-flow diagram

## Logical flow

```text
┌──────────────────────┐
│ User / Popup / Action│
└──────────┬───────────┘
           │ request
           v
┌──────────────────────┐       untrusted DOM text
│ Content script       │◄──────────────────────── Web page
│ extraction/filtering │
└──────────┬───────────┘
           │ structured context
           v
┌──────────────────────────────┐
│ MV3 service worker            │
│ message routing + policy     │
└──────────────┬───────────────┘
               │ privacy policy
       ┌───────┴────────┐
       v                v
┌───────────────┐  ┌──────────────────┐
│ Chrome-managed│  │ Explicit cloud   │
│ on-device AI  │  │ fallback (BYOK)  │
└───────┬───────┘  └────────┬─────────┘
        │                   │ only if allowed
        └─────────┬─────────┘
                  v
          ┌───────────────┐
          │ Structured UI │
          │ result +      │
          │ provider meta │
          └───────────────┘

Local-only side path:
Tab events → coarse hostname/category signals → local recommendations
                         │
                         └── never sends activity to an AI provider by default
```

## Data classes

- **Ephemeral:** current page context and selected text.
- **Conversation:** bounded local chat sessions.
- **Activity:** coarse hostname/category counts with retention.
- **Credentials:** user-supplied cloud key in local extension storage.
- **Telemetry:** none by default.
