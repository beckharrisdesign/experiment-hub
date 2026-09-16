# W&H shop design system — content principles

*Chapter 2 of two ([image principles](image-principles.md) is the other). The written form of the design system layer in the [ecosystem map](../ETSY_ECOSYSTEM_MAP_2026-09.md) §1 — the layer owns these rules; [Authorship](../ETSY_ECOSYSTEM_MAP_2026-09.md) (§5) is where they get applied. MVDS is the base; everything marked **Etsy extension** is marketplace-specific.*

**How to read this.** Every principle is a statement you can mark **met** or **not met** against a real listing — no interpretation required — followed by its receipt. A principle whose receipt stops existing gets deleted, not kept on inertia.

---

## Titles

### 1. Titles follow the formula *(Etsy extension)*

`[Unique descriptor] Hand Embroidery Pattern PDF, [positioning phrase], [hoop sizes]`. The listing's own descriptor leads; the searched phrase shape follows immediately.

**Bundles vary the middle.** A set can't claim to be one pattern, so it reads `[Collection] Embroidery Pattern Set, [N] Hand Embroidery PDF Designs, [member names], [skill] Bundle` — the same searched words in a shape that's true about a multi-pattern product. Example: the Christmas Classics set.

**Check:** single listings parse into the four parts in order; bundles carry "Embroidery Pattern Set", the design count, and "Hand Embroidery PDF".

> **Receipt:** copy rule 1, `experiments/etsy-notion-sync/docs/tag-positioning-experiment.md`; applied across the 13 sets in `experiments/etsy-notion-sync/docs/tag-experiment-copy.md`.

### 2. One unique primary descriptor per listing

Geometric wheel, leaf fan, diamond wreath — no descriptor is reused on another listing. Shared prefixes recreate the near-duplicate-title problem, where several listings split the same searches.

**Check:** the descriptor appears on exactly one live listing.

> **Receipt:** copy rule 2, plus the measured damage — four "Digital geometric embroidery pattern" titles (24v / 9v / 2v / 1v) and three floral equivalents in the experiment plan's "Redundancies to resolve."

### 3. "Digital" never appears in a title *(Etsy extension)*

No one searched it. Format lives in the phrase "pattern pdf", not in the word "digital".

**Check:** the word "digital" is absent from the title.

> **Receipt:** copy rule 1; Search Analytics + ads evidence baselined in the experiment plan — "digital products" as an ad keyword returned 28 impressions / 0 clicks (`docs/pulls/2026-09-16-etsy-ads-dashboard.md`).

## Tags

### 4. Format words are phrases, never standalone tags *(Etsy extension)*

"pattern pdf" and "pdf download" belong inside title phrases. "digital products", "digital product", "instant download", and "printable pdf" are not tags.

**Check:** none of those four strings occupies a tag slot.

> **Receipt:** copy rule 3; eRank scored "digital products" at 35 and "digital product" at 70 — the two weakest of 135 scored tags (`docs/pulls/2026-09-15-erank.md`).

### 5. No tag is shared across listings except a deliberate foundation

A tag appears on one listing's set unless it is a declared shared foundation (the "hand embroidery pattern" class). Cloned clusters compete with the listing they were cloned from.

**Check:** diff any two listings' tag sets — overlap is either zero or an explicitly listed foundation tag.

> **Receipt:** copy rule 4; the cloned-wellness cluster (4415081378, 4466797252 — 11–13 of 13 tags identical to the winner's) in the experiment plan.

### 6. All 13 tag slots are used

An unused slot is free search surface left on the table.

**Check:** the listing has 13 tags.

> **Receipt:** the untagged product line in the experiment plan — five "Grandma Hobbies" listings at 0 of 13 slots.

### 7. One skill level per listing

Beginner **or** intermediate **or** advanced, consistent between title and tags.

**Check:** exactly one skill level appears anywhere in the listing's copy.

> **Receipt:** copy rule 5; listing 4417249682 carried "advanced embroidery", "intermediate pattern", and "beginner pattern" simultaneously.

### 8. Wellness and gift language is positioning, not the primary keyword

Calm, slow stitching, self-care gift — they earn the positioning phrase slot when the design supports it, and never displace the searched descriptor.

**Check:** the wellness phrase sits in the positioning slot, not at the head of the title or in the lead tags.

> **Receipt:** copy rule 6; the specific-vs-generic CTR gradient in the ads evidence (specific terms ~40% CTR, generic ~2.6%, meta 0%).

## Descriptions

### 9. Descriptions follow the house skeleton

What it is → what you receive → hoop sizes and skill level → how to transfer → shop/FAQ close. Personalizable listings state the option, its character limit, and the delivery SLA.

**Check:** all skeleton sections are present and in order.

> **Receipt:** the shared template and the nine built descriptions in `docs/ETSY_HOLIDAY_DRAFTS_2026.md`; personalization contract (optional, ≤40 chars, 2-business-day custom PDF).

### 10. Every listing carries two style tags *(Etsy extension)*

Two styles per listing, drawn from the shop's declared pairs (classics and bundles: Minimalist + Cottagecore; globes: Whimsical + Cottagecore).

**Check:** the listing has exactly two styles from a declared pair.

> **Receipt:** the shared template in `ETSY_HOLIDAY_DRAFTS_2026.md` (a scorecard criterion); payload `holiday_drafts_2026.json`.

## Alt text

### 11. Alt text is one line per gallery role, from the component's visual description *(Etsy extension)*

Each role has a template — hero states the motif on fabric in a hoop; lifestyle adds the setting; scale names the size reference; transferring describes tracing; content-* name which part of the design; faq-* name the card's question. Alt text is generated from the component's own visual description, never invented per image.

**Check:** each uploaded image has alt text matching its role's template and naming the actual motif; nothing exceeds 500 characters.

> **Receipt:** the alt-text pack in `docs/ETSY_HOLIDAY_DRAFTS_2026.md`; machine form in `experiments/etsy-notion-sync/prototype/holiday_alt_text_2026.json`; visual descriptions live on the Content + Inventory component rows.

### 12. Alt text is applied at upload *(Etsy extension)*

Uploading an image wipes its alt text, so alt is set in the same call that uploads.

**Check:** after an upload run, every image has non-empty alt text.

> **Receipt:** `upload_listing_images.py` (`alt_for`, alt supplied at upload); the warning line in the holiday drafts doc — "apply AFTER image upload — uploads wipe alt."

## Copy handling

### 13. Copy is never retyped

Documents are the human form, payload JSONs are the machine form, and the machine form is regenerated from the documents. Tooling reads the payloads; nobody retypes a title into a form.

**Check:** the payload's strings match the document's, character for character.

> **Receipt:** `listing_copy_2026-09.json`, `holiday_drafts_2026.json`, `holiday_alt_text_2026.json`; `apply_listing_copy.py` echo-verifies what it wrote and aborts on mismatch.

---

## Applying this chapter

Before a batch ships, walk its copy against principles 1–13 and mark each met / not met in the batch review deck. Misses are fixed before activation, not after. Protected and control listings in a running experiment are exempt from edits for the experiment's duration — see the [tag positioning experiment](../../experiments/etsy-notion-sync/docs/tag-positioning-experiment.md).
