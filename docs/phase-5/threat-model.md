# ChromeMind threat model

## Scope

This threat model covers page extraction, provider routing, local storage, activity insights, and user-configured cloud fallback in the Manifest V3 extension.

## Assets

- User page content and selected text
- API credentials stored in extension storage
- Conversation history and approved personalization data
- Coarse activity signals and recommendations
- Provider policy and privacy preferences

## Trust boundaries

1. **Web page → content script:** webpage DOM and text are untrusted input.
2. **Content script → service worker:** messages cross the extension boundary and must be treated as data.
3. **Service worker → provider:** content may leave the device only when the privacy policy allows it.
4. **Extension storage → extension UI/runtime:** local storage is user-controlled browser data, not a guaranteed secret vault.

## Threats and mitigations

| Threat | Mitigation |
|---|---|
| Prompt injection in page content | Prompts explicitly label page content as untrusted data. |
| Sensitive form extraction | Password, payment, account, and high-risk pages are blocked or filtered. |
| Silent cloud transmission | Provider policy gates cloud use; results expose provider/privacy metadata. |
| Activity profiling | Activity insights are opt-in, coarse, local-only, bounded, and deletable. |
| Credential leakage | Keys are not committed; provider errors and logs must not contain secrets. |
| DOM corruption from highlighting | Text-node/Range highlighting avoids destructive `innerHTML` replacement. |
| Over-retention | Chat, activity, and recommendation data have bounded storage and deletion paths. |
| Overbroad extension access | Permissions and host access should be reviewed before store submission. |

## Residual risks

- `chrome.storage.local` should not be described as a secure secrets vault.
- `<all_urls>` content-script coverage remains broader than ideal for a least-privilege release.
- Chrome-managed AI availability varies by Chrome version, device, region, policy, and hardware.
- Cloud provider privacy and retention policies are outside ChromeMind's control.

## Release requirements

- Complete a permission review.
- Verify no secrets appear in logs or screenshots.
- Document every cloud-enabled path.
- Re-run static and browser validation before publishing.
