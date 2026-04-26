---
name: prd-writer
description: >-
  Writes lean experiment PRDs (experiments/*/docs/PRD.md) from the business case and
  hub template: plain language, outcomes first, explicit failing tests so agents and
  tools can iterate without the founder in the loop. Use when creating or revising
  a PRD, product requirements, MVP scope, validation plan, or after business-case-writer.
---

# PRD Writer

Turns a **tested** business direction (`docs/business-case.md`) into a **build-and-validate** spec (`docs/PRD.md`). Audience is the solo builder, agents, and future you—not a board deck. Keep it **short**, **concrete**, and free of **startup theater** (no "north star rituals," "alignment," "velocity," or feature lists that read like a pitch).

## Core philosophy (match `business-case-writer`)

- **Outcome-first. Observable. Honest about scope.**
- The PRD is where **“what we ship”** and **“how we know it works”** live. The business case is where **“is this worth pursuing”** and scoring live—do not duplicate the case’s job.
- **Plain language:** short sentences, real nouns (seed list, email signup), not abstractions (synergy, ecosystem, empower).
- **Willing to keep it small:** if the template section would be padding, cut it. Prefer one sharp failing test over three vague metrics.

## The main move: outcomes and **failing tests** first

**Outcome:** a user- or system-visible result stated in normal words (e.g. “A gardener can find a seed in under 10 seconds in a 100-packet list.”).

**Failing test:** a **specific check** that is **false or impossible until the product meets the outcome**. You write these **before** polishing feature prose. They are the contract for **you, CI, or an agent**: iterate until the check passes. They can be:

- Manual (a repeatable script: “From cold start, add one seed and see it in the list”)
- Instrumented (latency threshold, error rate, analytics event present)
- Automated where it already exists in the repo

**Naming:** Use **“Fails until:”** so it’s obvious the default state is failure—same spirit as test-first in code, applied to product behavior.

**Not:** implementation details (“use Postgres,” “add a React context”) or slogans (“delightful experience”). **Not** twenty micro-metrics—pick a few that **falsify** the hypothesis if they fail.

**Per goal, at least one failing test.** Per MVP feature, optional one-liner if it clarifies scope.

## Separation of concerns (don’t merge documents)

| Document                  | Job                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `docs/business-case.md`   | Why this might matter, who it’s for, options, market/score (if not `type: tool`), **honest verdict via scorecard** when applicable. |
| `docs/market-research.md` | Sizing, competition, research trail. **PRD does not restate TAM/SAM/SOM**—link or one sentence of positioning at most.              |
| `docs/PRD.md`             | Problem, goals, user, **MVP features**, **success metrics = outcomes + failing tests**, validation.                                 |
| Prototype / code          | Ground truth. If the PRD and app disagree, **update the PRD** to match the intended product, or flag the drift.                     |

**If `data/experiments.json` has `"type": "tool"`:**

- There is no commercial **market** story in the business case; the PRD still has goals and failing tests, but **validation** may be “internal / dogfood only” or a single “ship page” if applicable. Do not invent a fake TAM in the PRD.

## Workflow

### Step 1: Load context (before writing)

1. Read `experiments/{slug}/docs/business-case.md` (if present).
2. Read `data/experiments.json` for this experiment: `type`, `statement`, `name`.
3. Skim `docs/market-research.md` only for **wording** you must not contradict—not to copy tables into the PRD.
4. If `docs/PRD.md` or a prototype exists, read it and **prefer minimal diff**: preserve the founder’s voice and explicit decisions unless they ask to replace wholesale.
5. If a prototype exists, skim routes and README so **Core Features** and **Failing tests** match reality or deliberately document gap.

**Do not** paste the business case or market research into the PRD. **Point** to them when the reader needs depth.

### Step 2: Draft using the document template (below)

- Write **Failing tests** in **Success Metrics** **first** (stub list), then **Goals** and **Core Features** so they don’t float free of the checks.
- Keep **MVP** to what’s needed to pass the first batch of failing tests; push nice-to-haves to **Out of scope** in one line.

**Optional checkpoint:** If scope is unclear, ask one focused question, then continue—do not block on perfection.

### Step 3: Design review (UI-heavy experiments)

If the PRD specifies UI, **invoke `@design-advisor`** in PRD review mode before treating the doc as final. Fold in only feedback that **changes user-visible requirements**; skip stylistic noise.

**Optional user checkpoint:** If the user wants to approve before save, present the draft; otherwise save and offer edits.

### Step 4: Save

- **Path (Experiment Hub):** `experiments/{slug}/docs/PRD.md` — `slug` = experiment `id` from `data/experiments.json`.
- **After save:** Print the full path. Remind: **prototype-builder** is a separate, explicit request unless the user asked to build in the same turn.

---

## Document template

Follow **section order and exclusions** in `.cursor/rules/prd-template.mdc` (hub source of truth). The template’s **Success Metrics** block must include **Outcomes** and **Failing tests (write first)** as there.

**Section order (no others):** Overview → Problem Statement → Goals & Objectives → Target User → Core Features → Success Metrics → Validation Plan (Landing Page).

**Target length for `PRD.md`:** 100–150 lines; if longer, cut fluff.

**Use this skeleton** (replace placeholders; remove horizontal rules in paste if you prefer single breaks—match the style of the latest PRD in the repo).

```markdown
# {Name} — PRD

## Overview

[2–3 sentences: who it’s for, what job the product does, and how you’ll know you’re not building the wrong thing.]

---

## Problem Statement

[3–5 bullets or 2 short paragraphs: concrete pains, not “the space.”]

---

## Goals & Objectives

1. [Primary — phrased as an **outcome**, not a task]
2. [Secondary]
3. [Tertiary if needed — if not, stop at 2]

---

## Target User

**Primary:** [one sentence]

**Secondary:** [optional one sentence]

**Not for:** [one sentence]

---

## Core Features

### MVP scope

- **[Capability 1]**: [what it does; why it matters in one breath]
- **[Capability 2]**: […]
- [optional **Fails until** line per capability if it prevents scope arguments]

**Out of scope for MVP:** [short list—comma or semicolons, not a manifesto]

---

## Success Metrics

**Outcomes (what “good” means in plain language):**

- [Outcome A — tied to goal 1]
- [Outcome B — tied to goal 2]

**Failing tests (write first; pass = outcome is plausibly true):**

- Fails until: [observable check — human, metric, or automated]
- Fails until: [observable check]
- Fails until: [optional; keep the list small and sharp]

**Validation phase** (if you’re running a page / channel test):

- [Metric or event]: [target or band]
- **Go / no-go:** [what result means “don’t build more until we fix X”]

**MVP phase** (after you’re building the real surface):

- [Metric]: [target]

---

## Validation Plan (Landing Page)

[2–4 sentences: hypothesis, who you’re reaching, CTA, duration/budget if any. If `type: tool` and there is no landing, say so in one line.]
```

**Do not** add: User stories section, technical requirements section, data model section, “phase 2/3 roadmap” essay, or market tables copied from market research.

---

## Writing standards

- **Tie goals ↔ failing tests** so an agent can trace a line from “we claim X” to “we test X.”
- **Prefer falsifiable checks** over NPS and vibes.
- **Avoid:** agile clichés, “MVP” repeated every paragraph, “leverage,” “delight,” “seamless,” “robust” without a measurable meaning.
- **Tables:** only when comparing options or tracking launch hygiene—not for philosophy.
- If the product is real in code, add a one-line **Prototype** pointer (`experiments/.../prototype/app/`, `npm run dev`, port from `package.json`) inside **Overview** or as a foot of Overview—don’t let the PRD claim a port that the app doesn’t use.

## After output

- Confirm save path; offer a tight revision pass for one section the user names.
- If the experiment is in this hub, the **PRD** tab and workflow UI read `docs/PRD.md`.
- Do not auto-start prototype work unless asked.

## Integration

- **Business case** (`business-case-writer`) supplies direction; this skill supplies the **testable** build spec.
- **Design:** `@design-advisor` for UI completeness when the PRD names screens or flows.
- **Hub template:** `.cursor/rules/prd-template.mdc` — keep PRD body aligned when the rule changes, and vice versa.
