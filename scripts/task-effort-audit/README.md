# Task-effort audit (v1)

A deterministic regression audit of **interface-imposed work along a reviewed task path**.

It answers one question per task: ***has this task become more burdensome, less burdensome, or broken since the approved baseline?***

> It is **not** user research or a complete cognitive walkthrough. It doesn't measure emotion, human task time, discoverability, real-user completion, prevalence, or business impact. See [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) for the rationale, boundaries, sources, and future directions.

- **Skill:** [`skills/task-effort-audit/SKILL.md`](../../skills/task-effort-audit/SKILL.md)
- **Stack:** Node + Playwright (already in the repo), zod for config validation. No service, no database, and no LLM calls at runtime.

---

## Quick start: local fixture demo

The fixture is a tiny in-memory "Northwind" account app with four simulated releases:

| Variant | What it simulates | What the audit should do |
|---|---|---|
| `v1` | Baseline | Complete, verify, 9 actions |
| `v2-confirm` | Adds a "Confirm email change?" dialog | +1 action, flagged for review (supported conditional) |
| `v3-renamed` | Save button renamed to "Update contact" | **Stop** at `save` as a reference-path failure; no deltas |
| `v4-no-persist` | Shows "saved", but doesn't persist | Path completes, **verification fails** after reload |

```bash
pnpm audit:effort run --task scripts/task-effort-audit/audits/tasks/update-contact-email.json --fixture v1 --allow-writes
```

```bash
pnpm audit:effort approve --run <runId printed above>
```

```bash
pnpm audit:effort run --task scripts/task-effort-audit/audits/tasks/update-contact-email.json --fixture v2-confirm --allow-writes
```

```bash
pnpm audit:effort compare --run <runId of the later run>
```

```bash
pnpm audit:effort list
```

- **Recovery scenario:** add `--scenario recovery`
- **Debugging:** add `--headed --slow-mo 300`
- **No Playwright browser download?** Set `TEA_CHROMIUM_PATH` to a Chromium binary (e.g. `/opt/pw-browsers/chromium` in cloud sessions)

## Commands

| Command | What it does |
|---|---|
| `run --task <file> [--scenario normal] [--allow-writes] [--headed] [--slow-mo ms] [--fixture <variant>]` | Executes one scenario; writes a run directory; compares to the current baseline if one is compatible |
| `validate --task <file> [--scenario name]` | Checks config + safety and prints each step and whether it counts |
| `approve --run <runId> [--supersede] [--by name] [--note text]` | **The only way** a run becomes a baseline |
| `dashboard` | Rebuilds `index.html`, the runs page: every task's latest run against its baseline, plus all runs, linking to each report. Also rebuilt after every run. |
| `report --run <runId>` | Regenerates `report.md` and `report.html` from `run.json` + `actions.json` (e.g. for older runs) |
| `compare --run <runId>` | Re-compares a run against the *current* baseline; writes `comparison-vs-<baselineRunId>.{json,md}` into the run dir |
| `list [--limit 20] [--task id]` | Recent runs from the append-only index |
| `baselines --task <id> [--scenario name]` | Current baseline + full approval history |

- **Global flag:** `--data-dir <dir>` (default `artifacts/task-effort-audit`, or `$TEA_DATA_DIR`)

### Exit codes

| Code | Meaning |
|---|---|
| `0` | Executed the reference path **and** verified the final state |
| `1` | Run failed, stopped, or the final state wasn't verified (fail/unknown) |
| `2` | Configuration problem, safety refusal, or refused command (e.g. approving an unverified run) |
| `3` | Authentication problem (missing auth reference, expired session, redirected to login) |

> **Metric changes never change the exit code.** They're printed prominently (⚑) for review.

---

## What a run records

Each run lives in `artifacts/task-effort-audit/runs/<runId>/` (gitignored; only `baselines/` is committed):

