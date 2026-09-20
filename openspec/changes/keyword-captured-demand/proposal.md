# keyword-captured-demand

## Human anchor

> "lets build the track before the train exists. the whole point is to use the real data to make educated guesses on new and improved products."
>
> "ok lets make sure we don't lose that pull, but also fold into the big join so we can look across one keyword and see all kinds of signals."
>
> "its going to be messy - don't make assumptions or edits to the things you find."

— Katy, 2026-09-20

## Outcomes

- **Who:** Katy, deciding what to make next, and whether a keyword is worth writing a listing for.
- **Job:** See, on one keyword's row, both what the market is estimated to want **and** what her shop actually captured — eRank's demand estimates beside the real visits, sales and revenue that keyword produced. Today the corpus answers "is there demand?" and cannot answer "did we get any?"
- **Done when:** `/keyword-explorer` carries a Shop column group sourced from `docs/pulls/2026-09-20-etsy-listing-stats-*`, so a keyword a buyer really typed shows the visits it drove, the listing it reached, and whether that listing sold — and a keyword nobody typed shows blank there while keeping its eRank columns.
- **Not doing:** no attribution model — a term's visits are the number Etsy reports for it, never divided, inferred or spread across listings. No normalising, spell-correcting or deduplicating captured terms. No new scraping in this change: it reads the archive already landed in #507. No Etsy API work — there is no shop-stats endpoint to call.

## Why

Every source the corpus holds today is an **estimate of a market**: eRank's Keyword Tool, Bulk Keywords and Tag Report all describe what Etsy shoppers in aggregate are searching for. Ranked and Targeting are closer to home — they say where W&H's listings *sit* — but neither says whether anyone actually arrived. The corpus can tell you `embroidery kits` is searched 2,918 times and that the shop ranks nowhere for it; it cannot tell you that `paper embriodery template` was typed once, landed on a geometric pattern, and that listing sold.

That gap is the whole point of the archive. A keyword's estimated demand is a reason to try something; captured demand is evidence it worked.

**The numbers are small and that is precisely why the join should exist now.** 151 visits, 3 sales, 11 search terms across 6 listings. Nothing here supports a confident conclusion — but Etsy's stats pages are **rolling windows that keep no history**, so every period that passes uncaptured is gone permanently. Building the join while the data is thin means that when volume arrives there is already a series to read, rather than a first data point.

**There is already a signal worth testing.** Geometric designs hold 3 of the top 4 listings by traffic; both $6.00 sales are geometric; and the terms buyers actually typed agree — `hand embroidery pdf geometric`, `geometric hand embroidery patterns`, `modern minimalist embroidery pattern`. That is a product hypothesis drawn from captured demand rather than from eRank, and it is exactly the kind of guess this change exists to support.

## What changes

**A sixth source joins the merged row.** `scripts/ingest-pulls.py` gains a reader for the landed listing-stats archive. Each captured search term becomes a `shop_search` sub-object on the row for that keyword, carrying the visits Etsy attributed to the term, its Etsy-vs-Google split when the export provides one, and the listing it reached — listing id, title, and that listing's own visits, items sold and revenue. Matching uses the same case-insensitive exact-text rule every other source uses, so a captured term with no eRank row still gets a row, exactly as a Ranked-only term does today.

**The table gains a Shop band.** One more column group beside the existing five, rendering blank when a keyword has no captured demand — which will be almost every row, and is the honest state.

**Messiness is carried, not cleaned.** A captured term is stored as typed. `paper embriodery template` stays misspelled, and does not merge with `paper embroidery template`, because Etsy counts them separately and the misspelling is a real, low-competition term. The reader parses the archive's verbatim rows and must handle **both table shapes** the export uses — 2-column (`Search terms | Visits`) and 4-column (`Search terms | Etsy | Google, etc. | Total visits`). A parser that assumes one shape silently matches nothing on the other; that failure already happened once and cost 7 of 11 terms while reporting success.

**Every column hugs its contents, and none wraps.** Katy, 2026-09-20: *"make each column hug its contents without wrapping so we can see as much as possible."* Today all columns but one already do — `w-[1%]` + `whitespace-nowrap` is the hug pattern — but `Keyword` carries `grow: true` → `w-full`, so it absorbs every pixel of surplus and pushes the rest of the table right. That special case goes; the `grow` flag is removed entirely rather than moved to another column. The `<table>` itself changes from `w-full` to `w-auto min-w-full`, so it sizes to its content but still fills the viewport when the content is narrower — with every column at `w-[1%]` and the table still forced to `w-full`, the browser would redistribute surplus proportionally and nothing would hug at all.

**Width is not a problem to be solved here.** Katy, 2026-09-20: *"This is literally a Big Join. I don't want to edit down or hide columns right now."* The table is wide because it is showing everything, which is the point — hugging exists to waste no space, not to make the table narrow. Nothing is capped, truncated, hidden behind a toggle, or moved off the table. `Found via` stays the widest column by a wide margin, carrying strings such as `christmas embroidery (1), embroidery designs (4), embroidery font (28), embroidery fonts (29), font bundle (7), holiday hoop art (1)` in full. Horizontal scroll is the accepted cost of seeing every signal on one row.

**Listing-level outcome is attached, and labelled as listing-level.** A term's row carries its listing's sales and revenue so the two are visible together, but those belong to the listing, not to the term — one visit from `paper embriodery template` did not itself generate $6.00. The spec names this distinction so the table cannot be read as an attribution claim.

## Capabilities

### New Capabilities

- `captured-demand`: real Etsy search terms, with the visits they drove and the listing they reached, joined onto the keyword row by the same exact-text rule as every other source — stored verbatim, never normalised, and never divided across listings.

### Modified Capabilities

- `keyword-explorer`: the table gains a Shop column group for captured demand, blank for keywords no buyer has typed.

## Impact

- **New:** a listing-stats reader in `scripts/ingest-pulls.py`; a `shopSearch` sub-object on the merged row; one more column group on `KeywordTable`.
- **Changed:** every column hugs its contents — the `grow` flag is removed from the column spec and the table moves from `w-full` to `w-auto min-w-full`.
- **Unchanged:** the `docs/pulls/` archive and its conventions; the exact-text matching rule; the never-fabricate-a-zero rule; every existing source's behaviour.
- **Settled:** the Shop band shows everything it has — visits, the Etsy/Google split, the listing it reached, and that listing's sold and revenue. Nothing is dropped to save width, per the Big Join rule above.
- **Open before `design.md`:** whether a captured term with no eRank data sorts into the table by default or needs the Source filter.
- **Carried forward, and now load-bearing:** the Keyword column is not sticky, so scrolling right leaves rows unidentifiable (`keyword-explorer-unified-view` § tasks 4.3b). Since this change deliberately makes the table wider rather than narrower, that finding stops being cosmetic — a sticky Keyword column is the mitigation the Big Join rule implies, and it needs its own numbered Figma round.
- **Related:** #507 landed the archive this change reads. A cadence for re-running the pull is deliberately out of scope — it is a process question, not a schema one, and this change works on one capture or twenty.

## Optional links

- [`docs/pulls/2026-09-20-etsy-listing-stats.md`](../../../docs/pulls/2026-09-20-etsy-listing-stats.md) — the pull, its provenance and its parsing hazards
- PR #507 — the landed archive
