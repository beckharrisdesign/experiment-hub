# landing-pages

## Purpose

Deliver marketing and validation pages for experiments—either within the Next.js app or as static landing bundles—sharing the same signup pipeline keyed by experiment.

## Requirements

### Requirement: Single shared signup API contract

Standalone landing bundles SHALL submit signups through `POST /api/landing-submission` using JSON fields documented in [`experiment-submissions`](../experiment-submissions/spec.md), so no per-experiment server routes are required for basic capture.

#### Scenario: Standard fields respected

- **WHEN** a landing script submits `experiment`, `email`, optional `name`, optional `source`, and arbitrary extra primitive fields needed for segmentation
- **THEN** optional standard fields MUST map to persisted columns or metadata per the submissions capability

### Requirement: Repository layout for experiments

Experiment-specific marketing assets SHOULD live alongside the experiment under `experiments/<slug>/landing/` or published static copies under `public/landing/` when used for CDN-style hosting, consistently branded but implementation-flexible.

#### Scenario: Locating assets

- **WHEN** a maintainer adds or edits a landing for an experiment in the hub repo
- **THEN** artifacts SHALL reside under predictable paths scoped to that experiment slug or mirrored under `public/landing/` for static hosting equivalents
