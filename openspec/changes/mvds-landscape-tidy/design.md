# mvds-landscape-tidy — design

## Context

The Hub consumes MVDS through exactly one dependency, and `app/globals.css` imports its stylesheet into the root layout. That single pin is what makes this change high-leverage and what makes it risky in the same breath: six experiments move together, and there is no way to stage them.

There is no visual regression suite in this repo. So the design question here is not "what should it look like" — nothing is being composed — but **how do you know a stylesheet swap under every route changed nothing?** That is what this artifact specifies.

Two further facts shape the work. The Hub pins `.dark` on `<html>` and is a dark-only app, so MVDS light mode is unreachable inside it (established at apply time in `hub-tailwind-v4`). And `0.4.0`'s colour gradations are authored *per mode*, which means the one call site being migrated has to be chosen for dark, not evaluated in the abstract.

## Goals / Non-Goals

**Goals:**

- A verification method strong enough to justify "renders unchanged" without a regression suite.
- Delete CSS the bump makes redundant, rather than bumping and leaving the workarounds in place.
- Leave the two record files telling the truth about what the package ships and what the Hub still wants.

**Non-Goals:**

- Adopting `Input`, `Dropzone` or scoped brands. `0.4.0` brings them into reach; using them is later work with its own design pass.
- Touching `openspec/specs/`. The `experiments-catalog` drift found while writing the specs is filed as #528, not fixed here.
- Any change inside `@beckharrisdesign/mvds`, or in `bhd-headless-notion`.

## User flow / IA

No flow or IA change. No route is added, removed, or re-mounted; no navigation changes; no component composition changes.

The only person-facing surface is the six-route read-through in §4 QA, where Katy is the reviewer rather than the user.

## Visual design / Figma

> Waived for this change by founder decision — anchor, 2026-10-05: *"its ok to skip figma for this one."*

| Item | Value |
| --- | --- |
| Primary file URL | None — waived |
| As-is frame(s) | N/A |
| Proposed frame(s) | N/A |
| Libraries / version | `@beckharrisdesign/mvds@0.4.0` (consumed, not designed against) |
| Code Connect | No mappings affected — no component added, removed, or re-bound |
| Breakpoints | Unchanged. The bump alters tokens, not layout; breakpoint adoption is #285's scope, not this change's |
| Status | Waived, with the substitute below |

The waiver is defensible because this change composes nothing: the bump is a token and version move, and the other two items are data and documentation. But a waiver is not an absence of verification — it moves the burden onto the running app, which is where a token change actually shows up. The substitute is the route read-through below, against the current deploy rather than against frames.

## Decisions

1. **Bump, don't adopt.** `^0.4.0` lands; `Input`, `Dropzone` and scoped brands stay unused. Mixing a version move with new component adoption would make any visual delta ambiguous — you could no longer tell a regression from an intended change. The bump must be boring to be verifiable.

2. **Nothing to migrate — the one apparent brand-alpha call site was a false positive.** `text-text-primary/75` in `ChangePageView.tsx` reads as `text-primary/75` to a careless pattern, but it is the Hub's own `--color-text-primary` token (declared in the Hub's `@theme`, a light mint), not MVDS's `primary` brand family. `0.4.0`'s gradation contract does not govern hub-namespaced tokens, so it stays as written. Recorded because the mistake is easy to repeat: match brand families on a word boundary, or the Hub's `text-*` and `background-*` token names will shadow them.

3. **Attempt the font-hack deletion, with an explicit fallback — fallback taken.** The block at `app/globals.css:160–170` exists only because MVDS set `--font-heading: var(--font-sans)`. `0.4.0` makes that a runtime token, so the block should become redundant. If headings regress in either scoped theme, the fallback is to keep the block and record why in this file — the bump still stands on its own. The deletion is a win, not a precondition. **Outcome: not attempted, and correctly so.** Reading the installed `0.4.0` stylesheet before editing showed it still declares `--font-heading: var(--font-sans)` (`dist-lib/styles.css:228`), so the override remains load-bearing. Checking the dependency's own CSS cost nothing and avoided shipping a regression that the route read-through might not have caught in every card.

4. **The Hub keeps owning its font tokens.** `0.4.0` removes MVDS's `font-sans` / `font-heading` utilities, and the Hub declares both itself in its `@theme` block plus an `@layer utilities .font-heading`. That ownership is why the break costs nothing, so it stays — this change does not migrate the Hub onto MVDS's font model.

5. **Leave `--color-border` and the literal-green pin alone.** Both are known friction between hub and MVDS tokens. Reconciling them is adjacent work with its own trade-offs, and folding it in would again make deltas ambiguous.

6. **Correct the seed file rather than delete it.** It is not read at request time, which is an argument for deletion — but both its consumers are live, and the sitemap tooling silently loses a route without it. Correcting is cheaper than rewiring two scripts.

7. **`keyword-explorer` stays out.** Its page header records the decision in Katy's own words. A registry row would quietly overturn a founder call, which is worse than an incomplete file.

8. **`Slider` is handed off, not claimed.** The candidates doc records it with its two-consumer evidence and points at the concurrent MVDS session. If that session publishes it, the Hub picks it up on a later bump — no release coordination between the two.

9. **Route-level scanning is not consumption scanning.** The first pass over this landscape globbed `app/*/` for MVDS imports and concluded two routes were inherit-only. Both `components/KeywordTable.tsx` (used by `/keyword-explorer`) and `components/EtsySyncPanel.tsx` (used by `/admin`, the etsy-notion-sync surface) import MVDS from outside `app/`, so they were invisible to it. Any future consumption question has to scan `components/` and `lib/` too, and follow the import graph rather than the directory tree.

## Risks / Trade-offs

| Risk | Mitigation |
| --- | --- |
| **Blast radius is all six experiments at once.** One pin, no staging — a bad bump degrades every MVDS route simultaneously. | Verify `/etsy-listing-kit` first — the only inherit-only route, so if *it* shifts, the stylesheet moved under everything and the bump should be reverted rather than debugged forward. Corrected during apply: `/keyword-explorer` was also assumed inherit-only, but it reaches MVDS `Select*` through the shared `components/KeywordTable.tsx`, so it is not a canary. |
| **No visual regression suite**, so "renders unchanged" rests on human reading. | Read all six routes against the current deploy, not against memory, and read `/exec-function-assessment` most carefully — 11 files and the widest component surface (`Button, Callout, Card*, Field, Inline, Label, Layer, RadioGroup*, Section, Select*, Stack`), so it exercises the most of the package. |
| **The font-hack deletion may not work** if `0.4.0`'s token model does not reach the `.mvds-theme` / `.efa-theme` scopes the way the changelog implies. | Decision 3's fallback: keep the block, record why. Deletion is attempted after the bump is verified, never bundled into the same unverified step. |
| **`0.4.0` introduces `data-brand` scoping** while the Hub uses `.mvds-theme` / `.efa-theme` classes for the same purpose. The two mechanisms may interact. | Out of scope to migrate, but check during the read-through that the class-based scopes still win where they are applied. If they do not, that is a finding for its own change, not a fix here. |
| **Gradation steps are authored per mode**, and the Hub only ever renders dark. | No longer live for this change — decision 2 found nothing to migrate. Keep in mind for any later adoption work, which will be authoring against the gradation scale for real. |
| **The bump is a lockfile change** on a machine with limited memory and disk. | Single `pnpm install` for the one dependency; no full reinstall, no parallel builds. |
