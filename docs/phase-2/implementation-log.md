# Phase 2 — Privacy-aware content intelligence

## Current checkpoint: sensitive-page protection and bounded context

### Completed
- Structured extraction of headings, paragraphs, lists, code blocks, and quotations.
- Content-root scoring for article/main/document pages.
- Exclusion of navigation, chrome, forms, hidden regions, and editable controls.
- Safe text-node highlighting using `Range`; no destructive `innerHTML` rewriting.
- Manifest-declared content styling and `document_idle` execution.
- Explicit sensitive-page detection based on URL, sensitive controls, and high-risk page text.
- Extraction opt-out through the local `contentExtractionEnabled` setting.
- Sensitive pages return a structured refusal instead of page content.
- Long content is bounded to 12,000 characters and exposed as 2,400-character chunks.
- Extraction metadata includes truncation, content type, chunk indexes, and privacy handling.

## Privacy and security decisions
- Password, email, telephone, payment, SSN, textarea, and contenteditable controls are excluded.
- Login, checkout, billing, payment, and password-reset URLs are blocked by default.
- Page content remains in the extension until the Phase 1 provider policy selects an allowed backend.
- Webpage text remains untrusted context and must not be treated as executable instructions.
- Users can disable extraction locally with `contentExtractionEnabled: false`.

## Remaining Phase 2 work
- Add a visible extraction/privacy control to the popup settings.
- Add provider/privacy metadata to result cards.
- Add relevance-based chunk selection for chat and summarization.
- Add fixture tests for sensitive and navigation-heavy pages.
- Add explicit site opt-out support.
