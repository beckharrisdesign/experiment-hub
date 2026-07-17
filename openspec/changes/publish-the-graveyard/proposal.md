# publish-the-graveyard

## Human anchor

> "Stop the leaks could be one, publish the graveyard could be two, etc. I want to focus on writing out some of these plans today."

> "draft from business cases, but make sure I can edit or augment later"

(From the 2026-07-17 outside-investor review session — the second quote is Katy's decision on where kill-reason content comes from.)

## Outcomes

- **Who:** Investors and hiring managers evaluating decision quality — kill discipline with crisp reasoning is the strongest credibility signal a lab can show — and Katy, who needs the portfolio to reflect reality ("it's my OS").
- **Job:** Dead experiments are visible on the live site with an honest one-line reason for each death, and experiment status has a single source of truth that can actually express "dead."
- **Done when:**
  1. The Notion Status property gains **Abandoned**, **On Hold**, and **Archived** options, and `lib/notion-experiments.ts` maps them in both directions. Today the comment in that file says it plainly: "Abandoned/On Hold/Archived have no Notion option and stay unwritable" — the graveyard is structurally impossible until this lands.
  2. The six dead experiments that exist only in `data/experiments.json` (seed-finder, garden-guide-generator, photo-memories, the-illuminator, experience-principles-repository, ai-event-landing-zone) exist as Notion rows with correct statuses.
  3. Each dead experiment has a one-paragraph kill reason in an editable Notion property (**`Outcome`**, rich text), drafted from the existing `business-case.md` abandonment notes and approved by Katy before going live. Katy can edit or augment any of them in Notion at any time afterward.
  4. The homepage **Inactive tab** lists Abandoned + Archived + On Hold experiments with their kill reason line. The current mis-bucketing is fixed: the filter at `app/page-client.tsx:59` keys only on `status !== "Abandoned"`, which is why Archived rows land in the Active tab.
  5. Status conflicts between `data/experiments.json` and Notion are reconciled with Notion as the winner going forward (e.g., Landing Zone is Archived in the JSON but renders Active on the live site today).
  6. Enforcing the workflow gate becomes possible: Katy can demote gate-violating experiments (e.g., Pomodoro Maker, Active with only an `intent.md`) to On Hold directly in Notion. The demotion itself is her manual action, unblocked by this change.
- **Not doing:** Full retrospectives or `learnings.md` backfill; case-study pages; automated status inference; deleting the `HIDDEN_EXPERIMENT_IDS` hack unless experience-principles-repository's new status makes it redundant (check during apply); the Outcome line for *active* experiments (that's `outcomes-column`).

## Why

The live site says "Inactive (0)" while the repo records six killed experiments — several with genuinely sharp abandonment reasoning buried in `business-case.md` ("the business case is indistinguishable from a cool demo. Abandonment in the hub is fair until quality is proven on-thread."). For an outside reader, a lab that has never killed anything either isn't measuring or isn't being honest; either reading damages the site's central claim of evidence-driven rigor. Meanwhile every recorded market-research verdict is "GO" — the kill reasons are the only counterweight, and they're invisible.

This is a data-model problem first (no dead statuses exist in Notion), a migration second (dead rows never moved to Notion), and a UI fix third (status bucketing). All three belong to one change because shipping any subset leaves the graveyard still hidden.

## What changes

- Notion "BHD Labs Projects" database: add Status options (Abandoned, On Hold, Archived) and an `Outcome` rich-text property.
- `lib/notion-experiments.ts`: extend `STATUS_MAP` and `HUB_TO_NOTION_STATUS` both directions; read `Outcome`.
- Data migration: create Notion rows for the six dead experiments; drafted kill reasons written into `Outcome` (Katy approves each draft before it ships).
- `app/page-client.tsx`: Inactive bucket = Abandoned ∪ Archived ∪ On Hold; render the kill-reason line on inactive rows.
- `data/experiments.json`: statuses annotated/reconciled so the JSON fallback agrees with Notion.

## Capabilities

### New Capabilities

- `experiment-status-model`: Notion expresses the full lifecycle including dead states, mapped bidirectionally by the hub.
- `graveyard-visibility`: Inactive experiments render publicly with an editable one-line kill reason.

### Modified Capabilities

(none)

## Impact

- Notion database schema (2 property changes) + 6 new rows
- `lib/notion-experiments.ts`, `app/page-client.tsx`, `data/experiments.json`
- Draft source material: `experiments/*/docs/business-case.md` abandonment notes
- Tests: status bucketing + Outcome rendering in `tests/lib/`, `tests/components/`
- Downstream: `outcomes-column` renders the same `Outcome` property for active experiments — this change creates the property, so it should land first (soft ordering, not a hard block)

## Optional links

- Kill-reason draft sources: `experiments/seed-finder/docs/business-case.md`, `experiments/garden-guide-generator/docs/business-case.md`, `experiments/the-illuminator/docs/business-case.md`, `experiments/photo-memories/docs/business-case.md`, `experiments/ai-event-landing-zone/docs/business-case.md`
- Mis-bucketing evidence: `app/page-client.tsx:59` (Active = `status !== "Abandoned"`), `app/page-client.tsx:36` (`HIDDEN_EXPERIMENT_IDS`)
- Related changes: `openspec/changes/outcomes-column/` (consumes `Outcome`), `openspec/changes/stop-the-leaks/` (independent)
