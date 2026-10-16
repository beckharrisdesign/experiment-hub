# Explore — Estate Sale Planner

> Parent experiment change (`schema: bhd-experiment`). Code ships via the child change
> `estate-sale-planner-build` (`schema: experiment-hub-lite`), per `rules/bhd-experiment.mdc`.
>
> **Classification: commercial** — a product with a monetization question, not a utility.
> Source: a newsletter brief ("The estate sale planner", 2026-10-13), brought in by the
> founder: *"I liked this idea of the day today. Let's try another autonomous build
> using MVDS."*
>
> **Autonomous build.** Consequential defaults are logged in
> [`experiments/estate-sale-planner/docs/review-queue.md`](../../../experiments/estate-sale-planner/docs/review-queue.md)
> and none is approved until the founder says so. Precedent: `etsy-listing-kit`
> (`docs/REVIEW_QUEUE.md`).
>
> **Stores:** `openspec/config.yaml` names no Soul / Goals paths and `docs/founder/` does not
> exist. Noted and continuing with template placeholders, per the rule.

## Hypothesis

If an adult child clearing a parent's house can film a phone walkthrough and, within
minutes, get back a short list of *what might be worth something* and a one-decision-at-a-time
way to sort the rest, they will finish the sort instead of guessing — and the haul-away call
at the end is the moment they are most willing to pay or be referred.

The bet is that the bottleneck is not labor or logistics (both are purchasable). It is
**not knowing** — "is that lamp $20 or $2,000?" — and that a cheap, confident-enough vision
pass plus a decisive UI beats both guessing and a clean-out crew that hauls the good stuff
out with the junk.

## Why this matters

### Personal

Not stated by the founder beyond liking the idea. Recorded honestly: this is a
once-or-twice-in-a-lifetime problem, not a daily one, so the Personal Impact score below is
low by construction and not a judgement on the idea. If there is a personal driver (a family
clear-out in view, or one already done), it belongs here and would move PI.

### Strategic

**Open — not defaulted.** Rule: prompt if blank; do not pick a theme to flatter the score.

Candidate reading for when it is picked up: **neurodiversity** is the closest fit. The
founder's own framing of the hub is fast-arriving ideas and executive-function tooling
(`exec-function-assessment`); a grieving, overwhelmed person facing a house full of decisions
is executive function under the worst conditions, and "one swipe at a time" is that lens
applied to a clear-out. **Environment** is the secondary reading — keeping good objects out
of landfill is a real externality of the haul-away default.

## Who it's for

**Proxy mode.** The primary user is the adult child — Gen X / Millennial, a busy parent with
their own job and kids — who has become the de facto executor of a parent's house and has
to sort it while grieving. The founder is not the user.

Rule: name the specific person you are committed to. **Nobody is named yet** — logged in the
review queue. The experiment should not ship past Validating without one real person on the
other end of it.

## What it does

1. **Film a walkthrough on a phone.** Room by room, no setup. Frames are sampled from the
   video in the browser (no server-side video pipeline) — photos work as a fallback.
2. **A vision model flags anything that could be worth something.** Each flagged item gets a
   name, a rough value band, and a one-line reason ("mid-century teak sideboard, these resell").
3. **Two lists come back.** *Sell* (flagged, with bands) and *Keep / Toss* (everything else,
   grouped by room).
4. **Swipe to decide.** One item at a time, keep or toss — the sell list can be swept into
   keep/toss too. No forms.
5. **One tap to clear the rest.** When the toss list is done, a single call-to-action hands
   it to a haul-away service (1-800-GOT-JUNK as the first partner; affiliate deal to be set up).

## What it does NOT do

- **Not an appraisal.** Value bands are a vision model's guess with a stated confidence —
  never a certified valuation, never advice for insurance, tax, or probate.
- No marketplace, auction, or listing. It does not sell anything for you.
- No accounts in v1 — a session lives in the browser; a sharable link at most.
- No multi-user / family collaboration in v1 (the sibling fight is real, and out of scope).
- No actual haul-away booking integration — the CTA is a deep link / tel: with an affiliate
  placeholder until a deal exists.
- No inventory-for-insurance, no shipping, no donation pickup scheduling.
- No server-side video processing (ffmpeg) — frames are sampled client-side.
- No legal, estate, or grief content.

## Existing options

| Product | Price | Strength | Limitation |
|---|---|---|---|
| Estate sale company | 30–50% commission | Does everything, including pricing | Only takes houses worth their time; family still has to pre-sort; weeks of lead time |
| MaxSold / EBTH (online estate auctions) | Commission + fees | Reaches buyers; handles the sell side | Sell-side only; you still have to know what to put up |
| 1-800-GOT-JUNK and clean-out crews | $150–$800+ per load | Fast; one call | The failure mode in the hypothesis — hauls the good stuff with the junk |
| Google Lens / eBay sold listings | Free | Best single-item price check there is | One item at a time, no triage, no decision flow |
| WorthPoint | ~$30/mo | Deep sold-price archive for antiques | Expert tool; not for a grieving executor on a Saturday |
| Sortly and inventory apps | Freemium | Cataloguing | No value signal, no decisions, heavy data entry |
| Books (Swedish Death Cleaning, etc.) | $15 | The emotional framing is right | Not a tool |

