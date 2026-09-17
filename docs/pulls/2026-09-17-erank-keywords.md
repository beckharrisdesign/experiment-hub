---
source: erank
surface: keywords
captured: 2026-09-17
tier: external
scope: market
measures: [demand]
subjects: [patterns, holiday, grandma-hobbies]
half_life: 90d
answers: >-
  Marketwide demand and difficulty for terms W&H does not use. Contains trend spikes that decay far faster than the stated half-life — see the guardrail section.
---
# Data pull — eRank Keyword Tool, 10 seeds, captured 2026-09-17

**Provenance:** eRank Keyword Tool exports, 2026-09-17, ten seeds from Katy’s own thought experiments, captured in two batches the same day. **Batch 1, adjacent markets:** `paint by numbers`, `halloween`, `pokemon`, `poster`, `wall art` (65 rows). **Batch 2, the shop’s own category:** `embroidery designs`, `embroidery fonts`, `embroidery font`, `font bundle`, `procreate brushes` (18 rows). **83 data rows across ten CSVs**, kept alongside as `2026-09-17-erank-keywords-<seed>.csv` — small enough to keep in-repo. Archive copies flat in `Drive: W+H Listings/W+H Data Pulls/`.

**Batch 2 is the important one**, and §0 is the finding of the whole capture.

**What surface this is:** eRank's **third** instrument, and the first that is *marketwide and outside the shop's own vocabulary*. [The tag report](2026-09-15-erank.md) scores tags W&H already uses; [Spotted on Etsy](2026-09-17-erank-spotted-on-etsy.md) reports where W&H listings rank. This one reports demand for terms the shop has never touched. Read it as market reconnaissance, not as a to-do list — most of these rows describe products W&H does not make.

> **Known gap:** these ten seeds were exported ad hoc and more exports exist in Katy’s Downloads that have never reached the record. Only what is in this directory counts as captured.

## 0. The category finding — read this before the rest

Seeding **`embroidery designs`** — one of W&H's own tags, and 7.1K average searches per [the tag report](2026-09-15-erank.md) — returned **four rows**:

| Keyword | Searches | KD | On topic? |
|---|---|---|---|
| `gilmore girls` | 3,134 | 31 | No — Warner Bros. trademark |
| `pikachu` | 3,114 | 50 | No — Pokémon trademark |
| `embroidery fonts` | 3,928 | 54 | **Machine embroidery** |
| `embroidery font` | 2,475 | 64 | **Machine embroidery** |

For comparison, seeding `pokemon` returned 36 rows and `wall art` returned 10. The shop's own category returned four, **two of which are unrelated trademarks and two of which describe a different product**.

**The hypothesis this raises:** `embroidery` on Etsy is dominated by **machine** embroidery. "Embroidery fonts" are digitised alphabet files (PES/DST/JEF) that run on a Brother or Janome — not hand-stitch PDFs. If the volume behind `embroidery designs` (7.1K) and `embroidery patterns` belongs mostly to machine embroiderers, then W&H's core category tag is **borrowed from an adjacent, much larger market that wants a different product on a different device.**

That single hypothesis would explain every unexplained result in the ecosystem at once:

- ranking **page 1 position 1** on `calm stitching` while converting nothing ([Spotted on Etsy](2026-09-17-erank-spotted-on-etsy.md));
- `digital products` drawing 28 ad impressions and **0 clicks**;
- eRank's difficulty scores reading wrong for these listings — they score a market the shop is adjacent to, not in;
- three sales in a quarter against 127 views/30d.

**It is a hypothesis, not a finding, and the export has a confound:** these returns look filtered or capped (the `procreate brushes` seed came back with two rows, one of them `ghibli`), so a thin result may be an export artifact rather than a thin market. **Do not restructure the shop on this.** Test it directly — see the batches in §4 — before it becomes a premise.

**The capability note that makes this actionable rather than merely alarming:** `experiments/svg-to-stitch` already writes **DST and EXP** — the two machine-embroidery interchange formats — from SVG, with `fill.ts`, `satin.ts` and `ribbon.ts` now built past the original intent doc's non-goals. If the demand really is on the machine side, the shop is one product decision away from serving it with assets it already owns.

## 1. The guardrail


**Of the ten lowest-KD terms across all ten files, all ten are trademarks.** (Every one scores KD ≤ 9; the lowest in batch 2 is `kpop demon hunters` at 11, so adding those five seeds did not displace any of them.)

| Term | Avg searches | KD | Rights holder |
|---|---|---|---|
| `piplup`, `mimikyu`, `sylveon`, `pokemon binder` | 1.5–4.1K | 1 | Nintendo / The Pokémon Company |
| `la la land poster` | 1,588 | 1 | Lionsgate |
| `hacky sack` | 2,038 | 1 | Wham-O (the generic term is *footbag*) |
| `gengar` | 6,075 | 4 | The Pokémon Company |
| `minecraft` | 13,347 | 5 | Microsoft / Mojang |
| `leafeon` | 1,618 | 5 | The Pokémon Company |
| `kirby` | 8,282 | 9 | Nintendo / HAL |

