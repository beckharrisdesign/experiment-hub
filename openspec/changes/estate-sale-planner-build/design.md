# Design: estate-sale-planner-build

## Context

New in-hub route, mobile-first: the phone is the camera. The product is a linear funnel
with one loop (swipe) and one exit (haul-away tap), on MVDS. Nearest hub precedent is
`etsy-listing-kit` (one input → one transformation → one exit); the copy and layout rules
promoted from ELK in `rules/design-guidelines.mdc` apply here unchanged.

## Goals / Non-Goals

**Goals:**

- One primary action per screen; a grieving user never faces a form.
- The vision pass is visibly a *guess with a confidence*, never an appraisal.
- Swipe works one-handed at 480 px; lists and summary read well at 1024 px.
- The exit CTA is a single centered button on its own line (founder rule).

**Non-Goals:**

- No accounts, sharing, or multi-user surfaces.
- No marketplace or listing screens (Build Unit 2).
- No bespoke chrome — MVDS components only, hub `.mvds-theme` wrapper (plain MVDS, not
  the hub's green skin), light mode is unreachable in the hub so the dark `.dark` tokens
  apply as they do for `/svg-to-stitch`.

## User flow / IA

Six screens, one route:

```
/estate-sale-planner
  1. Capture       film / pick video or photos            ← one button
  2. Frames        sampled grid + count + Send            ← confirm before anything leaves the phone
  3. Lists         Sell (bands) · Keep / Toss by room     ← read, then "Start sorting"
  4. Swipe         one item, Keep | Toss, Undo            ← loop until the stack is empty
  5. Exit          haul-away CTA (own line, centered)     ← counted, then deep link / tel:
  6. Summary       printable Sell list, "not an appraisal" first
Recovery: no key → demo on the fixture set, says so · nothing flagged → honest empty Sell
```

The proposal-round flow as generated (the board's Mermaid source, kept here because the
thumbnail host is not reachable from the build environment):

```mermaid
flowchart LR
    start([Open on phone])
    subgraph device ["On the phone"]
        capture[/Film walkthrough or pick photos/]
        frames[Sample frames]
        confirm{Send these frames?}
    end
    subgraph hub ["Hub server"]
        flag[[Vision pass]]
        count[Count the tap]
    end
    sell[Sell list with value bands]
    keepToss[Keep or Toss list by room]
    swipe[Swipe one item at a time]
    finished{Sort finished?}
    exit{{One tap haul-away}}
    haul[/Haul-away link/]
    summary[Printable sell summary]
    start --> capture --> frames --> confirm
    confirm -->|"No"| capture
    confirm -->|"Yes"| flag
    flag --> sell
    flag --> keepToss --> swipe
    sell -.->|"Override"| swipe
    swipe --> finished
    finished -->|"No"| swipe
    finished -->|"Yes"| exit
    exit --> count --> haul
    exit --> summary
```

## Visual design / Figma

Two files, both titled with the change ID per `rules/figma.mdc`. Round numbering runs
continuously across them: the proposal round is **02** on the board; the surface pair
continues as **02** on the design file (as-is is `01`).

| Item | Board (proposal round) | Design file (surface pair) |
| --- | --- | --- |
| Primary file URL | <https://www.figma.com/board/uafykXQHdW2h3YpBAy3Hfv> (`uafykXQHdW2h3YpBAy3Hfv`) | <https://www.figma.com/design/p75qmqHxUBh0TDLAUUXUmn> (`p75qmqHxUBh0TDLAUUXUmn`) |
| As-is frame(s) | Page `01 Current state` (node `1:2`), section `Current state` — net-new note | Page `01 Current state` (node `1:2`), frame `Current state · net-new` (node `1:4`) — documents the net-new surface, elk precedent |
| Proposed frame(s) | Page `02 Proposed — flow` (node `0:1`), anchor section `On the phone` (node `2:12`); generated via `generate_diagram`, 14 nodes | Page `02 Proposed` (node `1:3`) — **pending MVDS Core subscription**: six frames × two breakpoints (Capture, Frames, Lists, Swipe, Exit, Summary · `Proposed · Mobile 480` / `Proposed · Desktop 1024`) |
| Libraries / version | FigJam page-per-iteration conventions per `rules/figma.mdc` | `MVDS Core` (`C20nU0mROzk3Zr0I9BELJF`) — **not yet subscribed on this file** (`get_libraries` 2026-10-13: `libraries_added_to_file: []`); code `@beckharrisdesign/mvds@0.4.0` → next release once published |
| Code Connect | N/A — no code surface | Not set up (no published hub component library to map against — elk precedent); implementation maps to MVDS components in code |
| Breakpoints | N/A — FigJam canvas, not a responsive screen | S · 480 px mobile (primary) / L · 1024 px desktop (review layout) — `rules/design-guidelines.mdc` |
| Status | **Round 02 drawn** 2026-10-13 (rough — shape and sequence, as the proposal round should be) | **Blocked on one founder click** — see below. Frames are drawn on `02 Proposed` once MVDS Core is on; the gate is not skippable |

**The one click (Katy):** open <https://www.figma.com/design/p75qmqHxUBh0TDLAUUXUmn> →
**Assets** panel → library icon (top right of the panel) → toggle **MVDS Core** on. Then
`get_libraries` must show `MVDS Core` with `source: "team"` before any proposed frame is
built.

**Component mapping (MVDS → screens):**

| Need | MVDS | Product-local? |
| --- | --- | --- |
| Capture / Send / Keep / Toss / haul-away CTA | `Button` (default, `outline`, `destructive` for Toss) | No |
| Frame grid, list rows, swipe card | `Card` + `CardContent` on `Grid` / `Stack` | No |
| Value band + confidence | `Badge` (`muted` for low confidence) | No |
| "Not an appraisal" / "closing the tab loses this" | `Callout` | No |
| Photo fallback picker | `Dropzone` | No |
| Page scaffolding | `Section`, `Container`, `Stack`, `Inline` | No |
| Swipe gesture handling | — | Yes: small pointer-event hook; visual is still a `Card` |

## Decisions

1. **Board for the proposal round, design file for the pair.** The proposal's question is
   a sequence (capture → flag → swipe → exit), so the first round is a board; the surfaces
   are a design-file question and get the as-is + proposed pair there.
2. **Mobile is primary.** 480 px frames are the ones that matter; 1024 px is a review
   layout for the lists and summary, not a different product.
3. **Sell flags are visibly guesses.** Every band carries a confidence `Badge` and the
   summary leads with the "not an appraisal" line — the product's honesty is a design
   property, not a footnote.
4. **Toss is `destructive`, Keep is default.** The irreversible-feeling action gets the
   stronger colour; Undo is always visible beneath the card.
5. **No screenshots committed yet.** The Figma thumbnail host (`s3-alpha.figma.com`) is
   denied by the build environment's egress policy, so the PR body carries file links and
   the Mermaid source above; PNGs can be captured from Katy's machine and committed under
   `assets/` when the frames exist.

## Risks / Trade-offs

- **The gate blocks on a founder action** (library toggle). Mitigation: it is one click
  and is listed first in the hand-off; nothing else in the change depends on it until the
  build session.
- **Frame sampling on low-end phones** may be slow for a 10-minute video. Mitigation: the
  sampler runs incrementally with a progress bar and the budget cap is low by default.
- **Dark-only hub** means the product cannot be previewed in MVDS light mode inside the
  hub; the Figma pair should be drawn in dark to match what ships.
