# Artifacts — openspec-change-visualizer

Everything this change generated, in the order it was made. Renders are
committed alongside the change so they survive the branch being deleted.

## Thinking

| | |
| --- | --- |
| Intent, discovery record and design rules | [`docs/intent.md`](intent.md) |
| Pull request | [#409](https://github.com/beckharrisdesign/experiment-hub/pull/409) |

## OpenSpec change

`openspec/changes/openspec-change-visualizer/` — schema `experiment-hub-lite`.

| Artifact | |
| --- | --- |
| Proposal | [`proposal.md`](../../../openspec/changes/openspec-change-visualizer/proposal.md) |
| Requirements — `change-page` | [`specs/change-page/spec.md`](../../../openspec/changes/openspec-change-visualizer/specs/change-page/spec.md) — 5 requirements, 15 scenarios |
| Requirements — `change-claim-verification` | [`specs/change-claim-verification/spec.md`](../../../openspec/changes/openspec-change-visualizer/specs/change-claim-verification/spec.md) — 2 requirements, 5 scenarios |
| Design | [`design.md`](../../../openspec/changes/openspec-change-visualizer/design.md) — Visual design table, 9 decisions, 6 risks |
| Tasks | [`tasks.md`](../../../openspec/changes/openspec-change-visualizer/tasks.md) — 30/38, §5 records the correction |

## Figma

File [`openspec-change-visualizer`](https://www.figma.com/design/2FEqaAxp50skge0yJI5wAC/openspec-change-visualizer)
(`2FEqaAxp50skge0yJI5wAC`). Numbered pages per `rules/figma.mdc`; every proposal
iteration is a new page, so earlier passes stay intact.

| Page | Frame | Node |
| --- | --- | --- |
| `00 Components — MVDS Core` | Badge, Card, Callout instances | — |
| `01 Current state` | The five sources, and their disagreement | `1:3` |
| `01.1 Current state` | The hub shell, with no `/changes` route | `44:3` |
| `02 Proposed` | First card | `5:2` |
| `02.1` | Every outcome with its evidence kind | `9:3` |
| `02.2` | Larger type scale | `10:3` |
| `02.3` | Multiple capabilities, and a loop back to design | `11:3` |
| `02.4` | The change as a stream | `16:3` |
| `02.5` | The stream, carrying its artifacts | `21:150` |
| `02.6` | Stage lane, notes behind an icon | `23:3` |
| `02.7` | Standing state above the timeline | `28:3` |
| `02.8` | The prose comes out | `30:3` |
| `02.9` | Intent restored, without the byline | `31:3` |
| `02.10` | Anchor text verbatim, unquoted | `35:3` |
| `02.11` | Intent, three sentences | `43:3` |
| `02.12` | Inside the hub shell — Desktop 1024 and Mobile 480 | `44:292`, `45:2` |
| `02.13` | **Built on MVDS Core — the shipped design** | `49:3` |

## Committed renders

Design-gate frames, in the change folder:

- [`current-hub-shell-desktop-1024.png`](../../../openspec/changes/openspec-change-visualizer/assets/current-hub-shell-desktop-1024.png)
- [`proposed-changes-page-mvds-desktop-1024.png`](../../../openspec/changes/openspec-change-visualizer/assets/proposed-changes-page-mvds-desktop-1024.png)
- [`proposed-changes-page-desktop-1024.png`](../../../openspec/changes/openspec-change-visualizer/assets/proposed-changes-page-desktop-1024.png)
- [`proposed-changes-page-mobile-480.png`](../../../openspec/changes/openspec-change-visualizer/assets/proposed-changes-page-mobile-480.png)

Iteration renders, in the experiment folder: [`docs/assets/`](assets/) — eight
frames, `01 Current state` through `02.11`.

## Code

| | |
| --- | --- |
| Route | [`app/changes/[id]/page.tsx`](../../../app/changes/%5Bid%5D/page.tsx) |
| Readers | [`lib/change-visualizer/`](../../../lib/change-visualizer/index.ts) — `git`, `gates`, `tasks`, `specs`, `prs`, `design-ref`, `drift` |
| View | [`components/change-visualizer/ChangePageView.tsx`](../../../components/change-visualizer/ChangePageView.tsx) |
| Tests | [`tests/lib/change-visualizer/`](../../../tests/lib/change-visualizer/page.test.ts) — 37 passing |

## Live

`/changes/<id>` renders any of the 47 changes. The two worth opening first are
the ones the format was built against:

- `/changes/tell-the-story` — one capability, a loop back to proposal, a 31-day
  silence, and the 3.11 disagreement
- `/changes/pdf-metadata-viewer-cloud` — three capabilities, workstream tasks
  that cannot be split, and the 2.1b disagreement
