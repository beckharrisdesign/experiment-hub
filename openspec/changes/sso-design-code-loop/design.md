## Context

The SSO prototype uses Tailwind v4 (CSS-first `@import "tailwindcss"` in `app/globals.css`) with no `tailwind.config.js`. Custom tokens are CSS variables on `:root`; spacing/sizing/typography otherwise use Tailwind's defaults. The Figma file ([Simple Seed Organizer](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=1-2), key `S8YJQugvMmn5jaRqwFM5XO`) currently has frames drawn with arbitrary pixel values — no shared Variables collection yet.

The `/dev/components` route lives inside the existing Next.js app (`experiments/simple-seed-organizer/prototype/app/`) using the same dev server, App Router, and HMR. Auth is enforced by Supabase middleware on protected routes; the dev route needs to live outside the protected path tree.

## Goals / Non-Goals

**Goals:**

- Pick the **smallest concrete shape** for each of the 5 spec requirements so tasks.md is unambiguous.
- Resolve the open choices the spec deferred: typography token type, Variables naming, mock-data approach, auth bypass, first proof component.
- Document the manual Tailwind ↔ Figma re-sync step in one place that's checked when either side changes.

**Non-Goals:**

- Automating the Tailwind ↔ Figma token sync (deferred).
- Designing a new responsive layout for `/dev/components` — it's a scrollable list, not a designed page.
- Setting up color or icon parity (color is a stretch only).

## User flow / IA

