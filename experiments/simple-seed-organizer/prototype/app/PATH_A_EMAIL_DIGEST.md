# Path A — Weekly Email Digest

Status: **not started**. This is the remaining "using the collection" happy path.
The other two (Plant Now banner, AI enrichment) are shipped.

---

## What it does

Every Sunday morning a user receives a plain-text/HTML email:

> **This week in your seed collection**
>
> Start indoors now: Tomatoes (zone 6b, last frost Apr 15 → start Mar 17)
> Coming up in 2 weeks: Peppers
> Direct sow next week: Peas
>
> 3 seeds still missing growing data — open the app to fill gaps with AI.

---

## Prerequisites

### 1. Supabase migration — `user_profiles` table

The growing zone is currently only in `localStorage`. Email requires it server-side.

```sql
-- run in Supabase SQL editor
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  zip_code text,
  growing_zone text,           -- e.g. "6b"
  last_frost_date text,        -- ISO date string, e.g. "2026-04-15"
  first_frost_date text,
  digest_opt_in boolean not null default false,
  digest_email text,           -- defaults to auth email; allow override
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_profiles enable row level security;
create policy "Users manage own profile"
  on user_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);
```

Add `lib/userProfile.ts` with `getProfile(userId)` / `upsertProfile(userId, data)` wrappers.

### 2. Profile page (or settings modal)

Users must opt in. Minimum fields: zip code (or zone), opt-in checkbox.
Suggest adding to existing account/settings flow — a simple `/settings` page or
a sheet off the avatar in the top-right corner.

Key UX: on first save, migrate the existing localStorage values into Supabase.

### 3. Resend account

- Sign up at resend.com, verify a sending domain (or use the sandbox for dev).
- Add `RESEND_API_KEY` to `.env.local` and Vercel environment variables.
- Install: `npm install resend`

---

## New files to create

### `lib/digestEmail.ts`

Pure functions (unit-testable, no I/O):

```typescript
import { getPlantingNow, PlantingNowResult } from './plantingNow';
import { Seed } from '@/types/seed';

export function buildDigestSubject(result: PlantingNowResult): string
export function buildDigestText(result: PlantingNowResult, seeds: Seed[]): string
export function buildDigestHtml(result: PlantingNowResult, seeds: Seed[]): string
// counts seeds missing daysToGermination || daysToMaturity
export function countMissingData(seeds: Seed[]): number
```

Write `lib/digestEmail.test.ts` first (TDD). Inputs: a fixed `today`, a fixed
seed list, a fixed zone. Assert subject line and key phrases in the text body.

### `app/api/digest/preview/route.ts`

`GET /api/digest/preview` — auth-gated, returns the HTML that would be sent
to the current user. Used during development to see the email in a browser tab.

```typescript
// pseudocode
const profile = await getProfile(user.id);
if (!profile?.digest_opt_in) return 403;
const seeds = await getSeedsByUser(user.id);
const today = new Date();
const result = getPlantingNow(seeds, today, profile.last_frost_date);
const html = buildDigestHtml(result, seeds);
return new Response(html, { headers: { 'Content-Type': 'text/html' } });
```

### `app/api/digest/send/route.ts`

`POST /api/digest/send` — called by Vercel Cron, protected by `CRON_SECRET`.

```typescript
// pseudocode
// 1. verify Authorization: Bearer $CRON_SECRET
// 2. query all users where digest_opt_in = true
// 3. for each user (batch or sequential with rate limit):
//    a. fetch their seeds
//    b. getPlantingNow(seeds, today, profile.last_frost_date)
//    c. skip if nowItems.length === 0 && upcomingItems.length === 0
//    d. send via Resend
// 4. return { sent: N, skipped: M }
```

### `vercel.json` — add cron

```json
{
  "crons": [
    {
      "path": "/api/digest/send",
      "schedule": "0 9 * * 0"
    }
  ]
}
```

9 AM UTC every Sunday. Adjust to target morning in the user's local timezone
(consider storing `timezone` in `user_profiles` and grouping sends, or just
send at a fixed UTC time for MVP).

---

## `getPlantingNow` signature change needed

Currently `getPlantingNow(seeds, today?)` reads frost dates from localStorage
inside the function (via `getPlantingGuidance` which calls `getFrostDates()`
which reads localStorage). This works client-side but not in a server route.

Two options:

**Option A (simpler):** Pass frost dates as an optional param:
```typescript
export function getPlantingNow(
  seeds: Seed[],
  today: Date = new Date(),
  frostOverride?: { lastFrost: string; firstFrost: string }
): PlantingNowResult
```
The server route passes `profile.last_frost_date` / `profile.first_frost_date`.
The browser component passes nothing (falls back to localStorage as today).

**Option B:** Extract frost-date reading into a separate layer, keep the
pure function truly pure. More refactor, better for testing.

Recommendation: Option A for the MVP.

---

## Email template guidance

Keep it plain. Example text body:

```
Hi,

Here's your seed planting digest for the week of Mar 8.

THIS WEEK
  Start indoors: Tomatoes, Peppers
  Direct sow: Peas

COMING UP (next 2 weeks)
  Mar 22 — Start indoors: Eggplant

3 seeds are missing growing data. Open the app and tap
"Fill gaps with AI" on each seed's detail page.

---
Manage your preferences: https://your-domain/settings
Unsubscribe: https://your-domain/api/digest/unsubscribe?token=...
```

For unsubscribe, generate a signed token (e.g. JWT with `userId`) so users can
opt out without logging in. Store the `UNSUBSCRIBE_SECRET` env var.
`GET /api/digest/unsubscribe?token=...` sets `digest_opt_in = false`.

---

## Env vars summary

| Var | Where |
|-----|-------|
| `RESEND_API_KEY` | `.env.local` + Vercel |
| `CRON_SECRET` | `.env.local` + Vercel |
| `UNSUBSCRIBE_SECRET` | `.env.local` + Vercel |

---

## Suggested build order

1. Supabase migration (SQL)
2. `lib/userProfile.ts` + basic `/settings` page with opt-in checkbox
3. Migrate localStorage zone → Supabase on first settings save
4. `lib/digestEmail.ts` + `lib/digestEmail.test.ts` (TDD)
5. `getPlantingNow` Option-A frost override
6. `app/api/digest/preview/route.ts` (test in browser)
7. Install Resend, add `app/api/digest/send/route.ts`
8. `vercel.json` cron
9. Unsubscribe token endpoint

Estimated new tests: ~10 in `digestEmail.test.ts`
Current test count: 74 (all passing)
