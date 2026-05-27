## Context

Root cause identified during the propose pass: `saveProfile` in [`lib/storage.ts:488-498`](../../../experiments/simple-seed-organizer/prototype/app/lib/storage.ts) writes to `localStorage`, not Supabase. The user thought they were saving to their account; the data goes to their browser only. Sign out, switch devices, or clear cache → zip code is gone. The bug report's wording — *"not saving to an account despite adding it in"* — exactly describes that mismatch.

The Profile.tsx save handler at [`components/Profile.tsx:291-298`](../../../experiments/simple-seed-organizer/prototype/app/components/Profile.tsx) makes the same problem worse: it calls `saveProfile` synchronously (no `await`, no error handling), shows no toast on success or failure, and immediately calls `router.push('/')`. The user can't tell whether their save took because nothing tells them.

Supabase setup is fully wired everywhere else (`auth-context`, `supabase` client, server, admin, RLS migrations on every table). No `profiles` or `user_profiles` table exists yet — migrations go up to `007_seed_hidden_and_personal_notes.sql`. The fix needs a new migration.

There's already a healthy test pattern at [`lib/storage.test.ts`](../../../experiments/simple-seed-organizer/prototype/app/lib/storage.test.ts) and [`lib/storage.save.test.ts`](../../../experiments/simple-seed-organizer/prototype/app/lib/storage.save.test.ts) using vitest, plus a separate live integration config (`vitest.live.config.ts`) for hitting a real Supabase. The new round-trip test fits cleanly into one of those.

## Goals / Non-Goals

**Goals:**

- Move `UserProfile` persistence from `localStorage` to Supabase so it actually persists per-account.
- Make Profile save feedback unambiguous via the existing `react-hot-toast` system (`AppToaster` is already mounted globally).
- Add a vitest test that proves the round-trip works against Supabase — the test must fail against today's localStorage code, pass after the fix.
- Verify manually on a real account before merge.

**Non-Goals:**

- Migrating existing users' localStorage data into Supabase (cost-benefit: no real users yet, migration risks data corruption for zero practical benefit).
- Zip code validation (5-digit pattern, US-only, etc.) — separate concern, not in this change.
- Refactoring the rest of Profile.tsx or the planting widget — pure persistence fix.
- Building a generic "profile field updated" pattern for future fields — solve the actual bug, generalize later if needed.

## User flow / IA

1. User opens Profile, enters a zip code, clicks save.
2. **Pending:** Save button shows a brief disabled/pending state while the Supabase write is in flight (prevents double-submit).
3. **Success:** `toast.success("Profile saved")` fires *before* the existing `router.push('/')`; the toast persists across navigation because `<Toaster>` lives in the root layout — so the user sees confirmation on the home page they land on. Auto-navigate preserved (matches current UX pattern).
4. **Failure:** `toast.error("Couldn't save your profile — <reason>")` fires and `router.push` is **skipped** so the user stays on Profile with their values intact and a clear error.
5. User opens any seed detail page → "Planting in your region" widget reads the persisted zip and shows planting dates.

## Visual design / Figma

No new Figma design required — this is a persistence + feedback fix on an existing surface. The references below confirm what this change touches in the design system and what parity status applies; see [`experiments/simple-seed-organizer/docs/figma-source.md`](../../../experiments/simple-seed-organizer/docs/figma-source.md) for the full inventory and parity convention.

| Item             | Value |
| ---------------- | ----- |
| Primary file URL | [Simple Seed Organizer (Figma)](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=0-1) — `fileKey: S8YJQugvMmn5jaRqwFM5XO` |
| Surface in scope | **Profile** — node [`21:1700`](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=21-1700) (desktop placeholder per `figma-source.md`; no mobile frame yet). This change does **not** require a Figma update to the surface — Save button pending state and toast feedback are runtime states that fit within the existing layout. If a future change adds Save-state variants to Figma, the Variables wired in `sso-design-code-loop` (`space/*`, `color/*`, `font/text/*`) are the tokens to use. |
| Component library | Components page [`1:2`](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=1-2). Relevant existing symbols: **Button** (`17:1298`, variant `Type=Primary` `21:5209` for the Save button) and the **Header** (`13:128`) which Profile sits beneath. No new symbols added by this change. |
| Tokens used      | Existing `space/*` and `color/*` Variables (renamed/established during `sso-design-code-loop`). Toast styling uses `react-hot-toast` defaults already configured in [`AppToaster.tsx`](../../../experiments/simple-seed-organizer/prototype/app/components/AppToaster.tsx) — `#fef2f2` background and `#991b1b` text for errors, mapping to `color/red/50` and `~color/red/800`. |
| Breakpoints      | N/A — Save button pending state and toast are runtime affordances; not breakpoint-sensitive. The Profile surface itself follows existing responsive behavior. |
| Status           | No new Figma work required. The Profile surface's existing parity status (`not-yet-linked`) is unchanged by this fix; a future parity pass on Profile (separate from this bug) would map its layer tree to the React component tree per the `figma-code-parity` convention. |

## Decisions

### Storage layer: new `user_profiles` Supabase table, one row per user

Create migration `008_user_profiles.sql`:

- Columns: `user_id uuid primary key references auth.users(id) on delete cascade`, `zip_code text`, `growing_zone text`, `previous_zone text`, `location text`, `updated_at timestamptz default now()`.
- RLS policies matching the pattern from `002_add_user_id_and_rls.sql`: users can `select`/`insert`/`update` rows where `user_id = auth.uid()`. No delete needed (cascade handles account deletion).
- One row per user is created lazily on first save (upsert pattern), not on signup — keeps signup unchanged.

