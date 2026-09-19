# ChromeMind release checklist

## Product truthfulness

- [ ] README describes implemented behavior only.
- [ ] Gemini Nano availability and Chrome ownership are clearly explained.
- [ ] Cloud fallback is described as explicit and policy-controlled.
- [ ] Known limitations are current.
- [ ] Phase logs link to the relevant implementation checkpoints.

## Privacy and security

- [ ] Sensitive-page extraction remains blocked.
- [ ] Activity insights are disabled by default.
- [ ] Activity data is coarse, local, bounded, and deletable.
- [ ] API keys are never committed or logged.
- [ ] Provider metadata distinguishes on-device and cloud processing.
- [ ] Webpage content is treated as untrusted context.
- [ ] Data export/delete behavior is documented.

## Engineering validation

- [ ] Manifest JSON validation passes.
- [ ] JavaScript syntax validation passes.
- [ ] Provider policy tests pass.
- [ ] Content extraction fixture tests pass.
- [ ] Activity aggregation tests pass.
- [ ] Manual Chrome smoke test is recorded before release.
- [ ] No stale imports or legacy provider claims remain.

## Portfolio assets

- [ ] Add a screenshot of the popup.
- [ ] Add a screenshot of provider/privacy metadata.
- [ ] Add a screenshot of activity recommendations.
- [ ] Record a 60–90 second demo.
- [ ] Include a privacy data-flow diagram.
- [ ] Include a short architecture explanation.
- [ ] Add a reproducible demo script.

## Packaging

- [ ] Update extension version.
- [ ] Verify icons and manifest paths.
- [ ] Produce a clean release archive without development artifacts.
- [ ] Tag the release commit.
- [ ] Publish release notes with known limitations.
