---
source: etsy
surface: title-suggestions
captured: 2026-09-17
tier: bookend
scope: shop
measures: [content]
subjects: [holiday]
half_life: 90d
answers: >-
  What Etsy's own dashboard proposed as listing titles, and why it was declined.
---
# Data pull — Etsy dashboard title suggestions, captured 2026-09-17

**Provenance:** Katy's screencapture of Shop Manager's suggested-titles panel, 2026-09-17. All nine holiday listings were flagged in one batch. **Screenshotted, then dismissed — no titles were changed.** Archive the source image flat in `Drive: W+H Listings/W+H Data Pulls/` as `2026-09-17-etsy-title-suggestions.png` to match the other pulls; the nine pairs are transcribed below so the readout does not depend on the image surviving.

This is the first capture of Etsy's *own* SEO opinion about the shop. That is what makes it worth keeping: it is a free, independently-generated hypothesis to score the experiment's result against.

## The nine pairs

Every listing in the holiday batch, current title → Etsy's proposal.

| # | Current (kept) | Etsy's proposal (dismissed) |
|---|---|---|
| 1 | Personalized Christmas Tree Snow Globe **Hand** Embroidery Pattern PDF, Custom Text Festive Hoop Art, Holiday Keepsake, 6 and 8 Inch Hoops | Personalized Christmas Tree Snow Globe Embroidery Pattern (PDF Download) |
| 2 | Personalized Penguin Snow Globe **Hand** Embroidery Pattern PDF, Custom Text Christmas Hoop Art, Cute Holiday Keepsake, 6 and 8 Inch Hoops | Personalized Penguin Snow Globe Embroidery Pattern, Custom Text Hoop Art (PDF) |
| 3 | Personalized **Snowy House** Snow Globe **Hand** Embroidery Pattern PDF, Custom Text Christmas Village Hoop Art, Keepsake, 6 and 8 Inch Hoops | Personalized Snow Globe Embroidery Pattern, Custom Text Christmas Keepsake (PDF) |
| 4 | Personalized Snowman Snow Globe **Hand** Embroidery Pattern PDF, Custom Text Christmas Hoop Art, Beginner Keepsake Stitching, 6 and 8 Inch | Personalized Snowman Snow Globe Embroidery Pattern, Custom Text Christmas Hoop Art (PDF) |
| 5 | Christmas Classics Embroidery Pattern Set, 4 **Hand** Embroidery PDF Designs, Bow Candy Cane Nutcracker Poinsettia, Beginner Bundle | Christmas Embroidery Pattern Set, Bow, Candy Cane, Nutcracker, Poinsettia (Digital Download) |
| 6 | Nutcracker **Hand** Embroidery Pattern PDF, Classic Christmas Hoop Art, Beginner Friendly Holiday Stitching, 6 and 8 Inch Hoops, Download | Nutcracker **Hand** Embroidery Pattern, Classic Christmas Hoop Art (6 & 8 Inch) |
| 7 | Candy Cane **Hand** Embroidery Pattern PDF, Christmas Hoop Art with Bow and Holly, Beginner Holiday Craft, Festive Decor, 6 and 8 Inch Hoops | Candy Cane Embroidery Pattern, Christmas Hoop Art, Bow and Holly (PDF Download) |
| 8 | Christmas Bow **Hand** Embroidery Pattern PDF, Holiday Hoop Art for Beginners, Cozy December Stitching, 6 and 8 Inch Hoops, Download | Christmas Bow Embroidery Pattern, Beginner Hoop Art (6 & 8 Inch PDF) |
| 9 | Poinsettia **Hand** Embroidery Pattern PDF, Christmas Flower Hoop Art, Beginner Friendly Festive Decor Craft, 6 and 8 Inch Hoops | Poinsettia **Hand** Embroidery Pattern, Christmas Flower Hoop Art (6 & 8 Inch PDF) |

## Distilled

