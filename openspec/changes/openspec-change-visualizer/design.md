# Design — openspec-change-visualizer

## Outcomes

(See [proposal.md](proposal.md) — Who / Job / Done when / Not doing.)

## User flow / IA

`/changes/[id]` is a read-only page inside the hub shell (`components/Header.tsx`, `components/Footer.tsx`), reached from a change reference anywhere in the hub. It reads top to bottom in the order the questions get asked:

**Intent → Stages → Outcomes → What happened.** The first three are standing state — what is true now. The fourth is history. A chronological stream alone cannot answer "where are we" without the reader getting to the bottom and inferring, which is why the rail sits above it.

`[id]` resolves against `openspec/changes/<id>/` first, then `openspec/changes/archive/YYYY-MM-DD-<id>/`. A change with only a `proposal.md` renders the page with the later sections absent, not an error.

## Visual design / Figma

**File convention (restated):** numbered pages, and every proposal iteration is a **new** numbered page — `02.1`, `02.2`, … — never frames appended to an already-built page. Frames within a page are named by treatment + breakpoint. This change's exploration ran `02` through `02.11`; `02.12` is the gate pair.

| Item | Value |
| ---- | ----- |
| Primary file URL | <https://www.figma.com/design/2FEqaAxp50skge0yJI5wAC/openspec-change-visualizer> (`fileKey` `2FEqaAxp50skge0yJI5wAC`) |
| As-is page | `01.1 Current state — the hub shell, with no /changes route` — frame `Current state · Hub shell · Desktop 1024` (node `44:3`). Header, body and footer reconstructed from `components/Header.tsx` (h-51, `bg-background-secondary`, `lg:px-16`, single `Experiments` nav item with `bg-background-active` + 3px `accent-primary` underline) and `components/Footer.tsx`. The route does not exist, so the as-is is a 404 in real chrome — the absence *is* the current state. |
| Proposed page | `02.13 Proposed — built on MVDS Core` (current) · `02.12 Proposed — inside the hub shell, plain-language stages` (kept) |
| Proposed frames | `02.13` → `Proposed · /changes/[id] · Desktop 1024` (node `49:3`) · `02.12` → Desktop (`44:292`) and `Proposed · /changes/[id] · Mobile 480` (node `45:2`) |
| Prior iterations | `01 Current state` (`1:3`), `02` (`5:2`), `02.1` (`9:3`), `02.2` (`10:3`), `02.3` (`11:3`), `02.4` (`16:3`), `02.5` (`21:150`), `02.6` (`23:3`), `02.7` (`28:3`), `02.8` (`30:3`), `02.9` (`31:3`), `02.10` (`35:3`), `02.11` (`43:3`) — kept intact |
| Libraries | **MVDS Core**, subscribed 2026-08-28 (`libraryKey` `lk-d54f86bc…09687`, `source: team`). Components used: `Badge` (`925f5b9b…`, 6 variants) for the status chip, `Callout` (`b9ebdbd5…`, `variant=with-icon`) for the drift finding and the loop detail. `Card` (`c6b13ee4…`) was evaluated and **not** used — it carries a Header/Title/Description + Footer/Action contract the bands do not need; the bands are plain surfaces built on tokens. `Tooltip` and `Separator` have no MVDS counterpart and stay page-local. Instances live on `00 Components — MVDS Core`. |
| Fonts | Fraunces (headings) and Inter (body) are the real hub faces. `SF Mono` has no Figma counterpart; **JetBrains Mono stands in** for every mono run. Implement with the `--font-mono` stack from `app/globals.css`, not JetBrains Mono. |
| Breakpoints | S · 480px / L · 1024px (BHD Content Types). Both drawn. |
| Code Connect | No new mappings. The page composes existing hub primitives plus four page-local elements (stage rail, outcome row, timeline row, tooltip); revisit if any becomes shared. |

**Mobile 480 shows the pattern, not the full page** — 4 of 11 outcome rows and 5 timeline events, enough to fix every responsive rule below. The desktop frame is complete.

Responsive rules, from the two frames:

- **Stage rail stacks.** Six gates cannot carry labels across 448px, so below `lg:` the rail becomes a vertical list, one gate per row, dot + name + date. Dot states are unchanged.
- **The stage lane becomes a chip.** The 140px left column collapses; each timeline event carries its stage as a small mono line above its title.
- **Meta drops under the title.** Right-aligned dates have nowhere to go at 480, so they sit beneath the title rather than beside it.
- **Evidence kind takes its own line**, indented to the outcome text, instead of a right-hand column.
- **Gutter narrows** 34px → 28px; page padding `px-16` → `px-4`.

## Decisions

