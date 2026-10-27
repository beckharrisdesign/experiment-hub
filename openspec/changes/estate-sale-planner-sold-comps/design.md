# Design: estate-sale-planner-sold-comps

## Context

Follow-on build change inside the shipped Estate Sale Planner (`app/estate-sale-planner/`,
`lib/estate-sale-planner/`), on MVDS `@beckharrisdesign/mvds@0.5.0` in the AppShell from
review queue #57. Two capabilities, built in order: `item-correction` (part 1) and
`sold-comps-lookup` (part 2). A lookup only ever runs on an item the family confirmed.

What exists today, which this design builds on:

- **Photos are thrown away.** `framesFromPhotos` (`capture.ts`) scales each photo to
  `PHOTO_BUDGET.maxEdgePx` (768 px), sends it to `/api/flag`, and keeps only a 320 px crop
  per item (`thumbs.ts`). Nothing is left to re-crop.
- **The model already returns a box.** `FlaggedItemSchema` carries `frame` (photo index) and
  a normalized `box` (0–1, top-left origin), or null. Correction edits that box; it does not
  need a new model output.
- **There is already a re-read.** `/api/refine` takes one item, up to three images, and a
  family note, and returns name, band, reason, confidence and `markReading`. A corrected crop
  goes through it unchanged.
- **Sessions live on the device.** `storage.ts` keeps the active sale in sessionStorage and
  saved sales in localStorage, stripping images when quota runs short. There are no
  accounts (05b).

## Goals / Non-Goals

**Goals:**

- Any item can open the photo it came from, with its box drawn. Fixing the subject takes
  one or two gestures at 480 px, one-handed where possible.
- Every correction gets a fresh read, and the item visibly follows its new subject.
- "Confirmed" is a state the family can see on every item. It is set by fixing the item
  or with one tap.
- A band always says where it came from: **Guess**, **Based on N sold**, or **Set by you**.
- A repeat item never pays for a second lookup. A room's cost is one SQL query.
- Everything degrades to the labelled guess, never to an error screen.

**Non-Goals:**