1. **Author edits Figma frame** — picks a value from the spacing/typography Variables (e.g. `space/4`, `text/sm`) instead of typing a pixel value. Variables are visible in the Figma right rail.
2. **Author opens parity table** in [`figma-source.md`](../../../experiments/simple-seed-organizer/docs/figma-source.md), sees the component's current parity status, sees which Figma node the row points to.
3. **Author runs `npm run dev`** in the SSO prototype and visits `/dev/components` — sees the priority component(s) rendered with mock props, no sign-in required.
4. **Author edits the React source file** — `/dev/components` hot-reloads. They compare to the Figma frame side-by-side and either update the React code or update the Figma frame so both match.
5. **Author marks the parity row** `full` (or `drifted` if they spotted a gap they're not fixing now).

## Visual design / Figma

| Item             | Value                                                                                                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary file URL | [Simple Seed Organizer](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=1-2)                                                                                                                         |
| Frames in scope  | New "Tokens" page (Variables admin); first-proof component frame (default: `ViabilityBadge` — smallest). No new public-facing frames in this change.                                                                                   |
| Libraries        | None new in Figma; none new in code.                                                                                                                                                                                                   |
| Breakpoints      | N/A — this change is dev infrastructure. The `/dev/components` route is a developer surface, not a responsive page; it can render at desktop width only.                                                                               |
| Status           | Planning — Variables not yet created in Figma; `/dev/components` route not yet scaffolded.                                                                                                                                             |

## Decisions

### Token naming convention

Use **slash-namespaced names** in Figma Variables that map directly to Tailwind class suffixes:

- Spacing/sizing: `space/0`, `space/1`, `space/2`, `space/3`, `space/4`, `space/5`, `space/6`, `space/8`, `space/10`, `space/12`, `space/16`, `space/20`, `space/24` → Tailwind `gap-{n}` / `p-{n}` / `m-{n}` / `w-{n}` / `h-{n}` (each unit = 4px per Tailwind default).
- Typography: `text/xs`, `text/sm`, `text/base`, `text/lg`, `text/xl`, `text/2xl`, `text/3xl` → Tailwind `text-{size}` classes.

Scope: only the values **actually consumed** by SSO prototype components (audit `grep -rEo "(gap|p|px|py|m|mx|my|w|h|text)-[a-z0-9]+" experiments/simple-seed-organizer/prototype/app/components/` to confirm coverage before creating the Variables collection).

### Typography: Figma Variables, not Text Styles — and **Tailwind names override Figma's semantic ones**

Use **Figma Variables** for type tokens (font-family, font-size, line-height, font-weight as separate Number/String variables grouped under `text/<size>`). Two reasons: (1) Variables are the same primitive as spacing, so the mental model is consistent; (2) Variables can be referenced in Auto Layout text properties the same way as spacing values. Text Styles can still exist as a composite, but the parity contract is at the Variable level.

**Naming:** the existing Figma Typography frame (`3:34`) uses semantic names — `Display-L / Display-M / Heading / Body-L/M/S / Label`. **Rename to Tailwind names** (`text/xs`, `text/sm`, `text/base`, `text/2xl`, …) so the token name reads identically on both sides and the parity check is a string match. This is a Figma-side refactor of every text node that currently references one of the old semantic styles. Mapping table lives in [`figma-source.md`](../../../experiments/simple-seed-organizer/docs/figma-source.md) → "Typography (rename existing Figma styles → Tailwind names)".

### Color palette: replace Figma scaffold, in-scope for this change

The Figma file's `Foundations/Color` frame (`3:5`) is a template scaffold with generic Tailwind sample values (Primary-500 = `#4F46E5` indigo) that do not match the prototype's actual palette (`--green-primary: #16a34a`, `--brand-primary: #15472d`, etc). The proposal originally marked colors as "stretch" — **promoting them to in-scope** because the existing scaffold is actively misleading, and the badge tone colors (`color/tone/*`) discovered via the `ViabilityBadge` Figma audit are needed to do the first-proof parity refactor.

The full swap list (15 base colors + 9 badge tone colors) lives in [`figma-source.md`](../../../experiments/simple-seed-organizer/docs/figma-source.md) → "Figma scaffold → real tokens (one-time replacement)". The Figma-side work: replace the existing color swatch frames with the values from that list, organized into a Figma Variables collection grouped by namespace (`color/green/*`, `color/brand/*`, `color/bg/*`, `color/text/*`, `color/age/*`, `color/tone/*`).

### `/dev/components` route placement and structure

- **Path:** `experiments/simple-seed-organizer/prototype/app/app/dev/components/page.tsx` (App Router; `app/dev/` mirrors the existing `app/add/`, `app/import/` conventions).
- **Structure:** single server component renders one section per priority component. Each section: heading with component name, `@figma` node link, the rendered component(s) with mock-data variants below.
- **Mock data:** inline in the route file (not a separate file) until there's enough volume to justify extraction. Solo workflow — colocation beats indirection.

### Bypass auth

- The SSO Supabase middleware (currently in `middleware.ts` at the prototype root) gates protected routes. Add `app/dev/components` to the **middleware-bypass list** (whichever mechanism the middleware uses — public-paths array or matcher exclusion).
- **Production guard:** wrap the route body in `if (process.env.NODE_ENV !== 'development') notFound()` so the route 404s in production builds. Dev-only surface.

### Parity status column legend

Place the legend immediately above the existing component table in `figma-source.md`:

> **Parity status:** `full` = layer tree + tokens mirrored end-to-end · `partial` = some tokens or some structure mirrored, gaps documented in row notes · `drifted` = was mirrored, has since diverged (needs reconciliation) · `not-yet-linked` = the pairing exists in name only

Every existing row gets a value. Most start at `not-yet-linked`.

### First-proof component

**Default: `ViabilityBadge`** — fewest sub-elements, single-purpose, low risk to refactor on either side. If the audit reveals it's already trivially mirrored (no work to do), fall through to `SeedPill`, then `FilterBar`.

### Token sync documentation

Single short section in `figma-source.md` titled "**Token sync (manual)**" with three sub-bullets: (a) when to re-sync (Tailwind config changes, or new spacing/text class introduced in prototype code), (b) where the canonical Tailwind class list is (`grep` command from the audit decision above), (c) how to add a new Variable in Figma. No script — manual until evidence shows churn is high enough to automate.

## Risks / Trade-offs

- **Risk: Figma Variables for typography are clunkier than Text Styles for some operations** (e.g. applying a "full" type style to a text node in one click). Mitigation: optionally add a parallel set of Text Styles that *reference* the Variables. Adds a small one-time setup cost; preserves single source of truth.
- **Risk: `/dev/components` becomes a maintenance burden as components evolve.** Mitigation: route is dev-only (404s in prod); breakage on a stale entry blocks nothing user-facing. Treat the page like a sketchpad — fine to leave entries that are out of date as long as the parity column reflects reality.
- **Risk: Manual token sync drifts silently.** Mitigation: the parity column makes drift visible — any drift between Tailwind and Figma flips affected components to `drifted` on the next time anyone notices, which forces a reconciliation conversation rather than letting it rot.
- **Trade-off: not automating now means the second pass of components will pay this manual cost again.** Acceptable because we don't yet know which automation actually helps — let the friction speak before building the script.
