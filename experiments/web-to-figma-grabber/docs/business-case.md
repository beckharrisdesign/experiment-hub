# Web-to-Figma Grabber — Business Case

## Hypothesis

Design and product people will adopt a **fast element-level** browser → Figma handoff (screenshot mode and structured layout mode) because rebuilding live UI in Figma by hand is a weekly tax—and existing tools are either **pixels-only** or **ambitious full-page** converters with weak control.

---

## Why This Matters to Me

The workflow is the loop the Experiment Hub is built in: real sites, real components, and Figma as the place for design iteration. A grabber that respects selection scope and metadata fits how small teams actually work.

---

## Who It's For

**Primary:** Product designers, design engineers, and solo founders who iterate on production UI. **Secondary:** PMs/UXR who need review artifacts quickly. **Not for:** one-click, token-perfect design-system import on day one.

---

## What It Does

- **Element picker** in the browser with explicit selection
- **Screenshot mode** for quick pixel-accurate crops
- **Layout mode** with bounded JSON (structure + key styles + bounds) for faster rebuild
- **Handoff** via clipboard or download for import/automation; extension path exists but **script-first** is valid for the experiment

Not in MVP: iframe traversal, design-token extraction, Figma write API in-extension.

---

## Market

| Segment           | Size        | Basis                                                           |
| ----------------- | ----------- | --------------------------------------------------------------- |
| Total market      | $600M–$1.3B | Design/prototyping tooling spend (context for opportunity size) |
| Reachable segment | $80M–$220M  | Browser-native product orgs on Figma                            |
| Year 1 target     | $120K–$420K | Directional early revenue if productized                        |
| Year 3 target     | $1.2M–$3.4M | If teams standardize on capture workflow                        |

This experiment can remain an **enabling tool** (internal) even if a standalone SaaS never justifies itself—market size is “why it could matter,” not a commitment to charging.

---

## Existing Options

| Option                          | Strength              | Limitation                                      |
| ------------------------------- | --------------------- | ----------------------------------------------- |
| Figma import flows              | Core design workflows | No tight browser element capture loop           |
| Screenshot tools                | Fast pixels           | No structured rebuild metadata                  |
| HTML-to-Figma / page converters | Broad coverage        | Mixed fidelity, low control, heavy cleanup      |
| Misc browser extensions         | Debug/capture         | Not Figma-payload contracts; not designer-first |

**Gap:** **Intentional element scope** + **Figma-friendly payload** + speed targets measured in the tens of seconds.

---

## Biggest Unknown

**Fidelity expectations:** layout mode invites hope for “nearly final” Figma; if cleanup time is still high, the wedge narrows to screenshot + metadata for speed, not true reconstruction.

---

## Validation Plan

|                | Detail                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| Method         | Benchmark **30+** real captures across mixed sites; log failure reasons and cleanup minutes vs. full manual rebuild |
| Traffic        | N/A (tool validation inside real projects, not a consumer landing page)                                             |
| Budget         | Time; minimal infra                                                                                                 |
| Success        | **≥8/10** trial captures on three sites produce “usable in under 5 minutes cleanup” per PRD direction               |
| Decision point | If layout mode can’t clear the bar, invest in screenshot + metadata depth before “full converter” dreams            |

**Status (hub):** Active prototype in repo.

---

## Scorecard

| Dimension                 | Score     | Criterion met                                                           |
| ------------------------- | --------- | ----------------------------------------------------------------------- |
| B — Business opportunity  | 4/5       | If sold as workflow infra to teams; TAM is tool-adjacent context        |
| P — Personal impact       | 5/5       | Directly shortens a frequent personal workflow                          |
| C — Competitive advantage | 4/5       | Wedge (scope + contract) is clearer than “another screenshot tool”      |
| $ — Platform cost         | 4/5       | Tractable for solo/AI-assisted build; integration complexity is bounded |
| S — Social impact         | 3/5       | Improves craft velocity; not a social mission product                   |
| **Total**                 | **20/25** | **Build-and-measure**                                                   |

---

## Recommendation

**GO on the MVP and the benchmark** described in the PRD and market research. This is a **workflow bet**: prove the capture loop in real work before charging or expanding scope. If the benchmark fails, the product still has value as a personal utility—just not necessarily as a company.
