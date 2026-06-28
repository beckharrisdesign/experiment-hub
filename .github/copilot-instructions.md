# Copilot code review instructions

These rules apply to all PRs in this repository. Flag violations as comments;
do not auto-fix unless the fix is mechanical and unambiguous.

---

## Security — user isolation (highest priority)

Every Supabase query that touches the `seeds` or `user_profiles` table **must**
include an explicit `.eq("user_id", userId)` filter when a `userId` is
available, even though RLS policies enforce the same constraint. Defense in
depth: RLS is the safety net, the explicit filter is the first line of defense.

Flag any of the following as a security issue:

- `supabase.from("seeds").select(...)` without `.eq("user_id", ...)` in a
  context where `userId` is in scope
- `supabase.from("seeds").update(...)` without `.eq("user_id", ...)` when
  `userId` is available
- `supabase.from("seeds").delete(...)` without `.eq("user_id", ...)` when
  `userId` is available
- Functions that accept a `userId` parameter but don't apply it to the query

Exception: legacy schema fallback paths that intentionally skip `user_id`
(they must be clearly commented and gated behind an `isMissingColumnError`
check).

---

## Auth — session bootstrap

This codebase uses `onAuthStateChange` exclusively for session bootstrap.
`getSession()` reads from the local cookie cache without server validation and
can return a stale session for a previous user after sign-out, causing
cross-account data leakage.

Flag any usage of:

- `supabase.auth.getSession()` outside of server-side API routes
- Reading session from `localStorage` or `document.cookie` directly
- Calling `getSession()` as a fallback inside `useEffect`

The correct pattern is:

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  setUser(session?.user ?? null);
  if (event === "INITIAL_SESSION") setLoading(false);
});
```

---

## React — effect dependency arrays

When a `useEffect` uses `user.id` (not the full `user` object), the dependency
should be `[user?.id]`, not `[user]`. Using `[user]` causes the effect to
re-run whenever any property of the user object changes, which can cause
flickers and double-fetches on account switches.

Flag: `useEffect(() => { ... user.id ... }, [user])` — suggest `[user?.id]`.

---

## Storage function guards

Functions that accept `userId: string` must guard against empty string, not
just `null`/`undefined`:

```typescript
if (!supabase || !userId) return earlyValue;
```

Flag: `if (!supabase)` without `|| !userId` in functions where `userId` is a
required parameter used in queries.

---

## Test coverage expectations

New or modified storage functions (`getSeedById`, `updateSeed`, `deleteSeed`,
`getSeedsWithoutPhotos`, etc.) should have unit tests that verify:

1. The `user_id` filter IS applied when `userId` is provided
2. The `user_id` filter is NOT applied when `userId` is omitted (backward
   compat)
3. Errors are surfaced as thrown exceptions, not silently swallowed

Flag PRs that add new Supabase query functions without corresponding tests.

---

## Conventional commits

Commit messages must follow the Conventional Commits format:

```
<type>(<scope>): <short description>
```

Common types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`.

Flag commit messages that don't follow this format.

---

## React — component conventions

Flag these structural issues in any `.tsx` file under `components/` or `app/`:

- Default export is not a named function declaration (`export default function ComponentName`)
- Props interface is not named `<ComponentName>Props` (e.g. `ButtonProps`, `CardProps`) — a
  bare `Props` or any other name is incorrect
- `"use client"` added to a component that has no browser-only APIs, event handlers,
  or hooks — server components are the default; flag if the directive appears unnecessary
- Variant maps typed as `{ [key: string]: ... }` instead of `Record<VariantKey, ...>`
- Static data (lookup tables, config objects) defined inside the component body
  instead of at module scope

---

## Next.js API routes

For any route handler in `app/api/`:

- Flag if `checkAdminAuth` (or equivalent auth guard) is not called before any other
  logic in the handler body — it is called synchronously and need not be the first `await`
- Flag response shapes that don't conform to `{ error: string }` for errors or
  `{ success: true, ...data }` for success — mixed shapes break the client contract
- Flag CORS wrapper usage on routes that are not explicitly public endpoints
- Flag handlers that don't validate required inputs before touching the database

---

## Vitest conventions

For any `.test.ts` / `.test.tsx` file:

- Flag `vi.mock(...)` calls that appear inside `describe` or `it` blocks — they must
  be declared at module scope (top of the file, outside any block). Note: `vi.hoisted()`
  is only for extracting mock handles referenced inside a `vi.mock()` factory; it is not
  a replacement for moving `vi.mock()` to module scope
- Flag snapshot assertions (`toMatchSnapshot`, `toMatchInlineSnapshot`) — they are
  banned; use explicit assertions instead
- Flag dynamic API route imports outside `beforeEach` — route handlers must be
  re-imported each test to avoid module cache bleeding
- Flag test IDs (`data-testid`) used as the primary query selector when a semantic
  query (`getByRole`, `getByLabelText`) would work

---

## Critical path protection

Flag any PR that modifies the following without explicit justification in the PR description:

- Pricing logic or payment flow
- Auth flows (sign-in, sign-out, session bootstrap)
- RLS policy files or Supabase migrations
- Public API contracts (route signatures, response shapes used by external callers)

A PR description explaining the change is not a flag; a change with no explanation is.
