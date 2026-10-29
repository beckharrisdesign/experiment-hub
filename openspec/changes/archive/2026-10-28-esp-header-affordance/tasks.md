# Tasks: esp-header-affordance

> §1 checkboxes are claims: ticked only with a dated receipt (test, Playwright run, screenshot).
> Visual target: Figma round **02.1** (<https://www.figma.com/design/TsnWXZIK9TgMlxX7kPy9BQ>, page
> `8:23`). Ships in PR #568 with the planning docs (Katy, 2026-10-28: "one PR — add tasks and
> build it here").

## 1. User outcomes (from spec scenarios)

- [x] 1.1 Back from a sale's inner screens: on Sort, Progress, Add photos or an item, the user taps `‹ <sale name>` and lands on that sale's Items screen — `top-bar.test.tsx`; Playwright 428/360: Sort, Progress, item, Add photos → `/sales/<id>` (2026-10-28)
- [x] 1.2 Back from a sale to Home: on a sale's Items screen or Take photos, the user taps `‹ Home` and lands on Home — `top-bar.test.tsx`; Playwright: sale and Take photos → `‹ Home` (2026-10-28)
- [x] 1.3 Back from a source photo: the user taps `‹ <item name>` and lands back on the item — `top-bar.test.tsx` (2026-10-28)
- [x] 1.4 Home has no Back button — `top-bar.test.tsx`; Playwright Home: no Back (2026-10-28)
- [x] 1.5 Long names truncate, the controls stay: at 360 px a long sale or item name truncates, and Back and Menu stay fully visible at 44 px — Playwright 360: Back 148×44, Menu 44×44, title truncates, no horizontal overflow on any route (2026-10-28)
- [x] 1.6 Menu on every page: Home, a sale screen, an item screen and the sell list each show a Menu button at the right edge, announced as "Menu, button" — `top-bar.test.tsx`; Playwright: Menu 44×44 on all eight routes at 428 and 360 (2026-10-28)
- [x] 1.7 Open and close the placeholder: Menu opens an "Account & profile" panel with only a Close button; ✕, Escape or tapping outside closes it and returns focus to Menu — `menu-placeholder.test.tsx`; Playwright (real `<dialog>`): opens on "Account & profile" only, focus on Close, Escape closes with focus back on Menu, backdrop tap closes; `assets/built-menu-open-428.png` (2026-10-28)
- [x] 1.8 Item screen keeps its toggle: the Back / title / Menu row and the Sell / Donate / Keep toggle both show in the sticky header at 428 px, neither clipped — `top-bar.test.tsx` (7.75 rem); `assets/built-item-428.png` (2026-10-28)

## 2. Prototype shell

- [x] 2.1 N/A: built in the shipped app (`app/estate-sale-planner/`), no separate prototype. Dev server: `npx next dev` (the repo's `pnpm dev` needs 1Password, which isn't available in agent shells).

## 3. Implementation

- [x] 3.1 `TopBar.tsx`: replace the crumb trail with one Back `Button` (secondary, chevron SVG, `aria-label="Back to <label>"`) built from the last crumb; title `flex-1 min-w-0 truncate`, `aria-current="page"` (D1, D2, D5, D6)
- [x] 3.2 `TopBar.tsx`: `--chrome-top-height` 3.75 rem, or 7.75 rem with the toggle slot (D3)
- [x] 3.3 `MenuPlaceholder.tsx` (new): MVDS icon `Button` (`aria-label="Menu"`, menu SVG), plus a native `<dialog>` opened with `showModal()`, holding the "Account & profile" heading and a Close button, nothing else. Closes on ✕, Escape and backdrop click; returns focus to Menu; `track("esp_menu_open")` (D4)
- [x] 3.4 Mount `MenuPlaceholder` at the right edge of `TopBar` on every page
- [x] 3.5 Re-measure Sort at 428 × 926; if the taller header makes it scroll, tighten the Swipe photo cap — Sort overflowed 20 px at 428 × 746 with the 60 px header; photo cap 36dvh → 33dvh, now 0 (2026-10-28)

## 4. QA

- [x] 4.1 Manual walkthrough on the phone (home-screen app): Home → sale → Sort → Back → Back; open an item and a source photo and back out; open and close Menu three ways; check a long sale name — Katy, on her phone after #568 merged: "I've done a phone walk through -- looks good!" (2026-10-28)
- [x] 4.2 Automated: `pnpm vitest run tests/estate-sale-planner` (new `top-bar.test.tsx` and `menu-placeholder.test.tsx`), `eslint`, `tsc --noEmit` — 24 files, 190 tests pass (14 new); eslint 0 errors; tsc clean for planner files (2026-10-28)
- [x] 4.3 Playwright at iPhone 12 Pro Max (428 × 926) and 360 px: every route's header controls are ≥ 44 px with no horizontal overflow; capture against round 02.1 — all eight routes at 428 and 360; `assets/built-*-428.png` (2026-10-28)
