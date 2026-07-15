# Design — etsy-notion-sync-build

## Context

The hub page is the founder's operating surface for the sync ("I want a ui for this work"). It must answer two questions at a glance — *what synced, when?* — and offer exactly one action: *sync now*. Runs data comes from the Supabase `runs` table (spec: `etsy-sync-runtime`); this page is read-plus-one-button, not an admin console.

## Goals / Non-Goals

**Goals:**

- Run history scannable in seconds: newest first, single-line rows, status readable by color + label.
- One primary action (Sync now), with honest in-progress feedback (Actions dispatch → run visible ≈ seconds to a minute).
- MVDS-aligned visual language so this page is a consumer of the design system, not another one-off.

**Non-Goals:**

- Trends/charts (issue #283, post-validation). Editing anything. Exposing raw snapshots or tokens. Notifications.

## User flow / IA

1. Hub → experiment page `/experiments/etsy-notion-sync` → **Sync** surface (prototype tab, consistent with existing experiment-detail tab pattern).
2. Page shows: header row (last run status + "Sync now" button), then run history list — each row: started time (relative + absolute on hover), status badge (`ok` / `running` / `paused_quota` / `error`), trigger source (`scheduled`/`manual`), listings captured, Notion fields changed, new-field notices count, quota remaining.
3. "Sync now" → button enters *dispatching* state → optimistic "queued" row appears → row transitions to `running` then final status (poll Supabase while a run is active). Button disabled while a run is in flight.
4. Empty state (no runs yet): short explanation + link to the experiment README setup section. Error state on dispatch failure: inline, actionable retry.

## Visual design / Figma

**MVDS consumption model (founder, 2026-07-15): external package consumer** — `@beckharrisdesign/mvds` v0.2.0 from GitHub Packages, per the public docs at <https://mvds-roan.vercel.app/>. Not a local-copy or repo-read integration. In MVDS, **code is the source of truth; the Figma file is a generated mirror** (17 components, 137 declared variants, drift-guarded), so the Figma row below points at the mirror rather than a hand-drawn file.

| Item             | Value |
| ---------------- | ----- |
| Primary file URL | Code-first system — Figma is MVDS's generated mirror (key `50019850fd9e8695cb50bdcfb63e7bd12cda41c7`, synced 2026-07-15); docs/manifest: <https://mvds-roan.vercel.app/> |
| Frames in scope  | No hand-authored frames; sync page composes published MVDS components (mirror frames exist per component) |
| Libraries        | **`@beckharrisdesign/mvds` v0.2.0** (GitHub Packages; hub `.npmrc` already carries the `@beckharrisdesign:registry` line). Hub baseline (`rules/design-guidelines.mdc`) applies only where MVDS has no primitive. |
| Breakpoints      | **MVDS token-layer breakpoints govern this page — the full set, not a two-point subset** (founder, 2026-07-15). The hub's S · 480 / L · 1024 BHD Content Types default is a known limitation; adopting MVDS's full breakpoint set hub-wide is a separate future effort (issue #285). |
| Status           | Unblocked for design. Implementation prerequisite: a GitHub PAT with `read:packages` for local/CI/Vercel installs (founder-held secret), and the Tailwind v3/v4 spike below. |

### Component mapping (MVDS v0.2.0 manifest)

| Page element | MVDS component | Notes |
| --- | --- | --- |
| Page scaffold / sections | `Section`, `Layer` (layout primitives) | MVDS forbids raw flex/grid classes — layout goes through these |
| Run history rows | `Card` (list container) + MVDS type ramp + 8-grid spacing | No dedicated table component in v0.2.0 — compose per MVDS principles; flag as potential MVDS gap |
| Run status | `Badge` (6 variants) | Map run states → badge variants (success/running/paused/error) |
| Sync now | `Button` (3 axes, 72 variants) | Primary variant; CTA is a button, not a link |
| Quota / new-field notices | `Callout` (2 variants) for warnings (quota low, new fields detected); inline text otherwise | |
| Empty state | `Blockquote` or `Callout` + `Button` | |

MVDS enforced principles apply to this page's code: **no hardcoded colors** (token utilities only), **no margin spacing** (8-grid via layout primitives), **no raw flex/grid**.

## Decisions

- **Poll, don't push:** while a run is active, poll the runs API every few seconds; no websockets for a page viewed occasionally by one person.
- **Optimistic queued row** on dispatch, reconciled against the real Supabase row — covers Actions' cold-start latency honestly instead of a spinner with no context.
- **Dispatch route is admin-gated** using the hub's existing admin cookie guard pattern (fail closed — see PR #280 precedent).
- **Real data only** from day one: the page ships after Build Unit 2 lands, so there is never a mocked state.

## Risks / Trade-offs

- **Tailwind major-version mismatch:** MVDS is built on Tailwind v4; the hub is on Tailwind v3.4. **Spike result (2026-07-15):** `@beckharrisdesign/mvds@0.2.0` (now on public npm, tokenless) ships Tailwind v4 *source* (`styles.css` opens with `@import "tailwindcss"`) and peer-depends on `tailwindcss: ^4` — there is no compiled-CSS option in the package, so consuming MVDS requires a Tailwind v4 build on the consumer side. Remaining paths: (a) upgrade the hub to Tailwind v4 as its own change (aligns with issue #285), (b) MVDS additionally ships a precompiled CSS artifact for non-v4 consumers, or (c) a page-scoped v4 side-build inside the hub. Founder decision pending; the page does not ship on a broken hybrid.
- **Private registry in CI/Vercel:** installing `@beckharrisdesign/mvds` needs a `read:packages` PAT in GitHub Actions and Vercel env — founder-held secret, same handling as other deploy secrets.
- **Actions latency** (dispatch → run start can take ~10–60s) — mitigated by the queued/optimistic row; worst case the founder refreshes.
- **Supabase read from a public hub page** — runs data is low-sensitivity but reads go through a server route (no client-side service keys), same pattern as existing hub data routes.
