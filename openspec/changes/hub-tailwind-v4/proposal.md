# Proposal — hub-tailwind-v4

## Human anchor

> "I want to make sure we're leveraging MVDS as we build this experiment if there are any ui implications."
>
> "MVDS should handle all the breakpoints, not just s and l. if this repo is defaulting to just two I want to fix that in a future effort."
>
> — Katy, 2026-07-15 (session, verbatim). Same day, presented with the spike result (MVDS ships Tailwind v4 source only, no compiled CSS), Katy selected: **"Upgrade hub to Tailwind v4"** over MVDS shipping compiled CSS or a page-scoped side-build.

## Outcomes

- **Who:** Katy, and every current and future hub surface that should consume MVDS.
- **Job:** Make the hub a native consumer of `@beckharrisdesign/mvds` — Tailwind v4 toolchain so MVDS's tokens, components, and breakpoints work without hacks.
- **Done when:** The hub builds and renders correctly on Tailwind v4 (`npm run build` green, all vitest green, key pages visually verified); `@beckharrisdesign/mvds` installs from public npm and its `Button`/`Badge`/`Card`/`Section` render on a dev-only route; the `.npmrc` GitHub-registry line is gone.
- **Not doing:** Adopting MVDS components across existing hub surfaces (issue #285 territory, later); restyling anything — this is a toolchain migration, existing pages should look the same; the etsy sync page itself (PR #287, separate change).

## Why

The etsy-notion-sync hub page is spec'd on MVDS, and the spike (2026-07-15) proved MVDS requires a consumer-side Tailwind v4 build — the package ships v4 source with `tailwindcss: ^4` as a peer dependency, and there is no compiled-CSS fallback. The hub is on Tailwind 3.4. Rather than maintain a second build artifact in MVDS or run two Tailwind toolchains in one repo, the hub upgrades once and every future MVDS consumer in the hub is free. This also unblocks issue #285 (adopt MVDS's full breakpoint set hub-wide).

## What changes

- Tailwind 3.4 → 4.x: run `npx @tailwindcss/upgrade`, migrate `tailwind.config.ts` theme into CSS-first config (`@theme` in `globals.css`), swap the PostCSS plugin (`@tailwindcss/postcss`), update content scanning to `@source`.
- Install `@beckharrisdesign/mvds` (public npm) with a dev-only proof route rendering core components; delete the `@beckharrisdesign:registry` line from `.npmrc`.
- Visual regression pass over the hub shell (home, experiment detail, header/nav) — same look on v4 or documented-and-approved deltas.

## Capabilities

### New Capabilities

- none (toolchain migration; no user-facing behavior change).

### Modified Capabilities

- Hub build pipeline: Tailwind v4 toolchain; MVDS installable and renderable.

## Impact

- `package.json` / lockfile, `postcss.config.js`, `tailwind.config.ts` (removed or reduced), `app/globals.css` (token/theme home), `.npmrc`.
- All hub surfaces re-verified visually; experiment prototypes with their own builds are untouched.
- Vercel build must stay green — deploy preview is the acceptance surface.

## Optional links

- Blocks: sync page in [etsy-notion-sync-build](../etsy-notion-sync-build/) (PR #287). Related: issue #285 (MVDS breakpoints hub-wide).
