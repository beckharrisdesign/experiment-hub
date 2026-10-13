# Propose — Estate Sale Planner

> Second phase artifact on the parent `bhd-experiment` change. Drafted autonomously;
> every call below that is the founder's to make is mirrored in
> [`experiments/estate-sale-planner/docs/review-queue.md`](../../../experiments/estate-sale-planner/docs/review-queue.md).
>
> **Stores:** Business Patterns / Service Patterns / BHD Ecosystem stores are "pending" per
> `openspec/schemas/bhd-experiment/README.md` and do not exist. Nearest in-repo pattern is
> `etsy-listing-kit` (one input → one transformation → one paid exit), which this follows
> with the exit moved from a Stripe charge to a referral.

## Business Brief

### Monetization model

**Affiliate / referral — free for the family.** Decided before pricing, per the rule.

The family pays nothing in v1. The paid moment is the **haul-away tap** at the end of the
sort (1-800-GOT-JUNK first; a generic "find a hauler" fallback where it does not operate).
The sell-side referral (estate-sale companies, consignment, MaxSold-style auctions —
Explore Permutation C) is the second exit and is deliberately **not** in v1.

Why not charge the family: the person using this is grieving, time-poor, and about to spend
real money on either a crew or a truck. A $5 paywall in front of "what's worth keeping" is
a worse product *and* a worse test — it measures willingness to pay for a report, when the
question is whether triage changes what they do next. The referral exit measures that.

Honest cost of this choice: it makes revenue depend on a partner deal that does not exist
yet (review queue #7). The validation plan is built so the signal is readable *before* that
deal is real — a tap on a placeholder link still counts.

### Pricing

None to the family in v1. Referral economics are the partner's published rate once a deal
exists; the placeholder records intent only.

### SKUs / tiers

None. One flow.

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
3. **Two lists** — *Sell* (flagged) and *Keep / Toss* (everything else), grouped by room.
4. **Swipe** — keep or toss, one item at a time; undo the last swipe; sell items can be
   moved to keep or toss.
5. **Exit** — one tap hands the toss list to a haul-away service (deep link / `tel:`); the
   sell list is shown as a printable summary.

### Use cases NOT included in v1

- Appraisals, certified valuations, or anything usable for insurance, tax, or probate.
- Selling anything — no marketplace, auction, or listing creation.
- Accounts, saved sessions across devices, or family sharing. A session lives in the
  browser; closing the tab loses it (stated on screen).
- Multi-person sorting (siblings voting). The sibling fight is real and out of scope.
- Booking the haul-away inside the app — v1 hands off, it does not book.
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
- Anthropic API (vision) via the hub's server routes — `ANTHROPIC_API_KEY` is not yet in
  `.env.example` (review queue #6).
- 1-800-GOT-JUNK — deep link / `tel:` only in v1.
- Vercel (hub), Supabase only if a sharable summary link is added later (not v1).

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
- Money: $0 required; $15 ads optional; Anthropic API spend bounded by the frame budget
  (target < $0.50 per walkthrough — see Measurement).

### Success thresholds

- **25** walkthrough starts in 14 days.
- **≥ 40 %** of starts reach the end of the swipe.
- **≥ 5** haul-away taps (placeholder counted).
- Proxy-user grade: flags judged "would not have known" on **≥ 3** items in one house, with
  no "absurd" bands.

### Kill criteria

- **< 10** starts in 14 days *with* the search burst, or **< 5** without it.
- Proxy user overrides **> 60 %** of sell flags, or calls a band absurd on anything they
  know the value of.
- Per-walkthrough model cost cannot be held under **$1.00** with the frame budget.

### Decision point

- All thresholds met → **Build Unit 2**: sell-side referral (Permutation C) and the real
  haul-away deal; re-score.
- Starts met but finish rate or taps missed → the triage UI, not the idea, is the problem;
  one iteration on the swipe surface, then re-measure.
- Flag quality killed → stop. The vision pass is the product; if it is not trustworthy on
  one real house, nothing downstream matters.

## Measurement Brief — Intent

### Success metric

Haul-away taps per walkthrough start (the exit is the business), and sort completion rate
(the product).

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
| BI | 3 | 3 | 0 | Referral exit chosen, but the deal is unproven — Explore already assumed this path. Moves to 4 only with a signed partner or a measured tap rate. |
| **Total** | **9/15** | **9/15** | 0 | Shape unchanged: *Mission-driven*. |
