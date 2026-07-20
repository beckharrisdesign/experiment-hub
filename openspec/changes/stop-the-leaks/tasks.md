# stop-the-leaks — tasks

## 1. User outcomes (from spec scenarios)

- [x] 1.1 Private row is hidden from public routes
- [ ] 1.2 Backfilled public rows still render *(code reads `Public`; verify after the §2.1 backfill)*
- [x] 1.3 Bookkeeping fields are filtered out
- [x] 1.4 New Notion properties stay private by default
- [x] 1.5 Statements render in narrative order
- [x] 1.6 Missing fields are omitted silently
- [x] 1.7 Phase chip gated to edit mode
- [x] 1.8 Ghost prompts appear only in edit mode
- [ ] 1.9 Copy fixes verified on live pages *(post-deploy, §4.3)*

## 2. Pre-deploy data (Notion — manual, gating)

- [ ] 2.1 **Backfill `Public` = Yes** on every intended-public row in the "BHD Labs Projects" database *before* the enforcing deploy — otherwise private-by-default blanks the live portfolio. ✅ Property type confirmed **checkbox** (BHD Labs Database `399b908d…`, verified via Notion 2026-07-20); 3.1 reads `properties.Public.checkbox === true`.
- [ ] 2.2 Copy fixes in Notion: Best Day Ever "got to a better way" → "got to be a better way"; MVDS "an minimally viable" → "a minimally viable"; remove `--` from hero copy (use `—`).

## 3. Implementation

- [x] 3.1 Read the `Public` property; filter non-public (No/unset) rows out of every public read path. **Deviation (approved 2026-07-20):** filtering lives at the public *surfaces* (`app/page.tsx` list + `app/experiments/[slug]/page.tsx` 404), not inside `getExperimentsFromNotion` — that shared reader also feeds the admin page, which must still see private rows. `mapNotionPageToExperiment` now sets `public` on the `Experiment`; anonymous filtering keys off `public !== false`. (→ 1.1, 1.2)
- [x] 3.2 `lib/notion-experiments.ts`: added exported `PUBLIC_FIELD_ALLOWLIST = ["Why this matters", "Hypothesis", "Exec Summary"]`; `getExperimentFieldsFromNotion` now returns only those, in order. Status handled separately (hero chip). (→ 1.3, 1.4)
- [x] 3.3 `app/experiments/[slug]/page.tsx`: renders allowlisted narrative statements in order (label-over-prose, 720px measure, grid dropped); missing omitted silently; all-empty removes the content band (hero flush to footer). No demo/code buttons. (→ 1.5, 1.6)
- [x] 3.4 `app/experiments/[slug]/page.tsx`: Status renders as a hero `StatusBadge` chip beside the type badge. **Note:** the `ExperimentTypeBadge` `commercial` → `null` fix is already in flight as **PR #299**, so it's intentionally left out of this PR to avoid a conflict; hero includes `<ExperimentTypeBadge>` and picks up the fix when #299 lands.
- [x] 3.5 `app/experiments/[slug]/page.tsx`: admin edit mode (`hub-edit` cookie via `requireAdminCookie`) shows ghost prompts ("Add why this matters →") for missing statements; anonymous sees neither. Edit mode also bypasses the private-row 404. (→ 1.8)
- [x] 3.6 `app/page.tsx` gates the OpenSpec phase chip on edit mode (only loads the lifecycle when the cookie is present) and filters private rows for anonymous; `app/page-client.tsx` restyles the chip dashed/unfilled/muted so it reads as metadata, not a CTA. (→ 1.7)

## 4. QA

- [ ] 4.1 Manual walkthrough on the running app: a private/unset row 404s and is absent from the homepage table; a public row shows only Why this matters / Hypothesis / Exec Summary + Status chip, no bookkeeping fields, no buttons; a partial row omits missing fields with no dashes; admin edit mode shows ghost prompts + the phase chip, anonymous shows neither. (→ 1.1, 1.3, 1.5, 1.6, 1.7, 1.8)
- [x] 4.2 Automated (vitest, `tests/lib/notion-experiments.test.ts`): allowlist returns only the three statements and never leaks bookkeeping/scores/status/type/`Public`; an empty allowlisted field is omitted; `mapNotionPageToExperiment` sets `public` false unless the checkbox is checked. 70/70 pass; `tsc --noEmit` clean. *(Route-level 404 + homepage-filter integration stay in the §4.1 manual pass — they need a running app.)* (→ 1.3, 1.4, 1.1)
- [ ] 4.3 Post-deploy live-page verification of the copy fixes: `/experiments/best-day-ever` contains "got to be a better way"; `/experiments/mvds` contains "a minimally viable"; homepage hero has no `--`. (→ 1.9)
