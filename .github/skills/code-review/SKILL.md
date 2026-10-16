---
name: code-review
description: >-
  How agents handle pull request review on this repo: CI failures, Copilot and
  bot review comments, merge conflicts, and follow-up pushes. Use when reviewing
  a PR, answering review comments, fixing red CI, or watching a PR after opening
  it. Sets the autonomy level: act without asking, and only bring Katy decisions
  that need her.
---

# Code review and PR follow-through

Katy is a solo founder. Every question or "your move" message costs her a context
switch. **Default to doing the work, not asking about it.** Branching, drafts, PR
descriptions, and the Copilot loop are defined in `rules/github-workflow.mdc`.
This skill covers how proactive to be.

## Just do it — never ask first

- **Red CI on a PR you opened:** root-cause it, fix it, push. That includes failures
  in unrelated code that block the PR, such as a flaky live test or a timeout. Fix it
  on the same PR and note it in the Summary. Don't open a separate PR.
- **Copilot and review-bot comments:** fix anything that's correct and small, then
  reply on the thread and resolve it. If a finding isn't worth fixing, reply with one
  line saying why, then resolve it.
- **Nits and style comments:** if a commit is already going out, fold them in.
  Otherwise reply with one line and resolve.
- **Merge conflicts on your own branch:** merge main in, resolve, validate, push.
- **PR description:** keep the Summary list complete after each push, without being
  asked.
- **Stale `openspec/changes/*/tasks.md` claims your PR affects:** update them in the
  same PR.

## Before you push a fix

- Run lint, typecheck, and the tests for what you changed.
- For a CI fix, reproduce the failure first, then show it passing.
- Keep the fix to what the failure or comment needs.

## Don't prompt Katy for these

- Don't tell her to mark a PR ready, review it, or merge it. She knows. Never end a
  message with "your move" or "ready for you to review".
- Don't announce routine events: a check started, a preview deployed, or a bot
  skipping its preview.
- Don't ask "want me to fix this?" for anything in the list above. Fix it, then
  report it.
- Don't ask her to re-run a job. If you can't re-run it, make the test robust within
  the PR, or comment on the PR once with the blocker.

## Bring Katy only these

- Product, copy, or design calls where her voice matters, such as wording on a
  public page.
- A review finding that would change behavior beyond the PR's scope, or touches
  auth, payments, or data deletion.
- A security finding. Leave its thread open until she decides.
- Anything needing a setting agents can't reach: repo settings, environment
  network access, or dashboard keys.

When you do bring her something, ask exactly one question and lead with a
recommendation.

## Reporting

- **Talk only when something changed:** a fix pushed, a blocker found, or the PR
  merged. Report a quiet check silently.
- **When you do report,** give at most three bullets: what happened, what you did,
  and anything only she can do.

## Hard limits

- Never merge, approve, or mark a PR ready. Those are Katy's calls, and they're why
  you don't prompt her about them.
- Never skip, disable, or quarantine a test to get green. Never push an empty commit
  to retrigger CI.
- Never re-request Copilot review yourself. It spends premium requests.
