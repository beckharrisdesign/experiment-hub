# Etsy Listing Kit — history draft

> Draft 2026-08-23. **Staged to Notion the same day** (approved OK in
> session): all eight entries inserted into BHD Labs History with
> `Approved` unchecked — approval is the go-live switch, entry by entry,
> in Notion. Each entry's page body carries the full source log below;
> the hub renders only the milestone. Each chapter is one
> **Milestone** sentence (what renders on the hub), followed by its sources,
> each in its own voice: **gh** (the commit and PR trail), **supabase** (the
> live `elk_orders` table), **notion** (the experiment row), **Katy**
> (verbatim — none folded in yet; interview pending). The first link on a
> Links line becomes the Notion `Receipt URL`. Working dates live in the
> staging table at the end, not in chapter headings.
>
> **Process artifacts:** this experiment is OpenSpec-native — its change
> folder is [openspec/changes/etsy-listing-kit](https://github.com/beckharrisdesign/experiment-hub/tree/main/openspec/changes/etsy-listing-kit),
> linked below alongside the PRD-era docs.

## Proposed entries

### 0 · Prologue — the manager that taught the wedge

**Milestone:** The first pass at this problem was a whole shop-manager app —
pattern libraries, templates, listing wizards, SEO copy — being
overengineered with no signal, so the lesson, the same one Best Day Ever
taught, was to invert everything: one file, one paid pack, leave.

- **Katy:** "Similar to the Best Day Ever pivot - I was overengineering the
  entire product with no signal. And I tend to get really hyperfixated on
  the product already, so I needed something to pull me back out."
- **gh:** the `etsy-listing-manager` prototype ("Neon Purl") ran as a
  multi-page manager — Dashboard · Patterns · Templates · Listings · Store —
  with no payment and no accounts. The day before the new build started, its
  lessons were written down as prior art: the manager framing is deliberately
  dropped, the paste/drag upload is the one idea worth keeping, and the new
  bet centers on image assets where the old one centered on SEO text.
- **Links:** [prior art](https://github.com/beckharrisdesign/experiment-hub/blob/d76cf49/experiments/etsy-listing-kit/docs/prior-art.md) · [intent](https://github.com/beckharrisdesign/experiment-hub/blob/d76cf49/experiments/etsy-listing-kit/docs/intent.md)

### 1 · A paid product in a day

**Milestone:** Built the narrowest paid version of the job in about a day —
upload one embroidery design, preview six watermarked Etsy-ready images, pay
$3 once, download the pack, no account — built to answer one blunt question:
will a stranger pay a few dollars, right now, to skip the asset-prep chore?

- **gh:** OpenSpec change and the whole transactional foundation landed in a
  single PR: Stripe Checkout adapted from Simple Seed Organizer's
  subscription integration into one-time, metadata-linked orders; a
  webhook-driven, idempotent fulfillment flow; and a `revenue:test` command
  that exits non-zero until $100 of real, refund-adjusted Stripe revenue
  lands within 14 days of launch.
- **Links:** [PR](https://github.com/beckharrisdesign/experiment-hub/pull/331) · [proposal](https://github.com/beckharrisdesign/experiment-hub/blob/d76cf49/openspec/changes/etsy-listing-kit/proposal.md) · [intent](https://github.com/beckharrisdesign/experiment-hub/blob/d76cf49/experiments/etsy-listing-kit/docs/intent.md)

### 2 · Live money, own card first

**Milestone:** Two days of fighting the image library onto Vercel later, the
funnel took its first live $3 payment — the author's own, on purpose, proving
the full path from upload through Stripe to the download email end to end.

- **gh:** sharp's Linux binaries had to be forced into the function bundle
  across two fix PRs before image generation worked in production; the
  2026-07-28 live payment verified checkout's statement descriptor in the
  same pass.
- **supabase:** first fulfilled order 2026-07-27; the six lifetime orders
  that follow are all owner self-purchases (chapter 6).
- **Links:** [PR](https://github.com/beckharrisdesign/experiment-hub/pull/332) · [PR](https://github.com/beckharrisdesign/experiment-hub/pull/333)

### 3 · Making the pack worth $3

**Milestone:** Polished like a buyer was coming: the pack was restyled to
the composition language of Watermark & Hue — the author's live Etsy shop —
the weakest cards were replaced, the preview was made accessible, buyer
emails got the brand, and the funnel moved onto its own host.

- **Katy:** "W&H is Watermark & Hue, a live Etsy site that I have an api
  key for. I use it for experimenting and as real world data for things in
  the etsy realm."
- **gh:** the restyle PR adopts "the composition language from Katy's real
  listing images" (the W&H Listing Generator Figma file) — plain studio
  background, an arch logo badge whose accent color is sampled from the
  uploaded design's inked pixels; a follow-up recomposition dropped the
  detail/info cards for mustard and stitched scenes. Around it: preview
  scroll/focus/announce accessibility, failed confirmation emails made
  visible, buyer emails branded with replies routed, and the
  `etsy-listing-kit.vercel.app` vanity host.
- **Links:** [restyle PR](https://github.com/beckharrisdesign/experiment-hub/pull/337) · [recompose PR](https://github.com/beckharrisdesign/experiment-hub/pull/351) · [vanity host PR](https://github.com/beckharrisdesign/experiment-hub/pull/348) · [Figma](https://www.figma.com/design/ZZusgWsPM4Fz8YuhKxnD4R/W-H-Listing-Generator?node-id=134-22200)

### 4 · The campaign that never served

**Milestone:** Launched a $5/day Google Ads burst to put the funnel in front
of strangers — and it delivered nothing for a week: a bid cap below the
auction price was set but not shown anywhere in the Ads UI, and conversion
tracking was silently broken, so the window taught exactly nothing.

- **Katy:** "I didn't have any automations set up for google ads - and my
  campaign got stuck in a strange state where I had a bid cap set but it
  wasn't shown anywhere."
- **gh:** the campaign plan was drafted two days after launch; the campaign
  was published Jul 31 and enabled Aug 4, and the day-by-day log dutifully
  recorded a burst that, it later turned out, never ran. Google's own
  first-impression date is Aug 7. Two faults overlapped: the hidden CPC cap
  (~$0.50 against a ~$3.30 auction), and conversion tracking pointed at the
  wrong Ads account with its beacons blocked by CSP.
- **Links:** [campaign plan PR](https://github.com/beckharrisdesign/experiment-hub/pull/334) · [enable-date log PR](https://github.com/beckharrisdesign/experiment-hub/pull/355) · [campaign log](https://github.com/beckharrisdesign/experiment-hub/blob/aa54bcf/docs/AD_CAMPAIGN_GOOGLE.md)

### 5 · Unblocked, recalibrated, corrected in writing

**Milestone:** Forcing the bid cap to $15 produced the first impressions on
Aug 7 — 129 impressions and 2 clicks at roughly $3.30 each, triple the CPC
the plan assumed — so the 3-day, ~$15 burst was rewritten as a ~two-week,
$50–100 test, and the log was corrected to say the first week's run never
happened.

- **Katy:** "Once I untangled myself from that ui I was able to run it."
- **gh:** conversion tracking repaired across two PRs the day delivery
  started (wrong Ads account, missing event, CSP unblocked); the ad burst
  reset to Aug 8; a make-another CTA added to the result page; and a
  dedicated correction PR retitled the record — "the campaign never served
  until Aug 7." GA4 was linked to Ads for the first time on Aug 9.
- **Links:** [correction PR](https://github.com/beckharrisdesign/experiment-hub/pull/367) · [tracking repair PR](https://github.com/beckharrisdesign/experiment-hub/pull/363) · [burst reset PR](https://github.com/beckharrisdesign/experiment-hub/pull/365) · [campaign log](https://github.com/beckharrisdesign/experiment-hub/blob/aa54bcf/docs/AD_CAMPAIGN_GOOGLE.md)

### 6 · The verdict: too niche

**Milestone:** The campaign ran to its 15–30-click finish line and came back
with the answer the gut call predicted — 30 clicks of real Etsy-listing
intent at 3.09% CTR, and not one conversion once visitors landed and saw
the kit was embroidery-specific; $56.03 spent, six paid orders lifetime,
all self-purchases.

- **Katy:** "My gut said that an embroidery pattern maker was too niche,
  but the campaign hit that home. Decent signal on the keywords, but no
  conversions once users landed on the page and realized it was specific
  to embroidery."
- **google ads** (read live 2026-08-23, campaign `etsy-listing-kit-test1`):
  972 impressions, 30 clicks, 3.09% CTR, $56.03 total spend — average CPC
  ~$1.87, well under the feared ~$3.30 — and 0 conversions. The run was
  tended, not left idle: budget retuned Aug 9, two broad-match keywords
  added Aug 11 from the Ads mobile app, last manual change Aug 16; the
  campaign now sits Paused.
- **supabase:** six fulfilled orders, 2026-07-27 through 2026-08-07, all
  owner self-purchases; zero rows carry a click id or UTM source — the
  zero-conversion read is the orders table's, not just Google's.
- **gh:** the plan's kill/continue table had anticipated exactly this
  shape — "15+ clicks, 0 upload-starts → message mismatch." The final
  totals never made it back into the repo's campaign log, whose last
  recorded day is Aug 9.
- **notion:** `Status` = Validating; no `Outcome` recorded yet — the
  verdict names the niche as the mismatch, not the experiment as dead.
- **Links:** [campaign log](https://github.com/beckharrisdesign/experiment-hub/blob/aa54bcf/docs/AD_CAMPAIGN_GOOGLE.md) — its last recorded day predates the verdict.

### 7 · The pivot decision

**Milestone:** The verdict became a pivot: either widen the kit to any kind
of Etsy listing — no embroidery hoops — or shift the prism to evaluate a
seller's existing listings alongside the fixed assets in the same UI; the
demand question stays open, the embroidery framing doesn't.

- **Katy:** "the verdict was to either widen the offering to any kind of
  listing kit on etsy (no embroidery hoops) or shift the prism a bit to
  offer an evaluation of existing listings along with the fixed assets
  right in the same ui. So the verdict was to pivot, basically."
- **gh:** no pivot commits yet as of 2026-08-23 — the decision lives ahead
  of the trail. The evaluation direction rhymes with the
  listing-completeness scorecard already proposed against the Watermark &
  Hue capture pipeline (the etsy-zero-sales-funnel change), so the two
  threads may converge.
- **notion:** `Status` = Validating — consistent with a pivot in progress,
  not an ending.
- **Links:** [scorecard proposal](https://github.com/beckharrisdesign/experiment-hub/blob/main/openspec/changes/etsy-zero-sales-funnel/proposal.md) — the pre-existing evaluation thread; the pivot itself lives in no commit yet.

## Staging table (staged 2026-08-23; `Approved` unchecked on every row)

| # | Chapter | Date | Grain |
| --- | --- | --- | --- |
| 0 | Prologue — the manager that taught the wedge | 2026-07-24 | single day (prior-art capture; manager work itself predates, span unverified) |
| 1 | A paid product in a day | 2026-07-25 – 2026-07-26 | two-day span (first commit → PR #331 merge) |
| 2 | Live money, own card first | 2026-07-27 – 2026-07-28 | two-day span |
| 3 | Making the pack worth $3 | 2026-07-28 – 2026-08-04 | span |
| 4 | The campaign that never served | 2026-07-31 – 2026-08-06 | span (published → last void day) |
| 5 | Unblocked, recalibrated, corrected in writing | 2026-08-07 – 2026-08-09 | span |
| 6 | The verdict: too niche | 2026-08-07 – 2026-08-16 | span (first impression → last manual change / pause in Ads) |
| 7 | The pivot decision | Aug 2026 | month-wide — decided between the Aug 16 pause and the 2026-08-23 account; exact day unrecorded |

## Consistency check

- Etsy Listing Kit is not dead (notion: Validating, no kill reason); the
  terminal entry must describe a pivot in progress, not an ending. It
  does — chapter 7 records the decision and names both candidate
  directions without claiming either has started.
- Result claims carry their numbers inline: $3 price, $100/14-day target,
  six lifetime orders, zero ad-attributed, 972 impressions, 30 clicks,
  3.09% CTR, $56.03 spend, ~$1.87 average CPC, 0 conversions.
- Campaign totals were read live from Google Ads (account 671-160-6591,
  campaign `etsy-listing-kit-test1`) on 2026-08-23, not from the repo's
  log, which stops at Aug 9.
- Remaining marked inference: the manager prototype's own working span.

## Open questions for the interview (chat only, one per turn)

1. ~~Why the campaign didn't serve~~ — answered 2026-08-23: a bid cap was
   set but shown nowhere in the Ads UI; untangling the UI unblocked it
   (folded into chapters 4–5 verbatim).
2. ~~What the campaign ended up showing~~ — answered 2026-08-23 (Katy: too
   niche; keywords pulled, page converted no one) and confirmed live in
   Ads: 972 impr / 30 clicks / $56.03 / 0 conversions; paused Aug 16.
3. ~~What triggered the pivot from the manager framing~~ — answered
   2026-08-23: overengineering with no signal, same as the Best Day Ever
   pivot; hyperfixation on product needed something to pull her back out
   (folded into chapter 0 verbatim).
4. ~~Is "W&H" the Etsy shop the pack was restyled to match~~ — answered
   2026-08-23: Watermark & Hue, the author's live Etsy shop with an API
   key, used for experimenting and real-world data across etsy-realm work
   (folded into chapter 3 verbatim). The 19-listing image pass stays out
   of this narrative — W&H is shared test infrastructure, and that pass
   lives in `etsy-listing-manager` (Patternator's trail).
