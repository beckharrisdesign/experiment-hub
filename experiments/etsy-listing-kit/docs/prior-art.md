# Prior art — earlier Etsy-listing surfaces

Captured 2026-07-24 before the new `etsy-listing-kit` experiment, so the earlier
attempt isn't forgotten. Screenshots taken from the running prototype (port 3001).

## `etsy-listing-manager` prototype — "Neon Purl / Shop Manager"

A **full multi-page manager app**, not a single paid transaction. Next.js 15, runs on
port 3001 (`experiments/etsy-listing-manager/prototype`, `npm run dev`). Local SQLite-style
DB, no payment, no accounts gate. Nav: Dashboard · Patterns · Templates · Listings · Store · Debug.

| Route | What it was | Relevance to `etsy-listing-kit` |
| --- | --- | --- |
| `/` Dashboard | Counts of Patterns / Templates / Listings; a seeded "Single pattern · digital PDF (Etsy SEO default)" template | Shows the manager framing we are deliberately **dropping** |
| `/patterns` | **Drag & drop / paste image upload** — "Each image creates a pattern" | Closest predecessor to the new single-file upload; reuse the upload UX, drop the library |
| `/listings/new` | 3-step wizard: Select Template → Select Patterns → Edit Details; focused on **Etsy SEO title/description text** generation | The new kit is about **image assets**, not SEO copy — different output |
| `/templates`, `/store` | Product-template CRUD + store settings | Out of scope for the paid transaction |

### Key takeaways for the new experiment

1. The earlier attempt optimized for **managing many listings over time** (accounts-of-work,
   library, CRUD). The new bet is the opposite: **one file → one paid pack → leave.** No library.
2. The strongest reusable idea is the **paste/drag upload** on `/patterns`.
3. The earlier work centered on **SEO text**; the new wedge centers on **image assets**
   (hero + sized gallery variants + framed mockup). These are complementary, not the same product.
4. Branding "Neon Purl" was demo data, not a committed brand.

> Screenshots of Dashboard, `/patterns`, and `/listings/new` were captured in the
> 2026-07-24 build session transcript. Re-run `npm run dev` in the prototype (port 3001)
> to reproduce.
