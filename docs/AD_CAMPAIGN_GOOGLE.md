# Google Search campaign — Etsy Listing Kit (burst funnel test)

Ready to create in Google Ads. **I prepare; Katy creates/funds** (money-out step).

> **Spend is no longer capped at ~$15.** The original plan was $5/day × 3 days ≈ $15 total
> (burst approved 2026-07-27, same total as the original $1/day×14 — per the SSO playbook
> rule: *run fast, not trickled*). **Superseded 2026-08-09:** the campaign did not serve at
> all for its first week, so the 3-day stop is dropped and spend continues at $5/day until
> the campaign has 15–30 clicks to evaluate. At the CPC observed so far that is roughly two
> weeks and **~$50–100**, not $15. See the live run below.

## Reality check (set expectations)

~~Craft/Etsy-tool keywords run ~$0.40–$2 CPC. ~$15 buys **~15–30 clicks over 3 days**.~~
**That estimate was wrong (2026-08-09).** Observed CPC on these keywords is **~$3.30**, so
$15 buys ~4–5 clicks, not 15–30. The $0.50 cap the plan called for was below the auction
price, which is a likely reason the campaign never served. At ~$3.30/click, budget the
test at **~$50 for 15 clicks / ~$100 for 30**. (Caveat: $3.30 is the average of *two*
clicks — a very noisy estimate, so treat the whole range as provisional.)

What that buys is still a *message-match + intent signal*, not statistically strong
conversion data. Any real paid conversion from a stranger is a strong positive at this volume.

## Campaign settings

| Setting | Value |
| --- | --- |
| Type | Search only (uncheck Display/Search partners) |
| Budget | **$5.00/day**. ~~Pause after day 3~~ — **superseded 2026-08-09: no auto-pause**, see the live run below |
| Bidding | **Maximize clicks**, no max CPC bid limit set (2026-08-09). History: planned Maximize clicks + $0.50 cap → cap raised to $15 (2026-08-07) to unblock a campaign that was not serving → switched to Maximize conversions (2026-08-09) → **switched back to Maximize clicks the same day**, because conversion bidding cannot work with 0 recorded conversions. Observed CPC ~$3.30 |
| Geo | United States |
| Language | English |
| Final URL | `https://etsy-listing-kit.vercel.app/?utm_source=google&utm_medium=cpc&utm_campaign=elk-launch` |

(`etsy-listing-kit.vercel.app` is a vanity host on the same hub deploy — middleware rewrites it to `/etsy-listing-kit`. The `labs.beckharrisdesign.com/etsy-listing-kit` URL, Stripe webhook, and email links all keep working unchanged.)

(Google auto-appends the gclid; the app persists it into `elk_orders.click_id` — one column that holds gclid or fbclid — alongside the UTM columns. Conversion truth comes from the `elk_orders` table, no pixel setup needed for the decision.)

## Ad group: etsy listing images (exact + phrase)

**Keywords** (start narrow; phrase match unless noted):
- "etsy listing photos"
- "etsy listing images"
- "etsy product mockup"
- "etsy mockup generator"
- "embroidery mockup generator"
- "etsy image size" *(informational — watch and cut if it wastes clicks)*
- [etsy listing photo maker] *(exact)*

**Negative keywords:** `free`, `job`, `jobs`, `course`, `tutorial`, `photoshop`, `printful`, `printify`

## Responsive Search Ad (one RSA — fill all 15 headline + 4 description slots, per the SSO playbook)

**Headlines (≤30 chars each):**
1. `6 Etsy Listing Images in 1 Min`
2. `Your Design to 6 Etsy Photos`
3. `Etsy Listing Photos, $3 Flat`
4. `Made for Embroidery Sellers`
5. `No Subscription. Just $3`
6. `Upload Once, Download Six`
7. `Etsy Mockups From One File`
8. `Shop-Worthy Etsy Images Fast`
9. `2000px, Sized Right for Etsy`
10. `Preview Free. Pay $3 Once.`
11. `Skip the Listing Photo Chore`
12. `Flat, Framed & In-Hoop Shots`
13. `Listing Photos in Minutes`
14. `One Design, Full Photo Set`
15. `No Account. Instant Download`

