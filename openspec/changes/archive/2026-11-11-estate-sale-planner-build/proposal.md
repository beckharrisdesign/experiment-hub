# Proposal: estate-sale-planner-build

> **Superseded in part, 2026-10-30 (PR #572):** there is no haul-away exit (review queue #7),
> and no payment is wired: the Sell Sheet stays free, and the one planned fee is the
> sold-price lookup (#32). Haul-away and paid-sheet wording below is history from earlier
> rounds; the specs and `tasks.md` hold the current contract.

> Child change of `openspec/changes/estate-sale-planner/` (schema `bhd-experiment`). The
> parent holds Explore / Propose / Apply; this child is where code ships, per
> `rules/bhd-experiment.mdc`.
>
> **Scope:** Build Unit 1 only — the v1 flow (capture → flag → two lists → swipe → haul-away
> exit). The sell-side referral (parent Explore, Permutation C) is Build Unit 2 and not here.
>
> **Gate:** `/opsx:apply` on this change does not run until the next `@beckharrisdesign/mvds`
> release is published and folded in (founder instruction, 2026-10-13).

## Human anchor

> "I liked this idea of the day today. Let's try another autonomous build using MVDS. Note
> that I'm about to release another version of MVDS so make sure we don't build until that's
> able to be folded in."
>
> — Katy, 2026-10-13 (Claude Code session); the idea as it arrived is quoted in full in
> [`experiments/estate-sale-planner/docs/intent.md`](../../../experiments/estate-sale-planner/docs/intent.md)

## Outcomes

- **Who:** The adult child clearing a parent's house — a busy Gen X / Millennial parent who
  has become the executor by default and is sorting it while grieving. Proxy mode; nobody
  is named yet (review queue #10).
- **Job:** Find out what in the house might be worth something *before* the junk truck
  comes, decide keep/toss on the rest without a spreadsheet, and hand the junk off in one
  tap.
- **Done when:**
  - A phone walkthrough video (or a set of photos) is turned into frames in the browser and
    sent only after the user confirms.
  - The flagged items come back as a *Sell* list — name, value band, one-line reason,
    confidence — and everything else undecided; every item is headed to exactly one of
    *Keep*, *Sell*, *Donate*, toggled per item from any list (round 03; there is no Toss).
  - Sorting the undecided pile is one item at a time with undo; any item opens full-screen
    to be corrected, re-read from detail shots, removed, and items can be added.
  - The exit is one tap: the donate list goes to a pickup link (counted as a row before
    redirect); the sell list is a printable summary; junk haul is a demoted link.
  - The sell list with its photos can be bought once as a Sell Sheet at a shareable link;
    the Stripe webhook, not the success URL, unlocks it.
  - A walkthrough costs under $1.00 in model calls at the default frame budget, and the
    session says plainly that closing the tab loses it.
- **Not doing:**
  - Appraisals or anything usable for insurance, tax, or probate.
  - Selling, listing, auctions, or the sell-side referral (Build Unit 2).
  - Accounts, family sharing, or multi-person sorting. The free session is not saved; the
    paid sheet is the only server-side artifact.
  - Booking the haul-away in-app; raw video upload or server-side video processing.
  - Donation, shipping, logistics, grief or legal content.

## Why

The parent Explore's bet: the bottleneck is not labor or logistics, it is **not knowing** —
"is that lamp $20 or $2,000?" — and a confident-enough vision pass plus a decisive UI beats
both guessing and a clean-out crew that hauls the good stuff with the junk. Propose chose a
referral exit over charging the family, so the thing to validate is whether triage changes
what people do next: do they finish the sort, and do they tap the exit.

Building in the hub costs almost nothing extra: MVDS is already wired, the deploy exists,
and the model key, database, and payments are the hub's shared ones (OpenAI, Supabase,
Stripe) — no new credential. The first draft planned on an Anthropic key the hub does not
hold and kept its count in expiring logs; revised 2026-10-13 on founder review (review queue
#30–#35).

## What changes

- **New in-hub route** `app/estate-sale-planner/` on MVDS (mobile-first; the phone is the
  camera), following `etsy-listing-kit` and `svg-to-stitch`.
- **Client-side capture**: `<input capture>` / file picker for video or photos; frames
  sampled from `<video>` to canvas at a fixed interval, near-duplicates dropped, downscaled,
  previewed, and sent on confirm. No raw video leaves the device.
- **Vision route** `app/estate-sale-planner/api/flag/route.ts`: batches frames to the
  vision model and returns structured items (`name`, `room`, `band`, `reason`,
  `confidence`, `frame`, `box`). Provider follows the key the environment carries —
  `OPENAI_API_KEY` first, `ANTHROPIC_API_KEY` as the alternate (`lib/estate-sale-planner/vision/`).
  Frame budget and model names live in `lib/estate-sale-planner/config.ts`.
- **Session state in the browser**: lists, swipe decisions, undo stack, thumbnails.
- **Destinations + item screen** (round 03): `session.ts` holds `keep | sell | donate` per
  item with per-change undo, edit / remove / add; `ItemDetail.tsx` is the full-screen item
  (toggle, rename, room, band, note, detail shots, re-read, remove); `BottomNav.tsx` is the
  phone's Lists · Sort · Finish bar; `storage.ts` keeps the last six walkthroughs on the
  device and lists them on the capture screen.
- **Detail shots**: `api/refine` re-reads one item from up to three close-ups
  (`lib/estate-sale-planner/refine.ts`, both providers) and returns a better read plus
  what the mark says.
- **Exit**: donation-pickup CTA as a counted link (`app/estate-sale-planner/api/exit/route.ts`
  records the tap as an `esp_events` row with `kind`, then redirects to the deep link /
  `tel:`); printable sell summary; junk haul demoted to a secondary link.
- **Sell Sheet** (paid): `api/checkout` saves the Sell list to `esp_sheets` and opens Stripe
  Checkout; `api/webhook` marks it paid and records the buyer's email in the shared
  `experiment_submissions`; `sheet/[id]` renders the paid page at a UUID link.
- **Analytics**: start, frames-confirmed, flags-returned, swipe-complete, exit-tap,
  sheet-checkout — the Propose success thresholds are read off `esp_events` and
  `esp_sheets`, with GA as the client-side mirror.
- **Secrets**: none new. `OPENAI_API_KEY`, `SUPABASE_*`, `STRIPE_SECRET_KEY_*` are the hub's;
  this route's own Stripe webhook signing secret is the one thing Katy creates
  (`ESP_STRIPE_WEBHOOK_SECRET_*`, registered in `.env.example`).
- **Database**: `supabase/migrations/016_esp_sell_sheets.sql` (`esp_events`, `esp_sheets`;
  RLS on, service-role only, like `elk_orders`).

## Capabilities

### New Capabilities

- `walkthrough-triage`: turn a phone walkthrough into a *Sell* list with value bands and a
  *Keep / Toss* list, then let the user decide one item at a time.
- `donation-pickup-exit`: one counted tap that hands the donate list to a pickup service and
  leaves the user with a printable sell summary (renamed from `haul-away-exit` in round 03).
- `sell-sheet`: the sell list with photos, bought once and saved at a shareable link;
  payment is confirmed by the Stripe webhook and every counted event is a database row.

### Modified Capabilities

_None._

## Impact

- **Hub repo:** new route + `lib/estate-sale-planner/`; `.env.example` registry block; one
  Supabase migration; tests under `tests/estate-sale-planner/`.
- **Secrets:** none new beyond this route's Stripe webhook signing secret (Katy creates the
  endpoint). Model, database, and payment keys are the hub's shared ones.
- **MVDS:** version bump to the next release before build; re-check stacking where the
  swipe card and sticky CTA overlap (the `z-*` utilities begin emitting in that release).
- **Figma gate:** new UI surface → `design.md` needs an as-is + proposed pair on MVDS Core.
  As-is is net-new (elk precedent). The proposal round is a FigJam board, since the
  proposal's question is a flow.
- **Money / prod:** no money out. Money *in* is Stripe test mode until Katy creates the
  webhook endpoint and flips `STRIPE_MODE` (review queue #32); the haul-away link is a
  placeholder until a deal exists (review queue #7). Deploys with the hub as a
  private-by-default route.

## Optional links

- Parent: `openspec/changes/estate-sale-planner/` (explore, propose)
- Founder intent: `experiments/estate-sale-planner/docs/intent.md`
- Review queue: `experiments/estate-sale-planner/docs/review-queue.md`
- Nearest pattern: `openspec/changes/etsy-listing-kit/` (one input → one exit)
