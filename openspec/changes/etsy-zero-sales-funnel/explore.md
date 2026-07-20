# Explore — Diagnose the Zero-Sales Funnel

> Discovery artifact (2026-07-20). Rides on the read-only Etsy → Notion pipeline in
> `experiments/etsy-notion-sync/prototype` (`capture.py` → SQLite snapshots → `sync_notion.py`).
> No new write path — everything here is additive read-only enrichment of data already captured.
> Sibling to the `etsy-notion-sync` change (that one = mirror the shop; this one = read the shop's health).

## The situation

Super-early shop: **~20 listings, zero sales, zero reviews.** The founder doesn't know
what's wrong or what to tweak — and (correctly) doesn't want to change ten things at once
and muddy the signal.

At zero sales this is **not an optimization problem, it's a funnel-diagnosis problem.**
You can't A/B your way to a first sale; you first have to know *which stage of the funnel is
leaking* before touching anything.

```
        THE FUNNEL — where is the leak?
  ══════════════════════════════════════════════

   IMPRESSIONS  ──▶  CLICKS  ──▶  FAVORITES  ──▶  SALES
   (found in       (thumbnail   (liked it,       (bought)
    search)         + price      didn't buy)
                    earned it)

   ▲ discoverability  ▲ listing appeal   ▲ conversion / trust
     (SEO, tags)        (photo, price)     (price, reviews, trust)

   At 0 sales, you don't yet know which arrow is broken.
```

## The blind spot you have to design around

**The Etsy Open API v3 does NOT expose full Shop Stats** — no visit counts, traffic
sources, or search-term impressions. Those live only inside the Shop Manager dashboard.

*Correction (2026-07-20, from the `getListing` schema):* the API is **not** fully blind —
`getListing` does return per-listing **`views`** (daily-tabulated, active listings only)
and **`num_favorers`**. So the pure-API blind spot is narrower than first stated: it's the
*traffic-source / search-term / visit* breakdown that's dashboard-only, not raw views.

What the API *can* see at zero sales, from data the prototype already pulls:

| Signal | Source (read-only) | What it tells you |
|---|---|---|
| Listing **completeness / quality** | `getListing` (wide `includes`), images, videos, properties, inventory | Is the listing objectively *finished*? (hygiene, not a test) |
| **`num_favorers`** (favorites) | on the listing object; already snapshotted append-only | The one leading indicator before a sale — earliest funnel probe |

Everything above the favorites line (did anyone even *see* it) needs the founder to
pair API data with numbers read manually off the dashboard. Known constraint, stated up front.

## Candidate levers (read-only, diagnosis-first)

### L1 — Listing completeness scorecard  ← **chosen first**

Score each of the 20 listings on the objective, API-readable quality factors and emit a
ranked "fix these first" list:

- photo count (target 10–13) · has video · tag count (target 13/13) · materials set ·
  taxonomy assigned · section assigned · title keyword front-loading · description length ·
  active state / renewal.

**Why first:** it separates **objectively incomplete** ("just fix it" — not an experiment)
from **needs testing**. You fix hygiene *before* running any test, so you never burn signal
tweaking listings that were merely half-built. Computable entirely from data `capture.py`
already captures — no new endpoint, no new OAuth scope, no PII.

### L2 — Favorites-over-time as the funnel probe

`num_favorers` is already snapshotted append-only, so favorites velocity per listing is
free to compute. The read:

- **Zero favorites across all 20** → discoverability leak (nobody's *finding* you → SEO/tags).
- **Some favorites, zero sales** → conversion leak (price, trust, photos).

Cheapest way to learn *which end* is broken without dashboard access. Sequenced after L1
because you want a clean, hygiene-complete baseline before you start reading the probe.

### L3 — Tag & keyword coverage map

Aggregate tags across all 20 listings: flag any using <13 tags, surface duplication and
gaps, cross-check title vs. tags. Discoverability is the #1 zero-sales lever and unused
tag slots are the most common early mistake. Uses data already captured; deferred until
L1/L2 point the diagnosis at the discoverability end.

## The anti-muddying discipline (the actual method)

The order *is* the safeguard:

```
  1. FIX HYGIENE (L1) across all 20   → objective gaps aren't experiments,
                                          so fixing them costs no signal
  2. BASELINE (L2)                     → capture favorites before touching anything
  3. ONE VARIABLE AT A TIME            → read snapshot history + favorites as signal
                                          (sales signal doesn't exist yet)
```

You can't muddy a test you haven't started — and you don't start until the shop is
objectively complete.

## Decision

- **Chosen first lever: L1 — Listing completeness scorecard.**
- L2 (favorites probe) and L3 (tag map) held as sequenced follow-ons, not started.
- Scope stays read-only and additive to the existing capture → snapshot → mirror pipeline.
- **Surface: the scorecard output is a *public* artifact on the labs project page;
  the sync trigger stays authenticated.** (Founder decision, 2026-07-20.)

### Public output ↔ authenticated trigger

The hub already splits exactly along this line — reuse it, don't invent a surface:

```
  PUBLIC (labs project page)              AUTHENTICATED (admin)
  app/experiments/[slug]/page.tsx         app/admin/(protected)/page.tsx
  ── read-only, force-dynamic ──          ── EtsySyncPanel.tsx ──
        ▲                                        │
        │ reads                                  │ dispatches
        │                                        ▼
  lib/etsy-sync.ts::getEtsySyncRuns()      lib/etsy-sync.ts::dispatchEtsySyncWorkflow()
  (already public via /api/etsy-sync/runs)  (kicks off the sync)
```

- **Scorecard renders on the public labs project page** for the etsy-notion-sync
  experiment — read-only, no auth, no trigger. The point is that this kind of shop-health
  artifact "exists publicly," building in the open.
- **Kicking off a sync stays on the authenticated admin** (`EtsySyncPanel`), unchanged.
- No listing PII on the public surface — the scorecard is completeness *scores/flags*
  (photo count, tags filled, etc.), not buyer or account data.

## Open questions for Propose (L1)

- **What are the scoring thresholds/weights?** Etsy best-practice targets vs. founder's own bar.
- **One-time audit vs. every capture run?** (Append-only history could trend the score over time.)
- **Does the current `capture.py` `includes` set already pull every field L1 needs**
  (images, videos, tags/properties), or does the capture widen slightly?

## Next step

Formalize **L1 only** via `/opsx:propose` on this change — scorecard rendered on the public
labs project page, sync trigger untouched on the authenticated admin. Hold L2/L3 until L1
ships and the favorites probe tells us which arrow is broken.
