---
name: task-effort-audit
description: >-
  Run, author, and maintain deterministic task-effort regression audits: count
  interface-imposed work (actions, annotated repeated entry, annotated context
  switches, recovery actions) along a reviewed task path on a web property,
  verify the final state independently, and compare against an explicitly
  approved baseline. Use when the user asks to audit a task's effort, check
  whether a flow got more burdensome or broke since a baseline, add a property
  or task to the audit, approve or compare baselines, or read an audit report.
  Trigger phrases: "task effort audit", "did this flow get harder", "count the
  steps", "approve the baseline", "compare to baseline", "add a task to the
  audit". Not user research, not a cognitive walkthrough, never an "empathy score".
---

# Task-effort audit

**Tool:** `scripts/task-effort-audit/`
- [`README.md`](../../scripts/task-effort-audit/README.md) — commands, config format, counting rules
- [`docs/PROJECT_CONTEXT.md`](../../scripts/task-effort-audit/docs/PROJECT_CONTEXT.md) — why it exists and what it must never claim

**Core question:** *Has this defined task become more burdensome, less burdensome, or broken since the approved baseline?*

## Hard rules

- **No LLM at runtime.** The CLI executes reviewed JSON paths deterministically. You (Claude) help *author and maintain* paths; you never sit inside a run.
- **Never repair a broken path during a run.** No selector healing, alternative routes, or retries. A stopped run is evidence. Report it and propose a path edit for Katy to review *separately*.
- **Never approve a baseline on your own.** `approve` is Katy's call. Draft the command and say why the run qualifies (completed + verified + reviewed). Once she approves, commit the updated file in `artifacts/task-effort-audit/baselines/` (that folder is tracked; runs are not).
- **Writes:** only with `allowedMutations`, a `writesApproved` local/test property, and `--allow-writes`. Never against production. Never demo write scenarios on a live property; use the fixture (`--fixture v1`).
- **Credentials:** never in config. Auth is a `storageState` file referenced by an env var name.
- **Language discipline when reporting:**
  - Say *observation* / *annotation* / *hypothesis* exactly as the finding is labelled
  - A count increase is a **review signal**, not a regression verdict
  - A stopped path is **not** a confirmed product failure
  - Browser duration is **not** human task time
  - No severity, user emotion, or business impact. No composite score.
  - Label design ideas *"Suggestion, not an observed fact."*

## Workflows

### Run an audit
```bash
pnpm audit:effort run --task scripts/task-effort-audit/audits/tasks/<task>.json [--scenario normal] [--allow-writes]
```
- Report from `report.md` (point Katy at `report.html` to view it), giving the three separate answers:
  - **A.** execution
  - **B.** verified completion
  - **C.** comparison
- Then list changed metrics and new/resolved findings with their evidence refs
- Keep the report to what's in `run.json`; don't embellish
- In cloud sessions, set `TEA_CHROMIUM_PATH=/opt/pw-browsers/chromium`

### Investigate a stopped run
1. Read `run.json#execution.failure`, then the failure screenshot
2. `npx playwright show-trace <runDir>/trace.zip` if needed
3. Classify what's *known*; leave root cause "not established" unless the evidence shows it
4. If the UI changed on purpose, propose an updated path. **That changes the definition hash, so a new baseline is required** (say so).

### Add a property/task
1. Follow README § "Adding a real property and task"
2. Prefer role/label locators
3. Add an independent `verify` (assertion after `reload`/`goto`, or `httpJson`)
4. Annotate repeated entry / context switches only with a concrete `source` or `boundary`, and flag each annotation for Katy's review
5. Run `validate`, then one `--headed` run

### Tag MVDS principles
- Add `principles: [id]` to a step, verify step, or scenario only where it is real evidence for that principle. The ids come from `scripts/task-effort-audit/mvds-principles.json`.
- Only guiding principles are allowed; code-enforced ones are rejected.
- Tags never affect counts or the definition hash.
- Report them as "evidence tagged for X", never as a pass/fail on the principle.
- If MVDS principles changed, run `pnpm audit:effort:sync-principles` and commit the snapshot.

### Signed-in properties (e.g. the PDF Organizer)
- **Katy signs in herself:** `pnpm audit:effort auth-capture …`. Never automate a sign-in, and never handle a session value.
- **Where they run:** signed-in runs happen on her machine. A cloud session can only run them against a mock or fixture.
- **On an auth stop** (exit 3), the session expired. Ask her to capture again.

### See all results
- Point Katy at `artifacts/task-effort-audit/index.html`. It's rebuilt after every run, or run `pnpm audit:effort dashboard`.

### Compare / list
- `pnpm audit:effort compare --run <id>`
- `pnpm audit:effort list`
- `pnpm audit:effort baselines --task <id>`

## Tests

| Command | Scope |
|---|---|
| `pnpm test` | Unit, in CI |
| `pnpm test:effort-audit` | Browser acceptance against the fixture; needs Chromium |

Run both after changing anything under `scripts/task-effort-audit/lib/`.
