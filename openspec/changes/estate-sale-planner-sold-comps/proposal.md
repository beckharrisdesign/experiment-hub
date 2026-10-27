# Proposal: estate-sale-planner-sold-comps

> Follow-on build change for Estate Sale Planner (parent `openspec/changes/estate-sale-planner/`,
> schema `bhd-experiment`; v1 shipped under `estate-sale-planner-build`). Code ships here.
>
> **Order inside this change:** correct the item first, then look up its price. A lookup only
> runs on an item the family has confirmed.

## Human anchor

> "the confidence and price ranges are wildly optimistic."
>
> "I like the lookup step, but would want to think through how to reduce the initial cost."
>
> "what if the image is of three separate items? what if the user needs to split out the image
> or adjust what we've determined is the subject of the image?"
>
> — Katy, 2026-10-27 (phone testing round 05a, the model-call review, then the round-02 board)

## Outcomes

- **Who:** Katy, testing on real houses first; then the adult child clearing a parent's house
  (proxy, nobody named yet — review queue #10).
- **Job:** Make sure the app is pricing the right thing, then know what it actually sells for,
  from real sales instead of a model's guess from memory.
- **Done when:**
  - From any item, the family can open the photo it came from, see the box the model drew, and
    **adjust** it, **split** it into separate items, **merge** items or mark them as **one lot**,
    or **draw a box** around something the model missed. Each correction gets a fresh read of
    the new crop.
  - An item flagged for Sell at $100 or more, once confirmed, shows a band set from real sold
    listings, how many sales it rests on, and links to a few of them.
  - The same item seen again is answered from our own saved results without a paid lookup.
  - Every model call and lookup records what it cost.
- **Not doing:** Licensing a price database (WorthPoint, LiveAuctioneers, Invaluable — none
  publish a license; revisit with users). Training or hosting a pricing model (nothing usable
  exists on Hugging Face). Object outlines / segmentation (round 05 #48 stays roadmap; boxes
  are enough to correct a subject). Cloud photo storage and accounts (05b). Lookups for items
  under $100, Keep, Donate, or unconfirmed items. Any upsell (review queue #58).

## Why

Two problems, one cause underneath: the app trusts its first look.

**The subject can be wrong.** One photo already becomes several items — the model returns one
item per object with a box around it. But it can merge three vases into one, crop the table
instead of the clock on it, or miss the lamp in the corner, and today the family cannot fix
any of that. Rename, change the band, remove, or type a missed item with no picture: that is
all. The photos are dropped after the walkthrough pass and only 320 px thumbnails are kept, so
there is nothing to re-crop from. Round 05 planned recropping (#47) but put it behind accounts
and cloud storage.

**The price is a memory.** The walkthrough prices from what the model remembers, so it prices a
perfect example. Round 05a made the guess humbler (review queue #55); only real sold prices
make it true.

They have to be fixed in this order. A lookup on the wrong subject buys the wrong comps and
shows a confidently wrong band. Fixing the subject first is also the cheapest cost control
there is: a mistake caught before the lookup never costs one. The rest of the cost lever is
the gate and the cache — most of a house is under $25 and never needs a lookup, a room yields
two to five items worth checking, and many repeat across houses (Pyrex, cast iron, a mixer).

## What changes

**Part 1 — correct the item**

- **Keep the original photos on the device.** Each walkthrough photo is kept at 1600 px in the
  browser's IndexedDB, linked from its items, until accounts and cloud storage arrive (05b).
  This is the device half of round 05 #47, pulled forward.
- **Source photo on every item.** The item screen opens the photo it came from with its box
  drawn on it.
- **Adjust, split, merge, lot, add.** On the source photo: drag the box to fit (adjust); draw a
  box per object to turn one item into several (split); select items to combine, or mark them
  as one lot ("Set of 6 Pyrex bowls"); draw a box around something missed to make a new item
  with a picture (add). Each correction sends the new crop through the existing re-read, so the
  name, band and reason follow the subject.
- **Confirm.** An item becomes *confirmed* when the family corrects it or taps **Looks right**.
  Confirmation is part of the lookup gate.

**Part 2 — look up its price**

- **The gate.** Only confirmed items, flagged for Sell, at a band of $100 or more get a lookup.
  Everything else keeps the model's band, labelled as a guess.
- **A search name, not a description.** The walkthrough (and each re-read) returns the short
  query a reseller would type ("Lodge cast iron skillet No. 8"; a lot gets a lot query).
- **One lookup per item, through an adapter.** A sold-listings provider behind one interface,
  starting with a third-party eBay sold-listings API on its entry plan (CompsAPI first; others
  are a config swap). Server-side with the hub's key; the phone never sees it.
- **Our own comps store.** Every lookup is saved in Supabase under the normalized query with
  the sold prices, dates, titles and links. A repeat query inside the freshness window costs
  nothing. Over time this is the price database we cannot buy today.
- **The model reads the comps.** A short text-only call drops comps that are not the same
  object, sets the band from what is left, and returns the ones it kept, so the item shows
  "Based on 7 sold, $40–$85" with links. Too few matching sales → the band stays a labelled
  guess.
- **Cost logging.** Token usage from every model call and the price of every lookup go to a
  Supabase row per call, so a room's cost is a query, not a guess.
- **In parallel, not code:** apply for eBay's own sold-price API (Marketplace Insights). If
  granted, it replaces the third-party provider behind the same adapter.

## Capabilities

### New Capabilities

- `item-correction`: original photos kept on the device, the source-photo view, adjust / split
  / merge / lot / add-from-photo with a re-read of each new crop, and the confirmed state.
- `sold-comps-lookup`: the gate, cached sold-listings lookups, the comps store, setting the
  band from matching sales with the sales cited, and the per-call cost ledger for every model
  call and lookup.

### Modified Capabilities

- The walkthrough pass (`lib/estate-sale-planner/flag.ts`) and the re-read (`refine.ts`) return
  a search query. Items carry a photo reference, a lot flag and a confirmed flag. The item
  screen gains the source photo, the correction tools and the comps line. Bands without comps
  read as a guess.

## Impact

- **Code:** `lib/estate-sale-planner/` (photo store on IndexedDB, session model for photo
  refs / lots / confirmed, a `comps/` adapter, store and gate, `flag.ts` and `refine.ts`
  schemas); `app/estate-sale-planner/` (source-photo view with box editing, `ItemDetail`,
  `ItemCard`, the comps line); `app/estate-sale-planner/api/` (comps, inside an existing route
  or its own — design decides).
- **Device storage:** about 250–400 KB per kept photo; a 48-photo room is ~15 MB of IndexedDB.
  Design sets a cap and what happens at quota (oldest sale's originals go first; thumbnails
  and corrections stay).
- **Data:** migration `019` — `esp_comps` (query, provider, fetched_at, results) and
  `esp_costs` (call kind, model or provider, tokens, cents, session). Service-role only, RLS on,
  like `esp_events` (016). No photos leave the device in this change.
- **MVDS:** no crop or box-editing component exists — a composition on MVDS tokens with pointer
  events, logged as an MVDS hand-off.
- **Keys:** one new server key for the provider (`.env.example` entry with provenance; Katy
  adds the value). Nothing in the browser.
- **Cost, at entry-plan prices (vendor-stated, to confirm):** about 5 lookups a room, fewer as
  the store fills and fewer again because only confirmed items qualify; CompsAPI's $9 / month
  plan covers ~5,000 lookups. Each correction is one re-read call, the same as a detail shot
  today.
- **Risk:** third-party eBay data is scraped; acceptable while validating, revisit before any
  paid tier. Vendors report wrong-item matches, which is why the model filters comps against
  the confirmed item before they set a band.
- **Round 05:** supersedes the device half of #47 (originals on device, recrop, make-an-item);
  #47's cloud half and #48 (outlines) stay where they are.
- **Review queue:** new rows for the gate threshold, what counts as confirmed, the photo-storage
  cap, provider choice, freshness window, and the minimum number of matching sales.

## Optional links

- Experiment directory: `experiments/estate-sale-planner/`
- Parent change: `openspec/changes/estate-sale-planner/`
- v1 build: `openspec/changes/estate-sale-planner-build/`
- Round 05 proposal (recrop #47, outlines #48): `experiments/estate-sale-planner/docs/round-05-proposal.md`
- Review queue: `experiments/estate-sale-planner/docs/review-queue.md` (#55 band anchor, #58 no upsells)
- Figma, FigJam board titled with the change ID, one page per round: <https://www.figma.com/board/jOMdrrP5xLfaR1Yf7qfVdA>
  - Page `02 Proposed — flow` (page `0:1`): the first lookup flow (gate, comps store, comps
    pass, cost ledger).
  - Page `03 Proposed — correct, then look up` (page `8:207`): the confirm step between the
    vision model and the gate.
