## 1. User outcomes (from spec scenarios)

- [x] 1.1 User can find the Snap Issue callout with folder path and link to the extension README (Scenario: Callout includes folder path and link to extension README)
- [x] 1.2 User sees a short Chrome load-unpacked hint next to that link (Scenario: Callout includes a Chrome load-unpacked hint)
- [x] 1.3 Maintainer review confirms the hub README does not paste long permission/PAT guides (Scenario: No long permission or PAT guide in the hub README)

## 2. Prototype shell

- [x] 2.1 **N/A** — No app prototype; deliverable is root [`README.md`](../../../README.md) Markdown only.

## 3. Implementation

- [x] 3.1 Edit root [`README.md`](../../../README.md): add a `### Snap Issue (Chrome extension)` (or equivalent) callout per [design.md](design.md) **primary placement** (inside **Getting started**, after dev/env notes, before **Project structure**) unless that section is too crowded — then use **fallback placement** under **What’s inside** after the experiments table.
- [x] 3.2 Callout content: one-line purpose, literal path `` `experiments/snap-issue/extension/` ``, ≤2 short sentences for Load unpacked / `chrome://extensions`, and a markdown link to `experiments/snap-issue/extension/README.md`; cap ~6 lines inclusive of heading per design.
- [x] 3.3 Voice and formatting match surrounding README (no new large tables in the callout).

## 4. QA

- [x] 4.1 Open `README.md` in GitHub preview (or local render): confirm link resolves and path is visible in the Snap Issue subsection.
- [x] 4.2 Reread the new subsection only: confirm it does not duplicate multi-row permission tables or lengthy PAT steps (spec §1.3).

---

**Applied:** Callout added under **Getting started** in root `README.md` (2026-05-19 apply).
