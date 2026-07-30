# Design: ELK preview feedback

## Current behavior (the leak)

The preview CTA sits mid-page; on click it disables and swaps its label to "Building your 6 images…" — that part works. But when generation finishes, the previews `<section>` mounts **below the fold** and nothing else happens: no scroll, no focus move, no announcement. The visitor is left staring at a re-enabled button ("the page stays up top"), which reads as *nothing happened*.

## Interaction states

```
idle ──click──▶ generating ──success──▶ revealed
                    │
                    └──error──▶ failed (existing role="alert" error, unchanged)
```

- **generating** — button stays disabled with its progress label (existing) and gains a small inline spinner so the state is visible at a glance, not only by reading. Repeat submits already prevented via `disabled`.
- **revealed** — the moment `previews` land:
  1. Scroll the previews section into view — `scrollIntoView({ block: 'start' })`, `behavior: 'smooth'`, degrading to `'auto'` under `prefers-reduced-motion`.
  2. Move focus to the section heading ("Here's your set — take a look") via `tabIndex={-1}` — keyboard users continue from the previews, not from the button.
  3. Announce via a polite `aria-live` region: "Your 6 preview images are ready." (also announces "Building your 6 images…" on start and the error message on failure).

No layout, palette, or copy composition changes — same components, same frames, new motion + focus behavior. Behavior is identical at S (480) and L (1024); mobile benefits most since the fold is shallower.

## Visual design / Figma

**File:** [etsy-listing-kit — OpenSpec design](https://www.figma.com/design/5oeip2GtLOFpGWpmhyd0fK) · fileKey `5oeip2GtLOFpGWpmhyd0fK` (parent change's file; naming convention per `rules/figma.mdc`)

| Item | Value |
| --- | --- |
| Published libraries | MVDS (unchanged) |
| Frames in scope | Existing `02.3` landing + preview frames — **no new composition**; the generating-button state already appears there. Motion/focus behavior is specified in this document (Figma frames can't carry scroll behavior). |
| New iteration page | **None proposed** — judgment call: a scroll/focus/announce fix has no new visual state to draw beyond the spinner. If you want a `02.4` page documenting the spinner + revealed state, say so and it gates apply. |
| Code Connect updates | None. |

## Accessibility

- `aria-live="polite"` region for start / ready / failed (failure also keeps the existing `role="alert"`).
- Focus target is a heading with `tabIndex={-1}` — no focus trap, natural tab order into the grid and pay CTA.
- `prefers-reduced-motion` honored on the scroll.

## Test approach

Component test (vitest, jsdom): after a mocked successful generate, assert `scrollIntoView` was called on the previews section, focus is on the heading, and the live region contains the ready message; reduced-motion branch asserted via matchMedia mock.
