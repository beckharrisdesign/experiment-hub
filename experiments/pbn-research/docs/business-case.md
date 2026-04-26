# PBN Research Lab

## Hypothesis

I can compare paint-by-number style pipelines (A/B/C) with repeatable metrics, optional human rubric scores, and logged runs on disk, so improvement is data-shaped instead of eyeballing the latest PNG folder.

---

## Why This Matters to Me

This is lab tooling: judgment-heavy image work benefits from a tight loop (run → see variants → score → log). The goal is to learn what “good PBN” means before any product wrapper exists.

---

## Who It's For

Me (or anyone cloning the repo) running local experiments on my images and my run logs. Not for a public SaaS, automated hosting, or customer support—those stay out of scope in the PRD.

---

## What It Does

- Local web UI plus CLI to run pipelines, view previews, and read auto metrics
- Human sliders (e.g. subject clarity, paintability) blended with auto scores per configured weights
- One-click logging to `assets/output/` (runs, manifests) for traceability
- Sweeps for budgeted search when the UI is not enough

---

## Existing Options

| Product / approach         | Price  | User Base      | Strength                 | Limitation                                   |
| -------------------------- | ------ | -------------- | ------------------------ | -------------------------------------------- |
| Ad hoc scripts / notebooks | $0     | universal      | Flexible                 | Drift; hard to compare runs                  |
| ML experiment trackers     | Varies | teams          | Strong for model metrics | Overkill; may not map to PBN human judgments |
| Consumer PBN apps          | Free–$ | large; unknown | Productized output       | Opaque; not a research surface               |

Gap: a local-first loop tuned to PBN—variants, side-by-sides, logged judgment—in one place.
