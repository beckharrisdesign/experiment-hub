## Human anchor

> "making the experiment list on the hub landing page dynamic based on whats in experiments.json"

## Outcomes

- **Who:** Hub visitor (founder) scanning the home page experiment table
- **Job:** See every experiment that should appear on the hub without editing React code when adding or hiding one
- **Done when:** Adding or updating a record in `data/experiments.json` is sufficient to include or exclude an experiment on the hub home list (Active/Inactive tabs); no hardcoded ID list in `page-client.tsx`
- **Not doing:** Auto-discovering experiments from filesystem folders without a JSON entry; redesigning the table layout; changing experiment detail routes

## Why

The home page server component already calls `getExperiments()` from `data/experiments.json`, but the client still filters out `experience-principles-repository` via `HIDDEN_EXPERIMENT_IDS`. That duplicates source of truth and blocks "add to JSON → shows on hub" for new experiments (e.g. Pomodoro Maker) when maintainers forget to touch frontend code. Visibility should live in data, not a static array.

## What changes

- Remove `HIDDEN_EXPERIMENT_IDS` from [`app/page-client.tsx`](../../../app/page-client.tsx)
- Add optional `hubListVisible` (or equivalent) on experiment records in `data/experiments.json` and [`types/index.ts`](../../../types/index.ts); default **true** when omitted
- Set `hubListVisible: false` on experiments that should not appear on the home table (e.g. `experience-principles-repository`) while keeping them in JSON for other surfaces if needed
- Document the field for `@experiment-creator` / JSON editors
- Tests: home list respects JSON-only visibility; inactive tab still uses `status === "Abandoned"`

## Capabilities

### New Capabilities

- `hub-home-experiment-list`: Hub landing table lists experiments from JSON with optional per-record visibility flag; Active/Inactive tabs driven by `status` only

### Modified Capabilities

- `experiments-catalog`: Experiment record schema and readers tolerate optional hub list visibility metadata

## Impact

- **Code:** `app/page.tsx`, `app/page-client.tsx`, `types/index.ts`, `data/experiments.json`, `skills/experiment-creator.md` (one line on optional field)
- **Tests:** `tests/` for home filtering (extend or add)
- **Specs:** `openspec/specs/experiments-catalog/spec.md` delta via change specs
- **No API routes** — server-side read path unchanged except filter semantics

## Optional links

- Existing catalog spec: [`openspec/specs/experiments-catalog/spec.md`](../../specs/experiments-catalog/spec.md)
- Related UI: [`app/page-client.tsx`](../../../app/page-client.tsx) "All experiments" section
