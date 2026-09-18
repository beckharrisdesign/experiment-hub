# Data pulls — the landing zone

Every capture of data or reporting **about the shop** lands here — whatever tool it came from. eRank and Etsy are simply what exists so far; Google Ads, Marmalead, Pinterest, Search Analytics and Shop Manager exports belong here on the same terms, and so does anything a future tool produces.

Two jobs, and the second is the harder one:

1. **Land it** under a naming rule, so a pull taken months apart is still findable and diffable.
2. **Classify it**, so it can be *called upon* — when a listing is being rewritten or a new product considered, the question is "what do we know about demand for this?", not "which file was that in?"

Monthly reviews and experiment readouts cite **pull notes**, never raw files.

## The rule

```
docs/pulls/YYYY-MM-DD-<source>-<surface>[-<variant>].<ext>
```

| Part | Is | Examples |
|---|---|---|
| `YYYY-MM-DD` | when it was **captured**, not when it was analysed | `2026-09-17` |
| `<source>` | the tool it came out of | `erank`, `etsy` |
| `<surface>` | which screen or export within that tool | `keywords`, `tag-report`, `spotted-on-etsy`, `statement`, `ads-dashboard` |
| `<variant>` | the seed, month, or subject — omit when there is only one | `halloween`, `2026-01` |

Flat files only. **No subfolders** — the date prefix does the sorting, and subfolders break the one-glance inventory.

> `<surface>` is load-bearing: one source can produce several exports on one day. The eRank pulls of 2026-09-17 are `erank-keywords` and `erank-spotted-on-etsy`, plus an `etsy-title-suggestions` capture — collapsing them to one `erank` name would have lost two of them. An earlier version of this convention omitted `<surface>` and could not have held them.

> **One grandfathered name:** `2026-09-15-erank.md` predates the `<surface>` part and should read `2026-09-15-erank-tag-report.md`. It is cited from eleven places across six documents, so it stays as-is rather than churning merged files for tidiness. New pulls follow the rule; this one is the exception that proves it needed writing down.

## Raw files: git or Drive?

| | Where | Why |
|---|---|---|
| **Small CSV/TSV** (a few hundred rows) | **git, here** | diffable, greppable, survives a laptop |
| **PDFs, screencaptures, big exports** | **Drive** — `W+H Listings/W+H Data Pulls/`, flat, same filename | too heavy for git; the note points at them |

Either way the pull note records the provenance, so a file in Drive is still discoverable from the repo.

## Every pull gets a note

`YYYY-MM-DD-<source>-<surface>.md`, alongside the raw files. A note carries:

1. **Provenance** — what was captured, when, from which screen, and where the heavy files live.
2. **What surface this is** — what this instrument measures that the others don't. The ecosystem now has several, and they disagree; a note that doesn't say what question it answers will get misread later.
3. **Distilled findings** — numbered, each standing on a figure from the data.
4. **Standing read** — what it changes, what it doesn't, and what to do with it at the next readout.
5. **Where this plugs into the map** — the tier and the downstream consumer.

State confounds in the note, not in your head. Several of these captures look like findings and are export artifacts; the note is the only place that distinction survives.

## Classification — how a pull gets found later

Every note opens with front-matter. This is what makes the archive queryable instead of merely tidy.

```yaml
---
source: erank                    # the tool it came from
surface: spotted-on-etsy         # which export within that tool
captured: 2026-09-17             # when
tier: external                   # instrumented | bookend | external
scope: shop                      # shop | market | competitor
measures: [position]             # what question it answers (below)
subjects: [patterns, holiday]    # which product lines it bears on
half_life: 14d                   # when it starts misleading
answers: >-
  One line: what this pull can be asked.
---
```

### `measures` — the axis that matters

The ecosystem's instruments disagree with each other, and most of the confusion this shop has run into came from reading one as though it were another. A #1 ranking is not traffic; marketwide demand is not fit; impressions are not buyers.

| Value | Answers | Instruments so far |
|---|---|---|
| `demand` | How many people search for this at all? | eRank tag report, eRank Keyword Tool |
| `position` | Where do we rank? | eRank Spotted on Etsy |
| `traffic` | Who actually arrived? | Search Analytics, sync snapshots |
| `conversion` | Who bought? | Statements, order exports |
| `spend` | What did it cost? | Ads dashboard, statements |
| `content` | What do our listings say? | Snapshots, title suggestions, copy payloads |
| `quality` | How complete are they? | Shop health ledger, ELK rubric |
| `competition` | What is everyone else doing? | eRank competitor audits |

### `tier` — how the data arrives

Mirrors [the ecosystem map §11](../ETSY_ECOSYSTEM_MAP_2026-09.md): `instrumented` (automatic, via the sync), `bookend` (manual capture ritual — no API exists), `external` (third-party tools). The tier tells you whether a pull can be refreshed on demand or has to be re-captured by hand.

