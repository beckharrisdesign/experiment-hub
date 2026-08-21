## Human anchor

> "this rings true - lets work through the idea of beefing back up the selection
> machinery without losing the personal, human connection seeds that I write."

> "I don't want this to be the final decision or for hard coded architectural
> decisions to bite me later."

## Outcomes

- **Who:** Katy, at the moment an idea arrives — usually away from a terminal,
  usually with no afternoon available.
- **Job:** Write the seed down somewhere that counts, in her own words, without
  paying for a scaffold, a repo, or an analysis she has not decided to do yet.
- **Done when:** A new idea can be captured as a Notion row at
  `Status = Ideation` carrying only Hypothesis, Why this matters, and Who it's
  for; and there is a written, soft rule for what it takes to leave Ideation.
- **Not doing:** No CI enforcement, no new Notion property, no rubric
  unification, no cull cadence, no hub UI for the backlog, and no change to the
  existing Explore artifact.

## Why

Selection is not missing from this system — it is unreachable.

`openspec/schemas/bhd-experiment` already defines a full Explore artifact:
hypothesis, personal and strategic drivers, who-it's-for, exclusions,
competitive scan, TAM/SAM, a five-dimension scorecard, and two to three
permutations with projected score deltas. It has been used **once**
(`openspec/changes/etsy-notion-sync/`). The two real Explore artifacts in the
repo run 91 and 143 lines. Ten of thirteen active changes use
`experiment-hub-lite` instead, which is a *build* path with no selection stage —
so the front door of the system never asks whether the thing should exist.

The reason is cost, not disagreement. An Explore artifact is an afternoon, and
ideas do not arrive with an afternoon attached.

The part that bears on the anchor: in the Explore template the personal driver
is **the second of nine sections**. To record "my kids missed the Kona Ice
Truck," Katy must also do market sizing. So the human part of an idea only gets
written down once the idea is already heavy enough to justify the analysis —
which is backwards. The seed is the cheapest and most durable part of an
experiment and should be captured first, alone.

## What changes

Split the seed from the analysis.

A **seed** becomes a row in the BHD Labs Database at `Status = Ideation`,
carrying only three fields the database already has — Hypothesis, Why this
matters, Who it's for. No score, no repo, no `experiments/` directory, no
`explore.md`, no scaffold. Ideation currently holds zero rows, so nothing is
displaced.

Leaving Ideation takes two soft checks, in order:

1. **The specific-incident test** — does "Why this matters" name a concrete
   moment, or a category? This is not invented for this change. The three seeds
   in the catalog that name a moment (Best Day Ever, Landing Zone, Simple Seed
   Organizer) are also the three top-scoring rows: 12, 12 and 11 of 15. The test
   predicts the score rather than replacing it, which is why it can carry the
   gate without a number doing the work.
2. **A named score shape** over the three dimensions already on the row
   (`Score:PI`, `Score:SI`, `Score:BI`). Report the shape, not the total — a
   total invites a threshold, and a threshold is the thing that would flatten
   the writing.

Explore is untouched. It stops being the entrance and becomes what a seed earns
on the way to Discovery.

Per the second anchor line, this change deliberately adds no enforcement and no
schema or database migration. Backing it out is deleting files.

## Capabilities

### New Capabilities

- `experiment-seed-stage`: capture an idea as a seed, and decide when a seed is
  ready to become an experiment.

### Modified Capabilities

None. `bhd-experiment`'s Explore artifact and the `experiment-hub-lite` change
flow are both unchanged.

## Impact

- **Docs:** `docs/SELECTION.md` is the prose home for the convention.
- **Notion:** uses the existing `Status = Ideation` value and the existing
  Hypothesis / Why this matters / Who it's for / `Score:*` fields. No property
  is created, renamed, or removed.
- **Code:** none.
- **Reversibility:** deleting `docs/SELECTION.md` and this change directory
  returns the system to its current state. No data migration to unwind.

## Optional links

- Selection convention: [`docs/SELECTION.md`](../../../docs/SELECTION.md)
- System review that surfaced this: FigJam board "BHD Labs — Experiment Hub
  System Map"
- Existing heavyweight path:
  [`openspec/schemas/bhd-experiment/templates/explore.md`](../../schemas/bhd-experiment/templates/explore.md)
