---
name: openspec-apply-change
description: Implement tasks from an OpenSpec change. Use for /opsx:apply or when the user wants to start implementing, continue implementation, or work through tasks.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.1"
---

Implement tasks from an OpenSpec change.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx:apply <other>`).

2. **Check status to understand the schema**

   ```bash
   openspec status --change "<name>" --json
   ```

   Parse the JSON to understand:
   - `schemaName`: The workflow being used (e.g., "spec-driven")
   - Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)

   **If `schemaName` is `bhd-experiment`:** follow **BHD Apply branch** below instead of steps 3–8 (task checkbox loop and commit/PR for code).

   ### BHD Apply branch (`bhd-experiment` only)
   1. Read `apply.md` and upstream artifacts from `openspec/changes/<name>/` (`explore.md`, `propose.md` if they exist).
   2. **Default — code implementation:** Tell the user to use a **child** OpenSpec change:
      ```bash
      openspec new change <name>-build --schema experiment-hub-lite
      ```
      Child `proposal.md` should quote the Human anchor / hypothesis from parent `explore.md`. Run `/opsx:apply` on the **child** only (normal lite flow + step 8 commit/PR).
   3. **Narrow path — Build Units only:** If the user only wants lifecycle doc updates, edit `apply.md` (Build Unit state, learnings, instrumentation, pattern notes). **Skip** step 8 commit/PR unless they also changed repo code.
   4. Do **not** parse `apply.md` as `- [ ]` task checkboxes. Do **not** create `tasks.md` on the parent change.
   5. End with `## Artifacts` per `openspec-artifacts-output.md`.

3. **Get apply instructions**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns:
   - `contextFiles`: artifact ID -> array of concrete file paths (varies by schema - could be proposal/specs/design/tasks or spec/tests/implementation/docs)
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If `state: "blocked"` (missing artifacts): show message, suggest using openspec-continue-change
   - If `state: "all_done"`: congratulate, suggest archive
   - Otherwise: proceed to implementation

4. **Read context files**

   Read every file path listed under `contextFiles` from the apply instructions output.
   The files depend on the schema being used:
   - **spec-driven**: proposal, specs, design, tasks
   - Other schemas: follow the contextFiles from CLI output

5. **Show current progress**

   Display:
   - Schema being used
   - Progress: "N/M tasks complete"
   - Remaining tasks overview
   - Dynamic instruction from CLI

6. **Implement tasks (loop until done or blocked)**

   For each pending task:
   - Show which task is being worked on
   - Make the code changes required
   - Keep changes minimal and focused
   - Mark task complete in the tasks file: `- [ ]` → `- [x]`
   - Continue to next task

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Error or blocker encountered → report and wait for guidance
   - User interrupts

7. **On completion or pause, show status**

   Display:
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - If all done: suggest archive
   - If paused: explain why and wait for guidance

8. **When apply finishes: commit, push, refresh PR**

   Run this **once per `/opsx:apply` session**, after step 6 ends (all tasks done, paused with progress, or blocked after coding). Invoking apply is Katy’s signal to land work on GitHub so **CI/CD and tests run**—do not wait for a separate “please commit.”

   **Skip only** if the session changed no files (e.g. blocked before step 6) or git is unavailable—say so explicitly.

   a. **Branch** — [github-workflow.mdc](../rules/github-workflow.mdc): never on `main`. Use `cursor/<descriptor>` in kebab-case; **descriptor = OpenSpec change name** when one exists (e.g. change `openspec-artifact-links` → branch `cursor/openspec-artifact-links`). Create and check out the branch before committing if needed.

   b. **Commit** — Stage only files touched this apply session (implementation + `tasks.md` checkboxes). [commit-messages.mdc](../rules/commit-messages.mdc):
   - **Subject:** `<type>(<scope>): <imperative>` — max 50 chars, lowercase start, no period. Scope = area or change slug (e.g. `openspec`, `sso`, `experiments`).
   - **Body:** **Brief but substantive** — 1–3 sentences: what shipped this session and why it matters (not a file list, not “WIP”). Wrap at 72 chars.
   - **Type:** `feat` for new behavior, `fix` for bugs, `docs` for workflow/docs-only, `test` for tests-only.
   - Use a HEREDOC for the message.

   Example:

   ```
   feat(openspec): wire artifact links into apply skill

   End /opsx:apply with commit and a ready-for-review PR so CI runs.
   Step 8 documents branch naming and conventional commit format.
   ```

   c. **Push** — `git push -u origin HEAD` (or push to the existing feature branch).

   d. **PR** — Open **ready for review, not draft**, so the automated Copilot review starts immediately (per [github-workflow.mdc](../rules/github-workflow.mdc)). If no open PR for this branch: `gh pr create` (no `--draft`) with summary, why, and test plan (brief but substantive, same bar as the commit). If a PR already exists as a draft, `gh pr ready` it; if it exists and is already ready, push only and CI re-runs. Then run the **Copilot review loop** (github-workflow.mdc): wait for Copilot's review, address every actionable comment on the same branch, and reply to each — never leave one unanswered.

   e. **Report** — In the completion or pause summary, include commit subject, PR URL, and that checks are running.

   **Never:** `gh pr merge` or approve/review the PR.

**Artifacts output (required):** Follow [`skills/openspec-artifacts-output.md`](openspec-artifacts-output.md). After reading `contextFiles`, include `## Artifacts` with repo-relative links to every context path (and any `tasks.md` or change file edited this session). On session end or when all tasks are `[x]`, list all artifact files for the change via status JSON.

**Output During Implementation**

```
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete
```

**Output On Completion**

```
## Implementation Complete

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 7/7 tasks complete ✓

### Completed This Session
- [x] Task 1
- [x] Task 2
...

All tasks complete! Ready to archive this change.

**PR:** https://github.com/beckharrisdesign/experiment-hub/pull/NNN (ready for review — CI running)
```

**Output On Pause (Issue Encountered)**

```
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

**PR:** https://github.com/beckharrisdesign/experiment-hub/pull/NNN (ready for review — CI running; partial apply committed)

What would you like to do?
```

**Guardrails**

- **`/opsx:apply` finishes with git:** when the session ends, commit (brief substantive message + naming conventions) + push + PR refresh if any files changed; overrides global “commit only when asked” for this repo
- Keep going through tasks until done or blocked
- Always read context files before starting (from the apply instructions output)
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Pause on errors, blockers, or unclear requirements - don't guess
- Use contextFiles from CLI output, don't assume specific file names

**Fluid Workflow Integration**

This skill supports the "actions on a change" model:

- **Can be invoked anytime**: Before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions
- **Allows artifact updates**: If implementation reveals design issues, suggest updating artifacts - not phase-locked, work fluidly
