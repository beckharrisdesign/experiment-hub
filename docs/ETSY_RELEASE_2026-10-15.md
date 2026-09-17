# Release — 2026-10-15

*The next shop-wide change window. Work that would disturb the running tag experiment accumulates here instead of happening piecemeal, so the shop holds still until the experiment can be read, and then changes once, deliberately.*

**Why this date:** it is day 30 of the [tag positioning experiment](../experiments/etsy-notion-sync/docs/tag-positioning-experiment.md) (day 0 = 2026-09-15). Until the readout is taken, edits to the protected, treatment, and control listings contaminate the comparison.

**What belongs here:** anything touching the 16 experiment listings, or anything that changes how buyers browse the shop. **What doesn't:** work on the holiday batch, new listings, and anything invisible to buyers — those ship whenever they're ready.

---

## 1. Read the experiment first — this gates everything below

- ☐ Re-capture the ad panels (the 7 baseline rows plus each treatment listing) and re-export Search Analytics.
- ☐ Compute `views(day 30) − views(day 14 baseline)` per listing from `etsy_listing_snapshots`; compare treatment vs control mean.
- ☐ Call the verdict against the rule: **positioning wins** if treatment mean ≥ 2× control, or ≥ 2 treatment listings reach 10+ views/30d; **flat** if both stay ~0–2 views and ads keep serving generic terms.
- ☐ Record the readout as a pull note in `docs/pulls/`.
- ☐ Score the verdict against the two external instruments that disagree with our first-party data — [eRank](pulls/2026-09-15-erank.md) and [Etsy’s dismissed title suggestions](pulls/2026-09-17-etsy-title-suggestions.md). Both point generic-and-high-volume; our click data points specific. The readout is what adjudicates, so say which won.
- ☐ Re-run the eRank **Spotted on Etsy** export and diff it against the [2026-09-17 baseline](pulls/2026-09-17-erank-spotted-on-etsy.md). That capture found the shop at **page 1 position 1** for `calm stitching` on a listing with 9 views/30d — so rank and volume must be read together, and "flat" may mean the constraint is term selection rather than thumbnails. It also records that the treatment rewrite dropped `calm stitching` from six titles without knowing the phrase ranked: a confound this rule does not otherwise account for.

Everything after this point assumes the readout is taken. Do not start them first — each one destroys the thing being measured.

## 2. Re-section the pattern catalog

The 21 pattern listings share one section (`21751592`), which is the shop's whole browse experience. Proposed split, balanced by size and grounded in the catalog:

| Section | Listings | Views today |
|---|---|---|
| Geometric & Mandala | 7 | 195 |
| Floral | 6 | 68 |
| Leaves & Greenery | 6 | 33 |
| Seasonal | 2 | 39 |

**Why it waits:** the split lands 4 protected + 3 treatment and **zero** control listings in Geometric & Mandala, while Floral holds 3 control and zero treatment. Sections change how buyers browse, so doing this mid-window gives the two arms different exposure — a confound aimed directly at the comparison, not merely noise.

- ☐ Create the four sections in Shop Manager (creating sections needs `shops_w`; the token has `listings_r listings_w`).
- ☐ Put their ids in `holiday_listing_ids.json` → `shop_sections`, map each listing, then `bash scripts/run-assign-sections.sh --apply`.

## 3. Deferred from the experiment protocol

- ☐ **P4 — lengthen titles on the traffic magnets.** The protected four (4415035303 mandala, 4466080258, 4466076995, 4417250225 starburst) keep short titles during the window; retitling the winners mid-experiment would move the very traffic being measured.
- ☐ **P5 — one video per week.** Videos lift search placement, so adding them unevenly mid-window biases whichever arm gets them. Only 1 of 27 active listings has a video.
- ☐ **Fix 4417249682's skill-level contradiction** — tags carry "advanced embroidery", "intermediate pattern" and "beginner pattern" at once, against content principle 7.
- ☐ **Fix 4414949521’s two wrong tags** — `cross stitch designs` (wrong craft — counted-thread, not hand embroidery) and `fall leaves art` (wrong motif — this is the *floral* listing). Both are factually inaccurate, not merely weak. The ad-side patch is already in place (the term is marked not relevant), but Etsy derives ad keywords from title and tags, so the tag edit is the actual fix. Blocked until now because 4414949521 is unassigned and its listing content is frozen for the window.
- ☐ **Prune the protected listings' generic ad keywords** — the mandala's "embroidery patterns" converts at 2.6%; pruning it mid-window would change the winner's traffic.
- ✅ ~~**Etsy’s own dashboard title suggestions**~~ — the 2026-09-17 batch flagged all nine holiday listings; screenshotted and dismissed the same day, no titles changed. Captured as a pull note: [2026-09-17-etsy-title-suggestions](pulls/2026-09-17-etsy-title-suggestions.md). **Standing rule for the next batch:** on a protected, treatment, control or unassigned listing, hold until the readout — accepting one overwrites the intervention being measured. On any listing, run it past the [copy rules](../experiments/etsy-notion-sync/docs/tag-positioning-experiment.md#copy-rules-every-treatment-edit-follows-these) first, and screenshot before dismissing.

## 4. Completeness sweep — the three systematic zeros

From the [shop health ledger](ETSY_SHOP_HEALTH_LEDGER.md): mean Tier-B completeness sits at 50.5% across active listings, held down by three criteria that are at **0 of 27**. These are one batch of work, and each touches experiment listings.

- ☐ **Alt text on every image** (0/27). The single biggest completeness lever, and an accessibility win outright.
- ☐ **Two styles per listing** (0/27) — the holiday batch already ships with styles; the back catalogue has none.
- ☐ **Photos toward 20** (0/27 at the threshold) — the 12-role galleries exist in Drive and Notion for 38 SKUs but were never uploaded to the older listings.

Closing all three roughly doubles the completeness number, which is the ecosystem's primary measure.

## 5. Not blocked — ship any time

These are here only so they aren't forgotten; none of them touch the experiment.

- ☐ Attach the bundle's gallery images in Notion: its gallery sits at Drive `_staging/WH-UN-B-STAGING` but the sync looks for the SKU folder (`WH-UN-S-C3DD`), so it never matches. Rename/move the folder, update `holiday_listing_ids.json`, rerun the gallery sync. The images are already correct on Etsy.
- ✅ ~~Assign the 9 holiday listings to Holiday / Personalized~~ — done 2026-09-16 (Holiday 60384454, Personalized 60384456).
- ☐ Fill the four partial gallery folders (WH-UN-S-3453 / -8779 / -CA26 / -DF8E) — each has the six photo-derived roles and is missing its six template-card roles.
- ☐ Label the 9 external eRank audit shops in [the eRank pull](pulls/2026-09-15-erank.md).

---

## Release ritual

1. Take the experiment readout (§1) and record it. **Nothing else starts first.**
2. Work §2–§4 in one sitting, so the shop changes once rather than drifting.
3. Re-run `bash scripts/run-batch-status.sh` and a sync, then append the month's row to the [ledger](ETSY_SHOP_HEALTH_LEDGER.md) — completeness should move sharply on the back of §4.
4. Open the next release doc and move anything unfinished into it, rather than leaving it loose.
