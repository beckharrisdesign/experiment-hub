# Product traceability — Etsy Listing Kit

OpenSpec decision → Figma → code → test → analytics, for each critical part of the journey.

| Journey step | OpenSpec (spec scenario) | Figma (02.3) | Code | Test | Analytics |
| --- | --- | --- | --- | --- | --- |
| Upload one design | Upload · valid / bad file | Landing+Upload | `app/etsy-listing-kit/page.tsx`, `lib/upload.ts`, `api/preview` | `upload.test.ts` | `upload_started` |
| Watermarked preview | Preview the pack | Preview+Paywall | `lib/generator.ts`, `api/preview/route.ts` | generator verified (visual) | `preview_viewed` |
| One-time payment | Complete / cancel payment | Preview+Paywall, State·Cancelled | `api/checkout/route.ts` | — (route; needs keys) | `checkout_started`, `payment_cancelled` |
| Webhook fulfilment | Webhook fulfils once / duplicate | Processing | `api/webhook/route.ts`, `lib/webhook-logic.ts`, `lib/fulfillment.ts` | `webhook-logic.test.ts` | `purchase` (server) |
| Delivery + retrieval | Retrieve later | Result+Download | `result/page.tsx`, `api/order`, `api/download`, `lib/zip.ts` | `zip.test.ts` | `result_delivered` |
| Failure recovery | (design) processing failed | State·Processing failed | `lib/refund.ts` (webhook path) | `refund.test.ts` | `processing_failed` |
| Revenue truth | Revenue red / qualifying / green | — | `scripts/revenue-test.mjs`, `lib/revenue.ts` | `revenue.test.ts` | — |

**Coverage note:** pure logic (qualification, idempotency/scope, refund guard, upload, zip) is unit-tested (31 tests). Route-level integration + live E2E (checkout/webhook against Stripe/Supabase) require keys and are the remaining test gap — see tasks §5.