**Why a separate table** (not a column on `auth.users`): Supabase's `auth.users` is locked down; the canonical pattern is a `public.profiles` table joined by `user_id`. Existing migrations follow this pattern for every other entity.

### `lib/storage.ts` changes

- Replace `saveProfile`'s `localStorage.setItem` with a Supabase upsert against `user_profiles` using the current `auth.uid()`.
- Replace `getProfile`'s `localStorage.getItem` with a Supabase select on `user_profiles` where `user_id = auth.uid()`.
- Both functions become async — update every call site to `await` them. Call sites: grep across `prototype/app/`; should be `Profile.tsx`, the planting widget read path (probably in `PlantingCalendar.tsx` or `lib/plantingGuidance.ts`), and the existing test files.
- Delete the `PROFILE_STORAGE_KEY` constant and any localStorage helpers exclusive to it. Profile state becomes server-of-record; the brief in-memory state during the editor session is just normal React state.

### Save feedback mechanism: `react-hot-toast`, not inline

The project already mounts `<Toaster>` globally via `AppToaster.tsx` in the root layout, and `Profile.tsx` already imports `toast from 'react-hot-toast'` (used for billing errors). Adding `toast.success("Profile saved")` and `toast.error(...)` matches the existing pattern. No new dependency, no design work.

The Save button gets a `disabled` + `pending` state using the same classes the rest of the prototype uses (e.g. `aria-busy` + a brief opacity change). This prevents the double-submit failure mode where users click twice because nothing visible happened.

**Keep the existing `router.push('/')` on success.** Toasts persist across navigation because `<Toaster>` is mounted globally in the root layout, so the success toast appears on the home page the user lands on — the feedback isn't lost. On failure, skip the navigation so the form keeps its values and the error stays visible.

### Test layer: lib/storage round-trip + component handler

Two tests:

1. **`lib/storage.profile.test.ts` (new)** — calls `saveProfile({ zipCode: '90210', ... })`, then `getProfile()`, asserts the returned value matches. Runs against Supabase via the existing `vitest.live.config.ts` setup (it already authenticates a real test user for similar tests).
2. **`components/Profile.test.tsx` (new or extended)** — renders the Profile component with a mocked `saveProfile`, simulates clicking Save, asserts the success toast appears and the form stays on the page (doesn't navigate away). Catches the UX feedback regression separately from the storage regression.

The lib-level test is the primary protection against the bug class (silent persistence failure); the component test catches the feedback bug (the "did it even save?" confusion).

**Red→green proof:** before applying the lib fix, the new `storage.profile.test.ts` must fail (zip doesn't come back). After the fix, it passes. This is the SHALL from spec requirement 4.

### CI: enable live integration tests on PRs by the repo owner

Current `.github/workflows/ci.yml` runs `live-integration` only on push to `main` (post-merge) — secrets gate. For this change to satisfy spec requirement 4 (automated round-trip test catches regression), the live test needs to actually run in PR CI.

**Change:** loosen the `live-integration` job's `if:` condition to also run on PRs opened by the repository owner, where exposing the Supabase secrets is safe:

```yaml
if: >
  (github.event_name == 'push' && github.ref == 'refs/heads/main')
  || (github.event_name == 'pull_request' && github.actor == github.repository_owner)
```

Cost: ~2 min added to PR runs (install + targeted test). Well under the existing Vercel preview build time; not on the critical path for review.

Future-proofs against the secrets risk if anyone else opens a PR — they get the unit-tests gate only, same as today. The owner-check is the right boundary for a solo-founder repo.

### Manual verification flow (for spec requirement 5)

1. Sign in to the staging/preview Supabase project with a real test account.
2. Open Profile, enter zip `90210`, click save → toast shows "Profile saved", button shows pending state during save, page does not auto-navigate.
3. Reload the page → zip field still shows `90210`.
4. Sign out, sign back in → zip still `90210`.
5. Open any seed detail → "Planting in your region" shows zone-aware content, not the "Add your zip" prompt.
6. Log the result (pass/fail + any notes) under an "Effort log" sub-bullet in `tasks.md`.

## Risks / Trade-offs

- **Risk: Supabase migration may collide with someone else editing schema in parallel.** Solo founder, so practically zero, but the migration file ordering is `008_user_profiles.sql` — confirm no `008_*` already exists when applying.
- **Risk: Async `getProfile` requires updating every call site; some might be in render paths that don't currently expect a Promise.** Mitigation: grep all call sites upfront (apply step 2.1); if any are in render bodies, refactor to load via `useEffect` + state. Likely only Profile.tsx and the planting widget code; bounded risk.
- **Trade-off: no migration of existing localStorage profiles into Supabase.** Solo founder confirmed — one user (Katy), no real migration concern. If a zip is sitting in localStorage, re-enter once.
- **Risk: enabling live tests on PRs exposes Supabase secrets to PR workflows.** Mitigated by `github.actor == github.repository_owner` gate: only Katy's PRs get the secrets. Anyone else's PR runs unit tests only. Standard pattern for solo repos.
- **CI runtime impact (acceptable):** ~2 min added to PR runs from the live-integration job (install + targeted Supabase round-trip test). Confirmed not on the critical path — Vercel preview build already exceeds this.
