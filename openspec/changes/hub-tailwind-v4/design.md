# Design — hub-tailwind-v4

## Context

Toolchain migration: Tailwind 3.4 → 4.x so the hub can consume `@beckharrisdesign/mvds` natively (the package ships v4 source with `tailwindcss: ^4` as a peer dep — spike 2026-07-15). No user-facing change; visual parity is a spec requirement. The hub's current setup is favorably simple: no Tailwind plugins, a flat custom color/font theme in `tailwind.config.ts`, two `@apply` uses in `globals.css`, `darkMode: "class"`.

## Goals / Non-Goals

**Goals:**

- Hub builds/renders identically on v4; MVDS installs tokenless and renders on a dev proof route; `.npmrc` registry line removed.

**Non-Goals:**

- No restyling, no MVDS adoption on existing surfaces (issue #285, later), no breakpoint changes yet, no sync-page work (PR #287's change).

## User flow / IA

N/A — no new user-facing UI. One dev-only proof route (`app/dev/mvds/page.tsx`, 404s in production but visible on Vercel previews) rendering MVDS `Button`/`Badge`/`Card`/`Section` in the hub's dark context — the hub pins `.dark` on `<html>`, so light mode is unreachable inside it (discovered at apply, 2026-07-15).

## Visual design / Figma

| Item             | Value |
| ---------------- | ----- |
| Primary file URL | N/A — toolchain migration; spec requires visual parity with current production, so production is the reference |
| Frames in scope  | N/A (dev proof route uses MVDS's generated Figma mirror as its reference: <https://mvds-roan.vercel.app/>) |
| Libraries        | `@beckharrisdesign/mvds` v0.2.x (public npm) added; hub theme tokens preserved as-is |
| Breakpoints      | Unchanged in this change (hub `md`/`lg`); MVDS full breakpoint adoption is issue #285 |
| Status           | N/A — no design sign-off needed beyond the parity check |

## Decisions

- **Start from the codemod:** `npx @tailwindcss/upgrade` does the mechanical pass; every diff it produces gets human review rather than blind trust.
- **Theme moves to CSS-first:** `tailwind.config.ts`'s colors/fonts become `@theme` variables in `app/globals.css` (`--color-background-primary: #194b31;` etc. — nested keys flatten to the same utility names, so `bg-background-primary` keeps working). `darkMode: "class"` becomes v4's `@custom-variant dark`.
- **PostCSS:** `tailwindcss` + `autoprefixer` plugins → single `@tailwindcss/postcss` (v4 handles prefixing).
- **MVDS wiring per its docs:** `globals.css` imports `@beckharrisdesign/mvds/styles.css` (which itself contains `@import "tailwindcss"` — it becomes the single Tailwind entry, hub `@theme` layered after it, avoiding a double-tailwind import) plus `@source` lines for the MVDS dist and hub source globs.
- **Dependency check at apply time:** confirm `tw-animate-css` arrives as an MVDS dependency; if it's a peer, add it.
- **Verification:** full vitest + `npm run build`, then side-by-side visual pass (home, experiment detail, header/nav, dark sections) against production via the Vercel preview; MVDS proof route screenshotted (dark — the hub's only mode).

## Risks / Trade-offs

- **v4 preflight deltas** — the classic regressions: default border color is now `currentColor` (v3 used gray), ring defaults changed (1px vs 3px, color), shadow/blur scale renames, `outline-none` semantics. The parity pass explicitly checks borders/rings/shadows on the hub shell.
- **Importing MVDS styles imports MVDS preflight/tokens globally** — acceptable (they're the design-system tokens the hub is converging on per #285), but the parity requirement still governs: if MVDS tokens visibly alter existing hub pages, scope or ordering gets adjusted before merge.
- **Machine constraints:** the migration needs a dependency install in the working tree on a disk that's ~92% full — prune first (`npm cache clean`, old `.next` artifacts) and install once, not repeatedly.
- **Vercel build** is the final gate; a green local build with a red Vercel build blocks merge.