| File | Contents |
|---|---|
| `run.json` | Context, tooling versions, definition hash, execution status, verification, metrics, safety, cleanup, findings, comparison |
| `actions.json` | Ordered action ledger with annotations. Written after **every** step, so it survives a crash or report failure |
| `report.html` | **Open this first.** Self-contained page: A/B/C status, baseline table, findings linked to evidence, the full action ledger with screenshots inline. Screenshots are embedded, so the file can be shared on its own (treat it as sensitive). |
| `report.md` | The same summary as plain markdown |
| `screenshots/` | Start, annotated/conditional/mutating steps, path end, verification, and failures |
| `trace.zip` | Playwright trace: `npx playwright show-trace <runDir>/trace.zip` |

Also in the data dir:
- **`index.html`** — the runs page. **Open this to see everything:** latest result per task (stopped and changed first), actions vs baseline, and links to every `report.html`.
- **`index.jsonl`** — append-only `started` / `finished` events. A run with no `finished` event lists as *interrupted*.
- **`baselines/`** — baseline records (described below)

### Three separate answers

Every run reports these separately:
- **A. Execution** — did the reviewed path complete?
- **B. Verified completion** — `pass` / `fail` / `unknown`, from independent assertions
- **C. Comparison** — `compared` / `not-comparable` (with reasons) / `no-baseline`

### Failure categories

- Product assertion
- Reference-path or locator
- Authentication
- Environment
- Timeout
- Safety stop
- Unknown

> Root cause is always recorded as *not established*. A stopped path is not a confirmed product failure.
>
> **No automatic retries.** A manual rerun gets a new run ID; the earlier run is kept.

### Findings

Each finding has:
- A **stable `key`** (e.g. `repeated-entry:normal:confirm-email`), so it can be tracked as new / resolved / unchanged across runs
- A **kind:**
  - `observation` — the runner saw it
  - `annotation` — a reviewer declared it
  - `hypothesis` — unverified
- **Evidence refs** (screenshot, `actions.json#<index>`, trace)
- A **review note**

Optional design suggestions are labelled *"Suggestion, not an observed fact."* No severity, user reaction, or business impact is ever generated.

### Baselines

- **Approval is explicit:** a run is never promoted automatically
- **Eligibility:** only completed **and** verified runs can be approved
- **Replacing:** if a baseline exists, `--supersede` is required
- **History:** every approval is kept in history, including what it superseded

`baselines/<taskId>--<scenario>.json` holds metrics, finding keys, hashes, and tool versions. No screenshots, page content, or entered values.

> **Baselines are committed to git** so they survive sessions and machines. After `approve`, commit the changed baseline file. The baseline's own run evidence (screenshots, trace) stays local, so the record carries everything a comparison needs.

### Compatibility

These make a comparison **"not comparable"** (default-deny):
- The task definition hash changed. Editorial fields `name`, `notes`, `description`, and `note` are excluded from the hash; everything else is included, *annotations too*.
- `comparisonContext` changed
- The property's id / baseUrl / environment changed
- The current run stopped, or its final state wasn't verified

A stopped run's actions are shown under **Partial execution**, never as completed-path deltas.

---

## Counting rules

| Rule | Detail |
|---|---|
| **1 action** | One `click`, `select`, `check`/`uncheck`, `press`, `switchPage` (moving to another tab/window), or full-field `fill`. A field value counts **once**, not per keystroke. |
| **0 actions** | Waits, assertions, `read`, screenshots, setup, starting-state load, verification, cleanup |
| **Scrolling** | Recorded separately (`scrolls`), never in the action count |
| **Conditional steps** | Counted only if the condition appeared and the step ran. Otherwise logged as *skipped*. |
| **Recovery** | Steps with `phase: "recovery"` are counted in `recovery.*`, separate from `path.*`. The induced error (`phase: "error-induction"` + an `expectError` step) is the controlled scenario, *not* a failure. |
| **Repeated entry** | Counted **only** from a `repeatedEntry` annotation (with `source` + `explanation`) on a `fill`/`select` |
| **Context switch** | Counted **only** from a `contextSwitch` annotation (with `from`, `to`, and a documented `boundary`: `new-browser-tab`, `different-site`, `different-application`, `different-product-area`, `external-document`). Ordinary navigation is *not* a context switch. |
| **Duration** | Recorded as `diagnostics.browserDurationMs`. Diagnostic only, never human task time. |

