# Design — listing-completeness-scorecard

## Context

The scorecard renders on the **public** labs project page for the etsy-notion-sync experiment
(`app/experiments/[slug]/page.tsx`, already `force-dynamic`). All scored data already lives in
Supabase: `etsy_snapshots.raw_response` stores the **full listing JSON** (every `includes`
field) per capture, and the hub already reads Supabase server-side with the service-role key
(`lib/etsy-sync.ts::getEtsySyncRuns`). So this is a **read + render** layer — no new Etsy calls,
no Python/capture change, no DB migration.

## Goals / Non-Goals

**Goals:**

- Show, per listing, Tier-A pass/fail + Tier-B completeness %, and a shop-level "fix these first" list.
- Compute from the latest captured snapshot only; send **only scores/flags** to the browser (no PII).
- Keep scoring thresholds in one tunable module so v1 defaults can change without touching UI.

**Non-Goals:**

- No sync trigger on the public page (stays on authenticated admin `EtsySyncPanel`).
- No new Supabase table / no persisted score history (trending is a later L2 concern).
- No attributes/properties scoring (deferred — needs a capture-widen).

## User flow / IA

```
  Public labs project page  (/experiments/etsy-notion-sync)
  ├─ existing experiment header + Notion fields  (unchanged)
  └─ NEW: "Listing health" section
        ├─ Shop summary strip:  X/20 publishable-complete · median Tier-B %
        ├─ Fix these first  (ranked): Tier-A failures on top, then lowest Tier-B %
        │     • "Listing 123 — Not publishable-complete: no photo, quantity 0"
        │     • "Listing 456 — 40% complete: +6 photos, +9 tags, no video"
        └─ Full sortable table: ALL listings, one condensed single-line row each
              cols → Listing · Publishable badge · Completeness bar+% · Unmet (condensed)
              • sortable column headers (default: fix-first — Tier-A fails, then asc %)
              • no "+N more" — every captured listing renders
```

Anonymous visitor sees all of the above; nothing is behind auth; no buyer/account data appears.

## Visual design / Figma

Figma **as-is + proposed** pair built and screenshot-verified (2026-07-20), per the `stop-the-leaks` process.

| Item              | Value                                                                                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary file URL  | https://www.figma.com/design/EdxL37LSW5exXAepqaH9ZM ("experiment-detail — listing-completeness-scorecard", BHD team drafts)                                                                          |
| As-is frame(s)    | `01 Current state → As-is · Desktop 1024` (node `4:2`) — current experiment page reconstructed from `app/experiments/[slug]/page.tsx`                                                                 |
| Proposed frame(s) | `02 Proposed → Proposed · Desktop 1024` (node `6:2`) and `Proposed · Mobile 480` (node `14:7`) — page + new "Listing health" section (summary strip → fix-first card → per-listing table)             |
| Libraries         | **MVDS Core** Badge instances for Tier-A status chips (`variant=success`/`destructive`, by key — MVDS not enabled as a team-library dep, same as stop-the-leaks); 16 "hub tokens" vars ported 1:1 from `app/globals.css @theme` (Fraunces/Inter), bound to all fills — no hardcoded hex |
| Code Connect      | None created. Note for apply: hub's `components/ExperimentTypeBadge.tsx` is bespoke, not wired to the MVDS Badge the prototype uses; type badge renders `null` for `commercial` experiments (etsy-notion-sync is commercial) |
| Breakpoints       | S · 480px mobile / L · 1024px desktop (BHD Content Types). Table collapses to stacked cards under `md` (mobile frame built).                                                                          |
| Status            | As-is + proposed built & verified; design pending approval. (As-is mobile not built — desktop-only for as-is; meets the L-minimum bar.)                                                               |

Status color semantics come from theme tokens only (`destructive` for Tier-A fail,
`success` for publishable, `muted`/`primary` for the completeness bar) — no raw hex, per `design-guidelines.mdc`.
**Placeholder-values caveat** (per `rules/figma.mdc`): all field text and every listing name/score/chip
in the frames are illustrative reference, not derived from code or a live Notion/Supabase read; layout,
labels, ordering, and token styling are faithful.

**Build follow-up (not blocking):** the table, completeness bars, and chips were built natively with
tokenized primitives (the accepted "existing markup" fallback); a hub `BHD Labs / shadcn` `Table` +
`Progressbar` exist and swapping to them is a clean later refinement.

## Decisions

1. **Scoring computed in TypeScript at render time, from Supabase `raw_response`.**
   A new server-only helper (extend `lib/etsy-sync.ts` or a sibling `lib/etsy-scorecard.ts`)
   reads the latest `etsy_snapshots` row per listing for `endpoint = shops/{shop_id}/listings`,
   selecting `raw_response`, and a pure `scoreListing(raw)` function returns Tier-A/Tier-B results.
   *Why:* the raw listing JSON is already in Supabase; scoring in the surface that renders it
   needs no migration, no Python change, and keeps thresholds one edit away. At ~20 listings,
   per-request compute is trivial (page is already `force-dynamic`).

2. **Section on the existing experiment page, not a sub-route.** Least surface; reuses the
   Notion-backed layout already there. (Founder lean, 2026-07-20.)

3. **Server-side read, scores-only to client = PII-safe by construction.** The service-role
   Supabase read happens in the server component; the client receives only computed
   scores/flags/criteria names, never `raw_response` (which could contain `user`/buyer fields
   via the `User` include).

4. **Thresholds live in one config object** (`SCORECARD_DEFAULTS`: photos 10, tags 13 / ≤20 chars,
   title 140, materials 13, styles 2, min description length). Marked † = "verify in Shop Manager,
   don't block." Equal weight per applicable Tier-B criterion in v1.

5. **Physical/digital awareness:** `listing_type = download` excludes shipping, processing, and
   return-policy criteria from both the Tier-A gate and the Tier-B denominator.

6. **Table behavior (founder feedback 2026-07-20):** the full table shows **all** captured
   listings (no "+N more" — the shop already has 20+), **one condensed single-line row** per
   listing, with **sortable** column headers. The unmet-criteria cell is condensed to fit one
   line — a compact count + truncated preview (e.g. "4 unmet · No photo, Qty 0, +2") rather than
   wrapping chips. Default sort is fix-first (Tier-A fails on top, then ascending Tier-B %); the
   separate "Fix these first" card stays as the top-offenders highlight. Sorting is client-side
   over the already-loaded rows (server sends all scored rows; ~20 items → no pagination).

## Risks / Trade-offs

- **`raw_response` completeness:** scoring assumes the stored raw listing carries the full
  `includes` set (images/videos/tags/materials). Confirmed from `capture.py` (stores the whole
  `listing` object) — but a **task will assert** an alt-text/image field is actually present on a
  real snapshot before trusting the alt-text criterion.
- **Latest-per-listing read:** `store_supabase.latest_parsed_by_listing` selects only `parsed`;
  the hub read must select `raw_response` instead (query the base table with a latest-per-listing
  filter, or confirm the `LATEST_VIEW` exposes `raw_response`). Small, verified in a task.
- **No persisted scores:** recomputing per request means no score-over-time trend yet — accepted;
  trending belongs to L2, and the append-only snapshots already retain the raw history to backfill later.
- **Threshold accuracy:** v1 defaults are best-effort (Handbook caps not re-confirmed live).
  Mitigated by centralizing them and tuning after the first real run.
