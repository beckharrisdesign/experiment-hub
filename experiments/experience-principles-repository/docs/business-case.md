# Experience Principles Repository — Business Case

## Hypothesis

Design teams will pay for a dedicated place to document, curate, and **use** experience principles—especially with LLM-assisted ingestion and machine-readable export (e.g. MCP) so engineering can consume principles where they work.

---

## Why This Matters to Me

Principles drift into slides and wikis; they rarely stay actionable. A purpose-built system plus AI-assisted input could reduce the tax of keeping “what good looks like” alive.

---

## Who It's For

**Primary:** Mid-market and enterprise product design teams (roughly 50–5,000 employees) who run design systems and need design-to-engineering alignment. **Secondary:** Agencies documenting principles per client.

---

## What It Does

- Central knowledge base for principles (not just component libraries)
- LLM-assisted ingestion (e.g. from screenshots, drafts, research) to lower curation cost
- Collaboration patterns such as designer voting on quality
- **MCP / integration story** for engineers using AI tooling that can pull structured principles

Not in scope for an MVP sketch: full enterprise SSO, DLP, and compliance—those matter for real sales but come after problem/solution fit.

---

## Market

| Segment           | Size       | Basis                                                           |
| ----------------- | ---------- | --------------------------------------------------------------- |
| Total market      | $20M–$60M  | Principles / design knowledge niche (not all of “design tools”) |
| Reachable segment | $4M–$16M   | US mid-market design teams, bottom-up team × ARPU               |
| Year 1 target     | $50K–$200K | Dozens of early teams, not thousands                            |
| Year 3 target     | $500K–$2M  | Hundreds of teams at optimized pricing                          |

Adjacent proof: design system doc tools (e.g. Zeroheight) show teams pay for structured design knowledge, though principles-first positioning is less proven.

---

## Existing Options

| Product               | Price                     | Strength                         | Limitation                                                    |
| --------------------- | ------------------------- | -------------------------------- | ------------------------------------------------------------- |
| Zeroheight            | Team SaaS                 | Design system docs, dev-friendly | System-first, not principles-first; limited LLM story         |
| InVision DSM          | Enterprise                | System management                | Declining share; not principles-native                        |
| Notion / Confluence   | Wide range                | Flexible                         | Generic; heavy manual curation; weak design-to-code contracts |
| Figma (built-in docs) | Bundled with design seats | In-canvas                        | Documentation secondary; not a principles repository product  |

**Gap:** Few tools lead with **principles as the primary object**, with AI ingestion and explicit engineer-facing export paths.

---

## Biggest Unknown

Whether “principles-first” is a must-have budget line—or whether teams will keep squeezing this into Notion and design system tools until the category is obvious.

---

## Validation Plan

|                | Detail                                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| Method         | Pilot with 1–3 design teams; measure ingestion time, search/use frequency, and engineer pull via MCP or export |
| Traffic        | Direct outreach; design leadership intros                                                                      |
| Budget         | Founder time; minimal infra for pilots                                                                         |
| Success        | Regular active use; willingness to pay after pilot; clear before/after on findability                          |
| Decision point | If teams won’t re-home content from Notion, the wedge isn’t strong enough                                      |

**Status (hub):** Abandoned.

---

## Scorecard

| Dimension                 | Score     | Criterion met                                                 |
| ------------------------- | --------- | ------------------------------------------------------------- |
| B — Business opportunity  | 4/5       | Credible B2B niche; revenue tied to team expansion            |
| P — Personal impact       | 4/5       | Directly relevant to how design orgs work                     |
| C — Competitive advantage | 4/5       | LLM + MCP angle is differentiated vs. generic wikis           |
| $ — Platform cost         | 3/5       | Solo build possible but integration surface area is real      |
| S — Social impact         | 3/5       | Improves craft inside companies; broad social effect indirect |
| **Total**                 | **18/25** | **Wedge is interesting; GTM and category education are hard** |

---

## Recommendation

**GO** only as a **narrow pilot**: prove that teams will migrate and **reuse** principles weekly. If the behavior doesn’t show up, the product is a better feature inside an existing system than a standalone company. Deprioritization in the hub is consistent with that—revisit if you have a live team who insists on funding build-out.
