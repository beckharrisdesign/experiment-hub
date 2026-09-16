# Proposal: retire-umbrella-switches

## Human anchor

> "now that we can control fills via tags, lets take off brute force
> umbrella rules like fill all, or satin all lines." — founder,
> 2026-09-16
>
> "I'd love to figure out how to apply different stitches to a path, or
> decide whether that path is a fill or a line." — founder, 2026-09-16

Founding record: `experiments/svg-to-stitch/docs/intent.md`; authoring
contract: `experiments/svg-to-stitch/docs/stitch-authoring.md`.

## Outcomes

- **Who:** Stitchers preparing their own artwork — the founder first —
  who tag layers in Figma and expect the converter to sew what the file
  declares, not what a panel switch decides on top of it.
- **Job:** Drop a prepped SVG in and get the stitches the design asks
  for, without having to notice, remember, or re-set three global
  toggles that can silently contradict every tag in the file.
- **Done when:** The panel carries no all-or-nothing stitch switch. A
  design converts identically whether it was just opened or the panel
  was fiddled with; an untagged shape sews by the documented fallback,
  and the only way to change one shape's stitch is to say so in the
  design file.
- **Not doing:** Changing the heuristics themselves — the untagged
  fallback keeps today's behaviour exactly. Removing **Fill angle**,
  **Fill density** or **Fabric**: the first two are parameters that
  `a`/`d` tags already override per shape, which the authoring contract
  endorses, and the third is a preview backdrop, not a stitch rule. No
  in-app per-object stitch picker — that is its own change.

## Why

The three switches predate the tag vocabulary. Each one applies a single
decision to every shape in the file: **Fill shapes** off flattens every
filled region to its boundary, **Satin narrow fills** decides tatami vs
satin for all of them at once, and **Satin strokes** does the same for
every stroke. They were the only control available before `st-` tags
existed.

Now they are the blunt instrument sitting on top of a precise one, and
they can contradict it. Review of PR #485 found the sharp edge: the
outline branch validated no fill directives at all, so with **Fill
shapes** off a shape tagged `st-brush` was silently flattened and an
out-of-range density passed unchecked. That specific hole is fixed, but
it was a symptom — a global switch and a per-shape declaration were
arguing, and the switch won quietly. The authoring contract already
names the destination: the heuristic decision tree "becomes the
**untagged fallback** … Tagged shapes bypass it entirely."

Every switch already has an exact per-shape equivalent, so nothing is
lost that the design file cannot say better:

| Switch | Its global effect | What replaces it |
| --- | --- | --- |
| **Fill shapes** (off) | every fill flattened to its boundary | `st-run` on a fill |
| **Satin narrow fills** | narrow fills satin vs tatami, all at once | `st-satin` / `st-tatami` |
| **Satin strokes** | every stroke ≤10 mm satin | `st-satin` / `st-run` |

The honest cost: auditioning a *bought* SVG you cannot easily tag gets
harder, because flipping one toggle was the quick way to see it another
way. That is the trade the anchor accepts — the file becomes the record,
and a conversion becomes reproducible from the file alone.

## What changes

- The three switch rows leave the panel, and with them the `fillMode`,
  `satinFills` and `satinStrokes` converter options.
- Outline mode is deleted rather than defaulted: with no switch, its
  branch is unreachable, and `st-run` on a fill already sews a boundary.
  This also retires the open tag-vs-switch question the review raised.
- Untagged shapes keep exactly today's default behaviour — fills hatch,
  narrow fills try satin first, strokes ≤10 mm satin — now documented as
  the fallback rather than as switch positions.
- The authoring contract's "What this replaces, and when" section moves
  from future tense to present.

## Capabilities

### New Capabilities

- `untagged-fallback`: the documented rule for a shape that declares
  nothing — what a bought or un-prepped file sews, stated once, with no
  global control able to change it.

### Modified Capabilities

- (none at the spec level — `brush-engine` and `brush-library` are
  untouched. The converter's options type loses three fields and the
  outline branch, per Impact.)

## Impact

- `app/svg-to-stitch/page.tsx`: three `Switch` rows and their state
  removed; **Fill angle**, **Fill density**, **Fabric** stay.
- `lib/svg-to-stitch/convert.ts`: `fillMode`, `satinFills`,
  `satinStrokes` options dropped; the `fillMode === "outline"` branch
  deleted; `rejectBrushOnFill` and `checkTagDensity` collapse back to a
  single call site each.
- `tests/`: the outline-mode regressions added in PR #485 retire with
  the mode they guard; tag coverage grows to pin the fallback so it
  cannot drift silently.
- `experiments/svg-to-stitch/docs/stitch-authoring.md`: fallback section
  rewritten as shipped behaviour.
- `experiments/svg-to-stitch/README.md`: panel description.

## Optional links

- Experiment directory: `experiments/svg-to-stitch/`
- Tagging brief: `experiments/svg-to-stitch/docs/brush-tagging-brief.md`
- Prior change: `openspec/changes/stitch-brushes/`
