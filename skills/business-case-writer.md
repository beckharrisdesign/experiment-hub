---
name: business-case-writer
description: >-
  Produces focused, honest business cases for early-stage ideas (founder GO/NO-GO,
  team alignment, investor-aware). Problem-first, data-driven, plain language;
  interview-driven workflow, live scoring rubric, strict template. Use when writing
  or revising a business case, GO/NO-GO, experiment business-case.md, or when
  the user asks for business case, honest verdict, or scoring before building.
---

# Business Case Writer

Produces focused, honest business cases for early-stage product ideas. Audience is mixed: founder self-assessment, team alignment, investor review. The document must be honest enough for a personal GO/NO-GO decision, clear enough for collaborators, and grounded enough for external readers.

## Core philosophy

- **Problem-first. Data-driven. Plain language. Honest verdicts.**
- The goal is not to win markets — it is to make something useful that can sustain itself. Language should reflect that. Avoid war metaphors, hype framing, and investor-bro energy. Write like a thoughtful person explaining why something matters.
- **Personal need is context, not justification.** The founder's connection belongs only in **Why This Matters to Me** — one sentence; then the document moves to data. Do not repeat it or use it to justify involvement elsewhere.
- **This skill must be willing to say NO.** Default toward skepticism on fit and timing. Score honestly. A low score is useful information — it prevents wasted months. A case that ends in PASS is a success, not a failure.
- **Financial estimates** should reflect solo-founder reality, not MBA exercises. A path to $100K ARR is a real outcome worth naming. $1M ARR is a strong outcome. Saying "this is a small but real market" is more useful than inflating numbers to seem credible.

## Workflow

### Step 1: Interview the user

Before writing anything, ask for:

1. The idea — one sentence
2. The problem it solves — is this a problem the founder has themselves? Who else has it?
3. What is already known — any numbers, similar products, early conversations?
4. Who will read this — personal decision doc, team alignment, external pitch?

Do not start writing until you have at least (1) and (2). Fill gaps with **web search** (use the web search tool; do not rely on training data for current stats).

### Step 1b: Interview for "Why This Matters to Me"

After the initial interview, ask **2–3** of the questions below — **one at a time**, wait for a reply before the next. Pick those most relevant to what the founder already shared; do not ask all of them every time.

- When did you first notice this problem in your own life?
- What were you doing (or failing to do) that made it obvious something was missing?
- Have you tried to solve it yourself — with existing tools, workarounds, or habits? What happened?
- Is there a specific moment or situation where you felt the mismatch most acutely?
- Why does this particular problem feel worth your time to solve?

Write **Why This Matters to Me** from their answers: **one sentence**, in their voice, grounded in a specific behavior or moment. Not a category description. Not a mission statement.

### Step 2: Research market sizing

Always use **web search** for this step. Do not use remembered or estimated figures — fetch current data each time.

Gather:

- Market size estimates (2–3 sources; triangulate honestly; note when estimates vary widely)
- Existing products: approach, pricing, and user base size where reported
- Signals about who is paying, for what, and how much

If no independently sourced market size exists, say so explicitly in the **Market** table **Basis** column. Triangulate from proxies (e.g. user counts × estimated conversion × price) and label as triangulated, not reported.

Be conservative. Solo founders rarely capture more than **0.01–0.1%** of a large total market in year one. If numbers only look good at unrealistic capture rates, say so. Size the **reachable** market for what one person can actually reach — a community, a niche, a direct channel.

### Step 3: Fetch the live scoring rubric

Before scoring, fetch the current rubric from:

`https://labs.beckharrisdesign.com/scoring`

Use that page as the **authoritative** source for dimension definitions, score thresholds, and verdict labels. Do not use a static rubric from memory — fetch fresh so the case stays in sync with the founder's current values.

**Fallback (if the URL is unreachable):** In this repository, use `../rules/scoring-criteria.mdc` for per-dimension 1–5 definitions. If composite verdict labels (e.g. Strong GO / Promising / Pass) are only on the live page, state that scoring dimensions are from the repo but **verdict label** should be reconciled with the live page when available.

Score the idea using the fetched rubric. **Let the score shape the recommendation** — do not write the recommendation first and reverse-engineer the score.

If **total is 0–9**: the recommendation is **PASS**. Write that clearly and explain why.

### Step 4: Write the document

Use the **Document template** below. Match section order and table shapes exactly.

**Where to save (pick one; confirm with user if unclear):**

| Context                          | Path                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Experiment Hub (this repo)**   | `experiments/<experiment-id>/docs/business-case.md` — use the `id` from `data/experiments.json` (e.g. `simple-seed-organizer`) |
| **Claude web / cloud artifacts** | `/mnt/user-data/outputs/business-case-<slug>.md` — slug: lowercase, hyphenated product name                                    |
| **Ad hoc**                       | Path the user specifies                                                                                                        |

