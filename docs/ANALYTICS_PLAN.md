# Analytics plan — Etsy Listing Kit

The funnel is the **primary KPI** (ad → checkout conversion + CAC), so events are typed in `lib/etsy-listing-kit/analytics.ts` (client delegates to the hub's `trackEvent`; server purchase uses the GA4 Measurement Protocol). All no-op without GA keys.

| Event | Trigger | Source | Key props | Funnel stage | Dedup |
| --- | --- | --- | --- | --- | --- |
| `landing_view` | Landing mounts | client | experiment_id | Awareness | per pageview |
| `upload_started` | Valid file accepted | client | file_type | Activation | — |
| `preview_viewed` | 6 previews rendered | client | image_count | Value shown | — |
| `checkout_started` | Pay button clicked | client | — | Intent | — |
| `payment_completed` | (reserved) verified pay | — | — | Conversion | — |
| `purchase` (GA4 std) | Fulfillment (verified) | **server** (Measurement Protocol) | transaction_id, value, currency | Conversion | once/order (fires on first fulfilment) |
| `result_delivered` | Result page fulfilled | client | — | Delivery | on status change |
| `payment_cancelled` | Return with `?canceled=1` | client | — | Drop-off | — |
| `processing_failed` | Result status refunded/failed | client | status | Failure | on status change |

**Attribution:** UTM params + `gclid`/`fbclid` captured on the landing, appended to the checkout `FormData`, persisted on the order row, and carried through Stripe. CAC = ad spend ÷ `purchase` count.

**Consent:** client events respect the hub's `analytics_optout` (via `trackEvent`). The server purchase event is first-party (no cookie).

**Verification:** GA4 realtime should show `landing_view → checkout_started → purchase`; the server `purchase` carries `transaction_id = order.id` so it de-dupes against any client purchase event.
