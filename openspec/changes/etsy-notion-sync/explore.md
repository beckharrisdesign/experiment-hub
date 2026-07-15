# Explore — Etsy → Notion Sync

> Store note: `docs/founder/soul.md` and `docs/founder/goals.md` are pending; this artifact uses the Scoring store (`rules/scoring-criteria.mdc`) and the founder's direct answers in session (2026-07-15). Process note: capture/sync code was built ahead of this artifact (PR #282, #284); Explore is recorded now to anchor the remaining phases, not to retro-justify scope that hasn't shipped.

## Hypothesis

A daily, read-only capture of Etsy Open API v3 data can (1) keep the Notion Inventory database current with zero manual edits, and (2) build an append-only history that answers time-based questions Etsy itself can't (every price a SKU has had, stock depletion, view trends) — cheaply enough that a solo maker can run it forever on a local cron.

## Why this matters

### Personal

Katy runs her Etsy shop's day-to-day inventory in Notion, and keeping it in step with the live shop is recurring manual bookkeeping. Past prices, stock levels, and listing lifecycles vanish unless someone records them — so pricing and restock decisions are made from memory. This is her own daily workflow, felt directly.

### Strategic

**Makers** (founder-confirmed 2026-07-15): infrastructure that gives maker-sellers ownership of their own shop data and workflows, instead of renting fragments of it from platform dashboards. Also the groundwork Etsy v3 API learning for future maker-facing experiments.

## Who it's for

Katy, as a solo Etsy seller managing inventory in Notion with Etsy as the source of truth. Building for self — no proxy user.

## What it does

- Captures every field Etsy v3 exposes for shop listings (widest `includes` + per-listing inventory endpoint) into an append-only SQLite history with ancestry chains, version tagging, and schema-drift detection.
- Mirrors current price / quantity / listing state into the Notion Inventory database, writing only changed fields; dry-run by default.
- One-time OAuth PKCE helper + hourly-token refresh so a daily cron runs unattended.
- **v1.0 direction (founder, 2026-07-15):** a prototype UI inside the hub showing what synced and when, with a manual "sync now" trigger — experiment registered in the BHD Labs Notion database (the hub registry).

## What it does NOT do

- Never writes to Etsy — no write/update/delete endpoint exists in the code.
- No Notion → Etsy direction (one-way only).
- No scraping or browser automation of either platform.
- No orders, receipts, payments, or financial account data.
- No multi-shop / multi-tenant support; no hosted SaaS; no credential custody for anyone but the founder.
- Notion remains the day-to-day data view; the tool does not replace Notion workflows.

## Existing options

| Option | Price | Strength | Limitation |
|---|---|---|---|
| Zapier / Make Etsy→Notion zaps | ~$20–30/mo | No-code, event-driven | Current-state only, no history/ancestry, per-task pricing, shallow field coverage |
| Etsy CSV exports → manual import | Free | Official | Manual, current-state only, no inventory-variation depth |
| Etsy listing managers (Vela, etc.) | Freemium–$20/mo | Rich editing UIs | Write-oriented (risk), not Notion-native, no local data ownership |
| DIY scripts (blog-post tier) | Free | Full control | No drift detection, no history model, token refresh usually broken |

None combine append-only history + Notion current-state mirror + read-only safety.

## Market analysis

Honest: **not sized for commerce.** Etsy has ~5–8M active sellers; the slice running inventory in Notion AND wanting self-hosted tooling is a niche of a niche (TAM plausibly <$10M). This is a personal-infrastructure tool with optional future sharing (write-up, template repo), not a revenue experiment. SAM/SOM: intentionally not pursued at this phase.

## Final scorecard

| Dim | Score | Reasoning |
|---|---|---|
| B — Business Opportunity | 2/5 | <$10M realistic TAM; no revenue path pursued; value is workflow + learning |
| P — Personal / Mission Impact | 5/5 | Removes a daily manual chore in the founder's real shop; strong emotional driver |
| C — Competitive Advantage | 3/5 | History + drift detection + read-only posture is differentiated, but not a moat; integrators exist |
| $ — Platform Cost | 5/5 | Built solo in days with agent assist; ~$0/mo (local cron, SQLite, existing accounts) |
| S — Social Impact | 2/5 | Mostly self-serving; modest spillover value to other makers if shared |
| **Total** | **17/25** |  |

**Score shape:** Cheap-and-useful (high $, moderate elsewhere) — flagged: P runs a point hotter than the canonical shape; closest alternative is Mission-driven. Noted for taxonomy review rather than proposing a new shape.

## Permutations

### Permutation A: Personal tool, hub-integrated (v1.0)

- **What changes:** Keep the shipped read-only capture/sync core; add a prototype UI inside the experiment hub showing sync history (what synced, when) and a manual "sync now" trigger. Run-visibility data moves somewhere the hub can read (local SQLite is invisible to the deployed hub — storage decision goes to Propose).
- **Projected scorecard:** B:2 P:5 C:3 $:5 S:2 = 17/25, shape: Cheap-and-useful
- **Trade-offs:** UI + storage work adds scope beyond the working cron pipeline; hub trigger needs an execution path (deployed hub can't run local Python).
- **Verdict:** **chosen**
- **Reasoning:** Matches how the founder actually operates (hub as home base, no file editing); makes the tool observable and controllable without terminal use; keeps read-only guarantees intact.

### Permutation B: Multi-seller SaaS ("Etsy→Notion for makers")

- **What changes:** Hosted service, Etsy full app review, multi-tenant OAuth credential custody, billing, support.
- **Projected scorecard:** B:3 P:4 C:3 $:3 S:3 = 16/25, shape: Hobby horse
- **Trade-offs:** Etsy app review + custody of other sellers' tokens + support burden; kills the cheap-and-useful economics before personal validation exists.
- **Verdict:** deferred — declared future direction (founder, 2026-07-15), not v1.0
- **Reasoning:** Founder intends to build this eventually, but is new to the Etsy API and wants to start smaller. Permutation A is the deliberate on-ramp: prove the pipeline personally, learn v3's quirks (hourly tokens, quotas, inventory schema), then re-score B as its own Propose phase rather than re-litigating from scratch.

### Permutation C: Analysis-only archive (no Notion sync)

- **What changes:** Drop the Notion mirror; keep capture + a trends notebook.
- **Projected scorecard:** B:1 P:3 C:2 $:5 S:2 = 13/25, shape: Cheap-and-useful
- **Trade-offs:** Simpler, but the daily felt pain (manual Notion upkeep) remains unsolved.
- **Verdict:** rejected
- **Reasoning:** The mirror is the part that touches the founder's workflow every day; history alone is a research artifact.