- Outlines or segmentation (round 05 #48). Cloud photo storage or accounts (05b).
- Confirming items in bulk. Licensed price databases. A pricing model of our own.
- Lookups for unconfirmed, Keep, Donate or sub-threshold items.
- Any upsell (#58). No new CTA styling; Katy's CTA design pass owns that.

## User flow / IA

**Correct the item (part 1).** The entry point is the item screen
(`/sales/[id]/items/[itemId]`).

1. The photo on the item screen gets a **Source photo** action. When the original is gone,
   it reads "Photo no longer on this device" and is disabled.
2. **Source photo** is a new pushed screen, `/sales/[id]/items/[itemId]/photo`:
   - It sits inside the AppShell; Back returns to the item, and tabs stay on per #52.
   - It shows the full original, this item's box outlined in the accent colour, and the
     other items from the same photo as faint outlines with their names.
   - Tapping a faint box switches to that item.
3. The bottom of the screen has the actions, one primary:
   - **Looks right** (primary). Confirms the item and returns to it.
   - **Adjust**. Drag the box or its corner handles, then **Save**.
   - **Split**. The current box fades. Draw one box per object, then **Save N items**.
   - **Add**. Draw a box around something missed, then **Save**.
   - **Select**. Tap boxes to pick two or more, then **Merge** or **Mark as a lot**.
4. After any save:
   - Back goes to the item, or to Items when the item no longer exists after a split or
     merge.
   - Each new or changed item shows a "Reading…" state until its re-read lands.
   - Every resulting item is confirmed (spec: a correction confirms).
5. A lot shows a **Lot** badge and a **Split lot** action that restores the parts.

**Look up its price (part 2).** Nothing new to navigate to:

- When an item becomes confirmed and passes the gate, the lookup starts in the background.
- The band line on the item screen and its card shows the result:

  | State | Band line reads |
  | --- | --- |
  | Lookup running | "Checking sold prices…" |
  | Enough matching sales | "Based on 7 sold · $40–$85", with up to 3 sold listings below (title, price, date; each links out) |
  | Too few matches | "Guess · only 2 similar sales found" |
  | Lookup can't run | "Guess · price lookups aren't set up yet" or "Guess · couldn't check prices, will try again" |
  | Family set the band | "Set by you" (comps stay listed underneath) |
  | Below the gate | "Guess" |

- The Lists screen, the tallies and the Sell list use whatever band the item carries. A
  comps band replaces the model's band in the totals.

## Visual design / Figma

Two files, both titled with the change ID per `rules/figma.mdc`. Round numbering runs
continuously across them:

- The proposal argued the flow on the board, in rounds 02–04.
- The surface pair lives on the design file: as-is is `01`, proposed continues at `05`.

| Item | Board (proposal rounds) | Design file (surface pair) |
| --- | --- | --- |
| Primary file URL | <https://www.figma.com/board/jOMdrrP5xLfaR1Yf7qfVdA> (`jOMdrrP5xLfaR1Yf7qfVdA`) | <https://www.figma.com/design/LzaDhbJ8HPsLTZObccHnlW> (`LzaDhbJ8HPsLTZObccHnlW`) |
| As-is frame(s) | N/A: the board argues flow, not surface | Page `01 Current state` (node `1:2`): `As-is · Item · S 480` (`4:189`), `As-is · Item · L 1024` (`4:259`), reconstructed from `ItemDetail.tsx`. The photo is a stand-in (see Libraries) |
| Proposed frame(s) | Page `02 Proposed — flow` (page `0:1`): first lookup flow. Page `03 Proposed — correct, then look up` (page `8:207`): confirm step before the gate. Page `04 Proposed — search query after the gate` (page `14:212`): query written only for confirmed, gated items | Page `05 Proposed — correct the item` (node `1:3`). Item screen: `Item · unconfirmed · S 480` (`7:3`), `Item · confirmed, based on sold · S 480` (`7:85`), same at `L 1024` (`7:173`). `Band line · states` (`7:262`), all seven band lines. Source photo: `view · S 480` (`7:286`), `adjust` (`7:335`), `split` (`7:382`), `add` (`7:428`), `select` (`7:478`), `view · L 1024` (`7:529`) |
| Libraries / version | FigJam page-per-iteration conventions per `rules/figma.mdc` | `MVDS Core` (team default library, `source: team`, confirmed 2026-10-27). Instances of `Button`, `Badge`, `Field`, with fills bound to `Tokens` (`background`, `foreground`, `muted`, `muted-foreground`, `border`, `card`, `primary`), spacing bound to `Scales`, and type from `Type/*` styles. The `Tokens` collection is pinned to **Dark** on every frame, matching the hub. Code: `@beckharrisdesign/mvds@0.5.0`. **Local stand-ins on page `00 Components` (node `0:1`):** `Breadcrumb header` (`10:2`, D11) on every proposed frame. `TopBar` (`3:25`) appears on the as-is frames only, since it is today's header. `TabBar` (`3:30`). The header and tab bar are MVDS hand-off #39, not in the library. `Subject box` component set (`3:54`, variants Selected / Faint / Editing / Picked), the box-editor hand-off below. `Photo stand-in · living room` (`3:55`), grey blocks in place of a real walkthrough photo; reference only, not product imagery. The `Value band` field is drawn as `Field` (text input) where code uses `Select`, since MVDS Core has no Select in the library yet |
| Code Connect | N/A: no code surface | Not set up (elk / build precedent); implementation maps to MVDS components in code |
| Breakpoints | N/A: FigJam canvas, not a responsive screen | S · 480px mobile / L · 1024px desktop (BHD Content Types), per `rules/design-guidelines.mdc` |
| Status | Rounds 02–04 done; 04 is current | Round 05 drawn 2026-10-27; awaiting review |

**MVDS hand-off:** MVDS has no crop or box-editing component. The editor is a composition
on MVDS tokens:

- An SVG overlay on the image, using pointer events.
- Corner handles with a 44 px hit area and an 8 px visible dot.
- The selected stroke uses `--primary` and the others `--muted-foreground` at 50%.
- Labels are `Badge`s.

Log it beside #39 (tab bar and app bar) as an MVDS component candidate (`BoxEditor`).

## Decisions

### D1. Originals stored on the device at 1600 px; the model still gets 768

- **Where:** a new `lib/estate-sale-planner/photos.ts` with one IndexedDB database
  (`esp-photos`) and one object store keyed `"<saleId>/<photoIndex>"`.
- **What's stored:** a JPEG `Blob` at up to 1600 px long edge, quality 0.8, plus the saved
  time.
- **Separate from what's sent:** `framesFromPhotos` keeps making the 768 px frame it sends
  today, so walkthrough cost does not move. The 1600 px copy is written alongside it.
- **Items link to it:** each item gets `photoId`, the store key. `frame` stays as the index
  into that pass's photos.
- **Boxes carry over:** boxes are normalized, so a box the model drew on the 768 px frame
  maps straight onto the 1600 px original.
- **Cap:** `PHOTO_STORE.capBytes`, 150 MB by default. Before a write that would pass the
  cap or hit `QuotaExceededError`, the oldest sale's originals are deleted first, one sale
  at a time.
- **What's never deleted:** thumbnails, names, bands, destinations and corrections, because
  they live in the session, not in this store.
- **Persistence:** we call `navigator.storage.persist()` once on the first save. It is
  best effort; see Risks.

### D2. The session model carries photo, lot, confirmed and band source

`SessionItem` gains these fields, all optional so saved sales still load:

```ts
photoId?: string;          // "<saleId>/<photoIndex>" — absent: no original on this device
lot?: { parts: Array<{ box: Box; name?: string }> };  // present: this item is a set
confirmed?: boolean;
bandSource?: "guess" | "comps" | "family";  // absent reads as "guess"
comps?: CompsSummary;      // see D7
rereadPending?: boolean;   // a correction was saved; its re-read hasn't landed
```

- **Pure reducers in `session.ts`, unit-tested like the existing ones:**
  `adjustBox`, `splitItem`, `addFromPhoto`, `mergeItems`, `markLot`, `splitLot`,
  `confirmItem`.
- **Every correction confirms:** each reducer returns confirmed items.
- **Edits keep confirmation:** `updateItem` (name, room, band) leaves `confirmed` alone, and
  a band edit sets `bandSource: "family"`.
- **Destination on merge and lot (spec):** the result keeps the most specific destination.
  Any Sell beats Donate, and Donate beats Keep, matching the order of what matters to the
  sale. Undecided only when all parts were undecided.
- **Merged box:** the bounding box of the parts. A lot keeps its parts' boxes, so
  **Split lot** restores them exactly.
- **New item ids:** `<oldId>_s<n>` for splits and `<saleId>_add_<n>` for adds. Ids stay
  stable and never come from model text, as today.

### D3. A corrected crop goes through `/api/refine` unchanged

- **No new route.** The client crops the new box from the 1600 px original, padded the same
  way as `cropRect` (`thumbs.ts`), at up to 1024 px (`DETAIL_SHOT.maxEdgePx`).
- **The call:** the crop goes as the single `details` image of a normal refine call.
- **The prompt:** gains one optional line when the body says `reframed: true`: "The family
  re-framed this object; the photo is the object itself." It is one new field on
  `RefineInput`, defaulting to false so detail shots are unchanged.
- **The thumbnail:** re-cut from the original at 320 px (`THUMB`), so cards follow at once.
- **Before the re-read lands:**
  - A split part is named "<old name> (1 of 3)" and keeps the old band.
  - An added item is "New item", under $25, low confidence.
  - Both are `rereadPending` until the read lands. On failure they keep that read and say
    "Not re-read yet" (spec).
- **Concurrency:** at most 3 re-reads in flight per sale. A split into 6 queues the rest.
- **Lots:** re-read with `context: "A set of N, sold together"`, so the name and band come
  back as a set.

### D4. Gate and query writing run server-side, in one new route

- **One route:** `POST /estate-sale-planner/api/comps`. Body: the confirmed item's name,
  room, band, destination, `markReading`, note, lot count and `confirmed` flag. It returns
  a `CompsSummary`.
- **The server checks the gate again:** confirmed, Sell, band at or above `COMPS.minBand`
  (`"$100–$500"`). A failed check returns `{ status: "gated" }` with no model call. The
  client gates too; the server check is the one that protects spend.
- **When the client calls:**
  - On confirm.
  - On opening an item that is gated in, has no `comps`, and either never ran or last failed
    (spec: "a later visit retries").
  - Never on list renders.
- **Query writing** is a text-only call, `writeQuery()` in `lib/estate-sale-planner/comps/query.ts`:
  - Provider order is the same as everywhere else: OpenAI, then Anthropic.
  - It uses the smallest model of each provider, set in `config.ts`, not hardcoded in the
    prompt module.
  - Structured output: `{ query: string }`, at most 80 characters.
  - The prompt asks for the words a reseller would type into eBay sold search. A lot gets a
    set query.
- **Normalization:** `normalizeQuery()` lowercases, folds Unicode, strips punctuation except
  `#` and `.` inside numbers, and collapses spaces. Word order is kept.
  - It's a pure function and tested.
  - It's the cache key, so "Lodge No. 8 skillet" and "lodge no 8 skillet" share a row.

### D5. One provider interface; CompsAPI first

`lib/estate-sale-planner/comps/provider.ts`:

```ts
export interface SoldListing { title: string; priceCents: number; soldAt: string; url: string; image?: string }
export interface CompsProvider {
  name: string;                 // "compsapi"
  pricePerRequestCents: number; // from config, for the ledger
  search(query: string, signal: AbortSignal): Promise<SoldListing[]>;
}
```

- **Selection:** `COMPS_PROVIDER` (default `compsapi`) plus `COMPS_API_KEY`, both
  server-only. The `.env.example` entry carries provenance; Katy adds the value.
- **No key:** `providerFromEnv()` returns null, which reads as "not set up yet".
- **No fixture provider in production.** With no key, the spec's labelled guess is the
  behaviour. Tests inject a fake provider.
- **Timeout:** 8 s via `AbortSignal.timeout`.
- **Errors:** 429 or a quota body maps to `quota`; other non-2xx responses or a timeout map
  to `error`.
- **Not written from memory:** CompsAPI's endpoint, auth header, response shape and
  per-request price get filled in from its docs at apply time.
- **eBay Marketplace Insights:** a second adapter behind the same interface if it's granted.

### D6. The comps store, with 90-day freshness

- **Lookup:** `esp_comps` row by `(provider, query_norm)`.
- **Hit:** a row younger than `COMPS.freshDays` (90) is used, logged as a zero-cost
  `cache_hit` row.
- **Miss:** call the provider, then upsert the row (replace on conflict).
- **Writes:** server routes only, with the service role. Same posture as `esp_events` (016).

### D7. The model picks matches; code sets the band

The comps pass is a text-only call, `readComps()` in `comps/read.ts`.

- **Input:** the confirmed item, plus up to 25 listings (title, price, date) with indexes.
- **Output:** `{ matches: number[]; reason: string }`, where matches are the indexes of
  listings that are the same object (same maker and model, or for a lot, a comparable set).
- **Code does the math** in `comps/band.ts`, which is pure and tested:
  - With `matches.length >= COMPS.minMatches` (3): the shown range is the 25th to 75th
    percentile of the matched prices, rounded to whole dollars.
  - The band is the `BANDS` entry containing the median.
  - Fewer matches: the model's band stays, with `bandSource: "guess"` and the found count.
- **Why code does the math:** asking the model for a band from prices gets back the
  optimism #55 just fixed. Percentiles are deterministic, testable, and honest about spread.
- **The summary the client gets:**

  ```ts
  interface CompsSummary {
    status: "ok" | "too-few" | "gated" | "not-configured" | "error" | "quota";
    query?: string; matched?: number; found?: number;
    rangeCents?: [number, number]; band?: Band; reason?: string;
    listings?: SoldListing[];  // up to 3 kept, most recent first
    fetchedAt?: string;
  }
  ```

- **On `ok`:** the client sets `band`, `bandSource: "comps"` and `comps`, unless
  `bandSource` is already `"family"`. A family band is never overwritten (spec); the comps
  are stored for reference.

### D8. Every model call and lookup lands in one cost table

- **Helper:** `recordCost()` in `lib/estate-sale-planner/costs.ts`. Fire-and-forget, wrapped
  in try/catch, logs on failure (spec: recording never fails the request).
- **Where it's called:** inside `/api/flag` (`walkthrough`), `/api/refine` (`reread`), and
  `/api/comps` (`query`, `comps`, `lookup`). Token counts come from the existing `usage` on
  each result.
- **Cents:** tokens × the model's per-million price from a `MODEL_PRICES` table in
  `config.ts`. Values come from the vendor pricing pages at apply time and carry a dated
  comment, not memory. Lookups use the provider's `pricePerRequestCents`.
- **Session key:** the browser session id the routes already receive (`esp_…`). It needs
  one new optional `saleId` field on flag and refine bodies, so a sale's cost is a `GROUP BY`.

### D9. Migration 019

`supabase/migrations/019_esp_comps_costs.sql`, idempotent (`create table if not exists`),
RLS on, no policies:

- `esp_comps`:
  - `id uuid pk`
  - `provider text`, `query text`, `query_norm text`
  - `fetched_at timestamptz`
  - `results jsonb` (the SoldListing array) and `result_count int`
  - `unique (provider, query_norm)`
- `esp_costs`:
  - `id uuid pk`
  - `experiment_id text default 'estate-sale-planner'`
  - `session_id text`, `sale_id text`
  - `kind text check (kind in ('walkthrough','reread','query','comps','lookup'))`
  - `provider text`, `model text`
  - `input_tokens int`, `output_tokens int`
  - `cents numeric(10,4)`
  - `cache_hit boolean default false`, `ok boolean default true`, `error text`
  - `created_at timestamptz default now()`
  - index on `(experiment_id, created_at)`
- Applied to Experiment Hub 2.0 through the normal migration path. The local file is the
  record, so the drift found earlier this session doesn't recur.

### D10. Two PRs, in order

1. **Correction:** D1–D3, the source-photo screen, the confirmed state, and the "Guess"
   label on bands. Shippable on its own; it already fixes the "wrong subject" problem.
2. **Lookup:** D4–D9, the band lines, and the cost ledger. Needs Katy's provider key to
   show real comps. Without the key, it ships showing "not set up yet".

### D11. A breadcrumb header replaces the top bar

Katy, on round 05: *"the header component is awkward - just do a simple breadcrumb style
header and let that function as the back button too"*.

- **One line, 44 px tall:** `Home / Mom's house / Mantel clock / Source photo`.
- **Every ancestor crumb is a link.** The last ancestor is Back, so there's no separate
  Back button.
- **Styling:** the current page uses `foreground` and is marked `aria-current="page"`;
  ancestors use `muted-foreground`, all in `Type/Small`.
- **When the trail doesn't fit at 480,** leading crumbs collapse to `…`. The parent crumb
  and the current page always show.
- **Code:** `chromeFor` (`routes.ts`) returns `crumbs: Array<{ label; href }>` plus `title`,
  in place of `eyebrow` / `back`. `TopBar.tsx` renders a `<nav aria-label="Breadcrumb">`
  inside the same MVDS `Chrome`, and `routes.test.ts` asserts each screen's trail.
- **Trails:**

  | Screen | Trail |
  | --- | --- |
  | Home | `Estate Sale Planner` alone |
  | Items | `Home / <sale>` |
  | Sort, Progress, Add a room, Sell list | `Home / <sale> / <screen>` |
  | Item | `Home / <sale> / <item>` |
  | Source photo | `Home / <sale> / <item> / Source photo` |
  | Sell Sheet | `Home / Sell Sheet` |

- **Scope:** ships in PR 1 (correction), because the source-photo screen is the deepest
  page and needs the trail most. It applies to every page, so it supersedes the top-bar half
  of #49 and #57. The tab bar is unchanged.

### Review-queue rows (added as PROPOSED with this design)

| # | Decision | Default |
| --- | --- | --- |
| 59 | Lookup threshold | Band $100–$500 or higher (`COMPS.minBand`) |
| 60 | What counts as confirmed | Any correction or **Looks right**; edits keep it; nothing un-confirms |
| 61 | Photo storage cap | 150 MB of originals; oldest sale's originals go first |
| 62 | Provider | CompsAPI entry plan behind the adapter; eBay Marketplace Insights if granted |
| 63 | Freshness window | 90 days per normalized query, shared across sales |
| 64 | Minimum matching sales | 3; fewer keeps the labelled guess |
| 65 | Who sets the comps band | Model picks matches; code takes the 25th–75th percentile and the band of the median |
| 66 | Header | Breadcrumb trail; the parent crumb is Back (D11) |

## Risks / Trade-offs

- **iOS Safari can delete IndexedDB.** Script-written storage goes after 7 days without a
  visit unless the app is on the Home Screen.
  - Effect: originals vanish, and correction falls back to "Photo no longer on this
    device".
  - Mitigation: thumbnails and every correction survive (they're in the session), plus
    `storage.persist()` and the existing "Add to Home Screen" path.
  - The real fix is 05b cloud storage.
- **Device storage:** 250–400 KB per original, so 48 photos is about 15 MB and the 150 MB
  cap holds about 10 full rooms. Older sales lose re-croppability first, by design.
- **Box editing on a phone is fiddly.** Hence 44 px handles; Split and Add draw fresh boxes
  rather than nudging existing ones; and Adjust is its own mode, so a pan never moves a
  box by accident. Needs Katy's phone test before PR 1 merges.
- **Split cost:** each piece is one re-read, the same cost as a detail shot today. A split
  into 6 is 6 calls. Accepted; it's the family's explicit action, and the ledger shows it.
- **Scraped third-party data:** wrong-item matches, and a vendor that could vanish.
  - The comps pass filters matches, the adapter makes swapping a config change, and the
    store keeps what we already paid for.
  - Revisit before any paid tier.
- **Cache collisions:** two different objects that normalize to one query share comps. The
  comps pass re-filters per item, so a shared row costs relevance, not correctness.
- **The gate depends on the model's band.** An item the model under-bands stays below $100
  and is never looked up. Accepted for now: a family band edit counts toward the gate, so
  "I think this is worth more" plus **Looks right** triggers a lookup.