This is the most important thing in the capture, and it generalises past these files: **on Etsy, a very low difficulty score against high search volume is frequently measuring legal exposure rather than opportunity.** Competition is thin on `mimikyu` because listings get removed, not because the idea is unclaimed. `minecraft` at 13.3K searches and KD 5 is the highest-risk row here, not the best one.

Also trademarked in this set: `magic the gathering`, `lorcana`, `gameboy`, `superman`, `haunted mansion`, `elf on the shelf`, `porsche`, `harley davidson`, `f1`, `pokemon *` (all variants).

The category seeds add four more: `kpop demon hunters` (Netflix/Sony), `ghibli` (Studio Ghibli), `gilmore girls` (Warner Bros.) and `pikachu` again.

**`kpop demon hunters` deserves naming separately: 26,982 average searches at KD 11** — by a wide margin the highest volume and lowest difficulty in anything captured. It is a 2025 Netflix film, it is trademarked, and KD 11 against 27K searches is the signature of a trend spike that has not yet been saturated *or* enforced. Both of those change fast. It is the most tempting row in the capture and the one most likely to end in a takedown.

**Roughly half of the 83 rows are unusable on these grounds.** Treat the capture as ~40 rows.

## 2. What is actually open

Non-trademarked, ≥1,500 average searches, and `Tag Occurrences` reported as 0:

| Term | Searches | KD | Read |
|---|---|---|---|
| `halloween headpiece` | 5,819 | 18 | Best volume/difficulty ratio in the set — but a wearable, not a craft product |
| `moss wall art` | 2,403 | 36 | Different craft |
| `masculine wall art` | 1,710 | 50 | **Positioning, not product** — see §3 |
| `wabi sabi wall art` | 2,038 | 58 | An aesthetic the line could serve |
| `halloween crochet pattern` | 1,818 | 65 | **Craft-pattern demand inside Halloween** — the useful signal, see §2 |

> **Caveat on the `Tag Occurrences` column:** its scope is unconfirmed. `masculine wall art` reads **0** in the `wall art` export and **2** in the `poster` export, which suggests it is counted per-query rather than against the shop. Confirm in eRank before weighting it.

## 3. Opportunities, in order of how soon they can be acted on

### 3.1 Tagging — `wall art` is the vocabulary gap (free, partially actionable now)

**Only 4 of 36 listings carry any `wall art` tag. 26 carry a `hoop` tag.** The ones in use: `bedroom wall art`, `calming wall art`, `christmas wall art`, `hoop wall art`, `penguin wall art`.

The shop's whole vocabulary is *hoop art*; the `wall art` family in this capture runs 1.5–4.5K searches. Buyers appear to search the category word, the shop indexes on the format word.

**Blocked and unblocked:** the 18 experiment listings are frozen until 2026-10-15. The **9 holiday drafts and 5 Grandma Hobbies listings are not**, and the holiday ones already rank. Start there; carry the rest into the October window.

### 3.2 Product — Halloween, six weeks out (time-sensitive)

`halloween crochet pattern` at 1,818 searches establishes that **craft-pattern demand exists inside Halloween**, and crochet is the nearest neighbour to hand embroidery in this set. The shop has **one** fall/Halloween title across 36 listings.

Digital delivery means no inventory and no shipping lead time, and the house style (clean black line art, botanical) maps onto moths, mushrooms, bats and spooky florals with no new capability.

**This is an extrapolation, not a finding.** None of the five files contains `halloween embroidery pattern`. Pull that term, plus `spooky embroidery` and `halloween hoop art`, before committing design time.

### 3.3 Positioning — `masculine wall art` (queue for October)

1,710 searches, no trademark, 0 tag occurrences in the `wall art` export. The catalogue is florals, wreaths and botanicals — feminine-coded nearly throughout — but the **geometric line** (wheel, starburst, diamond wreath, rosette) already serves this audience and is tagged as though it does not.

The cheapest test in the capture: a repositioning of existing patterns, not a new product.

### 3.4 The alphabet bridge — the strongest thread in the capture

`embroidery fonts` (3,928) and `embroidery font` (2,475) are the only on-topic terms the category seeds surfaced, and together they are **~6.4K searches**. They are machine-embroidery terms — but *lettering* is the one product that serves both halves of the category from one set of source assets:

- as **hand embroidery**, an alphabet or monogram pattern set, which is a normal product in the shop's existing format;
- as **machine embroidery**, the same letterforms through `svg-to-stitch` to DST/EXP.

Three things already point here. The four personalised snow globes are **custom-text** listings, so the shop has done lettering. `personalized gift` is **41.4K average searches** in [the tag report](2026-09-15-erank.md) — the highest-volume term W&H touches, and untested. And the design system already produces the line art.

**The counterweight, which is real:** `embroidery fonts` carries **competition 46,786** and `embroidery font` **46,800** — the two highest competition figures in the entire capture, at KD 54 and 64. This is where demand is *and* where everyone already is. `font bundle` (7,329 searches, KD 32, competition 32,217) is a materially better ratio but describes actual typefaces, which is a different business.