> **The runner does not discover repeated entry or context switches.** Those counts are only as good as the reviewed annotations.

---

## Configuration

Two JSON files: a **property** and a **task** (see `audits/` for the working example). Run `validate` after every edit.

### Property (`audits/properties/<id>.json`)

```jsonc
{
  "schemaVersion": 1,
  "id": "local-fixture",
  "name": "Northwind (local fixture)",
  "baseUrl": "http://127.0.0.1:4789",
  "environment": "local",            // local | test | production
  "writesApproved": true,            // only for an approved test env/account
  "writesApprovalNote": "why this is safe to change",
  "fixture": { "module": "../../fixture/server.mjs" },   // local only; enables --fixture
  "fixtureApi": { "pathPrefix": "/__fixture/" },          // setup/cleanup may only call under this
  "readOnlyRequestAllowlist": [],    // reviewed POSTs that change nothing; let through
  "suppressRequests": [],            // reviewed side effects (e.g. view counters); blocked quietly, recorded
  "authProfiles": {
    "fixture-owner": { "type": "none" },
    "test-account": { "type": "storageState", "pathEnv": "TEA_AUTH_MYAPP",
                      "signedInCheck": { "role": "button", "name": "Account menu" },
                      "loginUrlPattern": "/login" }
  }
}
```

### Task (`audits/tasks/<id>.json`)

| Field | Purpose |
|---|---|
| `id`, `name` | Stable id; human-readable name |
| `propertyRef` | Relative path to the property file |
| `userRole`, `familiarity`, `goal` | Who, how familiar, and the goal in user terms |
| `startingState` | `{ path, description }`, loaded after setup (not counted) |
| `testData`, `fixtureRef` | Test values (`{{data.x}}`) and where fixture data comes from |
| `viewport`, `locale`, `authRef` | Execution context; `authRef` names a property auth profile |
| `limits` | `maxDurationMs`, `maxActions`, `stepTimeoutMs` |
| `allowedMutations` | `[{ id, kind: update\|create, description }]`. Empty = read-only. |
| `comparisonContext` | Bump to deliberately break comparability (e.g. `2026-11-v1`) |
| `setup` / `cleanup` | `fixtureApi` calls only (GET/POST/PUT, under the fixture prefix). Recorded as non-UI steps. |
| `verify` | Independent success assertions (task default; a scenario can override) |
| `scenarios.<name>` | `{ kind: normal\|recovery, steps[], verify? }` |

### Steps

```jsonc
{ "id": "save", "do": "click", "target": { "role": "button", "name": "Save changes" },
  "mutates": "contact.email",                      // must be in allowedMutations
  "page": "main",                                  // or a page opened by opensPage
  "phase": "path",                                 // path | error-induction | recovery
  "conditional": { "ifVisible": { ... }, "waitMs": 1500, "reason": "..." },
  "annotations": { "repeatedEntry": {...}, "contextSwitch": {...}, "suggestion": "..." },
  "principles": ["error-prevention"],              // MVDS principle ids (labels only)
  "screenshot": true, "note": "editorial" }
```

- **Path steps:** `click fill select check uncheck press switchPage read waitFor scroll screenshot assertVisible assertText assertValue expectError`
- **Verify-only steps:** `goto reload httpJson`. They'd bypass the UI if used in the path.
- **Targets:** exactly one of `role`(+`name`) · `label` · `text` · `testId` · `placeholder` · `css`, optionally scoped with `within`. Prefer semantic locators (role/label).
- **Templates:**
  - `{{data.key}}` — logged
  - `{{saved.key}}` (from a `read` step) — redacted in the ledger
  - `{{env.NAME}}` — redacted in the ledger
