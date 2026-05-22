## Context

Code Connect wiring for the SSO Figma file. No prototype UI changes — this is a dev-workflow change only. The one Figma-visible change is the `⚡` prefix applied to wired component names on the Components page.

## Goals / Non-Goals

**Goals:**
- Document the Figma-side naming convention change (`⚡` prefix)
- Identify which frames / pages are in scope for the rename

**Non-Goals:**
- Redesigning any surface or component
- Changing any visual styling in the prototype
- Creating new Figma frames (phase 2)

## User flow / IA

No prototype user flow changes. The only perceptible change to a Figma user:

1. Designer opens the SSO Figma file → Components page (`1:2`)
2. Components with a published Code Connect mapping show an `⚡` prefix in their name (e.g. `SeedCard` → `⚡ SeedCard`)
3. Designer inspects a wired component in Dev Mode → Code panel shows correct React import + usage snippet

Surfaces page frames and component instances on surface frames are **not** renamed — the prefix lives on the symbol definition only.

## Visual design / Figma

| Item             | Value |
| ---------------- | ----- |
| Primary file URL | https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer |
| Frames in scope  | Components page (`1:2`) — symbol definitions only; Surfaces page frames untouched |
| Libraries        | N/A — no new library changes |
| Breakpoints      | N/A — no UI |
| Status           | `⚡` rename applied post-publish; no other visual changes |

## Decisions

**`⚡` on Components page only, not surface frames.**
Renaming surface instances would break layer-panel scanning (surface frames use component names as orientation anchors). The prefix only needs to appear where a designer picks a component — the component picker and the Components page layers panel.

**Single primary `@figma` node per multi-variant component.**
SeedPill and ViabilityBadge each have multiple variant symbols (no component set). The most representative variant is used as the primary annotation; sibling variants are noted in a comment. This matches how Code Connect handles variants without a unified component set.

## Risks / Trade-offs

- **`⚡` prefix is manual.** After `figma connect publish` succeeds, the Figma rename step must be done by hand (or via the Figma Plugin API). It will drift if new components are wired without updating names. Acceptable for phase 1 given small scope (5 components).
- **No component set for SeedPill / ViabilityBadge.** Code Connect will map to a single variant symbol. Designers inspecting the other variant won't see the snippet unless we extend to a full component set in phase 2.
