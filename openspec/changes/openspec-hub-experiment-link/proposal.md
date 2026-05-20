## Human anchor

> "propose the link between openspec and my hub. In the explore phase, it just shows up in the hub list but has no link to deeper details."

## Outcomes

- **Who:** Founder using BHD/OpenSpec for a new experiment and the hub home table to scan the portfolio
- **Job:** From the hub list, open a detail view that shows the current BHD lifecycle (at minimum Explore) without requiring PRD/market-research files first
- **Done when:** A registered experiment with an active `openspec/changes/<id>/` BHD change has a working row link to `/experiments/<slug>` and that page surfaces readable Explore content (and phase label); creating or naming the OpenSpec change and hub registry stay in sync by convention or explicit metadata
- **Not doing:** Auto-merge OpenSpec Archive into `docs/founder/` stores; replacing BHD artifacts with PRD tabs; full bidirectional sync of scores into `experiments.json` (optional follow-up)

## Why

Two registries exist today with no bridge:

| System        | Location                                        | Hub UI uses it?                          |
| ------------- | ----------------------------------------------- | ---------------------------------------- |
| Hub catalog   | `data/experiments.json` + `experiments/<slug>/` | **Yes** — list and `/experiments/[slug]` |
| BHD lifecycle | `openspec/changes/<name>/` (`explore.md`, …)    | **No** — not read by app routes          |

`pomodoro-maker` illustrates the gap: BHD `explore.md` exists under OpenSpec, but without a hub registry row and without UI that reads phase artifacts, the experiment either **does not appear** on the list or appears as a **dead link** (404 if JSON/directory missing; empty Business Case/PRD tabs if registered but only OpenSpec content exists).

Home links already target `/experiments/${slugify(experiment.name)}` ([`app/page-client.tsx`](../../../app/page-client.tsx)); detail pages only load PRD, business case, and market research ([`app/experiments/[slug]/`](../../../app/experiments/[slug]/)) — not `explore.md`.

## What changes

1. **Registry contract** — Add optional `openspecChangeId` (and optionally `openspecSchema`, default `bhd-experiment`) on experiment records in [`data/experiments.json`](../../../data/experiments.json) / [`types/index.ts`](../../../types/index.ts). Convention when omitted: `openspecChangeId === experiment.id` if `openspec/changes/<id>/` exists.

2. **Bootstrap on BHD Explore** — Document in [`skills/openspec-propose.md`](../../../skills/openspec-propose.md) / [`skills/experiment-creator.md`](../../../skills/experiment-creator.md): when starting `bhd-experiment`, create or verify hub registry (minimal JSON row + `experiments/<id>/docs/`) so the list row is valid; optionally symlink or copy `explore.md` summary to `experiments/<id>/docs/intent.md` for Human-anchor parity.

3. **Detail surface** — On experiment detail, detect linked OpenSpec change; add a **Lifecycle** (or **Explore**) tab that renders phase artifacts (markdown) from `openspec/changes/<openspecChangeId>/` with phase badge (explore / propose / apply / archive) derived from which files exist.

4. **List affordances** — Home table: show phase chip when BHD change linked (e.g. "Explore"); ensure slug resolution uses `experiment.id` as fallback if `slugify(name)` ≠ id (fix mismatch footgun).

5. **Complements** — Works alongside [`dynamic-hub-experiment-list`](../../dynamic-hub-experiment-list/) (JSON-driven visibility); this change is the **content bridge**, not the visibility flag.

## Capabilities

### New Capabilities

- `hub-experiment-openspec-bridge`: Link hub catalog records to OpenSpec change dirs; experiment detail reads and displays BHD phase artifacts by phase

### Modified Capabilities

- `experiments-catalog`: Experiment records MAY include `openspecChangeId` / `openspecSchema`; readers resolve OpenSpec path for hub UI

## Impact

- **Code:** `types/index.ts`, `lib/data.ts` (resolve openspec change path), `app/experiments/[slug]/page.tsx`, `detail-client.tsx`, new tab content component, optional `app/page-client.tsx` phase chip
- **Skills:** `openspec-propose.md` (BHD explore step: ensure registry), `experiment-creator.md` (openspec change hint + link fields)
- **Data:** Example row for `pomodoro-maker` when registered
- **Tests:** Detail page with only `explore.md` shows Lifecycle tab; slug/id link consistency

## Optional links

- BHD change: [`openspec/changes/pomodoro-maker/explore.md`](../pomodoro-maker/explore.md)
- Schema: [`openspec/schemas/bhd-experiment/README.md`](../../schemas/bhd-experiment/README.md)
- Related: [`openspec/changes/dynamic-hub-experiment-list/proposal.md`](../dynamic-hub-experiment-list/proposal.md)
