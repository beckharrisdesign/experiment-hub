## Human anchor

> "Shift experiment detail from a mixture of Lifecycle + Business Case + PRD to tabs that match the bhd-experiment schema artifacts — render the markdown cleanly, and don't show tabs that have no artifact under them."

## Outcomes

- **Who:** Founder on an experiment detail page (e.g. Pomodoro Maker in Explore)
- **Job:** Read the current BHD phase artifact in a dedicated tab, scan other phases only when they exist, without empty tabs or placeholder copy
- **Done when:** For a linked `bhd-experiment` change, the detail header shows **one tab per phase file that exists and is non-empty** (`explore.md`, `propose.md`, `apply.md`, `archive.md`); default tab is the **current phase**; markdown renders via the hub `MarkdownContent` pattern; **Business Case** and **PRD** tabs appear only when legacy `docs/business-case.md` / `docs/PRD.md` exist (not when empty)
- **Not doing:** Replacing OpenSpec files with PRD; auto-syncing scores; editing BHD artifacts in-browser (read-only v1); redesigning the hero or global nav

## Why

[`openspec-hub-experiment-link`](../openspec-hub-experiment-link/) added a **Lifecycle** tab that stacks every phase in one scroll — while **Business Case** and **PRD** still show always, often empty. That duplicates the mental model:

| Today (mixed)                           | BHD schema (`bhd-experiment`)                        |
| --------------------------------------- | ---------------------------------------------------- |
| Lifecycle (all phases stacked)          | `explore.md`, `propose.md`, `apply.md`, `archive.md` |
| Business Case (`docs/business-case.md`) | Business Brief lives in **Propose**                  |
| PRD (`docs/PRD.md`)                     | Optional parallel track, not a phase                 |

Pomodoro Maker shows **Business Case** active with "No business case yet" while **Explore** content lives in OpenSpec — confusing and contrary to the schema.

## What changes

1. **Tab model (BHD-linked)** — Replace the single Lifecycle tab with **phase tabs** aligned to schema artifact ids: Explore, Propose, Apply, Archive. Build the tab list from `openSpecLifecycle.artifacts` (already loaded server-side). Hide any phase with no file / empty content.

2. **Tab model (not BHD-linked)** — Keep PRD and Business Case only; apply the same **hide-if-empty** rule (no tab, no placeholder panel).

3. **Default selection** — When BHD-linked: `activeTab` = `currentPhase` (e.g. `explore`). If that phase tab is hidden (edge case), fall back to first available phase tab, then legacy tabs.

4. **Content panel** — One phase per tab: header with phase label + "Current phase" chip when applicable; body = `MarkdownContent` (`variant="light"`) inside existing prose container. Remove stacked multi-phase layout from [`tabs-content.tsx`](../../../app/experiments/[slug]/tabs-content.tsx).

5. **Legacy tabs** — Append **Business Case** / **PRD** after phase tabs **only when** `businessCaseContent` / `prdRawContent` are non-empty. Order: Explore → Propose → Apply → Archive → Business Case → PRD.

6. **Spec delta** — Update [`hub-experiment-openspec-bridge`](../openspec-hub-experiment-link/specs/hub-experiment-openspec-bridge/spec.md): replace "Lifecycle tab" requirements with per-phase tabs and empty-tab hiding.

7. **Tests** — Pomodoro (explore only): tabs = Explore only (+ PRD/BC if files added later); no Business Case tab when file missing.

## Capabilities

### New Capabilities

- `hub-bhd-phase-tabs`: Experiment detail derives visible tabs from BHD phase artifacts and optional legacy docs; no empty tabs

### Modified Capabilities

- `hub-experiment-openspec-bridge`: Per-phase tabs instead of combined Lifecycle; hide empty legacy tabs

## Impact

- **Code:** [`app/experiments/[slug]/detail-client.tsx`](../../../app/experiments/[slug]/detail-client.tsx), [`tabs-content.tsx`](../../../app/experiments/[slug]/tabs-content.tsx), possibly shared tab helper in `lib/openspec-shared.ts`
- **Docs:** [`openspec/changes/openspec-hub-experiment-link/design.md`](../openspec-hub-experiment-link/design.md) tab-order note superseded by this change
- **Tests:** Detail tab visibility for `pomodoro-maker` (Explore only); experiment with PRD only (PRD tab only)

## Optional links

- Schema: [`openspec/schemas/bhd-experiment/schema.yaml`](../../schemas/bhd-experiment/schema.yaml)
- Prior bridge: [`openspec/changes/openspec-hub-experiment-link/proposal.md`](../openspec-hub-experiment-link/proposal.md)
- Screenshot context: Pomodoro detail with empty Business Case tab while Explore exists in OpenSpec
