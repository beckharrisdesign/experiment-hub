# Etsy ecosystem review — September 2026

*Compiled 2026-09-08 from live Supabase snapshots (run 69), a live read-only Google Ads pull, and the repo. Sales figures are inferred (see caveat in §2).*

## 1. What the ecosystem is today

Four connected pieces plus one unfinished public surface:

- **etsy-notion-sync** — green daily scheduled runs (69 runs, 30 listings, 60 snapshots/day, 47 Notion pages). One standing conflict warning every run: the duplicate draft bundles (4522856685 / 4522923804, shared SKU `WH-UN-B-7584`) still need one deleted in the Etsy UI.
- **etsy-listing-kit (ELK)** — the pivot shipped: URL-first evaluation + ten-image/template kit live in production since 2026-08-31. Still **fixture-only** — no `ETSY_API_KEY` keystring in Vercel, so no stranger's listing can actually evaluate. The product is live but effectively unusable by anyone but Katy.
- **lib/google-ads** — setup complete, Basic access approved, live read-only verified (this review used it). Its OpenSpec change (`google-ads-automation`, 9/25 tasks) has drifted from reality: §2 setup boxes are unchecked in tasks.md even though `docs/GOOGLE_ADS_SETUP.md` records them done — truth-up + archive candidate.
- **Patternator** (`experiments/etsy-listing-manager/`) — the listing-content generator, status Active, "tool built, in personal use." Not touched by the pivot; it and ELK's composer now overlap on title/tags generation.
- **etsy-zero-sales-funnel** (OpenSpec, 7/30 tasks) — the public scorecard for the labs page. Its rubric shipped *into* ELK (`lib/etsy-scorecard.ts`), but the public UI section (tasks 3.2–3.5) was never built, and its "zero sales" anchor is likely stale (see §2). Needs a disposition call: fold into the ELK evaluation and archive, or build the public section.

Notable negative finding from the code sweep: **nothing anywhere calls receipts, ledger, transactions, or Etsy Ads endpoints** — the ecosystem's only Etsy reads are shop listings + inventory (sync) and single-listing lookups (ELK). Sales and Etsy-side ad data are structurally invisible today.

## 2. Listing stats (W&H, shop 5568941)

**Trajectory** (cumulative shop views, weekly):

| Week of | Views | Favorites |
|---|---|---|
| Jul 13 | 99 | 12 |
| Aug 3 | 185 | 15 |
| Aug 17 | 238 | 18 |
| Aug 31 | 302 | 21 |
| Sep 7 | **314** | **21** |

~137 views in the last 30 days across 22 active pattern listings — a steady organic trickle of ~4–5/day, flattening slightly into September. The August bump overlaps the ad burst (ads pointed at ELK, not the shop, so this is mostly organic).

**Probable sales — 3 (new information).** Three single-unit quantity decrements, each on a different listing:

| Date | Listing | Price |
|---|---|---|
| 2026-07-25 | Leaf mandala (4415035303) | $4.99 |
| 2026-08-16 | Geometric (4466080258) | $6.00 |
| 2026-09-03 | Geometric (4466076995) | $6.00 |

Caveat: quantity decrements are consistent with digital sales but could be manual edits. The sync token is `listings_r` only — receipts are invisible, so ~$17 of probable revenue can't be confirmed from the hub. If real, the etsy-zero-sales-funnel's "zero sales" anchor (2026-07-20) is out of date.

**Leaders and laggards (30-day views):**
- Leaders: Leaf mandala +47 (83 total, 4 favs), Geometric 4466080258 +25, then a middle band of +8–10.
- **Fall leaves (4415032102): only +10** despite September — the one explicitly seasonal listing is not catching the seasonal wind.
- Tail: ~10 listings with 0 views in 30 days.

**New, untracked: 5 print-on-demand "Hot Girls Have Grandma Hobbies" listings** (tee $37.98, 2 pins $6.05, 2 candles $37.55/$43.38) appeared 2026-08-14. Zero views, 1 favorite, POD-style numeric SKUs outside the `WH-` scheme, no experiment doc or memory anywhere in the hub. The sync captures them fine, but they're a product line the ecosystem doesn't know it has.