1. **Plain-language stage names, schema ids untouched.** The rail and stage lane read `proposal · requirements · design · tasks · build · archived`. `specs`, `apply` and `archive` are OpenSpec's words, and a reader who has never used it cannot be expected to know that "apply" means the code is being written. The underlying artifact ids do not change — this is a display mapping, and `openspec status` stays the source. (Deferred here from the intent statement by decision, 2026-08-28.)
2. **Standing state above history.** Settled in `02.7` after `02.4`–`02.6` proved a timeline alone cannot answer "where are we" at a glance.
3. **Every outcome, with its evidence kind, never a bare count.** Five kinds — automated test, code path, human review, deferred, not stated — each with its own colour. The kind is **derived from the `(→ 1.4, 1.5)` back-references the change already records**, not judged: a §4 item naming a test file outranks everything, `deferred` outranks a plain implementation item because a wired seam with nothing behind it is not evidence, and an outcome nothing points at reads `not stated`.

   It reports the **strength of the claim in `tasks.md`, not an audit of the test suite** — and it corrected this document. An earlier draft asserted `tell-the-story` was "8 checked, of which only 5 are defended by a test"; derived, it is 8 automated test / 2 human review / 1 deferred. The hand-made number reached `proposal.md` and the Figma frames before the code contradicted it.
4. **Silences render at full weight.** A gap gets its own row and its real duration. Duration is never styled as a warning: amber is reserved for disagreement between sources and for stages that went backwards. Apply is long by nature and the page does not apologise for it.
5. **Provenance hides, findings do not.** `ⓘ` holds node ids, file paths and commit stats. The row keeps what was learned — a loop, a retraction, a disagreement. A page whose findings sit behind icons answers the question with a shrug.
6. **No caption narrates what is visible.** Explanatory paragraphs were cut in `02.8`; labels name things, marks and colour carry state.
7. **Intent is a blend, capped at three sentences** — the anchor's own words at each end, generated summary in the middle carrying what the change produces. It opens `This change is about…` because the page titles itself with a slug.
8. **Components come from MVDS where MVDS has one.** `Badge` for the status chip, `Callout` for findings. `Card` is deliberately not used: its Header/Footer contract does not fit a plain banded surface, and bending it would be worse than a token-built surface. The stage rail, the timeline row and the tooltip have no MVDS counterpart and are page-local — like `Stack` and `Inline`, their absence is not a gap to fill.
9. **Artifacts prefer the committed file.** A PNG under the change's `assets/` renders directly; otherwise the frame is fetched from the file key, page and node id recorded in that change's own `design.md`. Neither available renders no artifact and no placeholder.

## Risks / Trade-offs

- **Pull-request attribution is the weakest link.** `tell-the-story`'s eleven PRs were found by matching the change name *and* its capability name, which will not generalise. Branch-name matching (`<harness>/<change-name>`) is the likely rule, with an explicit list in the change folder as the fallback; unresolved until tasks.
- **Fetching a Figma frame needs Figma access at render time** and returns a short-lived URL. Committed PNGs are preferred for exactly this reason; a page rendered without Figma access must degrade to the recorded reference rather than break.
- **Drift detection can be confidently wrong.** Matching an unchecked task to shipped code is inference. Mitigated by decision 5: findings state both readings and cite their evidence, never resolve.
- **Page length.** The desktop frame is 3599px with the shell. Acceptable for a page read top-to-bottom, but if a change with 40 outcomes and 60 events lands, the outcome table and history will need collapse affordances — deliberately not designed yet, since no such change exists.
- **The frames' evidence column predates the derived rule.** `02.13` and its ancestors show `1.2`, `1.5` and `1.8` as `code path`, from the hand-made split. The shipped page derives `automated test` for all three. The frames are kept as the iteration record; the code is the correct reading.
- **MVDS's Figma library has no hub brand mode, and the frames override it.** MVDS Core's `Tokens` collection carries `Light` and `Dark` modes; `02.13` is set to `Dark`, matching `app/layout.tsx` putting `dark` on `<html>`. But dark-mode MVDS is **greyscale** — an imported `Callout` renders `#262626`, not the hub's `#113723`. The hub brands MVDS at runtime in `app/globals.css` by redefining `--primary`, `--card`, `--background` and friends, and that brand layer has no counterpart in the Figma variables. The `Customize Here` collection ships six presets and none of them is the hub: `Default` is `#0a7e3a`, `Forest` is `#1a704d`, the hub's primary is `#14ae5c`. So the instances in `02.13` carry **fill and stroke overrides** to the hub's real values — structure, spacing and type come from the component, colour is compensated by hand. This is exactly the greyscale failure `globals.css` documents in code, reproduced in Figma. Fixing it at source means adding a hub-branded mode to the MVDS library rather than repainting instances per file — logged as a follow-up, and until then every hub frame built on MVDS Core needs the same override.
