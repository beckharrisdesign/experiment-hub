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
| `Etsy Listing Kit purchase` | 7917701953 | Created 2026-11-25. Event snippet `AW-10904266222/824ACMGWur8dEO7Lx88o`, fired by `trackAdsConversion()` on the result page once the order reaches `fulfilled`. `transaction_id = order.id` dedupes refreshes. Purchase, primary, counts every sale, uses the sale's value ($3 if missing), 90-day click window, data-driven. |
| `Etsy Listing Kit checkout started` | 7917759574 | Created 2026-11-25. GA4 import of `FormSubmit` from Beck Harris Design (506820302, `G-120M120GDY`), where it is a key event with no value. Sent by `trackFormSubmit()` on checkout submit; the name is case-sensitive. Begin checkout, secondary (reported, not bid on), one per click, no value. No `FormSubmit` reached that property in the 28 days before it was created. |
| `SwiftSketchAI (web) FormSubmit` | 6657647682 | **Old import, still enabled and primary.** Reads GA4 SwiftSketchAI (408528688), which receives no data. Remove it in Google Ads. |

`Sign-up` (7659388987, `AW-10904266222/dX8MCLuApMQcEO7Lx88o`) now belongs to simple-seed-organizer alone, which fires it when an account is created. Its fallback value is still the kit's $3, and the seed code sends no value, so each signup counts as $3 until that is changed in Google Ads.

`Etsy Listing Kit purchase` and `Sign-up` are both in account-default goals. A campaign using the account defaults counts both kit sales and seed signups, so before either campaign is turned back on, set its goals to its own action.

**Consent:** client events respect the hub's `analytics_optout` (via `trackEvent`). The server purchase event is first-party (no cookie).

**Verification:** GA4 realtime should show `landing_view → checkout_started → purchase`; the server `purchase` carries `transaction_id = order.id` so it de-dupes against any client purchase event.
