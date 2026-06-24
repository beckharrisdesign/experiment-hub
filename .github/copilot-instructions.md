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
