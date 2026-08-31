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
- [ ] 3.4 Flow per approved Figma 02.27 (URL map panel is the routing reference; supersedes the old "fix flow re-cut" framing — the evaluation exits into purchase, not upload). Shipped already: checking spinner, shop-link confirm, unusable-URL error. Remaining, in order:
  - [x] 3.4a `/check?listing=<id>` route — the hero form lands there; canonicalizes pasted URLs; hosts confirm/error states; serves the eval cache within TTL
  - [x] 3.4b Checkout seeded from the scrape — `POST /api/checkout { listing_id }`, checkout view renders the listing identity + deliverables + price; no upload anywhere on the path
  - [x] 3.4c `/result` GENERATING state — brief trust block, progress list, images appearing; polls `/api/order`; refresh-safe; flips to the fulfilled set (slot strip: their photos + the kit's ten)
  - [ ] 3.4d Persistent header/footer chrome across all five states, per 02.27
- [ ] 3.5 Generator rework per approved Figma 02.26 + design decisions 27/30 (build order below; the six embroidery-hoop compositions retire from this path when 3.4b lands). INTERIM (founder-approved honesty patch, 2026-08-30): production copy promises six images with everything else COMING SOON until this lands:
  - [x] 3.5a Brief module — deterministic verbatim extraction from title/description/tags/alt text + API facts, every phrase carrying its source field; wording-thin flag when phrases run out
  - [x] 3.5b Palette sampler — dominant saturated color(s) from the listing's photos (the "on brand" mechanic); terracotta fallback when photos are too muted to sample
  - [x] 3.5c Scene ladder — ten 2000px images from listing photos + brief + palette: re-edits first (square, tone, detail-crop), data cards only when fields exist, backfill with photo treatments; plus the reusable template file with dashed slots
  - [x] 3.5d Composer interface — suggested title / 13 tags / per-photo alt text; deterministic stub for tests (keyless), Claude Haiku implementation grounded in brief + photos for production; missing `ANTHROPIC_API_KEY` degrades honestly (images + template ship; text deliverables report unavailable)
  - [x] 3.5e Fulfillment rewire — webhook path generates from the order's `listing_id` snapshot instead of an uploaded design; result page + email carry the kit's ten + template + text deliverables
- [x] 3.6 De-niche pass — landing, result page, emails, and metadata all swept; upload section relabeled as the original image pack
- [x] 3.7 Analytics events (evaluation_started/completed/failed, pack_offer_click added to the FunnelEvent union) + breakpoint CSS (citations stack under 1100, mobile scale at 600)
- [x] 3.9 First-pass instrumentation per the approved legend on Figma 02.27 (violet pins mark fire points — implement from that legend, not from memory): P0 = utm/gclid capture into landing_view props · kit_cta_click extending pack_offer_click with placement (hero_skip / report_offer / kit_box / alt_card) · checkout_started carrying listing_id · payment_completed wiring untouched (Ads Sign-up + transaction_id dedupe is why /result keeps its URL). P1 = generation_completed server event (duration_ms, scene_count, wording_thin) · copy_clicked (block: title / tags / alt / zip) on the result page
- [x] 3.8 Copy/layout standards enforced: opportunity framing, no em-dash after tallies, captions under visuals, CTAs on their own line centered, 8pt spacing — promote to `rules/design-guidelines.mdc`

## 4. QA

- [ ] 4.1 Manual walkthrough on `npm run dev` with fixtures: keychain (gaps), floral (shop-link confirm), full listing; then one live-fetch pass against a small number of W&H URLs only
- [ ] 4.2 Automated smoke: rubric fixture parity test (1.10), URL-parser cases (listing/shop/junk/tracking-cluttered), evaluation API route tests, event payload PII check
- [ ] 4.3 Visual check against Figma 02.25 at Desktop 1400, 1024, and Mobile 480
- [ ] 4.4 Confirm zero non-fixture Etsy calls in dev/test logs; throttle + cache behave under repeat checks
- [ ] 4.5 Kit-generation fixture tests: keychain (2 photos, wording-thin → ten images, facts-only cards) and floral (10 photos, wording-rich → brief phrases sourced) both produce full kits through the deterministic composer stub, keyless
- [ ] 4.6 Wording-provenance check: every phrase on every generated template card exists in the brief with a named source field (automated assertion, not eyeball)
- [ ] 4.7 Flow walkthrough on fixtures: / → /check → checkout (Stripe test) → /result generating → fulfilled set; P0 events observed at each pin per the 02.27 legend
