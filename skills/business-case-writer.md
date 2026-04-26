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
- **Financial estimates** should reflect solo-founder reality, not MBA exercises. A path to **$100K annual recurring revenue (ARR)** is a real outcome worth naming. **$1M ARR** is a strong outcome (after first use of ARR, the acronym alone is fine). Saying "this is a small but real market" is more useful than inflating numbers to seem credible.

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

### Step 2: Research (market sizing and/or competitors)

**If the experiment is `type: tool`:** Use **web search** to ground the **Existing Options** table only—competitor or substitute products, typical pricing, user-base figures where published. **Do not** add a **Market** (TAM / SAM / SOM) section to `business-case.md` for tools; that belongs in a commercial/personal bet, not a utility.

**If the experiment is `commercial` or `personal`:** Always use **web search** for this step. Do not use remembered or estimated figures — fetch current data each time.

Gather:

- Market size estimates (2–3 sources; triangulate honestly; note when estimates vary widely)
- Existing products: approach, pricing, and user base size where reported
- Signals about who is paying, for what, and how much

If no independently sourced market size exists, say so explicitly in the **Market** table **Basis** column. Triangulate from proxies (e.g. user counts × estimated conversion × price) and label as triangulated, not reported. Surface competitor pricing and positioning in **Existing Options** first in the document — that section precedes **Market** so sizing reads against real alternatives.

Be conservative. Solo founders rarely capture more than **0.01–0.1%** of a large total market in year one. If numbers only look good at unrealistic capture rates, say so. Size the **reachable** market for what one person can actually reach — a community, a niche, a direct channel.

### Step 3: Fetch the live scoring rubric (skip for **tool** experiments)

If the experiment has `"type": "tool"` in `data/experiments.json` (**workflow / utility**): **do not** add a **Market** (TAM / SAM / SOM) section, **do not** add a **Scorecard**, **do not** add a `scores` object in `data/experiments.json`, and **do not** run the rubric step. The case ends after **Existing Options**.

Otherwise ( **`commercial`** or **`personal`** ), fetch the current rubric from:

`https://labs.beckharrisdesign.com/scoring`

Use that page as the **authoritative** source for dimension definitions, score thresholds, and verdict labels. Do not use a static rubric from memory — fetch fresh so the case stays in sync with the founder's current values.

**Fallback (if the URL is unreachable):** In this repository, use `.cursor/rules/scoring-criteria.mdc` for per-dimension 1–5 definitions. If composite verdict labels (e.g. Strong GO / Promising / Pass) are only on the live page, state that scoring dimensions are from the repo but **verdict label** should be reconciled with the live page when available.

Score the idea using the fetched rubric. **Let the scorecard carry the decision** (dimension scores plus **Total** and rubric **verdict label**). Do not reverse-engineer dimension scores to match a story.

If **total is 0–9**: the **Total** row’s verdict from the live rubric should be **Pass**; there is no separate **Recommendation** section in the document.

### Step 4: Write the document

Use the **Document template** below. For **commercial** / **personal**, match section order and table shapes exactly (`Existing Options` before `Market`). For **tool**, use only the sections through **Existing Options** (see first fenced block).

**If a `business-case.md` already exists:** Read it end-to-end first, plus the experiment’s `statement` in `data/experiments.json` and any `docs/PRD.md` overview. Preserve the founder’s thesis, phrasing, and emotional through-line when tightening structure or tables—do not replace distinctive voice with generic positioning copy.

**Where to save (pick one; confirm with user if unclear):**

| Context                          | Path                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Experiment Hub (this repo)**   | `experiments/<experiment-id>/docs/business-case.md` — use the `id` from `data/experiments.json` (e.g. `simple-seed-organizer`) |
| **Claude web / cloud artifacts** | `/mnt/user-data/outputs/business-case-<slug>.md` — slug: lowercase, hyphenated product name                                    |
| **Ad hoc**                       | Path the user specifies                                                                                                        |

After saving, **give the user the full path** so they can open the file. Offer to iterate on any section.

---

## Document template

**Section order:** **Hypothesis** → **Why This Matters to Me** → **Who It's For** → **What It Does** → **Existing Options**. For **`type: tool`**, the document **ends** there (no **Market**, no **Scorecard**). For **`commercial`** or **`personal`**, continue with **Market** (TAM / SAM / SOM) then **Scorecard** (explicit verdict). Deeper audience detail may also appear in the **PRD** (Target user). **Validation**, **Biggest Unknown**, and **Recommendation** are **not** in `business-case.md`—put those in the **PRD**.

**Market layout (follow when writing; do not paste this block into the finished doc):** (1) A short prose block above the table spelling out TAM, SAM, SOM and units, **or** (2) **no prose** and the **Segment** column carries the full term plus acronym, e.g. `Total Addressable Market (TAM)`, `Serviceable Addressable Market (SAM)`, `Serviceable Obtainable Market (SOM), Year 1`. Use **(2)** when you want to avoid repeating boilerplate in every case. **Use Title Case in the Segment column** (major words capitalized; `Year 1` not `year 1`). **TAM** and **SAM** sizes should show **annual** category pools (e.g. `$XM–$YM / yr`). **SOM** rows are this product’s **annual recurring revenue (ARR)** unless the experiment is explicitly non-subscription — put **`ARR`** in the Size column and spell **annual recurring revenue (ARR)** out in the first SOM row’s Basis (then “ARR” alone is fine in later SOM rows).