**Descriptions (≤90 chars):**
1. `Upload one design file. Get six shop-worthy, correctly sized Etsy listing images.`
2. `Flat, framed, in-hoop, detail, scale + info card. Watermark-free after one $3 payment.`
3. `See a full watermarked preview before you pay. Instant download, no account needed.`
4. `For embroidery & craft sellers. Upload one design, download all six in about a minute.`

> ⚠ Trademark note: "Etsy" in ad text can be disapproved if Etsy has a trademark complaint on file with Google. If headlines get flagged, swap "Etsy" for "shop"/"listing" variants (e.g. `6 Shop Listing Images in 1 Min`).

**Message match:** headlines mirror the landing hero ("You made the design. We'll make it look good on Etsy.") — same promise, same price, no bait.

## Measurement (truth = orders table, not pixels)

- Funnel: GA4 events fire only if GA keys are set (optional).
- **Conversions:** `select count(*) from elk_orders where status in ('paid','processing','fulfilled') and (utm_source='google' or click_id is not null)` — every ad-attributed paid order carries its click id in `elk_orders.click_id` (gclid for Google traffic).
- CAC = spend ÷ ad-attributed paid orders. Break-even is impossible at $3 by design; this is a signal test.

## Kill / continue (burst-calibrated, SSO-playbook style)

| Signal | Action |
| --- | --- |
| < 150 impressions after day 2 | Keywords too thin — broaden phrase variants or raise CPC cap to $0.75 |
| 15+ clicks, 0 upload-starts | Message mismatch — pause, revise landing/ad copy before spending more |
| Any stranger's paid conversion | Strong positive — consider extending/scaling (separate spend authorization) |
| Uploads but no checkouts | Value shown but price/trust gap — examine preview → checkout drop-off |
| ~~Day 3 complete~~ | ~~**Pause the campaign**~~ — **superseded 2026-08-09.** The 3-day stop assumed a serving campaign; the first week was spent debugging one that wasn't. Run until there are enough clicks to read (15–30), then evaluate |

## Launch checklist for this campaign

1. ~~Statement naming~~ **Dropped (2026-07-31):** Stripe requires the descriptor to match the business name, so no `BHD` shortening. Checkout's `statement_descriptor_suffix: 'ETSY KIT'` still applies on top of the business-name prefix (verified working by the live 2026-07-28 payment) — statements read `<BUSINESS NAME>* ETSY KIT`.
2. `ELK_LAUNCHED_AT` set in Vercel (revenue window running).
3. Resend key set (buyers need the email link to re-reach downloads).
4. Create campaign per above → set $5/day → enable. Campaign `etsy-listing-kit-test1`, id 24091208777, Ads account **671-160-6591**. Published Jul 31, enabled Aug 4, but **did not serve until Aug 7** — see the void window below.
5. **Link GA4 → Google Ads** — done 2026-08-09. Was never done before; conversions could not reach Ads at all.

## Void window — 2026-07-31 → 2026-08-06 — the campaign never actually served

Corrected 2026-08-09 from Google Ads itself (campaign `etsy-listing-kit-test1`, scoped
to that campaign, not the account). **Campaign published Jul 31; first impression
received Aug 7.** So it delivered *nothing* for a week, the whole originally-planned
Aug 4–6 burst included. This was not an untracked run — there was no run.

Two things were wrong at once, which is why the window taught us nothing:

1. **The campaign was blocked and not serving.** Katy raised max CPC to **$15**
   (arbitrarily high) to force it out of the blocked state; impressions started the
   next day. That is why observed CPC now runs ~$3.30 against the original $0.50 cap —
   a deliberate debugging move, not drift or auto-apply.
