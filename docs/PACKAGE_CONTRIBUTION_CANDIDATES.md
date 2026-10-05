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

### Delivered

| Candidate | Shipped in | Note |
| --- | --- | --- |
| **Terracotta + ochre + cream accent set** | `0.4.0` | Landed as the scoped brand preset `themes/terracotta.css`, which doubles as the template for writing another |
| **Dropzone (drag/drop/paste) pattern** | `0.4.0` | Landed as `Dropzone` — drag / drop / paste / picker over a hidden file input, with a real button in the a11y tree. Ends at "files selected"; transport and previews stay app concerns |

### Open

| Candidate | Evidence | Owner |
| --- | --- | --- |
| **`Slider`** | Two consumers independently worked around the same gap: `app/generative-sandbox/Slider.tsx` (native range input) and `image-lab/src/components/ui/slider.tsx` in `beckharrisdesign/generative-art` (composed from Radix). Both needed split `onValueChange` / `onValueCommit` semantics. MVDS has no open issue for it | The MVDS session — not claimed by the Hub |
| **Watermarked preview grid** | Product-specific; probably stays local | — |

## Acquisition-tooling gap (identified at etsy-listing-kit launch, 2026-07-27)

The launch's last mile — creating the ad campaign — fell back to manual dashboard work,
which belies the autonomous-experiment goal. Candidates, in preference order:

| Candidate | Shape | Notes |
| --- | --- | --- |
| **Google Ads connector (claude.ai)** | Zero-build | If a first-party/marketplace connector exists, connect + re-auth and agents can drive campaign creation directly (create paused; human enables = spend authorization). Katy believed one was connected — verify in connector settings; not surfaced in-session as of 2026-07-27 |
| **`google-ads-campaign` skill + thin API wrapper** | Scaffold build | Google Ads API v17+ via a service account / OAuth refresh token; smallest surface: create campaign (paused) + ad group + keywords + RSA from a JSON plan like `docs/AD_CAMPAIGN_GOOGLE.md`. Guard rails: hard budget cap param, always-create-paused, never enable |
| **Editor-import generator** | Cheapest build | Emit a Google Ads Editor CSV from the campaign doc — halves the manual work (import + review + enable) without any API auth |

Same pattern applies to Meta when that channel gets used. The campaign *plan* format in
`docs/AD_CAMPAIGN_GOOGLE.md` is already structured enough to be the input contract.

## Do not

- Do not fold the experiment's Stripe/order code into the shared scaffold until a second paid experiment validates the abstraction.

> The former blanket line here — "do not modify or publish `@beckharrisdesign/mvds` from this experiment" — was removed on 2026-10-05. It described a moment when the package was off-limits to this repo; two of this section's three original candidates (Dropzone and the terracotta set) have since shipped, so the Hub's job is to record what it wants and hand it to whoever owns the package, not to pretend the door is shut. Promotion still happens deliberately, on the two-consumer evidence bar this doc already sets.
