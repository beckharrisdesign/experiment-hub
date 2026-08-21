## Context

The seed stage is a writing convention, not a surface. It adds no page, no
component, and no route. What it does add is **rows** to a Notion database the
hub already reads, so the design question is not "what does this look like" but
"what happens to the surfaces that already exist when seeds start appearing".

## Goals / Non-Goals

**Goals:**

- A seed is capturable in Notion with no hub change at all.
- Seeds do not leak onto the public catalog before they are decided on.
- The consequence of seeds existing is written down, so a later session does not
  rediscover it as a bug.

**Non-Goals:**

- No hub surface for the Ideation backlog. Deferred deliberately — worth
  building only once there are seeds to look at, and listed as open question 4
  in `docs/SELECTION.md`.
- No change to how experiments render today.
- No new Notion property, view, or automation.

## User flow / IA

Idea arrives → Notion row at `Status = Ideation` with Hypothesis / Why this
matters / Who it's for → sits until judged → on promotion, `Status` moves to
Discovery and the existing Explore path takes over unchanged.

The hub is not in this flow until promotion.

## Visual design / Figma

| Item                | Value                                                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Primary file URL    | N/A — no UI. No surface is added, altered, or removed.                                                                  |
| As-is frame(s)      | N/A                                                                                                                    |
| Proposed frame(s)   | N/A                                                                                                                    |
| Libraries / version | N/A                                                                                                                    |
| Code Connect        | N/A                                                                                                                    |
| Breakpoints         | N/A                                                                                                                    |
| Status              | N/A justified below — this is a docs + Notion-data convention with zero rendered change, not a change whose UI is "reused components". |

**Why N/A is legitimate here, stated explicitly** because the schema restricts it
to genuinely no-UI changes: this change ships one markdown file and a set of
OpenSpec artifacts. It renders nothing. The nearest thing to a UI effect is
covered under Decisions below, and it is a *consequence of existing behaviour*
meeting new data — not a surface this change designs.

## Decisions

**Seeds are private-by-default, and that is load-bearing rather than lucky.**
`lib/notion-experiments.ts:201` reads `Public` as
`properties["Public"]?.checkbox === true`, so an unset checkbox — Notion's
default for a new row — yields `public: false`. `app/page.tsx:35` filters on
`editMode || exp.public !== false` and
`app/experiments/[slug]/page.tsx:122` returns `notFound()` for
`public === false`. A seed therefore stays off the public catalog with no action
required. The convention still says leave `Public` unchecked, because relying on
a default silently is how defaults get changed.

**Seeds read as `Active` inside the hub.** `STATUS_MAP` in
`lib/notion-experiments.ts:65` collapses all five pre-launch Notion phases —
Ideation, Discovery, Business Case, PRD, Validating — onto the single hub status
`Active`. So in admin edit mode a seed is listed as an Active experiment. This is
accepted for now rather than fixed: the hub's status vocabulary is coarser than
Notion's by design, and adding an `Ideation` hub status would be a schema and
rendering change this change explicitly refuses to make.

The practical consequence is that **"Active" in the hub will get less meaningful
as seeds accumulate**, on top of the existing problem that several rows already
marked Active have not moved in months. That is a real cost of this change and
the trigger for open question 4 — when the Active count stops being readable,
that is the signal a backlog surface has earned its place.

**No enforcement anywhere.** Per the second Human anchor line, nothing in CI
checks that a seed exists, has a score, or passed a gate. A convention this young
would be calcified by a gate.

## Risks / Trade-offs

| Risk | Assessment |
| --- | --- |
| Seeds leak to the public site | Low. Private-by-default is verified in code at three points. Mitigated further by the convention stating it rather than assuming it. |
| "Active" becomes noise in the hub | Accepted, and named as the trigger for building a backlog surface later. |
| The gate gets skipped the way the Explore scorecard did | Real — it is the failure mode this change is a reaction to. `docs/SELECTION.md` open question 5 says plainly that if scoring at the boundary slips, the gate is still too heavy and should shed the score and keep only the incident test. |
| The convention is wrong | Cheap to find out. Reverting is deleting files; no data migration, no property to remove. |
