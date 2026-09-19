# Phase 2 — Privacy-aware content intelligence

## Initial checkpoint

Phase 2 begins with safer page understanding. ChromeMind now extracts structured readable content while treating all webpage text as untrusted input.

## Implemented
- Replaced the Phase 1 content-script stub with structured extraction.
- Selects the highest-scoring article/main candidate instead of blindly taking the first selector match.
- Preserves headings, paragraphs, lists, code blocks, and quotations as separate blocks.
- Excludes navigation, headers, footers, sidebars, forms, hidden regions, and editable controls.
- Caps extracted content at 12,000 characters and reports truncation.
- Uses `Range` and text nodes for highlighting instead of rewriting `innerHTML`.
- Uses manifest-declared `content.css` rather than injecting duplicate styles.
- Changes content execution to `document_idle` so the DOM is more complete before extraction.
- Adds explicit content type metadata to extraction responses.

## Privacy and security decisions
- Password, email, telephone, textarea, and contenteditable controls are excluded from extraction and highlighting.
- Page text is data, not instructions; provider prompts must continue to treat it as untrusted context.
- Cloud routing remains controlled by the Phase 1 privacy policy.

## Next Phase 2 scope
- Add explicit sensitive-page detection and an extraction opt-out.
- Add chunking for long pages and bounded context selection.
- Add user-visible provider/privacy metadata to results.
- Add a content extraction fixture suite.
