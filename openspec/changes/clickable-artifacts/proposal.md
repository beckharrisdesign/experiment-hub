# clickable-artifacts

## Human anchor

> "consider these the explore artifact of an openspec changes. Stop the leaks could be one, publish the graveyard could be two, etc. I want to focus on writing out some of these plans today."

(Selected as one of the four changes in the 2026-07-17 review session. Source observation: the homepage PRD / Landing / Prototype checkmarks are static text — the only links in the experiment table are the experiment names.)

## Outcomes

- **Who:** Visitors who want to verify the claims — a hiring manager deciding whether to forward the site, an investor deciding whether the rigor is real.
- **Job:** Every artifact claim on the homepage is inspectable. A checkmark is a link to the thing it claims exists; a claim that can't be shown isn't made.
- **Done when:**
  1. **PRD ✓** links to the experiment's PRD rendered in the existing doc viewer on the detail page.
  2. **Landing ✓** links to the live landing page for that experiment.
  3. **Prototype ✓** links to a deployed prototype URL where one exists, or a demo artifact (screenshot / short GIF) where the prototype is local-only (Chrome extensions, Python tools).
  4. A checkmark with no reachable destination renders as "—" instead — the table can no longer assert artifacts it can't show.
  5. Link targets resolve from data (Notion property or registry JSON), not hardcoded per-experiment URLs in components.
- **Not doing:** Deploying prototypes that aren't currently deployed; producing new demo videos beyond a lightweight screenshot/GIF per prototype where needed; restyling the table; the Outcome column (that's `outcomes-column`).

## Why

The homepage table displays PRD ✓ / Landing ✓ / Prototype ✓ with no way to see any of them — verified in the 2026-07-17 review by reading the DOM: the checkmarks are plain text. The site asks outsiders to take its evidence on faith, which inverts the trust the scoring-and-workflow story is supposed to build. The artifacts largely exist (PRDs in `experiments/*/docs/`, a doc viewer already on the detail page, landing code under `experiments/*/landing/`) — this change is mostly wiring claims to already-real things, plus an honesty rule for when the thing isn't reachable.

## What changes

- Homepage table cells become links (PRD → doc viewer anchor; Landing → live URL; Prototype → deployed URL or demo asset).
- Detail-page demo/code buttons, inherited from `stop-the-leaks` v1 de-scope (2026-07-17): "View demo" (primary) ← `Demo URL` Notion property; "View experiment in repo" (outline) ← explicit external repo URL when one genuinely exists, else `github.com/beckharrisdesign/experiment-hub/tree/main/experiments/{slug}`. Fix or supersede the unreliable Notion `Repo` field as part of this. Full rationale in `openspec/changes/stop-the-leaks/design.md` decision 3.
- A per-experiment artifact-links data source (Notion properties or registry JSON — decide in design).
- Enforcement of the no-destination-no-checkmark rule in the table renderer.
- Inventory pass: confirm the live URL for each claimed landing page (e.g., where `experiments/best-day-ever/landing/` actually deploys per its `DEPLOY.md`) and the reachable state of each prototype.

## Capabilities

### New Capabilities

- `evidence-links`: Homepage artifact indicators link to their artifacts, sourced from data, with unreachable artifacts shown as absent rather than claimed.

### Modified Capabilities

(none)

## Impact

- `app/page-client.tsx` (table cells), possibly `app/experiments/[slug]` doc-viewer anchors
- Data source addition (Notion properties or `data/*.json`)
- Content: demo screenshots/GIFs for non-deployed prototypes (best-effort, per-experiment)
- Tests: link resolution + fallback rendering

## Open questions (resolve in design)

- Where does each landing page actually live publicly today? (`experiments/best-day-ever/landing/DEPLOY.md` implies an external deploy target; the hub also has landing infrastructure per the README.)
- Prototype representation for extensions/CLI tools: screenshot, GIF, or link to the repo directory? Recommendation: GIF for the flagship one or two, repo link for the rest.

## Optional links

- Related changes: `openspec/changes/stop-the-leaks/`, `openspec/changes/publish-the-graveyard/` (both independent of this one)
