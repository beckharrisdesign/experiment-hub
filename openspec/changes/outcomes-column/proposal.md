# outcomes-column

## Human anchor

> "consider these the explore artifact of an openspec changes. Stop the leaks could be one, publish the graveyard could be two, etc. I want to focus on writing out some of these plans today."

(Selected as one of the four changes in the 2026-07-17 review session. Companion decision from the same session: outcome/kill-reason content lives in Notion so Katy "can edit or augment later.")

## Outcomes

- **Who:** Outside readers who need one measured fact per experiment to believe the rigor story — and Katy, for whom writing the line is the forcing function to actually check the numbers.
- **Job:** Every experiment can show a single hand-written, measured outcome line ("212 scheduled sync runs, 0 errors", "0 signups from 500 visits — killed") on the homepage table and detail page.
- **Done when:**
  1. The `Outcome` rich-text property in Notion (created by `publish-the-graveyard`; created here if that change hasn't shipped) renders as a column/line on the homepage table for every experiment that has one, and on the detail page.
  2. An experiment without an outcome shows "—", visibly. The empty state is allowed but never hidden — the gap itself is information.
  3. The sourcing rule is documented where Katy writes the lines (a note on the Notion property): **only measured facts** — a number, a date, a decision. No aspirations, no adjectives.
  4. Outcome lines exist for at least the three flagship active experiments at launch (Best Day Ever, Simple Seed Organizer, Etsy → Notion Sync — e.g., its sync-run stats are already in Supabase `sync_runs`).
- **Not doing:** Automated metrics collection, analytics pipelines, or wiring Supabase/ad-platform data into the column — the line is manual by design; per-experiment dashboards; historical outcome timelines.

## Why

The 2026-07-17 review's sharpest finding: the site shows process everywhere and outcomes nowhere — scores are self-assigned, every market-research verdict is "GO," and no user numbers, conversion data, or run counts appear anywhere. One honest outcome line per experiment converts the homepage from process display to evidence display. It is deliberately manual: automation would delay shipping by weeks and remove the discipline of Katy personally standing behind each number. The kill reasons from `publish-the-graveyard` are the same property serving the same purpose for dead experiments — one field, one honesty rule, whole portfolio.

## What changes

- Render `Outcome` on the homepage table (new column or sub-line under the experiment name — decide in design; mobile behavior matters, the table is already dense at 375px).
- Render `Outcome` on the experiment detail page as a first-class field.
- Notion property description documents the sourcing rule.
- Katy writes the initial lines for active experiments (manual task, checklisted).

## Capabilities

### New Capabilities

- `outcome-line`: A manual, measured outcome statement per experiment, editable in Notion, rendered on public surfaces with an honest empty state.

### Modified Capabilities

(none)

## Impact

- `app/page-client.tsx` (table), `app/experiments/[slug]/page.tsx` (detail field)
- `lib/notion-experiments.ts` (read `Outcome` — shared with `publish-the-graveyard`)
- Notion database: property + description (shared)
- Tests: rendering + empty state

## Optional links

- Ordering: soft dependency on `openspec/changes/publish-the-graveyard/` (creates the `Outcome` property); this change is independently shippable if it creates the property itself
- Outcome data already on hand for Etsy → Notion Sync: Supabase `sync_runs` table (visible in the admin sync panel)
