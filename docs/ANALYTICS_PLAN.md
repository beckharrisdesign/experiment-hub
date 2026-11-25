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

**Google Ads conversions.** One Ads id, `AW-10904266222`. It belongs to Ads account **671-160-6591**, where the `etsy-listing-kit-test1` campaign runs. It is `gtag('config', …)`'d once, in `app/layout.tsx`, which covers every hub page including ELK. Guarded by `tests/etsy-listing-kit/ads-conversion.test.ts`.

**Correction, 2026-11-25.** From 2026-08-07 (PR #363) this plan and the code said ELK had its own Ads account, `AW-277034089`. The `Sign-up` action's event snippet in 671-160-6591, read live, shows `AW-10904266222/dX8MCLuApMQcEO7Lx88o`. Nothing recorded says where `AW-277034089` came from, and its owner is unknown. While it was in place no ELK sale could reach `Sign-up`.

| Ads action | Id | How it is fed |
| --- | --- | --- |
| `Sign-up` | 7659388987 | Event snippet `AW-10904266222/dX8MCLuApMQcEO7Lx88o`, fired by `trackAdsConversion()` on the result page once the order reaches `fulfilled`. `transaction_id = order.id` dedupes refreshes. Last recorded 2026-06-24, before ELK fired it. |
| `FormSubmit` | 6657647682 | **Not working.** It imports from the GA4 property SwiftSketchAI (408528688), which receives no data. ELK sends `FormSubmit` to Beck Harris Design (506820302, `G-120M120GDY`). Needs a new import from that property. |

⚠️ simple-seed-organizer fires the **same** `Sign-up` action when an account is created. A kit sale and a seed signup land in one number. **Before either campaign is turned back on,** create a separate action for the kit in Google Ads and put its label in `ADS_CONVERSION_PURCHASE`.

**Consent:** client events respect the hub's `analytics_optout` (via `trackEvent`). The server purchase event is first-party (no cookie).

**Verification:** GA4 realtime should show `landing_view → checkout_started → purchase`; the server `purchase` carries `transaction_id = order.id` so it de-dupes against any client purchase event.
