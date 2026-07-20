## Human anchor

> "I have 20ish listings, and zero sales. I have no idea what is going wrong, and what
> even to tweak without completely muddying the signal." … "surface the output on the labs
> project page … but I want these kind of artifacts to exist publicly." (founder, 2026-07-20)

## Outcomes

- **Who:** Katy, running a super-early Etsy shop (~20 listings, zero sales, zero reviews), plus anyone reading the public labs page.
- **Job:** See, per listing, whether it is objectively *finished* to Etsy's own standard — separating "just not done yet" from "done, needs a real test" — so hygiene gets fixed before any experiment muddies the signal.
- **Done when:** The labs project page publicly shows each listing's completeness score with a ranked "fix these first" list, computed only from data the read-only pipeline already captures.
- **Not doing:** No writes to Etsy. No A/B tests or copy suggestions. No sales/receipts/reviews data (none exist yet). No tag-map (L3). Current **views/favorites values** are shown and used to prioritize suggestions (a cheap, already-captured slice of L2); the favorites/views **trend over time** stays L2 and is held.

## Why

At zero sales this is a **funnel-diagnosis** problem, not an optimization one (see [explore.md](explore.md)). Before running any test you have to know a listing is *complete*, because fixing an objectively missing field isn't an experiment — it costs no signal — whereas tweaking a half-built listing teaches nothing. The scorecard is the hygiene gate that has to pass before L2/L3 diagnosis begins. Making it a public artifact is the founder's "build in the open" intent.

## Discovery: what Etsy considers good/bad in a listing (2026-07)

Two sources, kept distinct on purpose. **Tier A** is enforced by the Etsy API itself (confirmed live via the Etsy MCP `getListing` schema + `createDraftListing` required-field list, 2026-07) — these are objective pass/fail. **Tier B** is Etsy Seller Handbook guidance (current search-ranking article set, verified 2026-07 via search) — softer quality/SEO, scored not gated. Rows marked † are long-standing Etsy platform caps that the blocked Handbook fetch (HTTP 403) could not re-confirm live this session — **verify the exact number in Shop Manager before locking** (founder decision 2026-07-20: keep the defaults, verify later).

**Feasibility filter (adjusted 2026-07-20):** every criterion below is scored **only from data the capture pipeline already pulls** — `etsy_api.py` requests `includes = Shipping,Images,Shop,User,Translations,Inventory,Videos,Personalization,BuyerPrice` plus the per-listing inventory endpoint. So images, alt text, videos, tags, materials, styles, section, and all base fields are on hand with **no new Etsy calls**. Two candidates from the first draft were cut/changed for feasibility: **listing attributes/properties** need a separate `getListingProperties` call per listing (there is no `Properties` include; inventory only carries *variation* `property_values`) → **deferred**, not scored in v1; and **title keyword front-loading** isn't objectively scoreable without knowing target keywords → replaced by measurable **title length**.

### Tier A — Publishability gate (hard, API-enforced → pass/fail)

| Criterion | Target | API field (`getListing`) | Notes |
|---|---|---|---|
| Has a title | present | `title` | Required to publish |
| Has a description | present, non-trivial | `description` | Required to publish |
| Has a price | > 0 | `price.amount` | Required to publish |
| In stock | `quantity` > 0 | `quantity` | Below 1 → not searchable |
| At least one photo | ≥ 1 image | `images[]` | "All published listings require at least one listing image" |
| Attribution complete | all three set | `who_made`, `when_made`, `is_supply` | Required minimum-field set |
| Categorized | taxonomy set | `taxonomy_id` | Required minimum field |
| Active state | `state = active` | `state` | Only active listings are searchable |
| Shipping set (physical) | profile linked | `shipping_profile_id` | "Every physical listing requires a shipping profile" |
| Processing set (physical) | profile linked | `readiness_state_id` | Required for physical listings |

### Tier B — Discoverability & appeal quality (Seller Handbook → scored)

All rows below are computable **now, from already-captured data** (no new Etsy calls):

