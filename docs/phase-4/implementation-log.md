# Phase 4 — Local activity intelligence and recommendations

## Current checkpoint: connected activity controls

### Completed
- Opt-in local activity signals keyed by hostname.
- Background collection on tab activation and completed navigation.
- Sensitive-domain exclusion before storage.
- Retention pruning with a configurable day count and a 50-domain cap.
- Local category aggregation and explainable recommendations.
- Popup recommendation panel with dismiss actions.
- Popup controls for enable/pause, retention, and local activity deletion.
- Recommendation dismissal state remains local.
- Dashboard/new-tab presentation explicitly deferred to a later Phase 4 slice.

### Privacy behavior
- Activity insights default to disabled.
- Only coarse hostnames and category counts are retained; no page content or full URLs are stored.
- Sensitive domains are rejected before persistence.
- Recommendations are rule-generated locally and are not sent to an AI provider.

## Remaining Phase 4 work
- Add the optional dashboard/new-tab presentation.
- Add richer recommendation feedback and ranking.
- Add a user-facing explanation of retention and source signals.
- Keep automated execution deferred as requested.