After saving, **give the user the full path** so they can open the file. Offer to iterate on any section.

---

## Document template

Use this structure verbatim (including horizontal rules between sections). Replace placeholders; do not leave instructional text.

```markdown
# [Product Name]

## Hypothesis

[One sentence only. The core belief being tested. If it needs a second sentence, it is too broad — split the idea or narrow it.]

---

## Why This Matters to Me

[One sentence. The founder's personal connection. First person. Nothing else.]

---

## Who It's For

[One or two sentences. Primary user first, secondary users folded in naturally. No bold sub-labels.]

---

## What It Does

- [Feature. One line each. No bold labels.]
- [Feature.]
- [Feature.]

Not in MVP: [comma-separated exclusions.]

---

## Market

| Segment           | Size | Basis                                                   |
| ----------------- | ---- | ------------------------------------------------------- |
| Total market      | $X   | [Show math or source; say triangulated if not reported] |
| Reachable segment | $X   | [Who qualifies × price; solo-realistic]                 |
| Year 1 target     | $X   | [$ or $0 for personal; say why]                         |
| Year 2 target     | $X   | [~X subscribers × $Y/mo × 12; state assumptions]        |
| Year 3 target     | $X   | [~X subscribers × $Y/mo × 12; directional only]         |

[One sentence: why this market is real, or that figures are rough.]

---

## Existing Options

| Product | Price   | User Base                                         | Strength               | Limitation             |
| ------- | ------- | ------------------------------------------------- | ---------------------- | ---------------------- |
| [Name]  | [Price] | [~N with source, or "unknown" — do not fabricate] | [One complete thought] | [One complete thought] |

[One sentence: what existing options share that this product does not — without hype vocabulary.]

---

## Biggest Unknown

[One sentence. The single thing most likely to make this not work.]

---

## Validation Plan

|                | Detail                                           |
| -------------- | ------------------------------------------------ |
| Method         | [What you are running; what question it answers] |
| Traffic        | [How people arrive]                              |
| Budget         | [$X over Y weeks]                                |
| Success        | [Measurable thresholds]                          |
| Decision point | [What must be true to continue]                  |

[One sentence on current status if a test is already running.]

---

## Scorecard

| Dimension                 | Score    | Criterion met                               |
| ------------------------- | -------- | ------------------------------------------- |
| B — Business opportunity  | X/5      | [Exact criterion text from the live rubric] |
| P — Personal impact       | X/5      | [Exact criterion text from the live rubric] |
| C — Competitive advantage | X/5      | [Exact criterion text from the live rubric] |
| $ — Platform cost         | X/5      | [Exact criterion text from the live rubric] |
| S — Social impact         | X/5      | [Exact criterion text from the live rubric] |
| **Total**                 | **X/25** | [Verdict label from the live rubric]        |

---

## Recommendation

[Verdict in the first clause. 2–3 sentences total. Does the evidence support the hypothesis? Next concrete step — or for PASS, what would need to change.]
```

---

## Writing standards

- Every section: **title → content → `---` divider**. No bold sub-labels, no inline subheaders, no nested structure inside a section. If something needs a label, use a new section or a table.
- **Why This Matters to Me** is one sentence only; do not repeat it elsewhere; data carries the case after that.
- No section restates another. If Market repeats the problem, cut it.
- Prefer **tables** for comparisons and number bundles.
- **Numbers over adjectives** — e.g. "~3,500 subscribers at $8/mo" beats "a meaningful customer base."
- Size to reality. A path to **$50K ARR** for a solo founder is worth naming. Do not inflate.
- **Biggest Unknown** is exactly one sentence — the real one.
- Score before the recommendation. No reverse-engineering.
- **Avoid** in prose: _moat, disrupt, unfair advantage, dominate, win, capture, attack, opening, zero-to-one, 10x_, and **TAM/SAM/SOM** jargon in running text (plain descriptions are fine in Basis cells).
- **Target length:** 400–550 words for the full document. If longer, cut the wordiest section.

### Table rules

- **Scorecard "Criterion met"** states the **specific criterion** earned from the rubric, not a vague summary. Prefer rubric language over paraphrase when it fits.
- **Never use a table cell to make an argument.** Cells state facts. Short analysis belongs in the prose line below a table, not in cells.
- **Existing Options — User Base:** use web search for real numbers when possible; format as `~260K subscribers` or `~2M users`. If not findable after search, use **`unknown`** — never guess to fill the column.

---

## After output

- Confirm save path.
- Offer to iterate on any section.
- If the case is for an Experiment Hub experiment, remind the user the hub **Business Case** tab reads `docs/business-case.md` for that experiment.
