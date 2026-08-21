## Context

`.env.local` is the one canonical secrets file, symlinked into every worktree. It currently holds 22 variables, of which roughly seven are genuine credentials and the rest is config. Values live in four places — that file, GitHub Actions secrets, GitHub *environment* secrets, and Vercel — with no mapping between them and no mechanism keeping them in step.

Two failures on 2026-08-14 and 2026-08-16 define the design:

**A tool read the file and printed it.** An agent's `sed` range ran past its intended block and put both Stripe keys and the OpenAI key into a session transcript. GitHub secret scanning and push protection were both already enabled and neither was relevant — the leak never went near git.

**Nobody could say where a key lived.** The follow-up rotation took two days. It surfaced that the GitHub Actions `OPENAI_API_KEY` was five months stale and consumed by no workflow at all, while `SUPABASE_URL` and both `NOTION_*_DATA_SOURCE_ID`s were consumed by workflows but absent from the repo secret list because they are environment secrets.

The 1Password CLI (2.32.1) is installed and authenticates through desktop app integration with no sign-in step and no `~/.config/op/config`. The account is a Families plan.

## Goals / Non-Goals

**Goals:**

- No credential value readable from disk in the working tree
- Local dev keeps working with no manual step, so the safer file costs nothing daily
- One source of truth, pushed outward to Vercel and GitHub Actions
- Rotation documented per credential, so it stops being an incident
- Close the tool-output vector that actually leaked

**Non-Goals:**

- Adopting Doppler, Infisical, Vault, or any new paid service
- Moving non-secret config out of `.env.local` — it stays plaintext and diffable
- Encrypting anything at rest ourselves
- Collapsing the nine GitHub secrets into one via a service account (see Decisions)
- Deleting the stale `package-lock.json`, though it contradicts the real lockfile

## User flow / IA

No user-facing surface. The two flows that change are Katy's:

**Daily dev.** `npm run dev` → `op run` resolves `op://` references from the `BHD Labs` vault via the already-authenticated desktop integration → Next starts with real values. No prompt in the common case; no export step; no change to how worktrees resolve `.env.local`.

**Rotation.** Roll at the vendor → update the one 1Password item → run the sync command in preview → run it with `--apply` → it reports each variable as added, updated, or unchanged across Vercel and GitHub Actions → revoke the old credential last. The runbook supplies the vendor-specific mechanics at step one and the ordering rule at the end.

The ordering matters and is the part the runbook must state loudly: revoking before the new value is deployed breaks CI and production *while local dev keeps working perfectly*, which is the most confusing possible failure mode. It is exactly what nearly happened during the 2026-08-16 rotation.

## Visual design / Figma

| Item | Value |
| --- | --- |
| Primary file URL | **N/A — no UI** |
| As-is frame(s) | N/A |
| Proposed frame(s) | N/A |
| Libraries / version | N/A |
| Code Connect | None |
| Breakpoints | N/A |
| Status | N/A — no rendered surface |

**Rationale for N/A.** This change touches `.env.local` (untracked), `.env.example`, a `package.json` script, a new shell script, a docs page, and a Claude Code hook. It adds, removes, and alters nothing a user sees — no page, no nav item, no component, not even a removal that would leave a visible gap. The schema permits N/A only for genuinely no-UI changes, and this qualifies on the strict reading: the sole human-visible output is terminal text from a script.

## Decisions

**A standalone `BHD Labs` vault, not `Private` and not a shared vault.** The five existing vaults are `Private`, `Harris Family Main`, `Jenny B Harris`, `TKN Main`, `TKN Private`. A live Stripe key should not inherit family-vault access, and `Private` mixes infrastructure with personal logins so references would be hard to reason about. A dedicated vault also means access can be revoked or delegated as a unit later.

**One item per vendor, fields per credential** — `Stripe` carries live/test/webhook fields; `Supabase` carries url + service role + publishable. This matches how rotation actually works: you roll at the vendor once and update one item, rather than hunting four sibling entries.

**Service accounts stay off the critical path.** They would let GitHub Actions resolve `op://` at runtime and collapse nine repo secrets into one `OP_SERVICE_ACCOUNT_TOKEN` — the single best available outcome. But 1Password's own docs state no plan requirement anywhere (overview, get-started, and security pages are all silent), and the CLI cannot answer without attempting a create. Rather than block a design on an unresolved plan question, sync pushes values outward and service accounts become a later swap of one half. If they turn out to be available, the GitHub side changes and nothing else does.

**Sync previews by default; writing needs a flag.** The command targets production Vercel. A default that writes is a foot-gun, and the cost of the safer default is one extra flag on a command run a few times a year.

**Orphans are reported, never auto-deleted.** The stale `OPENAI_API_KEY` in GitHub Actions is exactly this case, and deleting it automatically would be wrong — it might be consumed by something outside the workflow files. Report and let a human decide.

**The hook guard is defense-in-depth, not the fix.** Blocking bulk `.env*` reads in `.claude/hooks/pre-tool-use.sh` is ten lines and would have stopped the original leak, but it only covers Claude Code and a determined agent can route around it. The references are the actual fix; the guard is cheap insurance on top. It needs a deliberate carve-out for listing key *names*, or ordinary env work becomes impossible.

## Risks / Trade-offs

**`op run` becomes a hard dependency of local dev.** If CLI integration breaks, dev stops. Mitigated by the loud-failure requirement — start-up must name 1Password as the cause and point at the bypass — rather than starting with empty credentials and failing confusingly three layers deep. The runbook must document the bypass.

**Vault access becomes single-point-of-failure for local dev.** Seven references are only as good as the vault behind them. This argues for confirming the 1Password account's own recovery (Emergency Kit, recovery contacts) *before* cutover, not after — a step worth doing while the old plaintext values still exist as a fallback.

**Values still land in Vercel and GitHub in plaintext.** Neither resolves `op://` at runtime, so this design reduces the number of *authoritative* locations from four to one, not the number of locations. The win is that derived copies cannot silently drift; the exposure surface in those dashboards is unchanged.

**The migration touches live credentials.** Cutover means editing the file that every experiment reads. Doing it per-credential, verifying each before moving to the next, is slower than a bulk rewrite but avoids a broken afternoon — and the 2026-08-16 rotation is direct evidence that "it saved, surely" is not a safe assumption about this file.

**Secrets already in transcripts.** Two credentials rotated on 2026-08-16 passed through a session transcript en route to the env file. They are live and working, and the residual exposure is far smaller than the original leak, but a belt-and-braces re-rotation entirely through the clipboard route is the clean end state once this system exists to make rotation cheap.
