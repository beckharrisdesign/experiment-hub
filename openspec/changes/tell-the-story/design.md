# tell-the-story — design

## Context

`tell-the-story` adds a read-only **History** band to the experiment detail page, below the narrative statements curated by `stop-the-leaks`. The layout was prototyped as a forward preview during `stop-the-leaks` and is now approved on its own iteration page. This design captures that frame and the rules for turning it into read-only markup fed by approved Notion entries.

## Goals / Non-Goals

**Goals:**

- History reads as a vertical scan line — tabular month dates in a fixed gutter, one milestone sentence each — an appendix to the case study, not a feed.
- Entries are content (approved in Notion), not chrome; the section is silent when there are none.
- Receipts live in the sentence (a number), so the band needs no link/chip vocabulary in v1.

**Non-Goals:**

- The generator UX / CLI ergonomics (that's tooling, not visual design).
- A timeline on the homepage table (proposal: detail page only).
- Link-artifact chips (deferred past v1 per founder call, 2026-07-17).

## User flow / IA

Detail page, public: Header → Hero → narrative statements (`stop-the-leaks`) → **History** band → Footer. History sits as an appendix below Exec Summary, before the footer. Empty (no approved entries) → the band is absent entirely (matches the detail page's silent empty-state). No edit affordances in v1 — entries are authored in Notion.

## Visual design / Figma

| Item             | Value                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary file URL | https://www.figma.com/design/HKy2SdRDyCJ37V29mvMpma ("experiment-detail — stop-the-leaks") — shared file; History lives on its own iteration page.                                                                                                                                                                                                            |
| Frames in scope  | Page `02.1 Proposed — History preview`: frame `Proposed — with History (preview)` (node `9:82`). The `History` group (`9:130`) holds `HISTORY` label + a `Milestones` stack; each `Milestone/<Mon YYYY>` is a date cell beside a `Body` sentence (see `9:148`–`9:167`, Mar–Jul 2026 exemplars incl. "Meta campaign launched — 500 visits, 38 signups (7.6%)"). |
| Layout           | Fixed **88px left date gutter**, dates mono **13px muted** (Roboto Mono stand-in — implement with the CSS mono stack, tabular); sentences **14px Inter** on the **720px** measure. Vertical scan line; chronological. Band header `HISTORY` matches the statements' uppercase-label treatment.                                                                  |
| Libraries        | Hub tokens / local components (same as `stop-the-leaks`); no MVDS component needed — History is type + layout only. No link chips in v1.                                                                                                                                                                                                                      |
| Breakpoints      | S · 480px / L · 1024px (BHD Content Types). At S the 88px gutter may collapse to a stacked date-over-sentence; keep the mono/tabular date. See `rules/design-guidelines.mdc`.                                                                                                                                                                          |
| Status           | **Approved 2026-07-20** (Katy, viewing `02.1`). File convention honored: the History mod is a new numbered iteration page (`02.1`), not frames appended to the approved `02 Proposed`.                                                                                                                                                                         |

## Decisions

1. **Appendix, not a feed.** History renders below Exec Summary, before the footer — a closing scan line, not a primary column. Chronological ascending (oldest first) so the story reads top-to-bottom.
2. **Receipts inline, no chips (v1).** A result entry carries its number in the sentence; link-artifact chips are deferred (founder call, 2026-07-17 — don't overbuild v1). This keeps the band pure type + layout.
3. **Silent empty state.** No approved entries → no `HISTORY` heading, no band. Matches `stop-the-leaks` decision 7 (empty content bands are removed, not rendered hollow).
4. **Read-only in v1.** Entries are authored/approved in Notion; the page never offers inline editing. (Ghost-prompt parity with statements can come later if entries need an admin affordance — out of scope here.)
5. **Month-level dates, tabular.** Mono, muted, right-aligned in an 88px gutter so dates line up as a scan column; no per-day precision (proposal Not-doing).

## Risks / Trade-offs

- **Notion storage shape (property vs child blocks) is unresolved** — decide in tasks/apply. It must hold date + text + optional URL receipt and stay hand-editable; the render adapter depends on that choice.
- **Generator accuracy** — rollup summaries ("pushed N PRs on foundations") are assembled from real PRs/commits but the phrasing is Katy's to approve; the design assumes approved, human-blessed sentences, so the visual band carries no "draft" state.
- **Kill-reason alignment** is a content rule (`Outcome` agreement), enforced at authoring time, not by layout — the band renders whatever is approved, so honesty lives upstream of this design.
