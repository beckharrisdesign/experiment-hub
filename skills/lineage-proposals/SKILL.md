---
name: lineage-proposals
description: >-
  Propose evidence-backed corrections to Katy's Idea Lineage graph (the claude.ai
  artifact that maps how ideas, tests, decisions and tools grew out of each
  other). Reads the graph's current nodes, gathers dated evidence from Notion,
  git, repo docs and other connected sources, and writes each correction as a
  proposal she accepts or declines inside the graph. Never edits nodes
  directly. Use when the user asks what came first, whether a lineage link is
  right, or for new proposals for the diagram. Trigger phrases: "propose
  updates to the lineage", "what else can we suss out", "check the lineage
  against the data", "which of these links are wrong", "find proposals for the
  diagram".
---

# Lineage proposals

The Idea Lineage graph is Katy's review surface for how her work evolved. This
skill finds links in it that the evidence contradicts and turns each one into a
**proposal**: a current vs. proposed comparison she says yes or no to in the
graph's drawer. **Claude proposes; Katy decides.** Nothing about the structure
changes until she taps *Yes*.

## The artifact

- **URL:** `https://claude.ai/artifact/Vk5R8upbve4sWf4SZd3C42`
- Read and write its database with the **ArtifactData** tool. Load it with
  ToolSearch (`select:ArtifactData`) if it is deferred.
- **`nodes` collection.** One document per node, with fields:
  - `kind`: `idea | test | decision | tool`
  - `name` and an optional `short` graph label
  - `parents[]`: what it grew out of
  - `testOf[]`: what a built thing was also a test of, for example Estate Sale Planner tested MVDS
  - `themes[]`, `fields{}` and `updatedAt`
- **`proposals` collection.** Read by the page:

```json
{
  "title": "Notion Sync came before zero-sales",
  "status": "open",
  "createdAt": "<ISO timestamp>",
  "source": "From git history + Notion",
  "rationale": "One or two sentences: what the graph says, what the evidence says.",
  "evidence": ["Dated, sourced fact", "…"],
  "changes": [
    { "node": "zero-sales", "field": "parents", "from": [], "to": ["etsy-notion-sync"] }
  ]
}
```

- `field` must be `parents` or `testOf` for link changes. Theme changes
  (`themes`, new themes) belong to `skills/theme-proposals/SKILL.md`.
- `from` must equal the node's **current** value. The page warns when it
  doesn't, but a proposal that is wrong from the start wastes a review.
- An open proposal adds +1 to the badge of each node it would change. Write
  only proposals worth her attention.

## Sources, in order of authority

1. **Notion is the source of truth** for status, outcome, type and why. Use the
   BHD Labs Database (`collection://399b908d-7b37-80cb-beb5-000b54ca2967`) and
   the KBH Second Brain notes, such as the weekly "Hub week of …" pages. Search
   with `notion-search`, then read rows with `notion-fetch`.
2. **Git dates things.** For each folder, the first commit tells you when it
   appeared. Run `git log --diff-filter=A --reverse --format='%ad %h' --date=short -- <path>`
   for each `experiments/<slug>/` and `openspec/changes/<id>/` (including
   `archive/`), and read the **first line of the full output**. Never pipe
   `git log` into `head` or `tail`: RTK truncates output before the pipe sees
   it, which returns a confidently wrong date (same rule as
   `lib/change-visualizer/git.ts`). Don't add `--max-count` either, because git
   applies the limit before `--reverse`. PR bodies
   (`git show --stat --format=%b <sha>`) often say what a change grew out of.
3. **Repo docs say why.** Look at `experiments/<slug>/docs/` (intent, prior art,
   history drafts), OpenSpec `proposal.md` and `design.md` (the "Why" and
   "Human anchor" sections), and `docs/pulls/` notes.
4. **Other connected sources are supporting evidence only.** Gmail, Google
   Calendar, Google Drive and similar connectors can date a moment, such as a
   purchase or a meeting. Use them only when they settle a question the first
   three can't.

**Never use `data/experiments.json` as evidence.** It is a stale legacy seed
(see #544). When Notion and the repo disagree, Notion wins, and the
disagreement is worth reporting.

## Method

1. **Snapshot the graph.**
   - Run ArtifactData `list` on `nodes` with an `out_dir` in the scratchpad.
   - List `proposals` too. Skip anything already open.
   - Never re-propose a declined change unless you have new evidence. Say so
     in the rationale.
2. **Pick a family** (a connected cluster) or the area the user named. Build a
   dated timeline of every node in it from Notion and git.
3. **Test every `parents` link.** A link holds only if both are true:
   - **The parent came first.** A child older than its parent is a reversal,
     which is the clearest kind of proposal.
   - **The child's own record points at the parent.** Look in its docs, PR
     body, "Why" section or Notion row.
4. **Know what isn't lineage.** Watch for these traps:
   - **Reused code:** "built on the reader first written for X", or a Stripe
     integration adapted from another project. That's infrastructure, not
     ancestry.
   - **Rhymes with:** "this direction rhymes with X" is a convergence. Put the
     link on the node where the threads actually met, not on the earlier one.
   - **Pointed at:** something a roadmap says a tool will feed later is future
     work, not origin.
   - **Personal-need roots:** a tool born from Katy's own chore or a one-off
     need is a root, with an empty `parents`. That's a legitimate answer.
5. **Respect how Katy defines tests.** Human instinct and accumulated knowledge
   are fair tests. A whole built idea can be a test of something else
   (`testOf`). In 2026, signup-page tests don't count as signal. Some
   "experiments" were really tools she needed.
6. **Rate each proposal.**
   - *Strong:* dates and the child's own record agree.
   - *Weaker:* there's an absence of evidence, or one indirect source. Put
     `· weaker evidence` in `source` and say what would settle it.
7. **Write the proposals.**
   - Use one ArtifactData `batch` of `set` ops into `proposals`.
   - Use kebab-case ids that describe the claim, e.g. `keyword-from-sync`.
   - Proposals are new documents, so they need no `if_version`.
   - Make one proposal per claim. A reversal touches two nodes in one proposal.
8. **Don't touch `nodes`.** Applying a change is the page's job, once Katy says
   yes. If you need to correct a proposal she has already decided, update only
   its `evidence` or `source`, pinned to the version you read. Keep `status`
   as it is.

## What you can't propose (yet)

- **New nodes** (for example, a missing ancestor like the Etsy listing manager).
  Katy hasn't approved adding nodes. List them in your reply and offer.
- **Field changes** such as status or kind. The page only applies link changes.
  Report mismatches (e.g. the graph or the json disagreeing with Notion) in
  your reply instead.

## Writing style

The proposal text appears in a narrow drawer, and Katy scans it.

- **Title:** the claim in plain words, under about 60 characters.
- **Rationale:** what the graph says, then what the evidence says, in one or
  two sentences.
- **Evidence:** dated, sourced facts, one per bullet. Quote her own words
  where they exist.

## Reply to the user

Keep the reply short and scannable, matching her preferences:

- a table with one row per proposal, giving the change, its strength and the
  key evidence;
- what you checked but **kept**, and why;
- mismatches and missing nodes as one line each, with an offer to act.

End with the artifact link. Don't re-explain how the review UI works unless it
changed.
