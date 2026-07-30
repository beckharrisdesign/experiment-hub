# Proposal: ELK preview feedback

## Human anchor

> "When I hit submit to preview my images, the page stays up top and I sometimes can't tell that I've generated them or that I need to scroll. Lets fix that pattern."
> — Katy, [issue #336](https://github.com/beckharrisdesign/experiment-hub/issues/336) (snap-issue capture on the live funnel, 2026-07-27)

## Outcomes

- **Who:** A first-time visitor on the Etsy Listing Kit funnel — soon arriving from the $1/day ad — who has uploaded a design and hit the preview button.
- **Job:** Know, without guessing or hunting, that their preview pack is being generated and then see it the moment it's ready.
- **Done when:** Hitting the preview button produces visible in-progress feedback where the visitor is looking, and on completion the page brings the six generated previews into view (no unprompted scrolling required). Works with keyboard/screen-reader flows (state changes are announced).
- **Not doing:** Pack image layout/visual-impact changes, the logo/business-name slot, or removing the "what you get" card — that's [#335](https://github.com/beckharrisdesign/experiment-hub/issues/335), the other half of tracker [#343](https://github.com/beckharrisdesign/experiment-hub/issues/343). No changes to the preview API, generator, or checkout.

## Why

This is the repo's only P1. The submit → preview step is the first conversion-critical moment of the paid funnel, and ad traffic turn-on is gated on it (tracker #343's definition of done). A buyer who can't tell their previews generated abandons before ever seeing the product — the exact leak the funnel-conversion KPI would blame on the ad.

## What changes

Client-only fix in `app/etsy-listing-kit/page.tsx` (+ `elk.module.css`): the `generate()` flow gains a completion behavior — when previews land, scroll the previews section into view (respecting `prefers-reduced-motion`) and move focus/announcement there via an `aria-live` region; while generating, the button area shows an explicit in-progress state so the click visibly "took." No server, API, or data changes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `paid-asset-pack`: the *Preview the pack* scenario gains explicit feedback requirements — in-progress state at the point of action, generated previews brought into view on completion, state changes announced to assistive tech.

## Impact

- **Touched:** `app/etsy-listing-kit/page.tsx`, `app/etsy-listing-kit/elk.module.css`, component test for the feedback behavior.
- **Closes:** #336. Advances tracker #343 (1 of 2 sub-issues).
- **Parent change:** `openspec/changes/etsy-listing-kit` stays active; its tasks 1.3/5.4 receipts gain a re-verify note when this ships.
