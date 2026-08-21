# Selection — the seed stage

**Status: provisional.** This is a first attempt, written to be revised. It adds
no code, no CI gate, no Notion property, and no schema change, specifically so
that changing your mind later costs nothing. Revisit after roughly ten seeds
have gone through it — see [Open questions](#open-questions).

---

## The problem this addresses

The selection machinery already exists. `openspec/schemas/bhd-experiment` defines
an Explore artifact with hypothesis, personal and strategic drivers, who-it's-for,
exclusions, a competitive scan, TAM/SAM, a five-dimension scorecard, and two to
three permutations with projected score deltas.

It has been used **once** — `openspec/changes/etsy-notion-sync/explore.md`. The
two real Explore artifacts in the repo run 91 and 143 lines. Ten of thirteen
active changes use `experiment-hub-lite` instead, which is a *build* path with no
selection stage at all.

So the entry point to the system is a schema that never asks whether the thing
should exist. Not because selection was rejected — because it costs an afternoon,
and ideas do not arrive with an afternoon attached.

The second-order effect matters more. In the Explore template the personal driver
is **the second of nine sections** (the schema's instruction behind it lists
eleven required subsections). To write down "my kids missed the Kona Ice Truck," you
must also do market sizing. So the human part of an idea only gets recorded once
the idea is already heavy enough to justify the analysis — which is backwards.
The seed is the cheapest and most durable part; it should be the first thing
captured, not a subsection of the most expensive artifact.

---

## The seed stage

A seed is a row in the **BHD Labs Database** with `Status = Ideation`. It requires
only the three fields already in the schema, and nothing else:

| Field | What goes in it |
| --- | --- |
| **Hypothesis** | One line. What you believe that, if true, would justify building this. |
| **Why this matters** | The moment. Personal, specific, in your own voice. |
| **Who it's for** | The person. You count. |

That is the whole artifact. **No score, no repo, no `experiments/` directory, no
`explore.md`, no scaffold.** Those are all downstream of a decision that has not
been made yet.

Ideation currently holds zero rows, so nothing is displaced by starting to use it.

### Leave `Public` unchecked

The hub reads this same database, so a seed is a row the site can see. Leaving
`Public` unchecked — Notion's default for a new row — keeps it off the public
catalog: `lib/notion-experiments.ts` reads an unset checkbox as `public: false`,
and both the experiment list and the detail route gate on that, the detail route
by returning 404.

Stated here rather than left to the default, because a default nobody wrote down
is a default that eventually changes.

One consequence worth knowing: inside admin edit mode a seed shows as **Active**.
`STATUS_MAP` collapses all five pre-launch Notion phases — Ideation included —
onto the single hub status `Active`. Accepted for now; see
`openspec/changes/selection-seed-stage/design.md`.

### Why these three fields and not a new form

They are what already produces the best writing in the system. Nothing here asks
you to write differently — it asks for the part you already write, earlier, and
without the eight other sections attached.

---

## The gate out of Ideation

Two things, in order. Both are soft — they are prompts for a human decision, not
thresholds a tool enforces.

### 1. The specific-incident test

**Does "Why this matters" name a concrete moment, or a category?**

This is not a proxy for rigor invented for this document. It is the pattern the
existing catalog already shows. The vivid ones:

> "I didn't see a reminder buried in an email — and my kids missed the Kona Ice
> Truck." — *Landing Zone*

> "I still dig through a neglected box stuffed with seed packets every year."
> — *Simple Seed Organizer*

> "Not gonna lie - I want this for me." — *MVDS*

The abstract one: *Figma Grabber* — "Design and product people need a dead simple
browser-to-Figma handoff." And *Snap Issue* has no Hypothesis, no Why, and no Who
at all — only a tagline. It is Launched regardless.

The test predicts the score rather than replacing it. The three seeds naming a
specific incident are also the three highest-scoring rows in the catalog:

| Experiment | Seed names an incident | P | S | B | Total |
| --- | --- | --- | --- | --- | --- |
| Best Day Ever | yes | 5 | 4 | 3 | 12/15 |
| Landing Zone | yes | 5 | 4 | 3 | 12/15 |
| Simple Seed Organizer | yes | 5 | 4 | 2 | 11/15 |
| MVDS | yes, briefly | 4 | 2 | 2 | 8/15 |
| Etsy → Notion Sync | no | 5 | 1 | 1 | 7/15 |
| PDF Metadata Viewer | no | 3 | 3 | 1 | 7/15 |

A seed that fails the test is not rejected. It goes back to Ideation to wait for
its moment — often the moment arrives later and the seed becomes obvious.

### 2. A score shape

Score the three dimensions already on the row — `Score:PI`, `Score:SI`,
`Score:BI` — and name the shape. **Report the shape, not the total.** A shape is
a judgment about what kind of thing this is; a total out of 15 invites a
threshold, and a threshold is the thing that would flatten the seeds.

Shapes observed in the existing portfolio, as a starting vocabulary:

- **Mission-driven** — P high, S high, B modest. *Best Day Ever, Landing Zone,
  Simple Seed Organizer.*
- **Personal tool** — P high, S and B low. Built because you need it and the
  need is real. *MVDS, Etsy → Notion Sync.* The `bhd-experiment` schema calls
  this "Hobby horse"; "personal tool" is less pejorative for something that is
  a legitimate reason to build.
- **Unproven** — nothing above 3. *PDF Metadata Viewer.* Not a rejection; a flag
  that the seed has not found its moment yet.

The taxonomy in `openspec/schemas/bhd-experiment/schema.yaml` also lists
Strong-go, Big-bet and Cheap-and-useful. **No row in the catalog currently has
that shape** — Business never exceeds 3 and Personal never drops below 3 across
all six scored rows. That is worth knowing about the portfolio, and it is a
reason not to hard-code a shape rule yet.

Naming a new shape is expected. The vocabulary should grow from what actually
shows up.

---

## What deliberately is not decided

Recorded so these are visible choices rather than oversights:

- **No enforcement.** Nothing in CI checks that a seed exists, has a score, or
  passed a gate. Enforcement on a convention this young would calcify a guess.
- **No new Notion property.** Everything above uses fields the database already
  has. Backing this out means deleting one markdown file.
- **No rubric unification, yet.** Three rubrics currently disagree —
  `lib/rubric.ts` (personal/social/business), Notion's `Score:PI/SI/BI` *plus*
  legacy `Score:P/S/B/C/D`, and the five keys in `data/experiments.json`. The
  seed stage deliberately uses only the three live Notion dimensions and does
  not attempt the reconciliation, which is its own change.
- **No cull cadence.** A standing "does this still sting?" pass over Ideation is
  probably right — four of the 2024 cohort were culled on a single day,
  2024-12-16 (Seed Finder, Garden Guide Generator, Photo Memories, The
  Illuminator), and only one experiment has been abandoned since, sixteen months
  later. But cadence should be set after seeing what actually accumulates.
- **Explore is unchanged.** It stays exactly as written. It stops being the front
  door and becomes what a seed earns on the way to Discovery.

---

## Open questions

Revisit after roughly ten seeds:

1. Does the incident test hold up, or does it reject something that later proves
   good? One counterexample is enough to loosen it.
2. Does the shape vocabulary need new entries, and does "Unproven" earn its place
   or just describe under-thought seeds?
3. What is the natural cull cadence, once there is a backlog to cull?
4. Should the hub render the Ideation backlog, so the top of the funnel is as
   visible as the middle? Deliberately deferred — it is only worth building once
   there are seeds to look at.
5. Does scoring at the Ideation → Discovery boundary actually happen, or does it
   slip the way the Explore scorecard did? If it slips, the gate is still too
   heavy and should shed the score, keeping only the incident test.
