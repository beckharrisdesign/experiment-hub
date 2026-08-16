# scoring-impact-rubric

## Human anchor

> "I'm not trying to eliminate my scoring, just edit it. […] So what's left are scores serving as proxy for the strength of the idea's personal, social, and business impact." — Katy, 2026-08-14
>
> "lets use the openspec framework - dogfooding!" — Katy, kicking off this change, 2026-08-14

## Outcomes

- **Who:** Katy, reading experiment pages on the hub and the Notion Labs database, deciding what to build, push, or kill.
- **Job:** Score experiments with three 1–5 impact proxies — Personal, Social, Business — each with an editable justification, all living in the existing Labs Notion database, and see that profile everywhere scores render, with the original five-dimension scores preserved as the historical record they are.
- **Done when:** `rules/scoring-criteria.mdc` describes the three-dimension rubric (1–5 each, total 3–15); an experiment scored under it renders three labeled dimensions in both full and compact views; totals compute 3–15 for the new shape and 5–25 for v1 rows; the existing BHD Labs Projects database carries three new score columns, each justification lives as a full Notion page under the experiment's row (a paragraph or an entire business case, Katy's choice), and the hub shows each justification as a tab under the score ledger; the archive re-grade line format matches the new dimensions; the `/scoring`, `/heuristics`, and `/harness` documentation pages are gone along with their nav and landing-page links; nothing crashes or blanks on rows with either shape, both, or neither.
- **Not doing:** Backfilling, converting, or deleting v1 five-dimension scores; auto-scoring any experiment; new Notion databases or pages (scores reuse the existing Labs infra); preserving the Mission/Pull/Speed rubric anywhere active (it remains in git history and PR #372); building replacement documentation pages — the rubric's home is `rules/scoring-criteria.mdc`, and a future hub page for it would be its own change.

## Why

The v1 rubric was built for its milestone and did its job — nine experiments scored, and enough signal accumulated to see which dimensions earned their place. This change is the edit that signal points to, not a replacement: `platformCost` comes out, and `businessOpportunity` + `competitiveAdvantage` merge into a single business-impact judgment. What's left is a rubric of three proxies for the strength of an idea's personal, social, and business impact — the parts of v1 that were always the point.

The documentation pages come out for the same reason the rubric gets simpler: "I just don't want to maintain this redundant set of descriptions while I'm iterating on the system" (Katy, 2026-08-14). `/scoring`, `/heuristics`, and `/harness` each restate rules that live — and keep changing — in `rules/` and `skills/`; while the system is being iterated on, a second copy in the hub UI is maintenance without benefit. The store files stay the single source of truth.

This supersedes the Mission/Pull/Speed rubric merged earlier today (PR #372). That was a same-day exploration that went further than the founder intended — replacing the instrument rather than editing it. No experiment was ever scored under it, so superseding it now is clean: the rules file is rewritten, and the one reference to its re-grade format (in `skills/openspec-archive-change.md`) is updated. The accuracy loop it introduced — re-grading at archive with a Predicted/Actual/Missed line — is kept; that idea survives the rubric it arrived with.

## What changes

- **Rubric:** `rules/scoring-criteria.mdc` rewritten — three dimensions, 1–5 each, total 3–15: Personal Impact and Social Impact carried over from v1 unchanged, Business Impact merging market opportunity and differentiation into one anchor set. At-archive re-grade line kept, reformatted for the new dimensions.
- **Archive skill:** the re-grade line example in `skills/openspec-archive-change.md` updated from `M3 P2 S2` format to the new dimensions.
- **Types:** add the three-dimension scores shape alongside the existing `ExperimentScores`; v1 stays typed as-is for historical rows. (Two of the three keys overlap v1's — how the shapes are distinguished is settled in design.md.)
- **Totals:** `lib/scoring.ts` computes 3–15 for the new shape and keeps 5–25 for v1 rows.
- **Display:** the detail page Overview gets the impact score ledger followed by a four-tab bar — Personal / Social / Business justifications plus History as the fourth tab (replacing the standalone History section); v1 rows keep their current landing-badge presentation, labeled as v1 history.
- **Notion sync:** `lib/notion-experiments.ts` maps the new score properties when present (exact column names settled in design.md), preferring the new shape when a row has both.
- **Notion columns:** three new number properties added to the existing BHD Labs Projects database — one score per dimension — a schema addition via the Notion connector, no rows touched, confirmed with Katy immediately before applying. The old `Score:B/P/C/D/S` columns stay as history.
- **Justifications as Notion pages:** each dimension's written justification is a full Notion page under the experiment's row (conventionally-titled child pages, names settled in design.md) — free to be one paragraph or a complete business case. The sync reads their content; the hub renders each as a tab under the score ledger on the detail page.
- **Data:** `data/experiments.json` accepts the new scores field on experiment rows; no existing rows are rewritten.
- **Doc pages removed:** `app/scoring/`, `app/heuristics/`, and `app/harness/` deleted — they document the v1 TAM-anchor rubric, the retired per-agent heuristic rubrics, and the removed `agents/` harness architecture. Their Header nav entries and landing-page cards (`components/Header.tsx`, `app/page-client.tsx`) go with them, as do `lib/agent-rubrics.ts` and `tests/agents/heuristics.test.ts` (used only by the heuristics page). The landing tooltip that cites "/25 across five scoring dimensions — see /scoring" is reworded for the new totals.

## Capabilities

### New Capabilities

- `experiment-impact-scoring`: the three-proxy rubric as store rules, plus hub display, total computation, and Notion ingestion of Personal/Social/Business impact scores, coexisting with read-only v1 history.

### Modified Capabilities

- None — no existing spec in `openspec/specs/` covers scoring; this creates the capability spec.

## Impact

- `rules/scoring-criteria.mdc` — rubric rewritten (supersedes PR #372's version)
- `skills/openspec-archive-change.md` — re-grade line format
- `types/index.ts` — new scores interface
- `lib/scoring.ts` — shape-aware total
- `components/ExperimentScores.tsx` — three-dimension rendering path, v1 history path
- `lib/notion-experiments.ts` — new property mapping
- `data/experiments.json` — schema addition only (no row edits)
- `app/scoring/`, `app/heuristics/`, `app/harness/` — deleted
- `components/Header.tsx`, `app/page-client.tsx` — nav entries, landing cards, and score tooltip
- `lib/agent-rubrics.ts`, `tests/agents/heuristics.test.ts` — deleted with the heuristics page
- Tests for the above (vitest, per `rules/vitest-conventions.mdc`)

## Optional links

- Rubric file being edited: `rules/scoring-criteria.mdc`
- Superseded exploration: PR #372 (`claude/scoring-rubric-v2`, Mission/Pull/Speed)
