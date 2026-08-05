# Etsy SEO audit — WatermarkandHue, August 2026

Source: eRank Health Check export + Listing Audit, cross-checked against live
Etsy API data for all 19 listings. Tag proposals were written from each listing's
actual main image, not from the listing copy. Every number below is computed from
live data at render time.

## Terminology

**10 images is eRank's recommendation, not an Etsy limit.** Etsy accepts up to 20
per listing (`updateListing`'s `image_ids` takes "up to 20 images"), which is why
several listings sit above 10 and need no action.

## What eRank missed

eRank scores each listing in isolation, so it reported these as healthy listings
needing three more tags each. Across the shop:

- **10 listings shared a byte-identical 10-tag set.** Geometric, leaf mandala,
  firecracker, floral and starburst patterns all carried the same words.
- **3 more listings shared a second identical set**, two of them leaf patterns
  carrying floral tags.
- `hand embroidery` appeared on 15 of 19 listings.
- Not one tag in the 10-listing block named what its pattern actually depicts.

Filling the three empty slots would have left ten of thirteen tags identical.

A second gap the audit did not cover: on the listings inspected, images 1-5 were
the same photograph with different text overlays, and 6-8 were text-only FAQ
cards — one photograph per listing, and no styled or lifestyle shot anywhere.

## Before and after

| | Before | After |
| --- | --- | --- |
| Most-shared tag | `hand embroidery` on 15 listings | `botanical embroidery` on 7 listings |
| Worst listing pair | 10 of 13 tags shared | 6 of 13 |
| Listings at 13/13 tags | 4 of 19 | 19 of 19 |
| Listings at 10+ images | 3 of 19 | 18 of 19 |
| Images with alt text | 3 | 29 |

## Corrections to the original brief

- **Etsy tags cap at 20 characters.** Long multi-word phrases are not possible;
  every tag below is two or three words.
- **No spelling fixes needed.** The fresh Health Check reports 0 spelling issues
  on all 19. `timeframe` (#2) is standard English. `flowerbuds` (#13) was still
  worth splitting to `flower buds` — the only copy change made.
- **Alt text cannot be patched onto an existing image.** `alt_text` exists only as
  a parameter on `uploadListingImage`, so it is set by hand in Shop Manager, or
  free of charge on any newly uploaded image.
- **Superstar Keyword is an eRank field**, set manually there. No API.
- **Listing videos cannot be created via API.**

## Per-listing changes

### 1. Personalized Photo Portrait Ornament, Unique Engraved Wood Gift, Colorful Handmade Holiday, Multiple Shapes

`4522918821` — Photo portrait ornament (physical)

| | |
| --- | --- |
| Tags | 13 before, 13 now |
| Kept | `photo ornament`, `engraved ornament`, `portrait ornament`, `wood photo gift`, `heart ornament`, `circle ornament`, `personalized gift`, `family ornament`, `pet ornament`, `keepsake gift` |
| Added | `christmas ornament`, `family photo gift`, `line art portrait` |
| Removed | `star ornament`, `wood decor`, `custom gift` |
| Superstar keyword | personalized photo ornament |
| Images | 3 — needs +7 to reach 10 |
| Main image alt text | missing |
| Listing video | missing |

Alt text for the main image:

> Heart-shaped wood ornament held in a hand outdoors, engraved with a teal line-art portrait of a family of four on a natural wood grain background.

### 2. Digital leaf embroidery pattern — beginner-friendly design — PDF download for 6" and 8" hoops

`4466791377` — Radial mandala of outlined leaves

| | |
| --- | --- |
| Tags | 10 before, 13 now |
| Kept | `hand embroidery`, `embroidery pattern`, `embroidery hoop`, `beginner pattern`, `for beginners`, `easy embroidery`, `digital pattern`, `pdf pattern` |
| Added | `leaf embroidery`, `leaf pattern pdf`, `botanical pattern`, `leaf hoop art`, `nature embroidery` |
| Removed | `simple floral`, `floral hoop art` |
| Superstar keyword | leaf embroidery pattern |
| Images | 10 — at or above target, no action |
| Main image alt text | set |
| Listing video | missing |

Alt text for the main image:

> Wooden embroidery hoop holding white fabric stitched with a radial mandala of outlined leaves in black thread, arranged in a circle around a central leaf.

### 3. Digital geometric embroidery pattern — beginner-friendly design — PDF download for 6” or 8” hoops

`4466080258` — Geometric sunburst, concentric rings of fine rays

| | |
| --- | --- |
| Tags | 10 before, 13 now |
| Kept | `simple embroidery`, `hand needlework`, `sketch embroidery`, `embroidery drawing`, `embroidery gift`, `needlework pattern`, `simple needlework` |
| Added | `geometric pattern`, `geometric mandala`, `modern embroidery`, `mandala embroidery`, `geometric hoop art`, `minimalist pattern` |
| Removed | `embroidery designs`, `hand embroidery`, `easy embroidery` |
| Superstar keyword | geometric embroidery pattern |
| Images | 10 — at or above target, no action |
| Main image alt text | set |
| Listing video | missing |

Alt text for the main image:

> Wooden embroidery hoop holding white fabric stitched with a geometric mandala of concentric circles filled with fine radiating black lines, forming a sunburst.

### 4. Hand Drawn Leaf Mandala Embroidery Pattern – Beginner Friendly PDF Download (6" & 8" Hoops)

`4466799018` — Leaf mandala with small buds and sprigs

| | |
| --- | --- |
| Tags | 10 before, 13 now |
| Kept | `hand embroidery`, `hand needlework`, `easy embroidery` |
| Added | `leaf mandala`, `mandala pattern`, `botanical mandala`, `folk leaf design`, `nature mandala`, `scandi embroidery`, `beginner mandala`, `hoop embroidery`, `beginner design`, `modern needlework` |
| Removed | `simple embroidery`, `embroidery designs`, `sketch embroidery`, `embroidery drawing`, `embroidery gift`, `needlework pattern`, `simple needlework` |
| Superstar keyword | leaf mandala pattern |
| Images | 10 — at or above target, no action |
| Main image alt text | set |
| Listing video | missing |

Alt text for the main image:

> Wooden embroidery hoop holding white fabric stitched with a circular mandala of outlined leaves, small buds and sprigs radiating from a centre point in black thread.

### 5. Leaf Floral Embroidery Pattern – Beginner Friendly PDF Download (6" & 8" Hoops)

`4466795496` — Ring of pointed leaves alternating with segmented circles

| | |
| --- | --- |
| Tags | 10 before, 13 now |
| Kept | none |
| Added | `leaf rosette`, `geometric leaves`, `modern leaf art`, `radial leaf design`, `leaf circle pattern`, `simple leaf pattern`, `craft pattern pdf`, `instant download`, `printable pattern`, `embroidery template`, `stitching pattern`, `hoop embroidery`, `modern needlework` |
| Removed | `hand embroidery`, `embroidery pattern`, `embroidery hoop`, `beginner pattern`, `for beginners`, `easy embroidery`, `simple floral`, `floral hoop art`, `digital pattern`, `pdf pattern` |
| Superstar keyword | leaf hoop art pattern |
| Images | 10 — at or above target, no action |
| Main image alt text | missing |
| Listing video | missing |

Alt text for the main image:

> Wooden embroidery hoop holding white fabric stitched with a ring of pointed leaves alternating with small segmented circles around a central rosette, in black thread.

### 6. Digital hand-drawn firecracker embroidery pattern — beginner-friendly design — PDF download for calm stitching

`4466795015` — Twelve-point star burst with rays and cross stitches

| | |
| --- | --- |
| Tags | 10 before, 13 now |
| Kept | `embroidery designs`, `sketch embroidery`, `needlework pattern` |
| Added | `starburst pattern`, `boho embroidery`, `sunburst design`, `star embroidery`, `boho hoop art`, `celestial pattern`, `firecracker design`, `embroidery pattern`, `embroidery template`, `digital pattern` |
| Removed | `simple embroidery`, `hand embroidery`, `hand needlework`, `embroidery drawing`, `easy embroidery`, `embroidery gift`, `simple needlework` |
| Superstar keyword | starburst embroidery pattern |
| Images | 10 — at or above target, no action |
| Main image alt text | set |
| Listing video | missing |

Alt text for the main image:

> Wooden embroidery hoop holding white fabric stitched with a twelve-point star surrounded by radiating lines and small cross stitches, in black thread.

### 7. Digital geometric embroidery pattern — beginner-friendly design — PDF download for 6" and 8" hoops

`4466789627` — Radial wheel of pie segments in concentric rings

| | |
| --- | --- |
| Tags | 10 before, 13 now |
| Kept | `simple embroidery`, `simple needlework` |
| Added | `geometric wheel`, `radial pattern`, `modern geometric`, `wheel embroidery`, `abstract pattern`, `line art pattern`, `geometric design`, `pdf pattern`, `slow stitching`, `stitching pattern`, `beginner pattern` |
| Removed | `embroidery designs`, `hand embroidery`, `hand needlework`, `sketch embroidery`, `embroidery drawing`, `easy embroidery`, `embroidery gift`, `needlework pattern` |
| Superstar keyword | geometric wheel pattern |
| Images | 10 — at or above target, no action |
| Main image alt text | missing |
| Listing video | missing |

Alt text for the main image:

> Wooden embroidery hoop holding white fabric stitched with a radial wheel of pie-shaped segments in concentric rings, drawn in fine black outlines.

### 8. Digital geometric embroidery pattern — beginner-friendly design — calming wall art PDF download

`4466082116` — Geometric rosette, circles and triangles, wall-art styling

| | |
| --- | --- |
| Tags | 10 before, 13 now |
| Kept | `embroidery drawing`, `embroidery gift` |
| Added | `geometric rosette`, `wall art pattern`, `geometric wall art`, `modern wall decor`, `circle pattern`, `boho wall art`, `mandala wall art`, `for beginners`, `hoop art pattern`, `instant download`, `organic pattern` |
| Removed | `simple embroidery`, `embroidery designs`, `hand embroidery`, `hand needlework`, `sketch embroidery`, `easy embroidery`, `needlework pattern`, `simple needlework` |
| Superstar keyword | geometric wall art pattern |
| Images | 10 — at or above target, no action |
| Main image alt text | set |
| Listing video | missing |

Alt text for the main image:

> Embroidery hoop on a green and tan flat lay with floss and scissors, holding fabric stitched with a geometric rosette of circles and triangles in black outline.

### 9. Digital floral embroidery pattern — beginner-friendly design — PDF download for 6" and 8" hoops

`4466078772` — Folk floral: central plant, tulip blooms, arch border

| | |
| --- | --- |
| Tags | 10 before, 13 now |
| Kept | `sketch embroidery` |
| Added | `folk floral`, `tulip embroidery`, `folk art flowers`, `scandinavian floral`, `flower pattern pdf`, `folk hoop art`, `nordic embroidery`, `embroidery hoop`, `botanical embroidery`, `craft pattern pdf`, `easy embroidery pdf`, `printable pattern` |
| Removed | `simple embroidery`, `embroidery designs`, `hand embroidery`, `hand needlework`, `embroidery drawing`, `easy embroidery`, `embroidery gift`, `needlework pattern`, `simple needlework` |
| Superstar keyword | folk floral embroidery pattern |
| Images | 10 — at or above target, no action |
| Main image alt text | missing |
| Listing video | missing |

Alt text for the main image:

> Wooden embroidery hoop holding white fabric stitched with a folk-style plant bearing tulip blooms and leaves, ringed by a border of small arches, in black thread.

### 10. Digital geometric embroidery pattern — beginner-friendly hoop design — PDF download for calm stitching

`4466076995` — Minimal sunburst, straight rays only

| | |
| --- | --- |
| Tags | 10 before, 13 now |
| Kept | `simple embroidery`, `embroidery designs` |
| Added | `minimal embroidery`, `sunburst pattern`, `simple line art`, `modern minimalist`, `beginner geometric`, `calm stitching`, `easy line pattern`, `diy embroidery`, `hoop embroidery`, `embroidery pattern`, `modern needlework` |
| Removed | `hand embroidery`, `hand needlework`, `sketch embroidery`, `embroidery drawing`, `easy embroidery`, `embroidery gift`, `needlework pattern`, `simple needlework` |
| Superstar keyword | minimalist embroidery pattern |
| Images | 10 — at or above target, no action |
| Main image alt text | set |
| Listing video | missing |

Alt text for the main image:

> Embroidery hoop on a green and tan flat lay with floss and scissors, holding fabric stitched with a minimal sunburst of straight black lines radiating from a centre point.

### 11. Digital floral embroidery pattern — beginner-friendly design — PDF download for 6" or 8" hoops

`4465359686` — Symmetrical folk arrangement of leaves and berry sprigs

| | |
| --- | --- |
| Tags | 10 before, 13 now |
| Kept | `hand embroidery`, `easy embroidery` |
| Added | `folk botanical`, `leaf and berry`, `symmetrical design`, `botanical folk art`, `berry embroidery`, `modern botanical`, `leafy pattern pdf`, `simple needlework`, `organic pattern`, `embroidery template`, `embroidery drawing` |
| Removed | `embroidery pattern`, `embroidery hoop`, `beginner pattern`, `for beginners`, `simple floral`, `floral hoop art`, `digital pattern`, `pdf pattern` |
| Superstar keyword | botanical embroidery pattern |
| Images | 10 — at or above target, no action |
| Main image alt text | missing |
| Listing video | missing |

Alt text for the main image:

> Wooden embroidery hoop holding white fabric stitched with a symmetrical arrangement of pointed leaves, berry sprigs and small fans in black outline.

### 12. Digital floral embroidery pattern — hand-drawn flower design — intermediate PDF download

`4417249682` — Navy star rosette of serrated leaves, intermediate

| | |
| --- | --- |
| Tags | 10 before, 13 now |
| Kept | `needlework pattern`, `hand needlework` |
| Added | `navy embroidery`, `leaf star design`, `intermediate pattern`, `detailed botanical`, `leaf rosette pdf`, `advanced embroidery`, `statement hoop art`, `pdf pattern`, `botanical embroidery`, `hoop embroidery`, `beginner pattern` |
| Removed | `simple embroidery`, `embroidery designs`, `hand embroidery`, `sketch embroidery`, `embroidery drawing`, `easy embroidery`, `embroidery gift`, `simple needlework` |
| Superstar keyword | intermediate embroidery pattern |
| Images | 10 — at or above target, no action |
| Main image alt text | missing |
| Listing video | missing |

Alt text for the main image:

> Wooden embroidery hoop holding white fabric stitched in navy thread with a star-shaped rosette of detailed serrated leaves radiating from a dense centre.

### 13. Floral Embroidery Pattern, Botanical Wreath Design, Beginner Hoop Art (PDF Download)

`4466793009` — Botanical wreath: leafy vine border, seed pods, starburst centre

| | |
| --- | --- |
| Tags | 13 before, 13 now |
| Kept | `embroidery designs`, `needlework pattern`, `simple needlework`, `floral pattern`, `botanical embroidery`, `self care gift`, `round wreath design`, `fall wreath diy`, `flower bud stitching`, `calm stitching`, `healing art project`, `printable pdf`, `digital product` |
| Added | none |
| Removed | none |
| Superstar keyword | botanical wreath pattern |
| Images | 10 — at or above target, no action |
| Main image alt text | missing |
| Listing video | missing |
| Description | `flowerbuds` to `flower buds` — applied |

Alt text for the main image:

> Wooden embroidery hoop holding white fabric stitched with a wreath of leafy vines enclosing a ring of seed pods around a starburst centre, in black thread.

### 14. Digital floral embroidery pattern — beginner-friendly design — PDF download for 6" & 8" hoops

`4465356349` — Ring of striped leaf fans around a star centre

| | |
| --- | --- |
| Tags | 12 before, 13 now |
| Kept | `radial design`, `calm stitching`, `slow craft`, `leaf embroidery` |
| Added | `leaf fan design`, `striped leaf pattern`, `star centre mandala`, `fan embroidery`, `embroidery designs`, `hoop art pattern`, `botanical embroidery`, `diy embroidery`, `printable pattern` |
| Removed | `hand embroidery`, `embroidery pattern`, `embroidery hoop`, `beginner pattern`, `for beginners`, `easy embroidery`, `simple floral`, `digital pattern` |
| Superstar keyword | leaf mandala embroidery |
| Images | 10 — at or above target, no action |
| Main image alt text | set |
| Listing video | missing |

Alt text for the main image:

> Wooden embroidery hoop holding white fabric stitched with a ring of striped leaf fans and small berry sprigs surrounding an eight-point star, in black thread.

### 15. Digital hand drawn leaves embroidery pattern — beginner-friendly design — PDF download for calm stitching

`4417250834` — Ornate folk floral on linen, pastel floss styling

| | |
| --- | --- |
| Tags | 10 before, 13 now |
| Kept | `embroidery gift` |
| Added | `ornate floral`, `folk flower design`, `linen embroidery`, `vintage floral`, `decorative pattern`, `symmetrical floral`, `cottagecore pattern`, `digital pattern`, `beginner design`, `craft pattern pdf`, `for beginners`, `slow stitching` |
| Removed | `simple embroidery`, `embroidery designs`, `hand embroidery`, `hand needlework`, `sketch embroidery`, `embroidery drawing`, `easy embroidery`, `needlework pattern`, `simple needlework` |
| Superstar keyword | folk flower embroidery pattern |
| Images | 13 — at or above target, no action |
| Main image alt text | missing |
| Listing video | missing |

Alt text for the main image:

> Embroidery hoop on natural linen with pastel floss and gold scissors, holding fabric stitched with an ornate symmetrical folk floral of flowers and leaves.

### 16. Digital hand-drawn starburst embroidery pattern — intermediate design — PDF download

`4417250225` — Elaborate boho mandala star, intermediate

| | |
| --- | --- |
| Tags | 10 before, 13 now |
| Kept | `simple needlework` |
| Added | `boho mandala`, `detailed mandala`, `intermediate design`, `ornate star pattern`, `mandala hoop art`, `bohemian pattern`, `statement mandala`, `hoop art pattern`, `embroidery hoop`, `modern needlework`, `easy embroidery pdf`, `instant download` |
| Removed | `simple embroidery`, `embroidery designs`, `hand embroidery`, `hand needlework`, `sketch embroidery`, `embroidery drawing`, `easy embroidery`, `embroidery gift`, `needlework pattern` |
| Superstar keyword | boho mandala embroidery pattern |
| Images | 11 — at or above target, no action |
| Main image alt text | missing |
| Listing video | missing |

Alt text for the main image:

> Wooden embroidery hoop holding white fabric stitched with an elaborate twelve-point boho mandala of layered chevrons, dots and starbursts in dense black thread.

### 17. Beginner floral embroidery design — PDF digital product — 6" & 8" hoops

`4414949521` — Floral rosettes and leaves with scalloped border

| | |
| --- | --- |
| Tags | 11 before, 13 now |
| Kept | `embroidery designs`, `self care gift`, `digital products`, `embroidery pattern`, `embroidery pdf`, `round embroidery`, `botanical embroidery`, `cross stitch designs`, `fall leaves art`, `hoop wall art`, `burnout recovery` |
| Added | `floral rosette`, `scalloped border` |
| Removed | none |
| Superstar keyword | beginner floral embroidery |
| Images | 13 — at or above target, no action |
| Main image alt text | set |
| Listing video | yes |

Alt text for the main image:

> Embroidery hoop on a green flat lay with pink, gold and teal floss, holding fabric stitched with floral rosettes and leaves inside a scalloped border.

### 18. Beginner Botanical Embroidery Design, Floral Hoop Art Pattern (PDF Download)

`4465357735` — Botanical folk motif with blanket-stitch border

| | |
| --- | --- |
| Tags | 13 before, 13 now |
| Kept | `embroidery designs`, `hand needlework`, `needlework pattern`, `beginner embroidery`, `floral hoop art`, `beginner friendly`, `fall hoop art`, `self care gift`, `calm stitching`, `pdf download`, `digital product`, `botanical embroidery`, `whimsical forest art` |
| Added | none |
| Removed | none |
| Superstar keyword | botanical hoop art pattern |
| Images | 10 — at or above target, no action |
| Main image alt text | missing |
| Listing video | missing |

Alt text for the main image:

> Wooden embroidery hoop holding white fabric stitched with a symmetrical botanical motif of leaves, buds and small flowers inside a dense blanket-stitch border.

### 19. Digital embroidery pattern — botanical wreath and branch design — beginner-friendly PDF download

`4466797252` — Wreath and branch: leafy vine circle, branching centre

| | |
| --- | --- |
| Tags | 13 before, 13 now |
| Kept | `hand embroidery`, `hoop art pattern`, `easy embroidery pdf`, `botanical embroidery`, `simple embroidery`, `beginner design`, `beginner craft`, `organic pattern`, `hand drawn pattern`, `meditation pattern`, `stress relief`, `modern hand pattern`, `slow stitching` |
| Added | none |
| Removed | none |
| Superstar keyword | wreath embroidery pattern |
| Images | 10 — at or above target, no action |
| Main image alt text | missing |
| Listing video | missing |

Alt text for the main image:

> Wooden embroidery hoop holding white fabric stitched with a leafy vine wreath enclosing a circle of branching stems radiating from the centre, in black thread.

## Status

| Change | Route | Status |
| --- | --- | --- |
| Tags (all 19) | `updateListing` PATCH | done, verified |
| Description fix (#13) | `updateListing` PATCH | done, verified |
| Images | `uploadListingImage` | 7 still needed across 1 listings |
| Main-image alt text | Shop Manager, by hand | 11 listings outstanding |
| Superstar keyword | eRank, by hand | 19 outstanding |
| Listing video | not available via API | 18 outstanding |

## Manual checklist

### Main-image alt text — paste into Shop Manager

- [ ] **1** `4522918821` — Heart-shaped wood ornament held in a hand outdoors, engraved with a teal line-art portrait of a family of four on a natural wood grain background.
- [ ] **5** `4466795496` — Wooden embroidery hoop holding white fabric stitched with a ring of pointed leaves alternating with small segmented circles around a central rosette, in black thread.
- [ ] **7** `4466789627` — Wooden embroidery hoop holding white fabric stitched with a radial wheel of pie-shaped segments in concentric rings, drawn in fine black outlines.
- [ ] **9** `4466078772` — Wooden embroidery hoop holding white fabric stitched with a folk-style plant bearing tulip blooms and leaves, ringed by a border of small arches, in black thread.
- [ ] **11** `4465359686` — Wooden embroidery hoop holding white fabric stitched with a symmetrical arrangement of pointed leaves, berry sprigs and small fans in black outline.
- [ ] **12** `4417249682` — Wooden embroidery hoop holding white fabric stitched in navy thread with a star-shaped rosette of detailed serrated leaves radiating from a dense centre.
- [ ] **13** `4466793009` — Wooden embroidery hoop holding white fabric stitched with a wreath of leafy vines enclosing a ring of seed pods around a starburst centre, in black thread.
- [ ] **15** `4417250834` — Embroidery hoop on natural linen with pastel floss and gold scissors, holding fabric stitched with an ornate symmetrical folk floral of flowers and leaves.
- [ ] **16** `4417250225` — Wooden embroidery hoop holding white fabric stitched with an elaborate twelve-point boho mandala of layered chevrons, dots and starbursts in dense black thread.
- [ ] **18** `4465357735` — Wooden embroidery hoop holding white fabric stitched with a symmetrical botanical motif of leaves, buds and small flowers inside a dense blanket-stitch border.
- [ ] **19** `4466797252` — Wooden embroidery hoop holding white fabric stitched with a leafy vine wreath enclosing a circle of branching stems radiating from the centre, in black thread.

### Superstar keyword — set in eRank

- [ ] **1** `4522918821` — personalized photo ornament
- [ ] **2** `4466791377` — leaf embroidery pattern
- [ ] **3** `4466080258` — geometric embroidery pattern
- [ ] **4** `4466799018` — leaf mandala pattern
- [ ] **5** `4466795496` — leaf hoop art pattern
- [ ] **6** `4466795015` — starburst embroidery pattern
- [ ] **7** `4466789627` — geometric wheel pattern
- [ ] **8** `4466082116` — geometric wall art pattern
- [ ] **9** `4466078772` — folk floral embroidery pattern
- [ ] **10** `4466076995` — minimalist embroidery pattern
- [ ] **11** `4465359686` — botanical embroidery pattern
- [ ] **12** `4417249682` — intermediate embroidery pattern
- [ ] **13** `4466793009` — botanical wreath pattern
- [ ] **14** `4465356349` — leaf mandala embroidery
- [ ] **15** `4417250834` — folk flower embroidery pattern
- [ ] **16** `4417250225` — boho mandala embroidery pattern
- [ ] **17** `4414949521` — beginner floral embroidery
- [ ] **18** `4465357735` — botanical hoop art pattern
- [ ] **19** `4466797252` — wreath embroidery pattern

### Images — upload to reach 10 each

- [ ] **1** `4522918821` — has 3, needs +7

Renders can be produced from the Figma base patterns via
`lib/etsy-listing-kit/generator.ts` — see the note below.

## Generating listing images

Source art lives in the W&H Listing Generator Figma file
(`ZZusgWsPM4Fz8YuhKxnD4R`), page `Embroidery Base Patterns`, as 2000x2000
components. Export a component as PNG and run it through `generatePack()` in
`lib/etsy-listing-kit/generator.ts` for six scenes.

### Verified listing to Figma component map

Each was confirmed by rendering the component beside the listing's live main
image. Names alone are not reliable — several listings are titled "floral" but
depict leaves.

| # | Listing | Figma component | Node |
| --- | --- | --- | --- |
| 2 | `4466791377` | Leaves Variety 8up | `130:25519` |
| 3 | `4466080258` | Geo Diagonals | `128:22453` |
| 4 | `4466799018` | Hand Drawn Leaf Mandala | `274:46784` |
| 5 | `4466795496` | Leaves Combo 8up | `128:24850` |
| 6 | `4466795015` | Hand Drawn Firecracker | `274:46782` |
| 7 | `4466789627` | Geo Plain | `127:21643` |
| 8 | `4466082116` | Geo Masonic | `128:22514` |
| 9 | `4466078772` | Flowers Quad | `130:24949` |
| 10 | `4466076995` | Geo Lines | `128:23219` |
| 11 | `4465359686` | Fans Triad | `127:19209` |
| 12 | `4417249682` | Hand Drawn Flower | `52:6607` |
| 13 | `4466793009` | Olympic Crown + Flower | `128:22044` |
| 14 | `4465356349` | Fans 8up | `127:20924` |
| 18 | `4465357735` | Flowers Triad | `128:23328` |
| 19 | `4466797252` | Olympic Leaves 8up | `127:21215` |

Listing #1 is a laser-engraved wood ornament, not an embroidery pattern — the
generator does not apply. Its 7 missing images need real product photography.

### Choosing a scene

- `in-hoop` duplicates the plain-grey look every gallery already overuses. Skip it.
- `scale` (terracotta on emerald) is the highest-contrast scene, but the saturated
  ground swallows sparse line work. Good for dense designs, wrong for #7 and #10.
- `framed`, `floss` and `sewn` are all the same sage-and-tan set and read as
  siblings at thumbnail size — avoid pairing two of them on one listing.
- #12's base pattern is black but the listing is stitched navy. Its render is
  recoloured to `rgb(34, 32, 66)`, sampled from the live image.

### uploadListingImage: rank is an INSERT position, not append

`rank` does not mean "put it at this index of the final array". Uploading two
images a second apart with `rank: 9` and `rank: 10` to an 8-image listing did
**not** reliably append them. On 5 listings the uploaded image ended up at
rank 1, replacing the main thumbnail, with the second landing at rank 3, 4 or 6.

Listings whose main thumbnail changed this way: #2, #3, #4, #6, #14. Katy chose
to keep the new thumbnails rather than revert them.

**Always verify placement after upload, not just image count.** The count reaches
10 whether or not the ordering is what you asked for. Two diagnostics that do
*not* work: `listing_image_id` (Etsy reassigns it during processing) and byte
comparison of the CDN derivative (re-encoded per request, so everything looks
changed). Comparing `alt_text` on the rank-1 image is reliable.

## Rollback

Original tag sets are saved as `rollback_original_listings.json` in the session
scratchpad. Reverting is one PATCH per listing with the old array.