### `half_life` — when a pull starts lying

**The one that protects you.** Data does not age uniformly, and citing a stale pull is worse than having none:

| Half-life | Kind | Why |
|---|---|---|
| `permanent` | Statements, orders | Historical fact. Never decays. |
| `180d` | Established keyword demand | Search volume for a stable term moves slowly. |
| `90d` | Keyword research, dashboard suggestions | Directional for a season. |
| `30d` | Ads panels, traffic mix | A month's spend tells you little about the next. |
| `14d` | Rankings | Positions move constantly. |

The index marks each pull 🟢 fresh (within its half-life), 🟡 aging (up to 2×), or 🔴 stale beyond that. **Stale is not "delete" — it is "re-pull before citing, and keep the old one to diff against."**

> A half-life is a default, not a guarantee. A pull can contain rows that rot much faster than its own setting — the Keyword Tool pull is `90d` but holds trend spikes that will not survive a month. Where that is true the note says so, and the note wins.

### Repeat pulls of the same surface

Pull the same export again and the two form a **series**. The newest is `current`; the older flips to `⏹ superseded` and records which note replaced it. Both stay — the delta between them is usually worth more than either alone, which is the whole reason for keeping a dated archive rather than overwriting a file.

Nothing extra to do: land the new export, write its note, re-run the script.

## Calling it up

`index.json` is generated beside this README — one record per pull with all of the above plus `current`, `status` and its raw files. It is the machine-readable entry point: read it first to find which pulls bear on a question, then read those notes.

Rules of thumb when using it:

- **Filter by `measures`, not by source.** "What do we know about demand?" spans eRank and Etsy both.
- **Check `status` before citing.** A 🔴 stale or ⏹ superseded pull is context, not evidence.
- **Prefer `scope: shop` over `scope: market` for decisions about existing listings**, and the reverse when considering something new. The two disagree on this shop, repeatedly and on purpose.
- **Read the note, not the CSV.** The distillation carries the confounds; the raw rows do not.

## Landing new exports

From Katy's own machine, where the downloads are:

```bash
python3 scripts/ingest-pulls.py ~/Downloads          # dry run — shows what would land
python3 scripts/ingest-pulls.py ~/Downloads --apply  # copy + refresh the inventory below
```

It derives the canonical name from the export's own filename (`eRank - Keyword Tool - halloween.csv` → `erank` / `keywords` / `halloween`), takes the capture date from the file's modification time, and **compares by content hash** — so eRank's `_1`/`_2` re-download suffixes don't create duplicates and re-running is safe. Anything it can't classify is listed as `UNKNOWN` and left alone; name it by hand or add a rule to `classify()`.

New sources only need a rule in `classify()` when their filenames are unrecognised; until then they land by hand under the same naming rule and behave identically everywhere else.

Then write the note **with its front-matter** and re-run with `--apply` to refresh `index.json` and the inventory. The script never writes notes — the distillation is the point of a pull, and it is not automatable.

## Inventory

<!-- inventory:start -->
| Captured | Pull | Measures | Scope | Raw | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-09-18 | [eRank Keyword Tool, 12 seeds, captured 2026-09-18](2026-09-18-erank-keywords.md) | `demand` | `market` | 12 × csv | 🟢 fresh · 1/2 |
| 2026-09-18 | [eRank Bulk Keywords, captured 2026-09-18](2026-09-18-erank-bulk-keywords.md) | `demand` | `market` | 1 × csv | 🟢 fresh |
| 2026-09-17 | [Etsy dashboard title suggestions, captured 2026-09-17](2026-09-17-etsy-title-suggestions.md) | `content` | `shop` | — *(Drive)* | 🟢 fresh |
| 2026-09-17 | [eRank "Spotted on Etsy", captured 2026-09-17](2026-09-17-erank-spotted-on-etsy.md) | `position` | `shop` | 1 × csv | 🟢 fresh |
| 2026-09-17 | [eRank Keyword Tool, 10 seeds, captured 2026-09-17](2026-09-17-erank-keywords.md) | `demand` | `market` | 50 × csv | ⏹ superseded · 2/2 |
| 2026-09-16 | [Etsy monthly statements, Dec 2025 – Sep 2026](2026-09-16-etsy-statements.md) | `conversion`, `spend` | `shop` | — *(Drive)* | ⚪ permanent |
| 2026-09-16 | [Etsy Ads dashboard, captured 2026-09-16](2026-09-16-etsy-ads-dashboard.md) | `spend`, `conversion` | `shop` | — *(Drive)* | 🟢 fresh |
| 2026-09-15 | [eRank, 2026-09-15](2026-09-15-erank.md) | `demand`, `competition` | `market` | 1 × csv | 🟢 fresh |
<!-- inventory:end -->

*Generated by `scripts/ingest-pulls.py --apply`, alongside `index.json`. Don't hand-edit between the markers.*
