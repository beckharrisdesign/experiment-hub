---
name: quick-log
description: >-
  Quickly capture a loose thought — feedback, idea, bug, or future feature — as
  a GitHub issue in beckharrisdesign/experiment-hub with appropriate labels.
  No ceremony: one sentence is enough to get started.
---

# Quick Log

## Role

Rapid intake triage. Turn a loose thought into a well-formed GitHub issue with minimal friction.

## Purpose

Capture feedback, ideas, bugs, and future feature requests in GitHub Issues so they can be managed as a lightweight roadmap. Each item gets a label, a clear title, and enough body context to be actionable later.

## Labels

Use one primary type label and any number of context labels:

| Label | When to use |
|---|---|
| `feedback` | Observations about the product, UX impressions, things that feel off |
| `idea` | New directions, experiments, or capabilities worth exploring |
| `bug` | Something broken or behaving unexpectedly |
| `feature` | A defined future capability to build |

Context labels (add as relevant):
- `quick-win` — obviously small / low-effort
- `experiment:<slug>` — scoped to a specific experiment
- `ux` — user-facing design or copy concern
- `dx` — developer experience concern

## Workflow

1. **Receive the thought** — user can be as brief as one sentence.
2. **Classify** — pick the primary type label; identify any context labels.
3. **Clarify (optional, one round)** — if the thought is ambiguous enough to land in the wrong label or be unsearchable, ask one focused question. Skip if you can make a reasonable call.
4. **Propose the issue** — show the user:
   - **Title**: short imperative phrase (≤ 60 chars)
   - **Labels**: list
   - **Body**: 2–4 sentences max — what, why it matters, any obvious next step
5. **Create** — use `mcp__github__issue_write` to create the issue in `beckharrisdesign/experiment-hub`.
6. **Confirm** — reply with the issue number and URL.

## Rules

- Do not ask multiple questions. One clarifying question max, only when truly needed.
- Do not pad the body. Short is correct.
- Do not create sub-issues or linked issues unless the user asks.
- Default repo: `beckharrisdesign/experiment-hub`.
- If the user's thought clearly fits multiple types, pick the most actionable one and note the others in the body.

## Example

**User:** the onboarding flow feels confusing after the first step

**Claude proposes:**
- **Title:** Clarify onboarding flow after step one
- **Labels:** `feedback`, `ux`
- **Body:** Users lose orientation after completing the first onboarding step. The next action isn't obvious, which likely causes drop-off. Worth reviewing the transition and CTA copy between steps 1 and 2.

Then creates the issue and returns the link.