Honest read: the real incumbent is **guessing, then calling the junk truck**. The product has
to beat that — fast and decisive — not beat WorthPoint on accuracy.

## Market analysis

**Tailwind, not TAM.** The brief cites Cerulli Associates / Visa Business &
Economic Insights (via Walnut): roughly **$106T** to be inherited through 2048 (Boomers $6T,
Gen X $39T, Millennials $46T, Gen Z $15T), "and a lot of it is houses full of stuff."

TAM/SAM bands: **unknown.** Per `rules/market-research-template.mdc`, bottom-up or nothing —
and no bottom-up count has been done. Signals that a bottom-up would start from: estate sale
company counts, haul-away affiliate rates, and search volume for "what is worth keeping
estate". That belongs in `experiments/estate-sale-planner/docs/market-research.md`, not here.

## Final scorecard

> Scored on **v3** (`rules/scoring-criteria.mdc`, 2026-08 — PI/SI/BI, 1–5, total /15). The
> template table above this file's revision was the retired v1 form; same issue the
> generative-sandbox explore noted.

| Dim | Score | Reasoning |
|---|---|---|
| PI — Personal Impact | 2/5 | "Solves a rare problem, would use rarely." A clear-out is a once-or-twice event. Moves to 3–4 only if there is a personal driver the founder has not stated. |
| SI — Social Impact | 4/5 | "Important need, meaningful." Grieving families making irreversible decisions under pressure, and good objects going to landfill. Not a 5 — it is a convenience in a hard moment, not a critical need. |
| BI — Business Impact | 3/5 | "Real demand signals; competitive but viable." The wealth-transfer tailwind is real, haul-away and estate-sale referrals already pay, and no incumbent does triage. But the differentiation rests on a vision model everyone has, and the paying party (family vs. haul-away partner) is unproven. |
| **Total** | **9/15** | |

**Score shape:** *Mission-driven* — SI leads, BI is the swing. If the referral economics
work (Permutation C), this becomes a Strong-go; if families won't pay and partners won't
refer, it is a weekend tool.

## Permutations

### Permutation A: Walkthrough triage with a haul-away exit — **chosen**

- **What changes:** Nothing from the scope above. Film → flag → two lists → swipe → one tap.
- **Projected scorecard:** PI:2 SI:4 BI:3 = 9/15, shape: Mission-driven
- **Trade-offs:** The vision pass is the whole demo and the whole risk — if the flags are
  wrong often enough, the family stops trusting the sell list and the product collapses
  into Permutation B. Needs frame sampling in the browser, which is fiddly but has no
  server cost.
- **Verdict:** chosen
- **Reasoning:** It is the only version that addresses the stated failure — good stuff
  hauled with junk — end to end, and it has a natural paid moment (the haul-away CTA) that
  the other two lack.

### Permutation B: Point-and-price ("is that lamp $20 or $2,000?")

- **What changes:** Single-item camera check. No walkthrough, no lists, no swipe. Value band
  + one line of reasoning.
- **Projected scorecard:** PI:2 SI:3 BI:2 = 7/15, shape: Cheap-and-useful
- **Trade-offs:** Cheapest to build and the most honest test of the vision model. But it is
  Google Lens with a nicer answer — crowded, and it leaves the family with the same pile.
- **Verdict:** rejected (as v1) — it is the atom inside A, and A's flag step *is* this.
- **Reasoning:** The job is "clear the house," not "price the lamp." B answers a question;
  A gets someone to the end of a Saturday.

### Permutation C: Sell-side referral network

- **What changes:** The *sell* list is handed to local estate-sale companies, consignment, or
  MaxSold-style auctions, with a referral fee on the other side too. Two paid exits instead
  of one.
- **Projected scorecard:** PI:2 SI:4 BI:4 = 10/15, shape: Strong-go
- **Trade-offs:** Highest score, and the most plausible business — but it needs a supply side
  (partners who want the leads) before a single family has used it.
- **Verdict:** rejected (for v1), **recorded as the Propose-phase monetization direction**
- **Reasoning:** A two-sided referral product with zero demand evidence is a classic way to
  build two things and validate neither. Ship A, measure whether families finish the sort
  and tap the exit, then add the sell-side partner. Noting that the higher score does not
  win here, and why.

## Open questions

1. **Strategic Why** — open; candidate reading recorded above.
2. **Named proxy user** — nobody yet. Who is the real person with a house to clear?
3. **Who pays** — the family (one-time fee for the report?) or the partner (per-referral)?
   Propose decides; Explore's BI assumes the latter is the stronger path.
4. **Vision model and cost ceiling per walkthrough** — frames × model call; a 10-minute
   walkthrough at one frame every 3 s is ~200 frames. Needs a sampling/dedupe strategy
   before it is affordable. Build-change concern, flagged here because it bounds the demo.
5. **Affiliate reality** — "You'd set up an affiliate deal of course" is an assumption in
   the source brief. 1-800-GOT-JUNK's referral programme terms are unverified.