- **Verify must be independent:** at least one assertion *after* a `reload`/`goto`, or an `httpJson` state check. A message at the end of the path is not proof.

---

## Safety

- **Read-only by default.** Every non-GET browser request is blocked unless:
  1. the task lists `allowedMutations`,
  2. the property has `writesApproved: true` in a `local`/`test` environment,
  3. the run passes `--allow-writes`, **and**
  4. the request is same-origin during a step that declares `mutates`.
- **Never production writes.** Even with every flag set.
- **Side-effect requests on live sites:** list reviewed analytics/view-counter endpoints in `suppressRequests`. They're blocked without stopping the run (so audits don't inflate your stats) and listed in `run.json#safety.suppressedRequests`. Anything unlisted still stops the run as a safety stop. Note that GET-based analytics are not blocked.
- **Always refused:**
  - Clicking anything labelled delete/remove/pay/purchase/send/place order/…
  - Mutation kinds other than `update`/`create`
  - Typing into password fields
  - `DELETE` in setup/cleanup
  - Fixture calls outside `fixtureApi.pathPrefix`
- **No credentials in config:**
  - Credential-looking keys/values are rejected
  - Auth uses a Playwright `storageState` file referenced by an **env var name**
  - Keep the file in `artifacts/task-effort-audit/auth/` (gitignored)
- **Cleanup failures** are reported as **RESIDUAL TEST CHANGES** in the terminal, report, and findings
- **Do not run write scenarios on a live property to demo the tool.** Use the fixture.

### Privacy and retention

- **Gitignored:** screenshots, traces, ledgers, the run index, and auth state all live under `artifacts/task-effort-audit/`. Only `baselines/` is tracked.
- **Not sanitized:** browser evidence can contain whatever the page showed
- **No automatic deletion in v1.** Review and delete old `runs/<runId>/` directories by hand. Keep any run that a current or historical baseline points to, if you want its evidence.
- **Suggested habit:** prune runs older than ~30 days that aren't baselines

---

## MVDS principle tags

Steps, verify steps, and scenarios can carry `principles: [id, …]`, naming the MVDS principles they are evidence for. Example: `update-contact-email.json`.

- **Must resolve.** Every id is checked against `mvds-principles.json`, a committed snapshot of your MVDS manifest, stamped with the MVDS commit. An unknown id fails `validate`.
- **Guiding principles only.** The Nielsen heuristics plus `scale-to-the-data`, `declarations-must-resolve`, and the like. Rules MVDS enforces in code (tokens, layout, story coverage) are rejected, because the audit observes running interfaces, not source.
- **Labels, not verdicts.** Tags never change what runs or counts, and they're excluded from the definition hash, so adding or editing them never breaks a baseline. Nothing is scored per principle.
- **Where they show up:**
  - Each finding carries the tags of its step.
  - The recovery finding carries the scenario's tags plus those of the error-message check and the recovery steps.
  - A failed verification carries its verify step's tags.
  - Both reports add an "MVDS principles" section listing the tagged steps and findings for each principle, with a link to its source.
  - All of this is recorded in `run.json#principles`.
- **Refresh the catalog** after MVDS principles change, then commit `mvds-principles.json`:

```bash
pnpm audit:effort:sync-principles
```

## Live-site example

`audits/tasks/bhd-find-design-function-case-study.json` runs read-only against beckharrisdesign.com: Home → Consulting → "Rebuilding a design function" (2 actions), verified by a fresh load of the case study. Its property suppresses the site's `POST /api/view` counter.

```bash
pnpm audit:effort run --task scripts/task-effort-audit/audits/tasks/bhd-find-design-function-case-study.json
```

