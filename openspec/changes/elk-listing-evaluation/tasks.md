## 1. User outcomes (from spec scenarios)

- [ ] 1.1 A public listing URL returns a rendered evaluation (current-state card: identity, required pass/fail, recommended %, field checklist)
- [ ] 1.2 Every recommendation carries its evidence (report cards: photo slots, character blocks, alt-text status, video absence)
- [ ] 1.3 Recommendations cite Etsy's current documentation (quote + source + "checked <date>" from the citation registry)
- [ ] 1.4 The free evaluation includes one sample kit suggestion (title card's "What the kit would suggest")
- [ ] 1.5 Recommendations speak in opportunities (framing what's available, facts stated plainly beneath)
- [ ] 1.6 Full image slots with weak photos still get an image recommendation ("Improve the listing images you already have" with resolution chips)
- [ ] 1.7 A fully populated listing gets opportunities, not invented gaps (100%, "Nothing to fill — now make it work harder", test/refresh cards)
- [ ] 1.8 A shop link suggests its featured listing (confirm card, nothing scored until confirmed)
- [ ] 1.9 An unusable URL fails honestly (plain-language reason, nothing scored or stored)
- [ ] 1.10 The same listing data scores identically everywhere (ELK evaluation and labs scorecard share one rubric module)
- [ ] 1.11 Evaluation events fire without PII (evaluation-start / evaluation-complete / pack-offer-click, listing id only)
- [ ] 1.12 The report resolves into the kit offer (per-card "What's in the kit" boxes + the full-kit card, video as coming soon)
- [ ] 1.13 The kit delivers suggestions, not writes (ten images + template + title + tags + alt text as paste-ready output; no Etsy writes)
- [ ] 1.14 No embroidery framing survives anywhere (landing, evaluation, upload, result, emails)

## 2. Foundations

- [x] 2.1 Shared rubric: `lib/etsy-scorecard.ts` already existed (zero-sales-funnel built it) — ELK's `evaluateListing` imports it; cap raised to 20; parity test pins identical output through both entry points (serves 1.10)
- [ ] 2.2 Rubric calls (code decisions SHIPPED: cap=20; Tier A stays presence-only, mirroring what Etsy itself enforces — thinness lives in Tier B; documented in etsy-scorecard.ts). REMAINING: founder Shop Manager spot-check of tags/title/materials caps
- [ ] 2.3 Citation registry SHIPPED (`lib/etsy-listing-kit/citations.ts`, `verifiedVerbatim:false` on every entry). REMAINING: human browser pass to verify each quote verbatim, then flip the flags (agent cannot — bot wall; serves 1.3)
- [x] 2.4 Listing-fetch endpoint: parse listing id from pasted URLs (tolerate `ref=`/`logging_key=` clutter), fetch via official v3 API with the existing key; shop-URL → featured-listing lookup; per-listing server cache + per-IP throttle (serves 1.1, 1.8, 1.9 — and the founder's no-rate-limit constraint)
- [x] 2.5 Dev fixture mode: evaluation UI served from Supabase `etsy_latest_listing_snapshots` fixtures (W&H listings 4522917501 / 4465357735 / a full one) — zero live Etsy calls during development and tests
- [x] 2.6 `elk_evaluations` table + migration 013 (file in repo; applying to the live project awaits founder OK / deploy)

## 3. Implementation

- [x] 3.1 Evaluation surface per Figma 02.25 lineage: 1024 content column, current-state card (tinted verdict panels, truthful "N of 10", "% in use", FIELDS grid, explainer), report cards in fixed order, RECOMMENDATION eyebrows, "What's in the kit" boxes, kit offer with COMING SOON tease + centered CTA — verified live on dev against the keychain fixture
- [ ] 3.2 Card variants (PARTIAL: open-slots vs improve-existing switch + empty-tags card + full-state heading/kit reframe shipped; REMAINING: the fully-built state's test/refresh recommendation cards, and resolution chips on the improve-existing card UI)
- [ ] 3.3 Character-block title evidence + numbered photo slots SHIPPED; REMAINING: per-photo quality/resolution chips on the improve card
- [ ] 3.4 Flow states (PARTIAL: checking spinner, shop-link confirm card, unusable-URL error shipped; REMAINING: the fix flow re-cut with kit-shaped copy and evaluation context carried in)
- [ ] 3.5 Kit scope: ten new-or-updated images + reusable template output from the generator; title/tags/alt-text suggestion generation. INTERIM (founder-approved honesty patch, 2026-08-30): production copy now promises only today's real deliverable (six images) with everything else explicitly COMING SOON; the new non-embroidery scene system gets designed on Figma 02.26 before the generator rework
- [ ] 3.6 De-niche pass (PARTIAL: landing hero/header/metadata done; REMAINING: result page + emails sweep)
- [x] 3.7 Analytics events (evaluation_started/completed/failed, pack_offer_click added to the FunnelEvent union) + breakpoint CSS (citations stack under 1100, mobile scale at 600)
- [ ] 3.8 Copy/layout standards enforced: opportunity framing, no em-dash after tallies, captions under visuals, CTAs on their own line centered, 8pt spacing — promote to `rules/design-guidelines.mdc`

## 4. QA

- [ ] 4.1 Manual walkthrough on `npm run dev` with fixtures: keychain (gaps), floral (shop-link confirm), full listing; then one live-fetch pass against a small number of W&H URLs only
- [ ] 4.2 Automated smoke: rubric fixture parity test (1.10), URL-parser cases (listing/shop/junk/tracking-cluttered), evaluation API route tests, event payload PII check
- [ ] 4.3 Visual check against Figma 02.25 at Desktop 1400, 1024, and Mobile 480
- [ ] 4.4 Confirm zero non-fixture Etsy calls in dev/test logs; throttle + cache behave under repeat checks
