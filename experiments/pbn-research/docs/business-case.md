# PBN Research Lab — Business Case (personal R&D)

## Hypothesis

I can **compare** paint-by-number style pipelines (A/B/C) with repeatable metrics, optional human rubric scores, and logged runs on disk—so improvement is data-shaped instead of “eyeball the latest PNG folder.”

---

## Why This Matters to Me

This is **lab tooling**: judgment-heavy image work benefits from a tight loop (run → see variants → score → log). The goal is to learn what “good PBN” means before any product wrapper exists.

_Aligned with `experiments.json`:_ exploratory craft/CV R&D, not a near-term commercial bet.

---

## Who It's For

**Primary:** Me (or anyone cloning the repo) running local experiments on **my** images and **my** run logs. **Not for:** a public SaaS, automated hosting, or customer support—those are not part of the PRD’s “validation / product landing” scope (explicitly out of scope).

---

## What It Does

- **Local web UI** plus **CLI** to run pipelines, view previews, and read auto metrics
- **Human sliders** (e.g. subject clarity, paintability) blended with auto scores per configured weights
- **One-click logging** to `assets/output/` (runs, manifests) for traceability
- **Sweeps** for budgeted search when the UI is not enough

Not in scope: packaging for sale, cloud sync, multi-user collaboration.

---

## Market

| Segment          | Size                 | Basis                                                          |
| ---------------- | -------------------- | -------------------------------------------------------------- |
| “Commercial TAM” | N/A / exploratory    | Treated as **personal R&D**; not sizing a venture outcome here |
| Investment       | Time + local compute | Marginal $ for APIs/GPU if you add models later                |
| “Revenue”        | $0 in Year 1         | Unless/until a product hypothesis appears                      |

If this ever becomes a product, sizing starts over with a different problem statement. Until then, the “market” is **iterations per week** and **confidence in the pipeline**.

---

## Existing Options

| Approach                          | Strength                | Limitation                                   |
| --------------------------------- | ----------------------- | -------------------------------------------- |
| Ad hoc scripts / notebooks        | Flexible                | Drift, hard to compare runs                  |
| General ML experiment trackers    | Great for model metrics | Overkill; may not map to PBN human judgments |
| One-off phone apps (consumer PBN) | Productized output      | Opaque; not a research surface               |

**Gap:** A **local-first** loop tuned to PBN: variants, side-by-sides, logged judgment.

---

## Biggest Unknown

Which visual failures matter most to **your** target aesthetic (e.g. edge detail vs. color span vs. “paintable regions”) and whether auto metrics line up with that—**human rubric** exists precisely because the unknown is irreducible with metrics alone.

---

## Validation Plan

|                | Detail                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| Method         | Run the benchmark loop on a fixed photo set; track metric deltas and human scores across pipeline changes |
| Traffic        | N/A (no audience)                                                                                         |
| Budget         | Time; disk; optional model/API costs for experiments you choose to turn on                                |
| Success        | Reproducible “better” on held-out photos + consistent logging when you change one knob                    |
| Decision point | When a pipeline is stable enough, **then** you can think about a product or export—separate decision      |

---

## Scorecard

| Dimension                 | Score     | Criterion met                                                       |
| ------------------------- | --------- | ------------------------------------------------------------------- |
| B — Business opportunity  | 2/5       | Intentionally low; R&D, not a revenue thesis in repo                |
| P — Personal impact       | 5/5       | Core to iterating on a craft you care about                         |
| C — Competitive advantage | 3/5       | Differentiation is your pipeline + rubric, not a moat in the market |
| $ — Platform cost         | 4/5       | Local-first keeps burn low; only pay for compute you add            |
| S — Social impact         | 3/5       | Craft joy; not positioned as a social mission                       |
| **Total**                 | **17/25** | **Correct posture for a personal lab**                              |

---

## Recommendation

**GO** as **research infrastructure**—the PRD is explicit that product landing is out of scope. Keep this as the honest place: log runs, compare variants, and only promote a “business” when the _output_ and _audience_ are defined. `scoreRationale` in hub metadata is the source of truth: **this is the bench**, not the storefront.
