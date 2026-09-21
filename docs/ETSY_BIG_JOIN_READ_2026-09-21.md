# Big Join — first read, 2026-09-21

*The first time the Keyword Explorer has been read for a decision rather than built. Two questions: what is worth making next, and which listings are worth rewriting. Every claim below names the row it rests on — type the keyword into the table's filter to see it.*

**What was read:** [`/keyword-explorer`](https://labs.beckharrisdesign.com/keyword-explorer) as served on 2026-09-21 — 2,310 keyword rows and 383 listing sub-rows, joining eRank (Keyword Tool and Bulk Keywords pulled 2026-09-17/18, Tag Report 2026-09-15), *Spotted on Etsy* (2026-09-17), live listing tags (snapshot 2026-09-21), captured search terms (2026-09-20, this year) and the Etsy Ads keyword panel (2026-09-20, last 30 days). Pull notes: [eRank](pulls/2026-09-15-erank.md), [keywords](pulls/2026-09-17-erank-keywords.md), [bulk](pulls/2026-09-18-erank-bulk-keywords.md), [ranked](pulls/2026-09-17-erank-spotted-on-etsy.md), [listing stats](pulls/2026-09-20-etsy-listing-stats.md), [ads](pulls/2026-09-16-etsy-ads-dashboard.md).

**What this read is gated by:** the [tag positioning experiment](../experiments/etsy-notion-sync/docs/tag-positioning-experiment.md) is at day 6 of 30. Nothing here touches the 16 experiment listings before the readout; those items are filed in [the 2026-10-15 release](ETSY_RELEASE_2026-10-15.md). Editable-now items are marked.

---

## The five things the table says

1. **Every sale this year came through a phrase the listing was not tagged with.** Seven captured terms carry a sale (`hand embroidery pdf geometric` $6, `modern minimalist embroidery pattern` $6, `paper embriodery template` $6, `mandala embroidery design`, `mandala embroidery pattern download`, `hand embroidery pattern pdf`, `embroidered kippah women` $2.49 each). All seven sub-rows read `not tagged`. Buyers arrive on specific, multi-word, sometimes misspelled phrases; the shop's tags are shorter and more generic. This is the experiment's hypothesis, seen from the sales side rather than the views side.
2. **Performance is thin, and honestly so.** Eleven captured terms, one visit each; fourteen ad-matched keywords, 145 views and 4 clicks between them; eight ranked terms. The eRank side has 2,082 scored keywords. The table is 95% estimate and 5% outcome. Read the estimates as a map of where demand might be, not as evidence of anything.
3. **The treatment listings carry almost no measurable eRank volume — by design, and the readout should say so.** Summed eRank search volume across the 13 tags: Geometric Rosette 3,594 (nearly all `bedroom wall art` and `boho wall decor`), Branch Wreath ≤100, Diamond Wreath ≤64, Geometric Wheel ≤41, Leaf and Berry ≤28, Leaf Fan 0 of 13 tags scored. The controls carry 289–19,329. If the treatment wins on 9/29 or 10/15, it wins with tags eRank calls invisible, which is a finding about eRank as much as about tags. If it loses, the "generic and high-volume" instruments were right. Either way the readout adjudicates two instruments, not one arm.
4. **`calm stitching` is the shop's one page-one term and the treatment rewrite removed it from six titles.** Position 1, on three listings' tags (geometric hoop #6, Beginner Botanical #9, Floral Wreath #10), competition 1,808, no eRank volume at all. The release doc already flags this confound; the table now shows which three listings still hold the phrase.
5. **The holiday nine cannot be scored yet.** The Tag Report predates them, so the Bow shows 4 tags of 13 scored, five show one, and three show none — the 108 live tags with no corpus row are mostly theirs. That is the one re-pull that would pay off (an eRank Tag Report), and it is tabled with the rest of re-pulling; noted so nobody reads "1 of 13" as a tagging failure.

---

## A. What happened — the Performance bucket

**Captured search terms (this year), all one visit each.** The listing reached is in the sub-row; none is tagged with the term.

| Term | Sold | Revenue | Listing reached | eRank |
|---|---|---|---|---|
| `hand embroidery pdf geometric` | 1 | $6.00 | Geometric (4466080258, protected) | no row |
| `modern minimalist embroidery pattern` | 1 | $6.00 | Geometric (4466080258, protected) | no row |
| `paper embriodery template` | 1 | $6.00 | Geometric hoop (4466076995, protected) | no row |
| `mandala embroidery design` | 1 | $2.49 | Leaf mandala (4415035303, protected) | no row; ad-matched, 5 views 2 clicks |
| `mandala embroidery pattern download` | 1 | $2.49 | Leaf mandala | no row |
| `hand embroidery pattern pdf` | 1 | $2.49 | Leaf mandala | no row |
| `embroidered kippah women` | 1 | $2.49 | Leaf mandala | no row |
| `mandala embroidery pattern` | 0 | — | Folk Leaf Circle; also ad-matched to the mandala | `< 20` vol, 4,994 comp (Bulk) |
| `botanical embroidery design hand embroidery` | 0 | — | Fall Leaves | no row |
| `medieval embroidery patterns` | 0 | — | Fall Leaves | no row |
| `geometric hand embroidery patterns` | 0 | — | Geometric Rosette (treatment) | no row |

Two things worth holding onto. eRank has **no row for ten of the eleven phrases buyers actually typed** — its instruments do not see the long tail the shop sells on. And the three $6 sales all landed on the two protected geometric listings, whose tags eRank mostly scores `< 20` (see §B). The phrases that sold are not the tags, and the tags are not high-volume either. The tags may be doing less than the thumbnails.

**Etsy Ads (last 30 days).** Etsy matched 14 keywords, 9 of them to the leaf mandala. The only clicks: `embroidery patterns` (38 views, 1 click, 2.6%), `hand embroidery designs` (13, 1), `mandala embroidery design` (5, 2 — 40%). `digital products` drew 22 views and 0 clicks on Beginner floral (its tag #3) — the release doc's "toggle it off" item stands. The band label says it: these are Etsy's matches, not the shop's choices; none of the nine mandala matches is one of the mandala's tags.

**Ranked (*Spotted on Etsy*, 2026-09-17).** Eight terms. `calm stitching` #1 (three listings). `small gift for her` #8 (Grandma Hobbies button, tag #12). `snow globe` #8 (Snowman globe, tag #3) and `snow globes` #19. `wooden wick candle` #17 (tag #1). `geometric wreath` #20 (Diamond Wreath, tag #2). `candles for her` #24, `flower hoop` #24 (no tag carries either).

## B. What we chose — tag health per listing

Tags scored by eRank, of 13; how many carry a real volume figure; how many eRank censors to `< 20`; how many sit at KD 100 (saturated); the summed volume; the tag carrying the most. Lifetime views from the 2026-09-21 snapshot are listed for contrast only — listings differ in age, so the day-14 window deltas are the real comparison.

| Group | Listing | Views | Scored | Vol > 0 | `< 20` | KD 100 | Σ vol | Best tag |
|---|---|---|---|---|---|---|---|---|
| Protected | Leaf mandala 4415035303 | 87 | 13 | 9 | 3 | 6 | 44,870 | `digital products` 31,237 (#13) |
| Protected | Geometric 4466080258 | 33 | 13 | 9 | 7 | 9 | 150 | `geometric mandala` `< 20` |
| Protected | Geometric hoop 4466076995 | 23 | 13 | 6 | 2 | 5 | 9,681 | `embroidery designs` 7,082 |
| Protected | Starburst 4417250225 | 17 | 13 | 3 | 1 | 3 | 656 | `instant download` 440 |
| Treatment | Geometric Wheel 4466789627 | 26 | 13 | 3 | 2 | 3 | 41 | `line art embroidery` `< 20` |
| Treatment | Diamond Wreath 4415081378 | 9 | 13 | 4 | 3 | 4 | 64 | `diamond pattern` `< 20` |
| Treatment | Geometric Rosette 4466082116 | 6 | 13 | 4 | 1 | 4 | 3,594 | `bedroom wall art` 1,953 |
| Treatment | Branch Wreath 4466797252 | 5 | 13 | 5 | 5 | 5 | 100 | `botanical wreath` `< 20` |
| Treatment | Leaf and Berry 4465359686 | 4 | 13 | 3 | 1 | 3 | 28 | `folk botanical` `< 20` |
| Treatment | Leaf Fan 4465356349 | 3 | 13 | 0 | 0 | 0 | 0 | — |
| Control | Beginner Botanical 4465357735 | 12 | 13 | 9 | 2 | 6 | 19,329 | `embroidery designs` 7,082 |
| Control | Hand drawn leaves 4417250834 | 8 | 13 | 6 | 2 | 6 | 289 | `digital pattern` 211 |
| Control | Firecracker 4466795015 | 5 | 13 | 11 | 7 | 10 | 10,081 | `embroidery designs` 7,082 |
| Control | Floral 4466078772 | 3 | 13 | 8 | 6 | 8 | 321 | `embroidery hoop` 196 |
| Control | Leaf 4466791377 | 3 | 13 | 10 | 2 | 10 | 3,578 | `embroidery pattern` 2,555 |
| Control | Leaf Floral 4466795496 | 2 | 13 | 5 | 2 | 5 | 574 | `instant download` 440 |
| Seasonal | Fall Leaves 4415032102 | 35 | 13 | 6 | 1 | 6 | 404 | `thanksgiving craft` 232 |
| Unassigned | Beginner floral 4414949521 | 27 | 13 | 11 | 6 | 8 | 46,842 | `digital products` 31,237 (#3) |
| Unassigned | Intermediate flower 4417249682 | 17 | 13 | 7 | 4 | 7 | 90 | `advanced embroidery` `< 20` |
| Unassigned | Folk Leaf Circle 4466799018 | 10 | 13 | 4 | 1 | 4 | 587 | `hand embroidery` 564 |
| Unassigned | Floral wreath 4466793009 | 8 | 13 | 7 | 1 | 4 | 19,254 | `embroidery designs` 7,082 |
| GH | Photo Portrait Ornament 4522918821 | 4 | 13 | 13 | 6 | 12 | 54,942 | `personalized gift` 41,355 |
| GH | Candle 4555463292 | 0 | 13 | 9 | 6 | 9 | 18,267 | `housewarming gift` 13,596 |
| GH | Wooden wick candle 4555463358 | 0 | 13 | 10 | 7 | 9 | 6,922 | `self care gift` 5,843 |
| GH | Button 4555463082 | 1 | 13 | 7 | 4 | 6 | 6,426 | `stocking stuffer` 6,159 |
| GH | Tee 4555452153 | 0 | 13 | 8 | 7 | 7 | 794 | `gardening shirt` 654 |
| GH | Pin 4555452273 | 1 | 13 | 5 | 5 | 3 | 100 | `cottagecore pin` `< 20` |
| Holiday | Christmas Bow 4576478333 | 0 | 4 | 3 | 0 | 3 | 2,935 | `christmas wall art` 2,298 |
| Holiday | Snowy House globe 4576478415 | 1 | 1 | 1 | 0 | 0 | 1,224 | `christmas village` 1,224 |
| Holiday | the other seven | 0–2 | 0–1 | ≤1 | 0 | ≤1 | ≤3 | *unscored — Tag Report predates them* |

Three observations, none of them a verdict:

- **Views do not track summed eRank volume.** Beginner Botanical (19,329) has 12 views; Geometric Wheel (41) has 26. The two most generic-tagged listings in the shop and the most specifically-tagged one sit at opposite ends of both columns. Read with the age caveat above; the day-14 deltas are the test.
- **`digital products` is the highest-volume tag the shop uses (31,237, KD 35, competition 156,839) and it is a category word, not a search a stitcher types.** It sits at #13 on the mandala and #3 on Beginner floral; ads matched it 22 times for 0 clicks. It is the one tag in the shop that looks good on eRank and bad in the Performance bucket.
- **Three listings carry `embroidery designs` at tag #1** (Beginner floral, Beginner Botanical, Floral wreath — one control, two unassigned) and `embroidery pattern` sits at #4–#10 on four more. Those two tags are the shop's actual bet on generic volume; ads matched them 19 times for 0 clicks, and the table can now show what they return over the window.

## C. What the market is estimated to want — candidates

Filters used: untargeted (no listing carries the tag), eRank volume shown, sorted by Search / Competition. Volume is eRank's estimate; KD is eRank's difficulty; competition is listing count.

**On-brand product forms** — things a pattern shop could make from what it already has:

| Keyword | Vol | Competition | KD | Why it fits |
|---|---|---|---|---|
| `stick and stitch` | 1,166 | 9,591 | 46 | Water-soluble printed transfers of the existing patterns. Same designs, physical product, the lowest-competition form in the corpus. |
| `advent calendar` | 8,347 | 33,071 | 30 | The Christmas Classics set already carries an `advent stitching` tag (unscored). A 24-motif stitch-along advent is a product, not a tag. |
| `embroidery pattern bundle` | 108 (Bulk) | 17,559 | 100 | Low volume but a form the shop already sells; the set listing is the test case. |
| `needle minder` | 3,246 | 29,016 | 48 | Physical accessory. The shop already makes engraved wood ornaments; a wood needle minder is the same process. |
| `punch needle kit` | 1,262 | 8,595 | 42 | Adjacent craft, not this one. Listed because the ratio is the best of any embroidery term; skip unless the craft is in scope. |
| `mini cross stitch pattern` | 1,321 | 26,331 | 65 | Different craft (counted-thread). Same caution. |
| `embroidery fonts` / `font bundle` | 3,928 / 7,329 | 46,786 / 32,217 | 54 / 32 | These are machine-embroidery files in practice. Not this shop's craft; noted so the ratio is not misread. |

**Personalized ornament variants** — the Photo Portrait Ornament's strongest tags are `personalized gift` (41k, KD 100, 5.5M competition) and `christmas ornament` (9k, KD 100, 2M). The niches around it are cheaper:

| Keyword | Vol | Competition | KD |
|---|---|---|---|
| `ultrasound ornament` | 505 | 2,075 | 31 |
| `big brother ornament` / `big sister ornament` | 205 / 204 | 1,955 / 2,773 | 49 / 57 |
| `nurse ornament` | 998 | 19,183 | 64 |
| `photo ornament` (already tag #1) | 1,174 | 93,353 | 95 |

An engraved ultrasound ornament is the same product with a different image; it is the clearest new-variant candidate in the corpus. Editable now — the ornament is not an experiment listing.

**Holiday, for the nine live listings** — tags with rows, none currently used: `christmas embroidery designs` 1,541 / 41,020 / KD 71; `gingerbread ornament` 2,168 / 43,397 / KD 65 (no gingerbread listing exists — a motif candidate); `christmas tree skirt` and `winter door decor` are other people's products. `christmas embroidery` (618) is on the Bow at #3 and `christmas wall art` (2,298, 1.8M competition) at #10.

**Grandma Hobbies** — the corpus is thin here. The line's real tags are generic gift terms at KD 100 (`stocking stuffer` 6,159, `housewarming gift` 13,596, `best friend gift` 4,148). Untargeted terms with any fit: `gardening shirt` is already on the tee; `funny cross stitch` 1,326 / 55k / KD 81 is a different product. `stitch markers` 2,293 / 23k / KD 50 (from the `gift for knitter` seed) is a knitter accessory the line could carry if it ever goes beyond print-on-demand.

**The non-embroidery seeds answered a different question.** The top of the ratio table is `heated rivalry` (11,549 / 6), `project hail mary`, `hollow knight`, `silksong`, `love and deepspace`, `elden ring`, `miffy`, `stardew valley`, `noah kahan`, `world cup 2026`, `pokemon binder` — all fandom or trademark IP, from the `stickers`, `shirt`, `book nook`, `pokemon` and `cutecore` seeds. They say what is hot on Etsy; they are not things this shop can make. The two generic ones (`hacky sack`, `wabi sabi wall art prints brown`) are not this shop's products either. Recommendation: do not spend manual re-pull time on those seeds again.

## D. Listings worth rewriting

**Editable now** (not experiment listings):

- ☐ **Photo Portrait Ornament 4522918821** — swap two of the KD-100 generic gift tags (`personalized gift`, `family photo gift`) for `ultrasound ornament` and `big sister ornament` / `big brother ornament`, or list the ultrasound version as its own listing. Rows: above.
- ☐ **Pin 4555452273** — weakest tag set in the shop: 5 of 13 scored, all `< 20`, summed volume ≤100. Its sibling button 4555463082 ranks #8 for `small gift for her` on tag #12. Do not clone the sibling's tags (cloned tags earned 1 view in August); find five distinct terms with rows. Candidates with rows: `stocking stuffer` is taken by the sibling; `cottagecore pin` is `< 20`.
- ☐ **Christmas Bow 4576478333** — `christmas wall art` (1.8M competition, KD 100) at #10 is the tag least likely to return anything; `christmas embroidery designs` (1,541 / 41k / KD 71) has a row and no listing.
- ☐ **Christmas Classics set 4576496782** — add `advent calendar` if the set is reframed as an advent stitch-along; the current `advent stitching` tag has no row anywhere.
- ☐ **Folk Leaf Circle 4466799018** — captured `mandala embroidery pattern` (1 visit) without being tagged for it, and holds `hand embroidery` (564). Unassigned, 10 views. Lowest-risk rewrite in the pattern catalog; use the captured phrase shape (`<motif> embroidery pattern <form>`).

**Gated by the 10/15 release** (filed there):

- **Geometric 4466080258 (protected)** — 7 of 13 tags censored `< 20`, 9 at KD 100, summed volume 150; and it took two of the year's three $6 sales on phrases it is not tagged with. The strongest case in the shop that tags are not what is selling it, and the strongest case for rewriting its tags once the window closes.
- **`embroidery designs` / `embroidery pattern` on the controls (Beginner Botanical #1, Leaf #7, Firecracker #8–9, Geometric hoop #10–13)** — leave alone until the readout; they are the control condition.
- **`digital products` on the mandala (#13) and Beginner floral (#3)** — the release doc's ad-keyword toggle covers the ad side; the tag side waits.

## E. What this read could not see

- **The grain is one visit.** Eleven terms, one visit each, seven sales at $2.49–$6. Nothing here is significant; it is legible. Etsy's Search Analytics export is the only source of these terms and covers the year.
- **The Tag Report is from 2026-09-15 and the holiday nine went live 2026-09-16**, so their tags are unscored and the 108-tag gap is mostly them. Re-pulling is tabled (manual). When it is un-tabled, the Tag Report is the pull to run first; it scores the shop's own choices.
- **Ads cover 30 days, Shop covers the year, eRank is a September estimate.** The bands say so on the table; the numbers above are not comparable across bands.
- **Ranked identifies listings by title text**, so a retitle can look like a new match. Eight terms today; the release doc's re-run will diff it.
- **eRank has no row for ten of the eleven captured phrases.** Its Keyword Tool is seeded by hand and its Bulk and Tag tools score what they are given; the long tail buyers actually use is structurally invisible to it. This is the single most important caveat on section C.
- **Lifetime views are not a comparison.** Section B lists them for orientation. The experiment's metric is window deltas from `etsy_listing_snapshots`, day 14 on 2026-09-29.

## F. Where each item went

- Release 2026-10-15, §1 (readout): score the verdict against tag volume too — the treatment arm's tags carry near-zero eRank volume, so a treatment win is also an eRank miss.
- Release 2026-10-15, §3 (deferred): Geometric 4466080258 tag rewrite.
- Release 2026-10-15, §5 (not blocked): the five editable-now rewrites in section D; the ultrasound ornament variant; the Tag Report re-pull as the first pull when re-pulling resumes.
- Nothing added to the improvement plan; P1 (tag the Grandma Hobbies five) is done, and the plan's P4/P5 already live in the release doc.