2. **Conversion tracking was dead** for the same period. Repaired 2026-08-07 by PRs
   #363/#364 — `Sign-up` pointed at the wrong Ads account, `FormSubmit` had no backing
   event, and CSP blocked every Ads beacon.

Funnel side, unchanged: **0 ad-attributed orders**; no `elk_orders` row carries a
`utm_source` or `click_id`, and all 6 lifetime paid orders are owner self-purchases.

## Live run — day-by-day

**Day 1 = 2026-08-07** (first impression, per Google) — *not* Aug 8. Katy's decision
2026-08-09: **keep spending, no auto-pause at day 3** — the 3-day burst assumed a
working campaign, and the first week was consumed by debugging. Now that delivery is
unblocked, she is retuning budget/CPC, so treat the numbers below as the start of the
real test.

| Day | Date | Impr. | Clicks | Upload starts | Checkouts | Paid | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| — | Jul 31 – Aug 6 | 0 | 0 | 0 | 0 | 0 | Campaign blocked; never served |
| 1 | Aug 7 | \* | \* | 0 | 0 | 0 | First impressions; max CPC raised to $15 to unblock |
| 2 | Aug 8 | \* | \* | 0 | 0 | 0 | |
| | **Aug 7–8 total** | **129** | **2** | **0** | **0** | **0** | $6.59 spend · ~$3.30 avg CPC · 1.55% CTR · 0 conversions |
| 3 | Aug 9 | | | | | | GA4↔Ads linked; Sign-up value fixed $1 → $3 |

\* Google's overview reports the two days combined; per-day split not captured.

**Read so far:** 2 clicks is far too little to say anything about the offer. The only
thing demonstrated is that delivery now works. At ~$3.30/click a $5/day budget buys
~1.5 clicks/day, so the 15–30 clicks this test needs is ~2 weeks at these settings —
the lever is budget and CPC cap, and lowering the cap risks re-blocking delivery.

### Measurement fixes applied 2026-08-09

- **GA4 `G-120M120GDY` ↔ Ads `671-160-6591` linked** (Product links → Google Ads links;
  was "No links yet"). Personalized advertising on. **Not retroactive** — nothing before
  Aug 9 backfills. Note the property lives under the `Beck Harris Design` GA account,
  reachable only as `authuser=5`; the default Google session lands on a different property.
- **Auto-tagging: already `Yes`** — verified, no change needed. This is what puts `gclid`
  into `elk_orders.click_id`.
- **`Sign-up` conversion value: was a fixed `$1`** → now **"Use different values" via
  Event snippet, default `$3`**. The tag already sent `value: 3`; Ads was overriding it,
  so every $3 sale would have booked as $1.
- **Open:** `Sign-up` shows *"Enhanced conversions: setup issues detected."* Enhanced
  conversions is enabled but our tag sends no user-provided data (only value, currency,
  `transaction_id`) — either disable it for this action or send a hashed email. Does not
  affect normal conversion tracking.
- **Bid strategy reverted to Maximize clicks** (2026-08-09). It had been switched to
  *Maximize conversions*, which cannot work here: the campaign has **0 recorded
  conversions** ever, and conversion tracking was broken and unlinked until today, so
  Google was bidding toward a signal it had never received. Conversion bidding generally
  wants ~15–30 conversions/month. Revisit once there are real conversions. No max CPC bid
  limit was set — a limit below the ~$3.30 auction price is what appears to have stopped
  delivery originally; add one (~$4) only as a safety rail, not as a throttle.
- **Watch:** account-level **auto-apply** is on with "display expansion + 19 more
  recommendation types", and campaign-level **AI Max** is on — both let Google modify a
  Search-only campaign on its own.
- Conversion actions in this account are named `SwiftSketchAI (web) …` — the account is
  partly repurposed from another project; don't assume every action belongs to ELK.

Funnel truth (not Google's numbers):
```sql
select status, count(*), count(click_id) as ad_attributed
from elk_orders
where created_at >= '2026-08-07'
group by status;
```