Treat lettering as the best-supported hypothesis in the capture, not as a free lane.

### 3.5 Procreate stamps — same assets, crowded market

`procreate brushes` (3,785, KD 55) and `procreate stamps` (2,168, KD 63) would take the existing motif SVGs into a second digital market with no new drawing work. Competition runs ~40–47K and difficulty is high, so this is a spare-capacity play rather than a bet — worth one test listing built from motifs that already exist, not a line.

## 4. The next export — batches to seed, in priority order

§0's hypothesis is testable and cheap. **Batch A gates the rest**: until it is run, the shop does not know whether its own category has demand, and every other decision here is guesswork.

**A — Does the category have demand, and which half of it?** *(run first)*
`hand embroidery pattern` · `embroidery pattern pdf` · `modern embroidery pattern` · `beginner embroidery pattern` · `embroidery hoop art` · `machine embroidery design` · `machine embroidery pattern` · `pes file` · `dst file`

The hand/machine pairing is the point. If the machine terms carry 5–10× the hand terms, §0 is confirmed and the shop's category tag is mispositioned. If they are comparable, §0 is an export artifact and the constraint is elsewhere.

**B — Lettering, per §3.4** *(run second, it is the best-supported thread)*
`monogram embroidery` · `hand embroidery alphabet` · `embroidery letters` · `monogram pattern` · `personalized embroidery` · `custom name embroidery`

**C — Halloween, time-sensitive** *(six weeks out; §3.2 rests on an extrapolation until this is run)*
`halloween embroidery` · `halloween embroidery pattern` · `spooky embroidery` · `halloween hoop art` · `fall embroidery pattern` · `mushroom embroidery` · `moth embroidery` · `celestial embroidery`

**D — The `wall art` reframe, per §3.1**
`wall art` · `boho wall art` · `minimalist wall art` · `nursery wall art` · `neutral wall art` · `textile wall art` · `fiber art` · `masculine wall art`

**E — Gift framing, where the tag report already said the volume is**
`self care gift` · `gift for crafters` · `hobby gift` · `craft kit gift` · `stocking stuffer` · `christmas gift for mom` · `teacher gift`

**F — Is embroidery the right craft at all?**
`cross stitch pattern` · `crochet pattern` · `punch needle pattern` · `sashiko pattern` · `sewing pattern pdf` · `digital download pattern`

Strategic rather than tactical: the same line art can become cross stitch charts from the same source files. If `cross stitch pattern` carries an order of magnitude more demand, that is a product-line question, not a tagging one.

**G — The Grandma Hobbies line, which is the part actually ranking**
`funny candle` · `wooden wick candle` · `cottagecore gift` · `gift for gardener` · `knitting gift` · `plant lady gift` · `enamel pin`

Outside the experiment, on real commercial terms, and already at page 1 position 17 for `wooden wick candle` from zero tag slots filled. Possibly the best near-term revenue in the shop.

**Export convention:** one seed per CSV, keep eRank's filename. That is what made these ten mappable.

## 5. The structural finding

Placed against the shop's own numbers, this capture confirms the demand reading from [Spotted on Etsy](2026-09-17-erank-spotted-on-etsy.md) from the opposite direction:

| | Average searches |
|---|---|
| `calm stitching` — where the shop ranks **page 1, position 1** | < 20 ("Unknown" in the tag report) |
| The **weakest** term in these five files | 1,510 |
| `minecraft` | 13,347 |

**A 75–600× gap.** The shop holds its best-ever organic placement on a term with no measurable volume, while terms with 1,500–13,000 searches sit at zero tag occurrences. Position is not the constraint; demand is. Together these two pulls make that concrete rather than suspected.

## 6. Standing read

**Four of the five batch-1 seeds answer the wrong question.** `paint by numbers`, `pokemon`, `poster` and `wall art` describe markets W&H does not serve; they report where Etsy demand lives — largely fandom, licensed and trend territory — which is useful context and not a plan. `halloween` is the exception and the reason batch 1 was not wasted — it is the one seed pointing at a product the shop could actually ship, per §3.2.

**The batch-2 seeds ask the right question and return an uncomfortable answer**, or possibly an export artifact. Either way the shop cannot proceed on a guess: §4 batch A resolves it for the cost of one more export session, and it gates the Oct 15 rollout decision as much as the experiment readout does.

Nothing here justifies a mid-window change. The tag experiment still closes 2026-10-15 on its own terms, and §3.1's tagging work is limited to the holiday and Grandma listings until then.

## Where this plugs into the map

Intelligence tier 3 (external tools) → evidence → product and tagging strategy. Sixth archived pull, and the first pointed at markets outside the current catalogue. The eRank trio now reads: [tag report](2026-09-15-erank.md) = demand for terms we use; this = demand for terms we don't; [Spotted on Etsy](2026-09-17-erank-spotted-on-etsy.md) = where we actually rank.
