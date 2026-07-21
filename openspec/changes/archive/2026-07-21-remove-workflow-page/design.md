# remove-workflow-page — design

## Context

This change deletes a page rather than adding one, so the design surface is minimal: the only UI that visibly changes for visitors is the header nav losing its Workflow item. The Figma gate is satisfied with an as-is + proposed pair of the header alone; everything else is removal.

## Goals / Non-Goals

**Goals:**

- The header reads identically minus one item — no reflow surprises, no restyling, active-state logic untouched.
- Old `/workflow` URLs land on the homepage via permanent redirect, not a 404.

**Non-Goals:**

- No `/method` page (copy lives in Notion — see proposal Not-doing).
- No homepage or `/scoring` redesign; the score tooltip change is copy-only.
- The superseded `/method` page design (`02 Proposed` in the same Figma file) is a design record for a possible future change, not part of this one.

## User flow / IA

- Nav: Experiments · ~~Workflow~~ · Scoring · Heuristics · Harness → Experiments · Scoring · Heuristics · Harness (desktop and mobile menus — both render from the same `navLinks` array in `components/Header.tsx`, so one array edit covers both).
- `/workflow` → 308 permanent redirect → `/` (configured in `next.config`, not a stub page).

## Visual design / Figma

| Item             | Value                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primary file URL | https://www.figma.com/design/SWHDnNKnd1MF1Te0y9YeEJ ("method-page — /workflow → /method")                                                                          |
| Frames in scope  | Page `03 Header — remove Workflow`: `Header / as-is` (node `15:4`, five nav items incl. Workflow) and `Header / proposed` (node `15:18`, four items, nothing else moves). |
| Layout           | Header unchanged: 51px bar, `background-secondary`, logo Fraunces 20, nav items Inter 15 Medium with 16px horizontal padding. Removal only — no spacing changes.     |
| Libraries        | Hub tokens (`app/globals.css` @theme). No components added.                                                                                                          |
| Breakpoints      | S · 480px / L · 1024px (BHD Content Types). Mobile dropdown loses the same item via the shared `navLinks` array.                                                     |
| Status           | Pair generated 2026-07-21; approval rides the design-gate approval of this artifact.                                                                                 |
| Reference pages  | `01 As-is — /workflow (current)` — the page being deleted, reconstructed from code. `02 Proposed — /method` — superseded rewrite, retained as design record.          |

## Decisions

1. **Redirect, not a tombstone page.** `/workflow` 308-redirects to `/`. No "this page moved" interstitial — the homepage is the story now, and a permanent redirect preserves old links with zero maintained surface.
2. **One-array edit for both navs.** Desktop and mobile menus render from the same `navLinks` constant; the removal is one line, and the design intentionally requires no compensating layout change.
3. **Tooltip tells the truth, minimally.** "Click to see breakdown" becomes a plain description of the score (e.g. "Total across five scoring dimensions — see /scoring"); no new breakdown UI is designed to satisfy the old promise. Final copy at apply.
4. **The method-page design is parked, not deleted.** `02 Proposed` stays in the file as the record of the explored direction; any future Notion-backed process page starts a new change and a new iteration page per file convention.

## Risks / Trade-offs

- **External links to `/workflow`** land on the homepage without explanation — accepted; the homepage table is self-explanatory and a redirect beats a 404 or a maintained stub.
- **`ExperimentList.tsx` deletion** — grep shows no app imports (orphaned since `stop-the-leaks`), but apply must re-verify before deleting in case an intervening change adopted it.
