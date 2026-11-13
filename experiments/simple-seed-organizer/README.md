# Simple Seed Organizer

Track a seed collection: what you own, what's still viable, what to use first.

**Status (2026-11-12): LIVE at <https://simpleseedorganizer.app>** (Vercel project
`simple-seed-organizer`). The same app also answers on `simple-seed-organizer.vercel.app`; since
[#593](https://github.com/beckharrisdesign/experiment-hub/pull/593) every public page names the
custom domain as its canonical, and the sitemap lists https URLs only.

**Deploys are manual.** Git deploys are off (`prototype/app/vercel.json`) and no workflow deploys
it, so merging does not ship. Deploy `main` to production from the Vercel project after each merge.

- **App:** [`prototype/app/`](prototype/app/) (Next.js, Supabase `orlpgxqbesxvlhlkbnqy`, Stripe)
- **PRD:** [`docs/PRD.md`](docs/PRD.md) · **Business case:** [`docs/business-case.md`](docs/business-case.md)
- **Analytics:** GA4 `G-YL355ESTTX` + Google Ads `AW-10904266222`; events in
  [`prototype/app/lib/analytics.ts`](prototype/app/lib/analytics.ts) (`sign_up`, `seed_added`,
  `search_performed`, `seed_opened`, `use_first_filter_used`)

## Checkpoints

Approved 2026-11-12. The decision date sits in seed-starting season: November is off-season for
gardeners, so a December call would mostly measure the calendar.

| Checkpoint | Date | What to check |
| --- | --- | --- |
| Day 0 | **2026-11-12** | Canonicals + https sitemap live (#593). Baseline in the table below. Search Console property verified, sitemap submitted |
| Day 7 | **2026-11-19** | Search Console: `simpleseedorganizer.app` pages indexed? `vercel.app` copies dropped? |
| Day 28 | **2026-12-10** | Search impressions for "seed organizer", "seed inventory", "seed tracker" |
| Decision | **2027-02-15** | **≥ 10 new sign-ups from strangers, and ≥ 3 of them adding 5+ seeds** → keep building (import, reminders). Fewer → shelve it until next season |

**Search Console:** Domain property `simpleseedorganizer.app` (covers https/http, www and every
path), verified 2026-11-12 by a DNS TXT record at the root of the domain on Vercel DNS. Leave
that record in place; Google rechecks it. `https://simpleseedorganizer.app/sitemap.xml` submitted
2026-11-12.

## Numbers

Counts come from Supabase, which keeps them indefinitely; search numbers from Search Console.
"Strangers" excludes `@beckharrisdesign.com` and any address containing `katy`.

| Checkpoint | Date | Accounts (all / strangers) | Sign-ups since day 0 (strangers) | Strangers with 5+ seeds since day 0 | Seeds added in last 30 days | Search impressions / clicks |
| --- | --- | --- | --- | --- | --- | --- |
| Day 0 | 2026-11-12 | 9 / 5 | — | — | 0 | not read |
| Day 7 | 2026-11-19 | | | | | |
| Day 28 | 2026-12-10 | | | | | |
| Decision | 2027-02-15 | | | | | |

Day-0 context: 1 sign-up in the previous 90 days (2026-10-31); 32 seeds across 2 accounts.

```sql
-- Run against orlpgxqbesxvlhlkbnqy. Day 0 = 2026-11-12.
with strangers as (
  select id, created_at from auth.users
  where email not ilike '%beckharrisdesign.com' and email not ilike '%katy%'
)
select
  (select count(*) from auth.users) as accounts_all,
  (select count(*) from strangers) as accounts_strangers,
  (select count(*) from strangers where created_at >= '2026-11-12') as signups_since_day0,
  (select count(*) from (
     select s.user_id from public.seeds s join strangers u on u.id = s.user_id
     where s.created_at >= '2026-11-12' group by s.user_id having count(*) >= 5
   ) t) as strangers_5plus_seeds,
  (select count(*) from public.seeds where created_at > now() - interval '30 days') as seeds_last_30d;
```