> **First run on any live site:** expect a safety stop if the page sends POSTs (analytics, view counters). Read `run.json#safety.blockedRequests`, decide what each one is, then add it to `suppressRequests` (a side effect to avoid) or `readOnlyRequestAllowlist` (harmless) on the property.

## Authoring realistic tasks

A task is only as realistic as the person and the evidence behind it. Examples: `bhd-hiring-manager-leadership.json`, `bhd-design-manager-process.json`.

1. **Start from a person and a decision.** Who they are (`userRole`), how they arrive (`startingState`: home from LinkedIn, or straight onto a case study from a referral), and what they're trying to decide (`goal`, in their words).
2. **Write the evidence first.** List what that person must see to make the decision, such as role history or a team-building section, and put it in `verify` as assertions on fresh page loads. The run passes only if the evidence is there, so removing or renaming it shows up as a verification failure.
3. **Walk it as them, not as the author.** Follow visible labels a first-time visitor would pick, even when you know a shorter URL. Record backtracks and detours in a step `note` (e.g. "About has no link to case studies, so they return through the nav").
4. **Annotate only real boundaries.** A PDF résumé, LinkedIn, or a new tab is a `contextSwitch`; moving between pages on the same site is not.
5. **One context per task.** Make a separate task for phone width, or for a different entry point, rather than averaging them.
6. **Run it once with `--headed`, then approve the baseline.**

> **What this can't tell you:** whether that person would choose this path, or find the content convincing. Pair it with real people (first-click or five-second tests) before drawing conclusions about discoverability.

## Adding a real property and task

1. **Create the property file.** Copy `audits/properties/local-fixture.json` → `audits/properties/<id>.json`:
   - Set `baseUrl` and `environment` (`test` for staging; `production` only for read-only tasks)
   - Leave `writesApproved: false` unless it's an approved test environment/account
   - Delete `fixture`/`fixtureApi` unless the property has a test-reset API
2. **Set up auth, if needed:**
   - Sign in by hand once with Playwright and save `storageState` to `artifacts/task-effort-audit/auth/<id>.json`
   - Add a `storageState` profile with `pathEnv`
   - Export that env var before running
3. **Write the task:**
   - Copy the example task, then write the reviewed path step by step with role/label locators
   - Annotate repeated entry and context switches only where a reviewer agrees they apply
   - Keep it **read-only** (`allowedMutations: []`) unless writes are approved
4. **Add verification:** a `goto`/`reload` + assertion, or an `httpJson` check
5. **Validate and dry-run:**
   - `validate --task …`
   - `run --task … --headed` to watch it once
6. **Approve a baseline:** once a run completes and verifies, `approve --run <id>`, then commit `artifacts/task-effort-audit/baselines/<task>--<scenario>.json`. Later runs compare automatically.

## Tests

| Command | What it runs |
|---|---|
| `pnpm test` | Unit tests in `tests/scripts/task-effort-audit/`: counting, config/hash, safety, comparison, classification, findings, approval |
| `pnpm test:effort-audit` | Browser acceptance tests (`tests/task-effort-audit-e2e/`), one per acceptance criterion. Needs Chromium; not in CI. |

## Known limitations

- **Breaks before it counts:** the runner follows the reviewed path and never repairs it, so many product changes *break* the path rather than change a count. That's intended: it stops for review.
- **Annotation-dependent:** repeated-entry and context-switch counts depend on reviewer annotations
- **Request attribution:** a mutating request is attributed to the step running when it fires. A 150 ms settle after each action catches most requests, but very late requests may be attributed to the next step.
- **Prohibited-label check is a heuristic** on accessible names. It can over-block (e.g. a legitimate "Send" in a search box) and can't see unlabeled destructive controls; the request guard is the backstop for writes.
- **Single browser, single viewport per task.** No scheduling, notifications, or dashboard by design.