**1. The rewrites are uniformly shorter — mean 131 → 79 characters of the 140 allowed.** Range −35 to −62. That leaves ~61 characters of search surface unused per listing, and runs directly against the shop's own P4 item ("lengthen titles on the traffic magnets"). Etsy is not filling the field it gives you.

**2. "hand embroidery" is dropped from 7 of 9.** Only #6 and #9 keep it. This is the batch's sharpest conflict with our evidence: all six organic search visits on record (Search Analytics, Aug 16 – Sep 14) have the shape *"hand embroidery" + pdf/download + a descriptor*. It is also a named listing-kit rubric fold — `holiday_drafts_2026.json` lists `"Hand keyword"` among the folds these titles were drafted against. Etsy proposes removing the one token with first-party evidence behind it.

**3. #3 collapses a unique descriptor and creates a collision.** "Personalized **Snowy House** Snow Globe" → "Personalized Snow Globe". The shop has four snow globe listings (tree, penguin, snowy house, snowman); stripping the descriptor makes #3 compete with the other three. This is precisely the near-duplicate-title failure the tag positioning experiment exists to undo, and it violates copy rule 2 (one unique primary descriptor per listing).

**4. Format words move into trailing parentheticals, and #5 gains "(Digital Download)".** Copy rule 3 keeps format words inside title phrases and bans them as standalone labels. A trailing parenthetical is the weakest position in the field — it is what Etsy truncates first on mobile.

**5. Lost long-tail, listed once:** *Holiday Keepsake*, *Christmas Village*, *Cozy December Stitching*, *Festive Decor*, *Beginner Friendly*, *Beginner Bundle*, *for Beginners*. Note that beginner framing disappears from four listings — the skill-level signal copy rule 5 asks to state consistently.

## The honest tension — recorded, not resolved

Etsy's suggestions are not random, and they are not straightforwardly wrong. They lean generic, high-volume and short — which is **the same direction the eRank pull points** (`digital products`: 31.2K avg searches, difficulty 35; `embroidery designs`: 7.1K, difficulty 77). Two independent external instruments now agree with each other and disagree with this shop's own click data (`digital products`: 28 ad impressions, 0 clicks; specific descriptors carrying every recorded visit and the only 40% CTR row).

That is the same tension [the eRank pull](2026-09-15-erank.md) logged at its point 4, arriving from a second direction. Both sides can be true at once: the external tools measure **marketwide demand**, our panels measure **fit between this shop's products and the people who arrive**. High volume you cannot convert is the `digital products` row.

**This pull does not adjudicate it — the tag experiment does.** The dismissal was the right call *for now* on process grounds (these titles were drafted against a rubric and the evidence we have), not because the market view has been refuted.

## Standing read — what to do with this at day 30

The value of this capture is realized at the [2026-10-15 readout](../ETSY_RELEASE_2026-10-15.md), not today:

- **If positioning wins** (treatment mean ≥ 2× control): Etsy's generic-and-short direction is contradicted by first-party evidence on our own catalogue. Dismiss future suggestion batches on sight, and note that the dashboard's model does not fit this shop.
- **If flat** (both arms stay 0–2 views): keywords are not the constraint, and *neither* our positioning rewrite nor Etsy's generic rewrite was going to matter. The next hypothesis is thumbnails/photos — and the dashboard's suggestions stay dismissed for a different reason (irrelevant, not wrong).
- **If the control arm beats treatment** — the outcome the verdict rule does not currently name — then generic beats specific on this catalogue, eRank and Etsy were both right, and this batch becomes the ready-made first rollout: nine drafted titles pointing the winning way, already written by the platform.

The third branch is why the screenshot was worth taking. Keep the pairs above intact until the readout.

## Where this plugs into the map

Intelligence tier 3 (external tools) → evidence → experiment readout. Fourth archived pull, and the first sourced from Etsy's own recommendation surface rather than from our data or a third-party tool. Cite this note in the day-30 readout alongside [the eRank pull](2026-09-15-erank.md); the two carry the same disagreement with our first-party evidence and should be read together.
