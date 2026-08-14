# Founder intent — cloud pivot

Verbatim, from the working session on 2026-08-05, in the order it was said.
Recorded because the decision was made in conversation and the reasoning is
worth more than the conclusion.

---

## The decision

> Shifting this codebase into experiments is me deciding to think about it as a
> cloud based tool not a local one. Which does definitely mean I need to think
> about it as multi tenant, and with a oauth handshake to a destination like
> google drives and notion, and testing for security standards since this will
> have family data in it.

## The sequencing

> ok so that's a large lift - noted - but what if I started with a personal only
> instance of the tool and then considered productizing it a much later phase. I
> wire up an oauth flow, put my own openai creds into a web ui, and work through
> getting it up and running in the cloud but in much the same footprint as the
> local version.

## The shape

> I want to shift to using my existing vercel ci/cd pipeline because its proven
> already. I think we need to think through a database schema that allows me to
> do batch edits and also store metadata history for a certain pdf without that
> full file round trip. File storage can stay on drive in the short term and we
> just store url refs to it in the database.

## The actual problem

> there are so many agents and tools out there, but the hardest problem is still
> moving back and forth from my digital life to my physical one. Scanning,
> tagging files, dedup-ing, doing your taxes, saving receipts -- if you have any
> scrap of a real world life you end up straddling those worlds. I want to
> combine a pdf editor with ai vision and a source of truth entity database that
> always understands the difference between my sons soccer team and my
> daughter's dance team.

This is the framing the rest of the work serves. The hosted instance, the
database, the Drive handshake are all mechanism; the straddle is the problem.

The soccer/dance example is already modelable — the work is plumbing, not design.

The Notion Entities database carries three self-referential relations:
`Parent Entity`, `Child Entities`, and `Related Entities`. An organization can
therefore already point at the specific person it belongs to, which is exactly
the edge that distinguishes one child's soccer team from another's dance studio.

**What drops it is the projection, not the schema.** `ALLOWED_PROPERTIES` in
`prototype/lib/entities-notion.js` lists eight fields — `Slug`, `Name`,
`Aliases`, `Kind`, `Relationship`, `Category`, `Status`, `Location`. None of the
three relations appear there, and the allowlist ignores anything unlisted by
design. So the hierarchy exists in Notion, never reaches `loadTaxonomy()`, and
never reaches the vision prompt. The model is being asked to disambiguate with
information the pipeline is holding back.

Two notes for whoever specs this:

- The relations are absent from `DENIED_PROPERTIES` too. They aren't a privacy
  exclusion, just unlisted — so adding them is a projection change, not a
  reversal of the security boundary. The allowlist should stay an allowlist.
- Notion returns relations as page references, not values, so projecting them
  means mapping page id → slug. `queryAllPages()` already fetches every entity,
  so that map can be built in the same pass rather than costing extra requests.

---

## Why this matters

The strongest evidence this experiment has is that its only user used it hard
and wanted more:

> I spent a week or two dogfooding this idea with my own data and LOVED it. It
> can get better, but even in rough shape it was revelatory.

That is worth more than the scored eval runs, because it is a verdict on the
workflow rather than on the model. A rough tool that survives two weeks of real
household paperwork has cleared the bar that kills most personal-productivity
projects: it beat doing nothing.

Two supporting facts from the original repo:

- **Cloud was in the plan from the first commit.** The earliest `PRD.md`
  (`e470ef2`) lists under Future Enhancements: *"Point application at cloud
  directories (Google Drive, Dropbox, etc.)"*. The hosted pivot is the original
  roadmap arriving, not a change of mind.
- **The bug that worried her most is still the bug that matters.** The original
  PRD escalated keyword read-back to *"CRITICAL — DEAL BREAKER"*. It remains
  the top item on [roadmap.md](roadmap.md) and is now a launch blocker.

## Where the founder's own writing lives

Deliberately not consolidated into this public repo — some of it cannot be.

| Source | Where | Public? |
|---|---|---|
| Original PRD, 227 lines, plus 6 commits of evolution | `~/Documents/code/pdf-metadata-viewer/PRD.md` | Safe, not copied here — the hub PRD supersedes it |
| Taxonomy and entity registry design, 421 lines | Same repo, `docs/tag_entity_database.md`; migrated into the **Notion Entities database**, now the live source of truth | **No** — real family names, including minors |
| Scoring rubric and prompt template, original versions | Same repo, `docs/` | **No** — worked examples use real names. The hub's copies were rewritten with synthetic placeholders |
| UI refinement notes, feature status, README, CLAUDE.md | Same repo | Safe |
| Eval corpus — the measurement record | `~/Documents/code/pdf-metadata-viewer-eval/` | **No** — built from real household documents |
| Redundant copy of all of the above | `~/Documents/code/pdf-metadata-viewer-eval/original-repo-writing/` | **No** — mixed; see `PROVENANCE.md` there |

The original repo should stay private permanently: it holds both the unredacted
history and the household registry. The copy under `original-repo-writing/`
exists only so the writing survives if that repo is ever archived.

---

## Lineage — what this supersedes

> yes, this experiment version supercedes what was really my first experiment in
> the private repo and local tooling.

**Experiment v1** — private repo, local tooling. `2026-01-10` to `2026-04-03`,
from initial scaffold through the dogfooding run that produced the eval corpus.
It predates the hub's experiment practice; it was the first one, run before
there was a place to put experiments.

**Experiment v2** — this directory, plus the
[`pdf-metadata-viewer-cloud`](../../../openspec/changes/pdf-metadata-viewer-cloud/proposal.md)
change. Same problem, same taxonomy, same entity database. Different premise:
hosted rather than local.

v2 is the continuation and the canonical version. v1 is not archived or
abandoned — the private repo stays private permanently, because it holds both
the unredacted history and the household registry — but it is no longer where
work happens.

### What that means for the docs here

`docs/PRD.md` still scopes the tool as single-operator and local:

> **Not for**: Teams, shared archives, or anyone needing multi-user access,
> permissions, or an audit trail. This is a single-operator tool on local files.

That framing described v1 accurately and stays in place until the cloud change
lands, at which point the PRD gets a rewrite rather than an edit. The same is
true of the "not deployed and should not be" language in `README.md` and
`prototype/.env.example`: correct for v1, superseded by v2, and deliberately not
patched ahead of the change that makes it wrong.

## Deliberately deferred

Multi-tenancy, per-user OAuth token storage, an OpenAI data-processing
agreement, and Google's restricted-scope security assessment are all out of
scope for the first hosted instance — the founder chose a personal instance
first specifically to defer them. They return the moment a second person has an
account.
