# W&H shop design system — image principles

*Chapter 1 of two ([content principles](content-principles.md) is the other). The written form of the design system layer in the [ecosystem map](../ETSY_ECOSYSTEM_MAP_2026-09.md) §1. MVDS is the base; everything marked **Etsy extension** is a marketplace-specific addition.*

**How to read this.** Every principle is a statement you can mark **met** or **not met** against a real image — no interpretation required — followed by its receipt: the artifact that justifies it. A principle whose receipt stops existing gets deleted, not kept on inertia.

**Where the images come from.** Two production paths, both governed by this chapter:

1. **Figma → Drive (the 12-role galleries).** Layouts instances composed on the `Garden Components` page, exported to `W+H Listings/W+H Listings/<SKU>/`, synced to Content + Inventory.
2. **Code (`lib/etsy-listing-kit/`).** `generator.ts`'s six-scene pack and `scenes.ts`'s ten-image ladder, over the same W&H template photography in `assets/mockups/`. This path does **not** consume Layouts exports; it expresses the same composition language independently.

---

## 1. Every gallery image is an instance of a named layout

A listing image occupies one of the roles below. If an image can't be named by its role, it doesn't ship.

| Gallery role (Drive filename) | Layouts variant | Source |
|---|---|---|
| `hero` | Basic | Layouts instance |
| `badge` | Badge | Layouts instance |
| `content-center` | Content Center | Layouts instance |
| `content-tl` | Content Top Left | Layouts instance |
| `content-bl` | Content Bottom Left | Layouts instance |
| `content-suggestions-4up` | Recos 4up | Layouts instance |
| `transferring` | Transferring patterns | Layouts instance |
| `faq-1` / `faq-2` / `faq-3` | FAQ 1 / FAQ 2 / FAQ 3 | Layouts instances |
| `lifestyle` | — | Photo-derived (template photography) |
| `scale` | — | Photo-derived (template photography) |

Two variants — **Recos 2up** and **Recos Hoop** — exist in the set but no current role uses them; they are available capacity, not missing work.

**Check:** every file in a SKU's gallery folder carries a role name from column 1, and no role appears twice.

> **Receipt:** `Layouts` component set, W+H Listing Generator (`ZZusgWsPM4Fz8YuhKxnD4R`), `Garden Components` page — page node `2041:55504`, set node `2041:55505`. Drive: `W+H Listings/W+H Listings/<SKU>/`. Consumed by `experiments/etsy-notion-sync/prototype/upload_listing_images.py` (`ROLE_ORDER`).

## 2. Artwork enters through a slot, never by redrawing

A design is placed into `Slot-BaseArtwork` over `Slot-Background`; Watermark, Banner, and Logo come from their shared components. A layout is never rebuilt by hand to accommodate one design.

**Check:** the frame is an instance (not a detached copy), and its watermark/banner/logo are component instances.

> **Receipt:** slot structure on the `Garden Components` page (Slot-Background-*, Slot-BaseArtwork-*, Watermark, Banner, Logo, Embroidery Backgrounds). Same discipline in code: `generator.ts` composites the design onto a real hoop photo template rather than redrawing the scene.

## 3. The design scales to its scene's fabric circle

In hoop scenes the artwork sits and scales relative to the scene's fabric circle — the same design reads consistently across every scene rather than floating at an arbitrary size.

**Check:** the design is centered in the hoop's fabric area and its scale matches sibling scenes of the same SKU.

> **Receipt:** `lib/etsy-listing-kit/generator.ts` — "The design always scales relative to its scene's fabric circle and sits…" plus the fabric-circle center/radius model for the 2000px template.

## 4. Color is sampled from the work, never invented *(Etsy extension)*

Template cards take their palette from the listing's own photos. When photos are too muted to sample, the documented fallback is used — no brand color is fabricated from noise.

**Check:** card grounds read as colors present in the listing's photos, or are the declared fallback.

> **Receipt:** `lib/etsy-listing-kit/palette.ts` — saturation/brightness gates, minimum bucket share, and `PALETTE_FALLBACK` (ELK terracotta) as the honest fallback. Design decision 27, Figma 02.26.

## 5. Cards render only when their content exists

A data card appears only if the fields it displays are present. Gaps are filled with additional photo treatments; blank slots stay in the template file and never reach a listing.

**Check:** no shipped image contains an empty field, placeholder, or lorem text.

> **Receipt:** `lib/etsy-listing-kit/scenes.ts` ladder rules — "Data cards render only when their fields exist — no field, no card"; "Blank slots live in the template file, not in shipped images."

## 6. Nothing on an image is fabricated copy

Every string a template card renders comes from the listing's own brief, verbatim and sourced. The one exception is the composed headline, which is passed in explicitly.

**Check:** each visible string traces to the brief or to the declared headline.

> **Receipt:** `scenes.ts` — copy provenance is returned for assertion (QA 4.6); design decision 30 for the headline exception.

## 7. All gallery output is 2000×2000 *(Etsy extension)*

Square at 2000px, the size Etsy's zoom rewards and the size the Layouts set is built at.

**Check:** exported dimensions are exactly 2000×2000.

> **Receipt:** `Layouts` variants are 2000×2000 (`2041:55505`); `PACK_IMAGE_PX = 2000` in `lib/etsy-listing-kit/config.ts`.

## 8. Siblings must be distinguishable at thumbnail size *(Etsy extension)*

Two listings from the same collection cannot share a hero that reads identically in a 170px search thumbnail — near-identical thumbnails split the same searches, the visual form of the near-duplicate-title problem.

**Check:** view the shop grid at thumbnail scale; each listing is individually identifiable.

> **Receipt:** the near-duplicate-title clusters in `experiments/etsy-notion-sync/docs/tag-positioning-experiment.md` ("Redundancies to resolve"); `generator.ts` swapped a repeated scene photo "to keep all six scenes distinct."

## 9. The first image carries the pattern itself

The hero shows the embroidery design clearly on fabric in a hoop. Lifestyle framing, FAQ cards, and suggestions come after — a buyer must recognize what they're buying before they see how it's styled.

**Check:** image rank 1 is the `hero` role.

> **Receipt:** `ROLE_ORDER` in `upload_listing_images.py` (explicit sequential rank, hero first); alt-text pack hero lines in `docs/ETSY_HOLIDAY_DRAFTS_2026.md`.

## 10. Bundle galleries are composed, not concatenated *(Etsy extension)*

A bundle's gallery is assembled in a staging frame from Layouts instances — it doesn't reuse member listings' heroes as-is.

**Check:** the bundle has its own staged gallery folder, not copied member images.

> **Receipt:** `staging/WH-UN-B-7584/` on the `Garden Components` page (hero, lifestyle, detail-1..4, color-options, endcap); `_staging/WH-UN-B-STAGING/` in Drive; `scripts/compose-classics-bundle.mjs`.

---

## Applying this chapter

Before a batch ships, walk its galleries against principles 1–10 and mark each met / not met. Misses are fixed before activation, not after. The batch review deck is where this happens ([map §5, Authorship](../ETSY_ECOSYSTEM_MAP_2026-09.md)).