| Criterion | Target | API field (already captured) | Source / rationale |
|---|---|---|---|
| Photo count | use all **10** † | `images[]` length | More photos = more angles/context; first photo is a ranking signal |
| Has a video | 1 present | `videos[]` | Handbook lists video among the 4 core SEO elements (title/description/images/videos) |
| Image alt text | set on each image | `images[].alt_text` | Accessibility + SEO; max 500 chars |
| Tag count | use all **13** † (≤ 20 chars each †) | `tags[]` | Unused tag slots are the #1 early miss; details moved from title → tags/attributes |
| Title length | healthy use of the **140** † chars (not near-empty, not truncated) | `title` | Objective proxy; front-loading kept as *guidance*, not scored (unknowable without target keywords) |
| Materials filled | ≥ 1, up to **13** † | `materials[]` | Feeds the holistic match |
| Styles set | up to **2** | `style[]` | API-confirmed cap of 2 |
| Section assigned | non-null | `shop_section_id` | Shop organization / navigability |
| Return policy set | non-null | `return_policy_id` | Required in many categories; completeness signal |
| Description depth | more than one line, keyword-bearing | `description` length | Part of Etsy's holistic listing view |

**Deferred (not feasible in v1 — documented, not scored):**

| Criterion | Why deferred |
|---|---|
| Attributes / properties completeness | Needs a separate `getListingProperties` call per listing — not in the current `includes`; inventory carries only *variation* `property_values`. Add a capture-widen task in a later change, then promote into the scorecard. |

**Scoring shape (starting default, tunable):** Tier A is a **pass/fail gate** — any red Tier-A item ranks that listing to the top of "fix first," regardless of Tier B. Tier B is a **0–100 completeness %** (equal weight per applicable criterion to start; weights become tunable once the first real scorecard is seen). Digital listings skip the physical-only and return-policy rows where they don't apply. This is a *deliberately simple v1* — the point is to see how the 20 real listings score, then tune.

## What changes

- A read-only **completeness scorecard** computed over the latest captured snapshot of each listing — **no new Etsy calls**: images, videos, tags, materials, styles, section, return policy, and all base fields are already in the captured `includes` set. (Only the *deferred* attributes criterion would later need a capture-widen — out of scope for v1.)
- Scorecard output **rendered publicly** on the labs project page (`app/experiments/[slug]/page.tsx`) for the etsy-notion-sync experiment: per-listing Tier-A pass/fail + Tier-B %, and a shop-level ranked "fix these first" list.
- **Sync trigger unchanged** — kicking off a capture stays on the authenticated admin (`EtsySyncPanel` → `dispatchEtsySyncWorkflow`). Public surface reads only; no trigger, no PII (scores/flags only, never buyer or account data).

## Capabilities

### New Capabilities

- `listing-completeness-scorecard`: score each captured listing against the Tier A/B criteria above and expose the result as a public read-only artifact on the labs project page.

### Modified Capabilities

- None (additive read layer over the existing capture → snapshot pipeline).

## Impact

- **Code:** new scoring module over existing SQLite snapshots (`experiments/etsy-notion-sync/prototype`); read-only render on the public experiment page; possible small widen of capture `includes`.
- **Data:** no schema change required to score; optional new column/table if we choose to persist scores for trending (open question, deferred to design).
- **Risk:** low — read-only, no Etsy writes, no new OAuth scope, no PII on the public surface. Main correctness risk is threshold accuracy → mitigated by shipping v1 defaults and tuning after first real run.

## Optional links

- Explore: [explore.md](explore.md) — zero-sales funnel diagnosis (L1 chosen; L2/L3 held)
- Experiment directory: `experiments/etsy-notion-sync/`
- PRD / SPEC: `experiments/etsy-notion-sync/docs/PRD.md`, `experiments/etsy-notion-sync/docs/SPEC.md`

---

> **Note (corrects explore.md blind-spot claim):** the Etsy API is *not* fully blind to the top of funnel — `getListing` exposes per-listing **`views`** (daily-tabulated, active listings) and **`num_favorers`**. The dashboard-only gap is limited to visit/traffic-source/search-term breakdowns. This strengthens L2 (favorites/views probe) for later.
