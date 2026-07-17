# stop-the-leaks — tasks

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Private row is hidden from public routes
- [ ] 1.2 Backfilled public rows still render
- [ ] 1.3 Bookkeeping fields are filtered out
- [ ] 1.4 New Notion properties stay private by default
- [ ] 1.5 Statements render in narrative order
- [ ] 1.6 Missing fields are omitted silently
- [ ] 1.7 Phase chip gated to edit mode
- [ ] 1.8 Ghost prompts appear only in edit mode
- [ ] 1.9 Copy fixes verified on live pages

## 2. Pre-deploy data (Notion — manual, gating)

- [ ] 2.1 **Backfill `Public` = Yes** on every intended-public row in the "BHD Labs Projects" database *before* the enforcing deploy — otherwise private-by-default blanks the live portfolio. Confirm the exact `Public` property type (checkbox vs select) and record it so 3.1 reads the right shape.
- [ ] 2.2 Copy fixes in Notion: Best Day Ever "got to a better way" → "got to be a better way"; MVDS "an minimally viable" → "a minimally viable"; remove `--` from hero copy (use `—`).

## 3. Implementation

- [ ] 3.1 `lib/notion-experiments.ts`: read the `Public` property; filter non-public (No/unset) rows out of every public read path (list + by-slug). (→ 1.1, 1.2)
- [ ] 3.2 `lib/notion-experiments.ts`: add exported `PUBLIC_FIELD_ALLOWLIST = ["Why this matters", "Hypothesis", "Exec Summary"]`; map/filter detail fields through it so unlisted properties never reach the page. Status is handled separately (hero chip), not via the field list. (→ 1.3, 1.4)
- [ ] 3.3 `app/experiments/[slug]/page.tsx`: render allowlisted narrative rows in order (label-over-prose, drop the 240px side-label grid per design.md decision 2); omit missing fields silently; when all three are empty, render the hero statement alone (remove the light content band). No demo/code buttons (deferred to `clickable-artifacts`). (→ 1.5, 1.6)
- [ ] 3.4 `app/experiments/[slug]/page.tsx`: Status renders as a hero chip beside the type badge, not as a field row. Also fix `ExperimentTypeBadge` returning `null` for `commercial` (design.md Risks) so Business-type experiments show a type badge — or consciously leave and note it.
- [ ] 3.5 `app/experiments/[slug]/page.tsx`: in admin edit mode (existing `hub-edit` cookie), render ghost prompts ("Add a hypothesis →") for missing statements; render nothing there for anonymous visitors. (→ 1.8)
- [ ] 3.6 `app/page-client.tsx`: gate the OpenSpec phase chip on admin edit mode; restyle it in admin so it no longer reads as a CTA/button (design.md decision 6). (→ 1.7)

## 4. QA

- [ ] 4.1 Manual walkthrough on the running app: a private/unset row 404s and is absent from the homepage table; a public row shows only Why this matters / Hypothesis / Exec Summary + Status chip, no bookkeeping fields, no buttons; a partial row omits missing fields with no dashes; admin edit mode shows ghost prompts + the phase chip, anonymous shows neither. (→ 1.1, 1.3, 1.5, 1.6, 1.7, 1.8)
- [ ] 4.2 Automated (vitest): allowlist filters a row with `Hypothesis` + `Last edited time`/`Name alt`/`Score tag`/`Public` to Hypothesis only; a new unknown property stays out; `Public` = No/unset yields no public row (unit) + 404 (route); phase-chip component renders only with the cookie. (→ 1.3, 1.4, 1.1, 1.7)
- [ ] 4.3 Post-deploy live-page verification of the copy fixes: `/experiments/best-day-ever` contains "got to be a better way"; `/experiments/mvds` contains "a minimally viable"; homepage hero has no `--`. (→ 1.9)
