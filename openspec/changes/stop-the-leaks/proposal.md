# stop-the-leaks

## Human anchor

> "consider these the explore artifact of an openspec changes. Stop the leaks could be one, publish the graveyard could be two, etc. I want to focus on writing out some of these plans today."

> "I want the details page to just show a few more guiding statements - why it matters, hypothesis, etc."

(From the 2026-07-17 outside-investor review session. Source observations: live experiment detail pages render raw Notion fields; the MVDS page displays "PUBLIC: No" while being publicly rendered; the homepage Etsy row shows a stray "Apply" OpenSpec phase chip. Refined the same day through review by @experiment-creator, @design-advisor, and @prd-writer.)

## Outcomes

- **Who:** Site visitors — hiring managers and investors forming a first impression of BHD Labs — and Katy, whose craft brand is judged by exactly this kind of polish.
- **Job:** Public pages render only content intended for outsiders, and the experiment detail page becomes a curated narrative surface — guiding statements, not a field dump. Internal state (visibility flags, raw timestamps, Notion bookkeeping, OpenSpec phase chips) never appears on a public URL.
- **Done when:**
  1. A Notion row with `Public` = No or unset never renders on a public route — the detail page 404s and the row is absent from the homepage table. Today `lib/notion-experiments.ts` never reads the `Public` property at all. (Verify the property's Notion type — checkbox vs select — during apply; the lib must handle the actual type. The existing ~60s cache means a row flipped to private can render for up to a minute; accepted.)
  2. **Gating pre-deploy task ("backfill then flip"):** `Public` = Yes is set in Notion on every intended-public row *before* the enforcing deploy. Without this, private-by-default blanks the live portfolio.
  3. The public detail page renders from an enumerated allowlist — exported as `PUBLIC_FIELD_ALLOWLIST` in `lib/notion-experiments.ts`, tested — containing exactly: **Why this matters**, **Hypothesis**, **Exec Summary** (as narrative rows, in that order). **Status** renders as a chip in the hero next to the type badge, not as a field row. Nothing else renders publicly: no score rows, tags, slug, directory, dates, `Name alt`, `Score tag`, `Public`, `Last edited time`, or any future Notion column not added to the list.
  4. Empty allowlisted fields are **omitted silently** — no label-with-dash rows. If all guiding statements are empty, the page falls back to the hero statement alone. In admin edit mode, missing fields render as ghost prompts ("Add a hypothesis →") so gaps surface as todos for Katy without leaking publicly.
  5. The OpenSpec phase chip no longer renders for anonymous visitors. It remains for Katy via the existing admin edit-mode mechanism (the `hub-edit` cookie path used by the dispatch/edit routes — the spec names the exact client-side read), restyled so it no longer mimics a button/CTA.
- **Not doing:** Demo/code link buttons on the detail page — deferred to `clickable-artifacts` along with the label ("View experiment in repo") and destination decisions recorded in design.md (founder call, 2026-07-17: simplify v1 to statements only). The history timeline (that's `tell-the-story`); the graveyard/status model (that's `publish-the-graveyard`); changing what authenticated admin surfaces may show on their own routes; renaming or restructuring Notion properties; scoring display changes beyond removal from public routes.

## Why

The 2026-07-17 outside review found the highest-traffic public pages leak internal plumbing: raw ISO timestamps, Notion field names (`NAME ALT`, `SCORE TAG`), a visibility flag displayed but never enforced, and internal process state (the phase chip). Individually small, collectively they read as "unfinished" on a site whose entire pitch is rigor and craft — and the `Public` gap is a real privacy defect: rows marked not-public are fully rendered today.

The refined shape goes one step further than leak-plugging: the detail page becomes intentionally curated. Three narrative statements present read as deliberate; a dozen mixed fields read as a database dump. This sets the stage for the real-time case-study direction (`tell-the-story`) without redesigning the page here.

**Acknowledged reversal:** PR #295 built auto-mirroring so new Notion columns appear without code changes. The allowlist deliberately inverts that — new fields stay private until a ~2-minute const edit + deploy exposes them. Private-by-default is the point.

## What changes

- `lib/notion-experiments.ts`: read + enforce `Public` on all public read paths; add exported `PUBLIC_FIELD_ALLOWLIST`; filter mapped fields through it.
- `app/experiments/[slug]/page.tsx`: render allowlisted narrative rows with silent-omission empty states; Status chip in hero; links as buttons; admin ghost prompts.
- `app/page-client.tsx`: phase chip behind admin edit mode; restyled in admin.
- Notion (manual, checklisted): `Public` backfill on intended-public rows; copy fixes with exact strings — Best Day Ever "got to a better way" → "got to be a better way"; MVDS "an minimally viable" → "a minimally viable"; hero `--` → `—`. Verified by loading the live pages at archive time (manual scenario — external-system edits are not code-testable).

## Capabilities

### New Capabilities

- `public-content-gate`: Public routes enforce the Notion `Public` flag; experiment fields render from an enumerated, tested allowlist; internal process indicators are admin-only; empty fields omit silently.

### Modified Capabilities

(none)

## Impact

- `lib/notion-experiments.ts`, `app/experiments/[slug]/page.tsx`, `app/page-client.tsx`
- Notion "BHD Labs Projects" database — content-only edits (backfill + copy); no schema change
- Tests: allowlist filtering (including a "new unknown property stays private" case), Public-flag gating + 404 route test, phase-chip visibility component test
- Downstream: `tell-the-story` adds the History section below the guiding statements this change curates

## Optional links

- Review evidence: `labs.beckharrisdesign.com/experiments/mvds` ("PUBLIC No" rendered publicly), `/experiments/best-day-ever` (raw `LAST EDITED TIME`), homepage Etsy row ("Apply" chip)
- Reversed design intent: `lib/notion-experiments.ts:224` comment (extra columns "appear without a code change", from PR #295)
- Related changes: `openspec/changes/tell-the-story/` (detail-page History section), `openspec/changes/publish-the-graveyard/` (independent)
