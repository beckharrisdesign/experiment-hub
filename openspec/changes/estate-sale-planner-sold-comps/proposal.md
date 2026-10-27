# Proposal: estate-sale-planner-sold-comps

> Follow-on build change for Estate Sale Planner (parent `openspec/changes/estate-sale-planner/`,
> schema `bhd-experiment`; v1 shipped under `estate-sale-planner-build`). Code ships here.

## Human anchor

> "the confidence and price ranges are wildly optimistic."
>
> "I like the lookup step, but would want to think through how to reduce the initial cost."
>
> — Katy, 2026-10-27 (phone testing round 05a, then the model-call review)

## Outcomes

- **Who:** Katy, testing on real houses first; then the adult child clearing a parent's house
  (proxy, nobody named yet — review queue #10).
- **Job:** Know what an item on the Sell list actually sells for, from real sales, instead of a
  model's guess from memory.
- **Done when:** An item the walkthrough flags at $100 or more shows a value band set from real
  sold listings, with how many sales it rests on and links to a few of them; the same item seen
  again is answered from our own saved results without a paid lookup; and every model call and
  lookup records what it cost.
- **Not doing:** Licensing a price database (WorthPoint, LiveAuctioneers, Invaluable — none
  publish a license; revisit with users). Training or hosting a pricing model (nothing usable
  exists on Hugging Face). Lookups for items under $100, Keep, or Donate. Any upsell or paid
  tier (review queue #58). Auction-house or Etsy prices.

## Why

The walkthrough prices from what the model remembers, so it prices a perfect example in good
condition. Round 05a anchored the prompt to a used-sale price and capped confidence without a
legible mark (review queue #55), but that only makes the guess humbler; it does not make it
true. Real sold prices are the only thing that does.

They are cheap if we are careful about *when* we ask. Most of a house is under $25 and never
needs a lookup. A room produces two to five items worth checking, and many of them repeat
across houses — Pyrex, cast iron, a KitchenAid mixer. So the cost lever is the gate and the
cache, not the vendor: look up only what could matter, once, and keep the answer.

## What changes

- **The gate.** After the walkthrough pass, only items flagged for Sell at a band of $100 or
  more get a lookup. Everything else keeps the model's band, labelled as a guess.
- **A search name, not a description.** The walkthrough returns, per gated item, the short query
  a reseller would type ("Lodge cast iron skillet No. 8"), so one lookup is enough.
- **One lookup per item, through an adapter.** A sold-listings provider behind one interface,
  starting with a third-party eBay sold-listings API on its entry plan (CompsAPI first; others
  are a config swap). Lookups run server-side with the hub's key; the phone never sees it.
- **Our own comps store.** Every lookup is saved in Supabase under the normalized query, with
  the sold prices, dates, titles and links it returned. A repeat query inside the freshness
  window is answered from the store and costs nothing. Over time this is the price database we
  cannot buy today.
- **The model reads the comps.** A short second call (text only, no images) gets the item and
  its comps, drops the ones that are not the same object, and sets the band from what is left.
  It returns which comps it kept, so the item can show "Based on 7 sold, $40–$85" with links.
  Too few matching sales → the band stays the model's guess and says so.
- **Cost logging.** Token usage from every model call and the price of every lookup go to a
  Supabase row per call, so a room's cost is a query, not a guess.
- **In parallel, not code:** apply for eBay's own sold-price API (Marketplace Insights). It is
  invite-only; if granted it replaces the third-party provider behind the same adapter.

## Capabilities

### New Capabilities

- `sold-comps-lookup`: gated, cached sold-listings lookups for flagged Sell items, the comps
  store, and setting the band from matching sales with the sales cited.
- `vision-cost-ledger`: a per-call record of model tokens and lookup price for every
  walkthrough, re-read and comps call.

### Modified Capabilities

- The walkthrough pass (`lib/estate-sale-planner/flag.ts`) returns a search query for gated
  items. The item screen shows the comps line. Bands without comps read as a guess.

## Impact

- **Code:** `lib/estate-sale-planner/` (new `comps/` adapter, store, gate; `flag.ts` schema),
  `app/estate-sale-planner/api/` (comps runs inside the flag request or as its own route —
  design decides), `ItemDetail.tsx` / `ItemCard.tsx` for the comps line.
- **Data:** migration `019` — `esp_comps` (query, provider, fetched_at, results) and
  `esp_costs` (call kind, model or provider, tokens, cents, session). Service-role only, RLS on,
  like `esp_events` (016).
- **Keys:** one new server key for the provider (`.env.example` entry with provenance; Katy
  adds the value). Nothing in the browser.
- **Cost, at entry-plan prices (vendor-stated, to confirm):** about 5 lookups a room, fewer as
  the store fills; CompsAPI's $9 / month plan covers ~5,000 lookups (~1,000 rooms). The comps
  call is text-only and small.
- **Risk:** third-party eBay data is scraped; acceptable while validating, revisit before any
  paid tier. Vendors report wrong-item matches, which is why the model filters comps against
  the item before they set a band.
- **Review queue:** new rows for the gate threshold, provider choice, freshness window, and the
  minimum number of matching sales.

## Optional links

- Experiment directory: `experiments/estate-sale-planner/`
- Parent change: `openspec/changes/estate-sale-planner/`
- v1 build: `openspec/changes/estate-sale-planner-build/`
- Review queue: `experiments/estate-sale-planner/docs/review-queue.md` (#55 band anchor, #58 no upsells)
- Figma round `02 Proposed — flow` (FigJam board, file titled with the change ID): <https://www.figma.com/board/jOMdrrP5xLfaR1Yf7qfVdA> — the gate, the comps store, the comps pass and the cost ledger as one flowchart. The board's page still carries FigJam's default name; rename it `02 Proposed — flow` when the board is opened (agents can't name pages from `generate_diagram`).
