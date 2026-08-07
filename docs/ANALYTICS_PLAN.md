# Analytics plan — Etsy Listing Kit

The funnel is the **primary KPI** (ad → checkout conversion + CAC), so events are typed in `lib/etsy-listing-kit/analytics.ts` (client delegates to the hub's `trackEvent`; server purchase uses the GA4 Measurement Protocol). All no-op without GA keys.

Every step a visitor can *attempt* has a **start** event and a **terminal** event (success or failure), so each step yields both a duration and a drop-off count. A step with only a success event is invisible when it fails or when the visitor abandons mid-step.

| Event | Trigger | Source | Key props | Funnel stage | Dedup |
| --- | --- | --- | --- | --- | --- |
| `landing_view` | Landing mounts | client | experiment_id | Awareness | per pageview |
| `upload_picker_opened` | "Choose file" / dropzone click | client | had_file | Activation (start) | — |
| `upload_started` | Valid file accepted | client | file_type, file_size_mb, ms_since_picker | Activation (ok) | — |
| `upload_rejected` | File failed validation | client | file_type, file_size_mb, reason, ms_since_picker | Activation (fail) | — |
| `preview_requested` | Preview button clicked | client | file_type | Value (start) | — |
| `preview_viewed` | 6 previews rendered | client | image_count, **duration_ms** | Value (ok) | — |
| `preview_failed` | Preview request errored | client | reason, duration_ms | Value (fail) | — |
| `checkout_started` | Pay button clicked | client | — | Intent (start) | — |
| `FormSubmit` | Pay button clicked | client | experiment_id | Intent (start) | — |
| `checkout_failed` | Never reached Stripe | client | reason | Intent (fail) | — |
| `payment_completed` | (reserved) verified pay | — | — | Conversion | — |
| `purchase` (GA4 std) | Fulfillment (verified) | **server** (Measurement Protocol) | transaction_id, value, currency | Conversion | once/order (fires on first fulfilment) |
| `result_delivered` | Result page fulfilled | client | **wait_ms** (post-payment wait) | Delivery | on status change |
| `download_clicked` | Zip or single image downloaded | client | kind, image_id | Delivery (ok) | — |
| `payment_cancelled` | Return with `?canceled=1` | client | — | Drop-off | — |
| `processing_failed` | Result status refunded/failed | client | status, wait_ms | Failure | on status change |

**Reading the funnel.** Drop-off between any start and its terminal event is abandonment *within* that step; a missing terminal event after `upload_picker_opened` means the visitor opened the file dialog and dismissed it (the browser fires no event for that, so absence is the signal). `duration_ms` / `ms_since_picker` / `wait_ms` give per-step timing without needing to difference GA4 event timestamps. Measured locally, `preview_requested → preview_viewed` runs ~6.7s — the longest in-page wait and the most likely abandonment point.

**Attribution:** UTM params + `gclid`/`fbclid` captured on the landing, appended to the checkout `FormData`, persisted on the order row, and carried through Stripe. CAC = ad spend ÷ `purchase` count.

**Google Ads conversions.** ELK runs its **own standalone Ads account, `AW-277034089`** — deliberately separate from the hub account (`AW-10904266222`) so ELK ad traffic and conversions stay distinguishable from general BHD Labs traffic.

**Where each account is configured — this matters.** The hub account is `gtag('config', …)`'d in `app/layout.tsx` (every page). The ELK account is configured in `app/etsy-listing-kit/layout.tsx`, which covers the ELK segment (landing + result) **and nothing else**. Configuring the ELK account in the root layout instead sends every hub pageview — `/heuristics`, `/prototypes`, … — into the ELK Ads account, which recreates the exact traffic-mixing problem the separate account exists to solve and seeds its remarketing lists with people who never saw the product. Guarded by tests in `tests/etsy-listing-kit/ads-conversion.test.ts` ("Google Ads tag scoping").

Corollary for the Google Ads / GA4 admin UI: do **not** add `AW-277034089` as a destination on the "BHD Labs" Google tag. That tag loads on every hub page, so adding it there reintroduces the same leak from the config side.

| Ads action | Id | How it is fed |
| --- | --- | --- |
| `Sign-up` | 7659388987 | Event snippet `AW-277034089/dX8MCLuApMQcEO7Lx88o`, fired by `trackAdsConversion()` on the result page once the order reaches `fulfilled`. `transaction_id = order.id` dedupes refreshes. |
| `FormSubmit` | 6657647682 | **GA4 import, no Ads snippet.** Needs a GA4 event named exactly `FormSubmit` (case-sensitive) — sent by `trackFormSubmit()` on checkout submit. Requires GA4 `G-120M120GDY` to be linked to `AW-277034089`; imported conversions lag hours and never appear in Ads realtime. |

⚠️ The label `dX8MCLuApMQcEO7Lx88o` is *also* used by simple-seed-organizer under the **hub** account. The account prefix is the only thing separating the two conversion actions — never collapse `GOOGLE_ADS_ID` and `ELK_GOOGLE_ADS_ID` into one constant.

**Consent:** client events respect the hub's `analytics_optout` (via `trackEvent`). The server purchase event is first-party (no cookie).

**Verification:** GA4 realtime should show `landing_view → checkout_started → purchase`; the server `purchase` carries `transaction_id = order.id` so it de-dupes against any client purchase event.
