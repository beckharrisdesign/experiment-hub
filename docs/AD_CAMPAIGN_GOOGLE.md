# Google Search campaign — Etsy Listing Kit (burst funnel test)

Ready to create in Google Ads. **I prepare; Katy creates/funds** (money-out step). Budget: **$5/day × 3 days ≈ $15 total** (burst approved 2026-07-27, same total as the original $1/day×14 — per the SSO playbook rule: *run fast, not trickled*).

## Reality check (set expectations)

Craft/Etsy-tool keywords run ~$0.40–$2 CPC. ~$15 buys **~15–30 clicks over 3 days**. This buys a *message-match + intent signal*, not statistically strong conversion data. Any real paid conversion from a stranger is a strong positive at this volume.

## Campaign settings

| Setting | Value |
| --- | --- |
| Type | Search only (uncheck Display/Search partners) |
| Budget | **$5.00/day**, plan to pause after day 3 (~$15 total) |
| Bidding | Maximize clicks with **max CPC cap $0.50** (raise to $0.75 if no impressions day 1) |
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
| Day 3 complete | **Pause the campaign**, run the numbers: clicks vs `elk_orders` upload/checkout/paid |

## Launch checklist for this campaign

1. Statement naming set (before first stranger pays): account descriptor must reflect the legal/DBA name (sole prop), so set the dashboard **shortened descriptor to `BHD`** — checkout adds a per-charge suffix and statements read **`BHD* ETSY KIT`**.
2. `ELK_LAUNCHED_AT` set in Vercel (revenue window running).
3. Resend key set (buyers need the email link to re-reach downloads).
4. Create campaign per above → set $1/day → enable. Note the enable date here: `____`
