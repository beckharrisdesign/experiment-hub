# Propose — Estate Sale Planner

> Second phase artifact on the parent `bhd-experiment` change. Drafted autonomously;
> every call below that is the founder's to make is mirrored in
> [`experiments/estate-sale-planner/docs/review-queue.md`](../../../experiments/estate-sale-planner/docs/review-queue.md).
>
> **Stores:** Business Patterns / Service Patterns / BHD Ecosystem stores are "pending" per
> `openspec/schemas/bhd-experiment/README.md` and do not exist. Nearest in-repo pattern is
> `etsy-listing-kit` (one input → one transformation → one paid exit), which this follows
> on the hub's shared rails — the OpenAI key, Supabase, and Stripe that ELK already runs on.
>
> **Revised 2026-10-13** after founder review: the first draft planned on an Anthropic key
> the hub does not hold, kept the validation count in expiring function logs, and had no
> payment in the model. Katy: *"we need some sort of payment in the model."* Both paid
> moments below are now in v1.

## Business Brief

### Monetization model

**Two paid moments, one on each side of the sort.** Decided before pricing, per the rule.

1. **Referral — the donation pickup tap** at the end of the sort (Pickup Please first, a
   Salvation Army pickup where it does not operate; round 03 — there is no Toss list, so
   the referral moved from junk removal to charity pickup, with 1-800-GOT-JUNK demoted to a
   "haul the rest" link). Free for the family; the partner pays. No deal exists yet (review
   queue #7, #37), so v1 counts the tap on a placeholder link.
2. **One-time purchase — the Sell Sheet.** The free flow ends in a printable summary. The
   Sell Sheet is the same list *with the photos*, saved at a link that survives closing
   the tab and can be sent to siblings or the estate-sale company. Stripe Checkout, no
   account, same wiring as ELK's kit.

Why the sheet and not a paywall on the triage: the person using this is grieving,
time-poor, and about to spend real money on a crew or a truck. The triage stays free so the
test still measures whether it changes what they do next. The sheet is paid because it is
the one thing they will want *after* the tab closes, and because a dollar signal with
infrastructure the hub already has beats a referral signal that waits on a deal that does
not exist. ELK validated with real charges; this does the same.

The sell-side referral (estate-sale companies, consignment, MaxSold-style auctions —
Explore Permutation C) remains Build Unit 2.

### Pricing

- **Sell Sheet: $5, one-time** (review queue #32). Anchored under ELK's $3 kit times the
  item count a house produces, and far under what an estate-sale company charges to walk
  through. Test mode until the Stripe endpoint for this route exists; live only on Katy's
  flip of `STRIPE_MODE`.
- Referral economics are the partner's published rate once a deal exists; the placeholder
  records intent only.

### SKUs / tiers

One SKU: the Sell Sheet. One flow.

### Internal Positioning

For the adult child clearing a parent's house, a phone walkthrough that tells them what is
worth keeping *before* the junk truck comes — so the good stuff is not hauled out with the
junk, and the rest is one swipe at a time instead of a weekend of guessing.

## Service Brief

### Use cases included in v1

1. **Capture** — film a walkthrough on a phone (or upload one / upload photos). Frames are
   sampled in the browser; nothing is sent until the user confirms.
2. **Flag** — a vision model returns the items that could be worth something, each with a
   name, a value band, a one-line reason, and a confidence.
3. **Three destinations** — every item is headed to *Keep*, *Sell*, or *Donate*
   (model-flagged items start at Sell); a toggle on every card and row moves it any time.
   Lists are grouped by destination, then room. Tap an item to open it: rename it (a wrong
   recognition is a rename), change the band, write what the family knows, add detail shots,
   remove it, or add one the model missed.
4. **Sort** — the undecided pile one item at a time: drag left donate, right keep, tap
   Sell; undo walks back one change.
5. **Exit** — one tap hands the donate list to a pickup service (deep link / `tel:`); the
   sell list is a printable summary; junk haul is a demoted link for a pile no charity takes.
6. **Sell Sheet** — from the summary, pay once to save the sell list with its photos at a
   shareable link; the page is unlocked by the Stripe webhook, never by the success URL.

### Use cases NOT included in v1

- Appraisals, certified valuations, or anything usable for insurance, tax, or probate.
- Selling anything — no marketplace, auction, or listing creation.
- Accounts. The free session lives in the browser and closing the tab loses it (stated on
  screen); the paid Sell Sheet is the only thing saved server-side, and the link is the
  only way back to it.
- Multi-person sorting (siblings voting). The sibling fight is real and out of scope.
- Booking the pickup inside the app — v1 hands off, it does not book.
- Donation pickup, shipping, or logistics of any kind.
- Server-side video processing — no ffmpeg, no uploads of raw video.
- Grief, legal, or estate guidance content.

### Surfaces involved

- **Mobile web first** — the phone is the camera, so the capture and swipe surfaces are
  designed at 480 px and must work one-handed. Desktop (1024 px) is a review layout for the
  lists and the summary.
- **In-hub route** `app/estate-sale-planner/` on MVDS, deployed with the hub (review queue
  #11). No separate Vercel project, no new secrets pipeline.

### Platforms involved

- iOS Safari and Android Chrome camera capture (`<input capture>` and `<video>` frame
  sampling to canvas).
- **OpenAI** (vision) via the hub's server routes on the hub's one synced model key,
  `OPENAI_API_KEY`; `ANTHROPIC_API_KEY` as the alternate if an environment carries it
  (review queue #30 — supersedes #6/#19).
- **Supabase** — `esp_events` (every counted tap, so the thresholds below are a query) and
  `esp_sheets` (the paid sheet); buyer emails land in the shared `experiment_submissions`.
- **Stripe** — the hub's shared key pair; this route's own webhook endpoint (review queue
  #32, Katy creates it).
- Pickup Please (donation pickup) — deep link / `tel:` only in v1; Salvation Army pickup as
  the fallback; 1-800-GOT-JUNK demoted to a "haul the rest" link.
- Vercel (hub).

## Validation Plan

### Method

A **working demo plus a fake-door exit.** Not a landing page alone — the vision pass is the
whole claim, so the test has to run it:

1. The v1 flow live on the hub, usable by anyone with a phone.
2. A **named proxy user** (review queue #10) runs it on a real house and grades the flags:
   for each *sell* item, "would I have known?" and "is the band plausible?"
3. The haul-away tap is a placeholder link that is counted before it redirects.
4. Optional, founder's call: a **$15 search burst** (elk's playbook — 3 days × $5) on
   queries like *"what to keep when cleaning out parents house"*, *"estate sale or junk
   removal"*. Agent prepares and caps; Katy creates and enables (money out).

### Traffic / sample

- The named proxy user and their family — the only sample that grades flag quality.
- Organic: one post each in r/declutter, r/estatesales, r/AskOldPeople-style threads where
  the question already recurs — posted by Katy, not the agent.
- The search burst above if approved. Target: 25 walkthrough starts in 14 days.

### Budget

- Agent sessions: Explore + Propose (this), child change artifacts, one build session after
  the MVDS gate, one measurement session. Katy's time: the Figma library toggle, env key,
  the proxy-user ask, the ads toggle if used.
- Money: $0 required; $15 ads optional; OpenAI spend bounded by the frame budget
  (≈$0.05 per walkthrough at 48 frames on gpt-5 high-detail images — see Measurement).

### Success thresholds

- **25** walkthrough starts in 14 days.
- **≥ 40 %** of starts reach the end of the swipe.
- **≥ 5** pickup taps (placeholder counted, rows in `esp_events`, `kind: donate`).
- **≥ 2** Sell Sheets paid in live mode (test-mode purchases do not count — ELK rule).
- Proxy-user grade: flags judged "would not have known" on **≥ 3** items in one house, with
  no "absurd" bands.

### Kill criteria

- **< 10** starts in 14 days *with* the search burst, or **< 5** without it.
- Proxy user overrides **> 60 %** of sell flags, or calls a band absurd on anything they
  know the value of.
- Per-walkthrough model cost cannot be held under **$1.00** with the frame budget.

### Decision point

- All thresholds met → **Build Unit 2**: sell-side referral (Permutation C) and the real
  pickup deal; re-score.
- Starts met but finish rate or taps missed → the triage UI, not the idea, is the problem;
  one iteration on the swipe surface, then re-measure.
- Flag quality killed → stop. The vision pass is the product; if it is not trustworthy on
  one real house, nothing downstream matters.

## Measurement Brief — Intent

### Success metric

Paid Sell Sheets and pickup taps per walkthrough start (the two paid moments), and sort
completion rate (the product).

### Leading indicator

**Flag acceptance** — share of *sell* flags the user leaves in *sell* rather than swiping
to keep/toss. High acceptance means the vision pass is earning trust; it is readable on the
first session, long before any tap.

### Kill criteria

Post-launch: flag override rate > 60 % sustained over 20 walkthroughs, or cost per
walkthrough above $1.00 after the frame budget is tuned.

## Score re-run

Scored on **v3** (PI/SI/BI) — the template's B/P/C/$/S table is the retired v1 form.

| Dim | Explore | Propose | Delta | Why |
|---|---|---|---|---|
| PI | 2 | 2 | 0 | No personal driver stated; nothing in Propose changes that. |
| SI | 4 | 4 | 0 | Free-for-family keeps the help where the need is. |
| BI | 3 | 3 | 0 | Referral exit chosen, but the deal is unproven — Explore already assumed this path. The Sell Sheet (revision) adds a dollar signal on rails the hub already has; it moves to 4 only on measured live purchases, not on the design. Katy's call whether the revision re-scores (review queue #18). |
| **Total** | **9/15** | **9/15** | 0 | Shape unchanged: *Mission-driven*. |
