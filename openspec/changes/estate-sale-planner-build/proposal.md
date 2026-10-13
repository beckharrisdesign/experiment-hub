# Proposal: estate-sale-planner-build

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
    confidence — and everything else as a *Keep / Toss* list grouped by room.
  - Keep/toss is one item at a time with undo; a sell item can be moved to keep or toss.
  - The exit is one tap: the toss list goes to a haul-away link (counted before redirect);
    the sell list is a printable summary.
  - A walkthrough costs under $1.00 in model calls at the default frame budget, and the
    session says plainly that closing the tab loses it.
- **Not doing:**
  - Appraisals or anything usable for insurance, tax, or probate.
  - Selling, listing, auctions, or the sell-side referral (Build Unit 2).
  - Accounts, saved sessions, family sharing, or multi-person sorting.
  - Booking the haul-away in-app; raw video upload or server-side video processing.
  - Donation, shipping, logistics, grief or legal content.

## Why

The parent Explore's bet: the bottleneck is not labor or logistics, it is **not knowing** —
"is that lamp $20 or $2,000?" — and a confident-enough vision pass plus a decisive UI beats
both guessing and a clean-out crew that hauls the good stuff with the junk. Propose chose a
referral exit over charging the family, so the thing to validate is whether triage changes
what people do next: do they finish the sort, and do they tap the exit.

Building in the hub costs almost nothing extra: MVDS is already wired, the deploy exists,
and the only new secret is an Anthropic key.

## What changes

- **New in-hub route** `app/estate-sale-planner/` on MVDS (mobile-first; the phone is the
  camera), following `etsy-listing-kit` and `svg-to-stitch`.
- **Client-side capture**: `<input capture>` / file picker for video or photos; frames
  sampled from `<video>` to canvas at a fixed interval, near-duplicates dropped, downscaled,
  previewed, and sent on confirm. No raw video leaves the device.
- **Vision route** `app/estate-sale-planner/api/flag/route.ts`: batches frames to the
  Anthropic API and returns structured items (`name`, `room`, `band`, `reason`,
  `confidence`). Frame budget and model name live in `lib/estate-sale-planner/config.ts`.
- **Session state in the browser**: lists, swipe decisions, undo stack. No database.
- **Exit**: haul-away CTA as a counted link (`app/estate-sale-planner/api/exit/route.ts`
  records the tap, then redirects to the deep link / `tel:`); printable sell summary.
- **Analytics**: start, frames-confirmed, flags-returned, swipe-complete, exit-tap — the
  Propose success thresholds are read off these.
- **Secrets**: `ANTHROPIC_API_KEY` added to `.env.example`'s registry (vault entry is
  Katy's).

## Capabilities

### New Capabilities

- `walkthrough-triage`: turn a phone walkthrough into a *Sell* list with value bands and a
  *Keep / Toss* list, then let the user decide one item at a time.
- `haul-away-exit`: one counted tap that hands the toss list to a haul-away service and
  leaves the user with a printable sell summary.

### Modified Capabilities

_None._

## Impact

- **Hub repo:** new route + `lib/estate-sale-planner/`; `.env.example` registry line;
  tests under `tests/estate-sale-planner/`.
- **Secrets:** one new key, Katy-owned.
- **MVDS:** version bump to the next release before build; re-check stacking where the
  swipe card and sticky CTA overlap (the `z-*` utilities begin emitting in that release).
- **Figma gate:** new UI surface → `design.md` needs an as-is + proposed pair on MVDS Core.
  As-is is net-new (elk precedent). The proposal round is a FigJam board, since the
  proposal's question is a flow.
- **Money / prod:** no money out; the haul-away link is a placeholder until a deal exists
  (review queue #7). Deploys with the hub as a private-by-default route.

## Optional links

- Parent: `openspec/changes/estate-sale-planner/` (explore, propose)
- Founder intent: `experiments/estate-sale-planner/docs/intent.md`
- Review queue: `experiments/estate-sale-planner/docs/review-queue.md`
- Nearest pattern: `openspec/changes/etsy-listing-kit/` (one input → one exit)
