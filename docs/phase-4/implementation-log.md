# Phase 4 — Local activity intelligence and recommendations

## Initial checkpoint

Phase 4 begins the personal-assistant layer with coarse, local-only activity signals and explainable recommendations.

## Implemented in this checkpoint
- Added an opt-in local activity signal store keyed by domain.
- Stores only coarse domain, category, visit count, and timestamps.
- Excludes domains that look like banking, account, login, checkout, or payment services.
- Caps stored domains to the most recent 50 entries.
- Added local recommendation generation grouped by broad activity category.
- Recommendations include a reason and source domains so the user can understand why they appeared.
- No page content, search terms, full URLs, or browsing history are sent to an AI provider.

## Privacy decisions
- Activity insights default to disabled and require `activityInsightsEnabled: true`.
- Signals remain in `chrome.storage.local`.
- Recommendations are rule-generated; AI explanation is not required.
- Sensitive domains are excluded before storage.

## Remaining Phase 4 work
- Add the visible activity-insights opt-in and pause controls to the popup.
- Record tab activity from the background service worker.
- Add a recommendations panel with dismiss and not-interested actions.
- Add retention and delete controls.
- Add optional new-tab/dashboard presentation.
