# ChromeMind — Solidify, Archive, Revive

A lifecycle guide for finishing, shelving, and later reviving the project.

---

## Definition of Done (Portfolio-Grade)

ChromeMind is considered "portfolio-grade and archivable" when:

- README is honest, current, and includes screenshots or a short demo GIF/video
- Architecture diagram, data-flow diagram, and threat model are present
- Privacy model and known limitations are clearly documented
- Automated tests pass in CI (`npm test`, `npm run lint`)
- Manual Chrome unpacked-extension smoke test is performed and recorded
- Release tag exists (e.g., `v1.2.0`) with a packaged `.zip` in GitHub Releases
- Legacy/stale docs are archived or clearly marked historical
- Repo has a clear description, topics, and license
- A "How to revive" section exists in the README or `docs/`

---

## Solidify Checklist (Final Phase 5 Push)

- [ ] Add GitHub Actions workflow for tests + lint
- [ ] Run tests locally and commit results to `docs/phase-5/`
- [ ] Capture screenshots and record the 60–90s demo from `demo-script.md`
- [ ] Clean up remaining stale documentation
- [ ] Add packaging script (e.g., `npm run pack` → `.zip`)
- [ ] Tag release `v1.2.0` and attach build artifact
- [ ] Add README badge: Status: Complete / Archived
- [ ] Add a short "Revival Guide" section

---

## Archive State

When archived, the repo should:

- Clearly state it's a completed portfolio project, not actively maintained
- Keep the code, docs, and demo assets intact
- Freeze dependencies with a lockfile
- Note that Chrome built-in AI APIs may evolve and require updates on revival
- Stay public as a showcase piece

---

## Revival Triggers

Bring ChromeMind back when:

- You actually need a local-first browser assistant for daily use
- Chrome's built-in AI APIs change and you want to update the integration
- You need provider orchestration or privacy-policy code for a new project
- You want to demo on-device AI, privacy engineering, or explainable recommendations in an interview
- You decide to extend memory/personalization or activity intelligence further

---

## Revival Checklist

- [ ] Checkout the release tag
- [ ] Run `npm install` and `npm test`
- [ ] Load unpacked in Chrome and verify current AI availability
- [ ] Check Chrome version and any API changes
- [ ] Update manifest or provider runtime if needed
- [ ] Re-run the demo script
- [ ] Decide scope: quick demo vs. full revival
