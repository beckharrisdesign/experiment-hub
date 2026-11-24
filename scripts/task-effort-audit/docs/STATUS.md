# Task-effort audit: status and next steps

**Last updated:** 2026-11-24, end of day. **Start here when picking this back up.**

- **Branch:** `claude/eager-ptolemy-mk5lbh`
- **PR:** [beckharrisdesign/experiment-hub#648](https://github.com/beckharrisdesign/experiment-hub/pull/648). Draft, CI green on every commit, no review comments. Mark it ready when you want Copilot's review.
- **Runs page (static copy from 2026-11-24):** https://claude.ai/artifact/1i5pvCP3CxdWZUDrz6uT1N. Private to you. It doesn't update itself; the live version is `artifacts/task-effort-audit/index.html`, rebuilt after every run.

---

## Next up

### 1. First PDF Organizer run (on your computer)

The five `pdfo-*` tasks are built and validated, but have **never run against production**. Google sign-in has to happen in your own browser. They were checked against a mock built from the components' markup: all passed.

**Either** share your `experiment-hub` folder with a cloud session (Claude desktop app → Settings → Claude Code → Remote Control) and ask that session to run them. **Or** open Claude Code in the desktop app, in your `experiment-hub` folder, and paste:

> Check out branch `claude/eager-ptolemy-mk5lbh` and run `pnpm install`. Then follow `skills/task-effort-audit/SKILL.md` to run the five PDF Organizer tasks: start with `auth-capture` so I can sign in, then run each `pdfo-*` task and open `artifacts/task-effort-audit/index.html`.

**Or by hand:**

```bash
pnpm audit:effort auth-capture --property scripts/task-effort-audit/audits/properties/pdf-organizer.json --profile katy-google --start /pdf-metadata-viewer
```

```bash
export TEA_AUTH_PDF_ORGANIZER="$PWD/artifacts/task-effort-audit/auth/pdf-organizer--katy-google.json"
```

```bash
for t in pdfo-find-by-name pdfo-find-by-name-phone pdfo-find-by-keyword pdfo-check-pages pdfo-step-through-results; do pnpm -s audit:effort run --task scripts/task-effort-audit/audits/tasks/$t.json; done
```

Then:
- **Look:** open `artifacts/task-effort-audit/index.html`. Expected actions from the mock: 2, 2, 2, 4, 4.
- **If a run stops** at a step, the real page differs from the code I read. That's a reference-path stop to review, not a bug in your app.
- **If Google refuses the sign-in** ("this browser may not be secure"), that's the one part not testable from the cloud. Note what it said.
- **If they look right,** approve each one (`pnpm audit:effort approve --run <id>`) and commit `artifacts/task-effort-audit/baselines/`.

### 2. Small open decisions (yours)

- [ ] **Approve the test app's recovery scenario as a baseline?** It has run and verified, but has never been approved.
- [ ] **Tag the portfolio tasks with MVDS principles?** Untagged so far. The candidate is the hiring-manager detour back to Projects, because "Projects" goes to the home page. Which principle that shows is your call.
- [ ] **Portfolio suggestion (not measured):** a "Leadership work" link on About. Expected effect: hiring manager 3 → 2 actions on desktop, 5 → 3 on phone. The baselines would show it.

### 3. Parked: PDF Organizer write tasks

These need a **test setup** first: a separate folder of made-up PDFs, and ideally a separate database. Production writes are never allowed.

- Tag a document and commit
- Suggest metadata → review → commit (AI-assisted against by hand)
- Discard staged edits ("every path has an exit")
- Keyword with a space → refused, with a hyphenated version suggested (a natural error-and-recovery scenario)
- Split a scan into N files
- Resolve a conflict in Compare

---

## What exists (as of 2026-11-24)

| Area | Where |
|---|---|
| CLI: `run`, `validate`, `approve`, `compare`, `report`, `dashboard`, `auth-capture`, `list`, `baselines` | `scripts/task-effort-audit/cli.mjs`; see [README](../README.md) |
| Rationale, boundaries, sources, future directions | [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) |
| Skill for agents | `skills/task-effort-audit/SKILL.md` |
| Tasks | `scripts/task-effort-audit/audits/tasks/`: test app (1), portfolio (5), PDF Organizer (5) |
| Approved baselines (committed) | `artifacts/task-effort-audit/baselines/`: test app normal + 5 portfolio tasks |
| MVDS principles snapshot | `scripts/task-effort-audit/mvds-principles.json` (MVDS `dae12d7`); `pnpm audit:effort:sync-principles` to refresh |
| Tests | `pnpm test` (99 unit tests) · `pnpm test:effort-audit` (11 browser tests; needs Chromium) |

## Known limitations to keep in mind

- **Sources not reviewed:** none of the 8 sources in PROJECT_CONTEXT.md have been read; the build session's network blocked them.
- **GET-based analytics:** these aren't blocked, so they can still record audit visits.
- **Phone tasks emulate only the screen width:** no touch input, no mobile browser identity.
- **Logins expire:** the PDF Organizer session lasts 8 hours, so capture again per audit day.
- **Cloud sessions** need `TEA_CHROMIUM_PATH=/opt/pw-browsers/chromium` to run browser tasks, and can't run signed-in tasks at all.