**Known content gaps (unchanged):** ornament listing's 7 real photos, 18 listing videos (camera work); pet-keychain draft is deliberately bare (it's the ELK truth-test fixture).

## 3. Ads stats

Live pull, account 671-160-6591 via MCC (read-only):

- **September-to-date spend: $0.** Both campaigns PAUSED (`etsy-listing-kit-test1` $5/day budget, `SSO-validation-phase1`).
- **ELK burst final (Aug 7–16): 972 impressions, 30 clicks, 3.09% CTR, $56.03, ~$1.87 CPC, 0 conversions.** Matches the recorded verdict: real Etsy-listing intent in the keywords, bounce on embroidery-specific framing → pivot (now shipped).
- Etsy Ads (on-platform): not running, and Etsy exposes no ads API — if ever used, stats would be manual Shop Manager exports.
- Housekeeping: burst finals were never written into `docs/AD_CAMPAIGN_GOOGLE.md` (log stops 08-09).

## 4. Funnel stats (ELK)

- 8 lifetime orders, **all Katy's own** ($24 gross, $3 refunded — the manifest-bucket failure order, auto-refund worked). Zero strangers, ever.
- 2 evaluations recorded, both her keychain fixture test.
- Conversion infrastructure verified end-to-end by the 2026-08-31 live kit delivery (10 images + template + OpenAI title/tags/alt in ~45s).

## 5. Broken / at-risk infrastructure found during this review

1. **GitHub token in the local keyring is invalid** (`gh` 401s) — the tracked-expiry risk from the token-hygiene note has landed. Scheduled Actions still run (repo secrets are separate), but local `gh` work is blocked until re-auth.
2. Etsy token scope (`listings_r`) can't see receipts → sales are guesswork (§2).
3. Google Ads vault item's `login customer id` still points at the test MCC; live pulls need explicit overrides (fine for scripts, worth cleaning at cutover).

## 6. Proposed September block

Theme: **stop polishing the machine, put real listings and real buyers through it.**

1. ☐ **API unlock** — no new key needed (verified 2026-09-08: vault `api key`:`shared secret` combined returns 200 on public v3; the Aug 31 "keystring missing" diagnosis was wrong — that test sent the key alone). Remaining: set Vercel prod `ETSY_API_KEY` to the combined value, redeploy, live-smoke with a real W&H listing (4415032102). *Gate for everything below.*
2. ☐ **Dogfood pass** — run all 22 active W&H listings through the live evaluation; apply composer title/tags/alt suggestions where they beat what's there. Start with Fall leaves — it's September and the seasonal listing is underperforming.
3. ☐ **Sales visibility** — re-auth the sync's Etsy token with `transactions_r` added, so sales become first-class in Notion instead of quantity forensics. Confirms (or kills) the 3-probable-sales read.
4. ☐ **ELK close-out** — remaining QA (4.1 walkthrough, 4.3 visual, 4.7 Stripe-test e2e), 2.2/2.3 doc tasks (2.3 includes Katy's human browser pass verifying citations verbatim — every registry entry is still `verifiedVerbatim:false`), 3.4d footer, verify section-1 outcomes, archive the change.
5. ☐ **Ad burst 2 prep (no spend yet)** — rewrite `etsy-listing-kit-test1` keywords de-niched; confirm GA4→AW-277034089 link; backfill burst-1 finals into `docs/AD_CAMPAIGN_GOOGLE.md`. Enable = Katy's switch, target late September only if 1–2 are done. (Commercial API access application dropped — Katy's call 2026-09-08: no general/commercial Etsy key; strangers' public listings evaluate under the existing app key.)
6. ☐ **Hygiene** — delete one duplicate draft bundle in Etsy UI (kills the daily conflict warning); `gh auth login` with a fine-grained token with a calendar-noted expiry; decide the Grandma Hobbies POD line's status (track as an experiment, or explicitly out of hub scope); truth-up + archive `google-ads-automation`; disposition call on `etsy-zero-sales-funnel` (fold into ELK evaluation vs. build the public scorecard section).

Explicit stop: nothing above spends money or touches live listings' content without a per-item go.
