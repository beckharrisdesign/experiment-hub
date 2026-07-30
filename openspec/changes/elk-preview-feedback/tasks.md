# Tasks: ELK preview feedback

Closes #336 · advances tracker #343 (1 of 2). Client-only: `app/etsy-listing-kit/page.tsx` + `elk.module.css` + tests. No API/generator/checkout changes.

## 1. User outcomes (spec scenarios — must all pass before archive)

- [x] 1.1 Submitting a design shows an explicit in-progress state at the button (label + spinner) and blocks repeat submits *(Visitor sees generation in progress)* — verified by preview-feedback.test.tsx (disabled + spinner label + status region)
- [x] 1.2 When generation completes, the previews section scrolls into view without manual scrolling — smooth, or instant under `prefers-reduced-motion` *(Finished previews are brought into view)* — verified: scrollIntoView smooth/auto branches tested
- [x] 1.3 Focus lands on the previews heading on completion; tab order continues naturally into the grid and pay CTA *(Finished previews are brought into view)* — verified: heading holds focus after reveal
- [x] 1.4 Start / ready / failed states are announced via a polite `aria-live` region; failure keeps the existing `role="alert"` error *(State changes are perceivable without vision)* — verified: status region start/ready; failure keeps role="alert"
- [x] 1.5 Existing preview scenario unchanged: all 6 watermarked images render with price + what-you-get *(Visitor previews the generated pack — regression guard)* — verified: 6 previews + pay CTA + what-you-get regression test

## 2. Build

- [x] 2.1 `generate()` completion behavior: ref on the previews section, `scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' })`, heading `tabIndex={-1}` + `.focus({ preventScroll: true })` — page.tsx effect on previews
- [x] 2.2 `aria-live="polite"` status region wired to generating/ready/failed transitions — genStatus + role="status" region
- [x] 2.3 Inline spinner on the generating button state (`elk.module.css`, terracotta on disabled surface, WCAG-safe) — spinner in elk.module.css, reduced-motion aware

## 3. QA

- [x] 3.1 Component tests (vitest/jsdom): scrollIntoView called on success, focus on heading, live-region text for all three states, reduced-motion branch via matchMedia mock, repeat-submit blocked — 5 tests; full ELK suite 67/67 green 2026-07-30
- [ ] 3.2 Manual pass on the production funnel after deploy: real upload → submit → auto-scroll lands on "Here's your set"; verify at 375px (shallow fold — the case that bit in #336)
- [x] 3.3 Update parent `etsy-listing-kit/tasks.md` receipts (1.3/5.4 re-verify note) in the same PR — per the "Tasks stay true" rule — parent 1.3 receipt updated this PR

> Stop rule: wait for approval before `/opsx:apply`.
