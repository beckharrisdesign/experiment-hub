# Package / scaffold contribution candidates — from Etsy Listing Kit

Reusable patterns this experiment produced. **Not** auto-applied to shared packages (per brief) — recorded for a later, deliberate promotion.

## Scaffold (`packages/*` or hub `lib/`) candidates

| Candidate | Where it lives now | Why promote | Effort |
| --- | --- | --- | --- |
| **One-time Stripe checkout + idempotent webhook** adapter | `lib/etsy-listing-kit/{stripe,orders,webhook-logic}.ts` + `api/{checkout,webhook}` | Every paid experiment needs this; SSO only had the *subscription* shape. Parameterize by `experiment_id` + price | Medium |
| **`revenue:test` harness** | `scripts/revenue-test.mjs` + `lib/revenue.ts` | A generic, `experiment_id`-scoped "did anyone really pay" test is reusable across all paid experiments | Low |
| **Dependency-free ZIP writer** | `lib/etsy-listing-kit/zip.ts` | No-dep STORE-method zip is broadly useful for any download bundle | Low |
| **Provider-agnostic transactional email adapter** | `lib/etsy-listing-kit/email.ts` | Resend-or-no-op pattern (no new account, never breaks fulfilment) fits any experiment | Low |
| **Order/fulfilment state machine + RLS-locked orders table** | `supabase/migrations/007` + `lib/orders.ts` | Reusable order model (created→paid→fulfilled→refunded) for future paid experiments | Medium |

## MVDS (`@beckharrisdesign/mvds`) candidates

| Candidate | Note |
| --- | --- |
| **Terracotta + ochre + cream accent set** | Warm, craft-friendly, WCAG-AA — a real alternative theme to the neutral default; could ship as an MVDS theme preset |
| **Dropzone (drag/drop/paste) pattern** | Product-local now; a common enough interaction to live in MVDS |
| **Watermarked preview grid** | Product-specific; probably stays local |

## Do not

- Do not modify or publish `@beckharrisdesign/mvds` from this experiment.
- Do not fold the experiment's Stripe/order code into the shared scaffold until a second paid experiment validates the abstraction.
