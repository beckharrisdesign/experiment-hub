# Secrets management — 1Password as source of truth

## Human anchor

> "secret management has to be easier than this - what are best practices in the software industry?"

> "super tired of having to hunt down keys again and again — this was supposed to be the point of a shared monorepo"

## Outcomes

- **Who:** Katy, running many experiments out of one monorepo — and the agents that work in it alongside her.
- **Job:** Change a credential once and have every consumer pick it up, without hunting for where it lives or hand-copying it into three dashboards — and without plaintext secrets sitting in a file any tool can print.
- **Done when:**
  1. `.env.local` contains no secret values — only `op://` references and non-secret config, so `cat .env.local` is boring.
  2. `npm run dev` works with no manual export step.
  3. One command pushes the current values from 1Password to Vercel and GitHub Actions, and reports what changed.
  4. Every credential has a documented rotation path in the repo, so rotating is routine rather than an incident.
- **Not doing:** Adopting Doppler, Infisical, Vault, or any new paid service. Moving non-secret config out of `.env.local`. Encrypting anything at rest ourselves. Rotating credentials that have not leaked.

## Why

On **2026-08-14** an agent ran `sed` over `.env.local` and printed three live credentials — both Stripe keys and the OpenAI key — into a session transcript. The rotation that followed took two days, spanned four locations, and stalled repeatedly because nobody could answer "where does this key live" without a dozen commands.

Two things that investigation surfaced matter more than the leak itself:

**The existing defenses point at the wrong vector.** GitHub secret scanning and push protection are both already enabled, so "secret committed to a public repo" is covered. But the leak had nothing to do with git. It was a tool reading a plaintext file and echoing it — and reading env files is *routine* agent behaviour, not a freak event. Nothing currently defends that path.

**The sprawl is already causing silent drift.** The GitHub Actions `OPENAI_API_KEY` was five months stale and is the only repo secret no workflow consumes — a live orphaned credential. Meanwhile `SUPABASE_URL` and both `NOTION_*_DATA_SOURCE_ID`s are consumed by workflows but absent from the repo secret list, because they are environment secrets. Four locations, no map.

The encouraging part: of 22 variables in `.env.local`, only about **seven are genuinely secret**. The rest is config that should stay in plaintext. This is a change to seven lines and the machinery around them, not a rewrite.

## What changes

**`.env.local` holds references, not values.** Seven lines become `op://` pointers resolved at process start. A stray `cat`, `sed`, or screen-share leaks a URI worth nothing. Non-secret config stays exactly as it is, so the file remains readable and diffable.

**A standalone vault for the hub.** A dedicated `BHD Labs` vault, not `Private` and not a shared family vault — the Stripe live key should not inherit family-vault access, and a dedicated vault keeps references stable and scoped. One item per vendor with fields per credential, matching how rotation actually works: roll at the vendor, update one item.

**Local dev runs under `op run`.** The `dev` script wraps in `op run --env-file=.env.local`, authenticating per-command through the already-working desktop app integration. Worktree symlinks are unaffected.

**Sync replaces hand-copying.** One script reads from 1Password and pushes to Vercel (`vercel env`) and GitHub Actions (`gh secret set`), reporting what changed. Values still land in both — that is unavoidable, neither resolves `op://` at runtime — but they become *derived* rather than authoritative, so they cannot drift five months out of date unnoticed.

**A rotation runbook per vendor.** OpenAI has no in-place rotate; Google's flow differs again; Stripe rolls with a grace period. That knowledge currently lives in session transcripts and gets rediscovered under pressure.

**A pre-tool-use guard.** `.claude/hooks/pre-tool-use.sh` already blocks force-push and `rm -rf` on source dirs; a rule blocking bulk reads of `.env*` is ten more lines and would have stopped the original leak outright. Imperfect and Claude Code-only, which is why it is defense-in-depth rather than the fix.

## Capabilities

### New Capabilities

- `secret-references`: `.env.local` stores `op://` references instead of values; local processes resolve them at start-up via the 1Password CLI; no secret value is readable from disk.
- `secret-sync`: a single command propagates current values from 1Password to Vercel and GitHub Actions, reporting adds, updates, and no-ops, so deployed environments cannot silently diverge from the source of truth.

### Modified Capabilities

None.

## Impact

**Prerequisites that block implementation** — both are Katy's to do, neither is code:

1. Create the `BHD Labs` vault in 1Password and populate it with the current values.
2. Install the Vercel CLI (`npm i -g vercel`), which is not present.

**Verified working already:** the `op` CLI (2.32.1) authenticates through desktop app integration with no sign-in step and no `~/.config/op/config`.

**Deliberately unresolved:** whether 1Password service accounts are available on a Families plan. Their absence would let GitHub Actions resolve `op://` at runtime and collapse nine repo secrets to one — a real improvement, but an optimization on top of this design rather than a dependency. Keeping it off the critical path means the change is not blocked on a plan question.

**Files touched:** `.env.local` (untracked), `.env.example` (registry gains a reference column), `package.json` (`dev` script), `scripts/sync-secrets.sh` (new), `docs/` (rotation runbook), `.claude/hooks/pre-tool-use.sh`.

**Risks.** `op run` becomes a hard dependency of local dev — if the CLI integration breaks, dev stops, so the runbook must document the bypass. The sync script writing to production Vercel is a foot-gun that wants a dry-run default. And seven `op://` references are only as good as the vault behind them: losing vault access loses local dev, which argues for the 1Password account's own recovery being in order before cutover.

## Optional links

- Rotation incident and current state: this change was written directly after the 2026-08-14 leak and the 2026-08-16 rotation.
- Prior art in-repo: `.env.example` already works as a values-free registry — the pattern this change extends.