**Market table format (hub standard):** One markdown table only — **no blank line** between the header row, the separator row (`| --- |`), and body rows (a blank line **breaks** the table in most renderers). Use three columns **`Segment | Size | Basis`** with aligned pipes.

Use the fenced structure below verbatim in the saved file (including horizontal rules between sections). Replace placeholders; do not leave bracketed instructional text.

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

---

## Existing Options

| Product | Price   | User Base                                         | Strength               | Limitation             |
| ------- | ------- | ------------------------------------------------- | ---------------------- | ---------------------- |
| [Name]  | [Price] | [~N with source, or "unknown" — do not fabricate] | [One complete thought] | [One complete thought] |

[One sentence: what existing options share that this product does not — without hype vocabulary.]
```

**For `type: tool` only, stop here** — do not add **Market** or **Scorecard**; do not add `scores` in `data/experiments.json`.

**For `commercial` or `personal`**, continue with **Market** and (after another `---`) **Scorecard**:

```markdown
---

## Market

| Segment                                     | Size    | Basis                                        |
| ------------------------------------------- | ------- | -------------------------------------------- |
| Total Addressable Market (TAM)              | $X / yr | [Show math or source]                        |
| Serviceable Addressable Market (SAM)        | $X / yr | [Solo-realistic; say if count unknown]       |
| Serviceable Obtainable Market (SOM), Year 1 | $X ARR  | [Spell ARR on first SOM row if not in prose] |
| Serviceable Obtainable Market (SOM), Year 2 | $X ARR  | [Directional; assumptions]                   |
| Serviceable Obtainable Market (SOM), Year 3 | $X ARR  | [Directional only]                           |

[One sentence: why this market is real, or that figures are rough.]

---

## Scorecard

| Dimension                 | Score    | Criterion met                               |
| ------------------------- | -------- | ------------------------------------------- |
| B — Business Opportunity  | X/5      | [Exact criterion text from the live rubric] |
| P — Personal Impact       | X/5      | [Exact criterion text from the live rubric] |
| C — Competitive Advantage | X/5      | [Exact criterion text from the live rubric] |
| $ — Platform Cost         | X/5      | [Exact criterion text from the live rubric] |
| S — Social Impact         | X/5      | [Exact criterion text from the live rubric] |
| **Total**                 | **X/25** | [Verdict label from the live rubric]        |
```

---

## Writing standards

- Every section: **title → content → `---` divider**. No bold sub-labels, no inline subheaders, no nested structure inside a section. If something needs a label, use a new section or a table.
- **Why This Matters to Me** is one sentence only; do not repeat it elsewhere; data carries the case after that. **Who It's For** states primary/secondary (and not-for) in one or two sentences; expand in the **PRD** if the build needs more.
- No section restates another. If Market repeats the problem, cut it.
- **What It Does** is capabilities and user-facing value only. Do not add “Not in MVP,” out-of-scope lists, or build-phase exclusions—put those in the experiment **PRD**, not the business case.
- Prefer **tables** for comparisons and number bundles.
- **Numbers over adjectives** — e.g. "~3,500 subscribers at $8/mo" beats "a meaningful customer base."
- **Existing Options** before **Market** so TAM / SAM / SOM sit on top of concrete prices and substitutes.
- Size to reality. A path to **$50K ARR** for a solo founder is worth naming. Do not inflate.
- **Tool** experiments: no **Market** (TAM / SAM / SOM), no **Scorecard**; no `scores` in `experiments.json` for that row. For **commercial** / **personal**, the **Scorecard** (including **Total** and rubric verdict label) is the closing decision surface. Do not add **Biggest Unknown**, **Recommendation**, or a **Validation Plan** section in the case—put those in the **PRD**. No reverse-engineering dimension scores.
- **Avoid** in prose: _moat, disrupt, unfair advantage, dominate, win, capture, attack, opening, zero-to-one, 10x_. For market acronyms, **first use** spells out the full term followed by the abbreviation in parentheses — e.g. _total addressable market (TAM)_ — then use the acronym alone. In **business-case** Market tables, putting **`Total addressable market (TAM)`** (and SAM / SOM with year) in the **Segment** column counts as that first use, so you may **omit** the boilerplate paragraph above the table. For **market research**, keep the definition line immediately above **Key Findings** (parser + hub cards). Basis cells may stay short once the acronym is defined in the Segment cell or prose.
- **Target length:** 400–550 words for **commercial** / **personal** cases with **Market** and **Scorecard**. **Tool** cases (no market table) are usually shorter; brevity is fine.

### Table rules

- **Primary column = Title Case** in business cases: **Segment**, **Product** (use brand capitalization when it is a proper name; otherwise Title Case), **Dimension** text after the dimension letter (e.g. `B — Business Opportunity`). Other columns stay sentence case unless a proper noun.
- **Scorecard "Criterion met"** states the **specific criterion** earned from the rubric, not a vague summary. Prefer rubric language over paraphrase when it fits.
- **Never use a table cell to make an argument.** Cells state facts. Short analysis belongs in the prose line below a table, not in cells.
- **Existing Options — User Base:** use web search for real numbers when possible; format as `~260K subscribers` or `~2M users`. If not findable after search, use **`unknown`** — never guess to fill the column.

---

## After output

- Confirm save path.
- Offer to iterate on any section.
- If the case is for an Experiment Hub experiment, remind the user the hub **Business Case** tab reads `docs/business-case.md` for that experiment. **`type: tool`** omits market sizing and the scorecard in the doc, does not show **Scores** in the PRD view or on the home list, and omits `scores` in `data/experiments.json`.
