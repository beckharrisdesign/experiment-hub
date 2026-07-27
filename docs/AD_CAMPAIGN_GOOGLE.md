# Google Search campaign — Etsy Listing Kit ($1/day funnel test)

Ready to create in Google Ads. **I prepare; Katy creates/funds** (money-out step). Budget cap authorized: **$1/day** (~$14 over the 14-day window).

## Reality check (set expectations)

Craft/Etsy-tool keywords run ~$0.40–$2 CPC. At $1/day expect **1–3 clicks/day, ~15–30 clicks total**. This buys a *message-match + intent signal*, not statistically strong conversion data. Any real paid conversion from a stranger is a strong positive at this volume.

## Campaign settings

| Setting | Value |
| --- | --- |
| Type | Search only (uncheck Display/Search partners) |
| Budget | **$1.00/day** |
| Bidding | Maximize clicks with **max CPC cap $0.50** (stretches the budget) |
| Geo | United States |
| Language | English |
| Final URL | `https://labs.beckharrisdesign.com/etsy-listing-kit?utm_source=google&utm_medium=cpc&utm_campaign=elk-launch` |

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

## Responsive Search Ad (one RSA, 3 distinct angles in the headline pool)

**Headlines (≤30 chars each):**
1. `6 Etsy Listing Images in 1 Min`
2. `Your Design → 6 Etsy Photos`
3. `Etsy Listing Photos, $3 Flat`
4. `Made for Embroidery Sellers`
5. `No Subscription. Just $3`
6. `Upload Once, Download Six`

**Descriptions (≤90 chars):**
1. `Upload one design file. Get six shop-worthy, correctly sized Etsy listing images.`
2. `Flat, framed, in-hoop, detail, scale + info card. Watermark-free after one $3 payment.`
3. `See a full watermarked preview before you pay. Instant download, no account needed.`

**Message match:** headlines mirror the landing hero ("You made the design. We'll make it look good on Etsy.") — same promise, same price, no bait.

## Measurement (truth = orders table, not pixels)

- Funnel: GA4 events fire only if GA keys are set (optional).
- **Conversions:** `select count(*) from elk_orders where status in ('paid','processing','fulfilled') and (utm_source='google' or click_id is not null)` — every ad-attributed paid order carries its click id in `elk_orders.click_id` (gclid for Google traffic).
- CAC = spend ÷ ad-attributed paid orders. Break-even is impossible at $3 by design; this is a signal test.

## Stop / continue (from LAUNCH_PLAN)

- **Stop** if ~100+ clicks yield 0 upload-starts (message mismatch) — at this budget that's most of the window.
- **Continue/scale** (separate authorization) if any stranger converts, or upload-start rate ≥ ~20% of clicks.

## Launch checklist for this campaign

1. Statement naming set (before first stranger pays): account descriptor must reflect the legal/DBA name (sole prop), so set the dashboard **shortened descriptor to `BHD`** — checkout adds a per-charge suffix and statements read **`BHD* ETSY KIT`**.
2. `ELK_LAUNCHED_AT` set in Vercel (revenue window running).
3. Resend key set (buyers need the email link to re-reach downloads).
4. Create campaign per above → set $1/day → enable. Note the enable date here: `____`
