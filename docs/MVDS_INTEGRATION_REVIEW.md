# MVDS ↔ Experiment Hub — integration review

**Date:** 2026-08-21 · **Repos:** `beckharrisdesign/experiment-hub` @ `3e4b09b`, `beckharrisdesign/mvds` @ `fe5ee00` (v0.3.0 + 2 commits)

**Question:** absorb MVDS into the hub as an experiment (inheriting the shared
secret infra), or keep it alongside and solve the OpenSpec schema-currency problem?

**Answer: keep it alongside.** Absorption trades a working, versioned package
boundary for a toolchain merge the hub doesn't need. But the "stay up to date"
half is a real, unsolved problem — the schema copy has *already* drifted, silently
and one-directionally, and nothing would have told you. Fix that; leave the code
where it is.

---

## 1. How the two repos are coupled today

The coupling is a **published npm package**, and it is already load-bearing —
not a proof of concept.

| Hub surface | Import |
| --- | --- |
| `app/globals.css:4` | `@import "@beckharrisdesign/mvds/styles.css"` |
| `components/EtsySyncPanel.tsx` | components |
| `app/pdf-metadata-viewer/page.tsx` | `Badge, Button, Container, Inline, Stack` |
| `app/pdf-metadata-viewer/sign-in/page.tsx` | `Button, Container, Stack` |
| `app/pdf-metadata-viewer/FolderPicker.tsx` | `Button, Stack` |
| `app/dev/mvds/page.tsx` | dev-only proof route (404s in prod) |

Pinned `^0.3.0`, resolved `0.3.0`, installed from **public npmjs.org**. The hub
already treats MVDS as an external dependency under a no-touch rule:

- `docs/SCAFFOLD_AUDIT.md:74` — "Do not modify or publish `@beckharrisdesign/mvds`"
- `docs/PACKAGE_CONTRIBUTION_CANDIDATES.md:39` — same, with a candidates list instead

That rule is the current answer to this question, written down twice. This review
mostly agrees with it — and identifies where it is being quietly violated by drift.

---

## 2. Why absorption is the wrong trade

### 2.1 MVDS has a distribution contract the hub cannot host

MVDS publishes to **public npmjs.org via OIDC Trusted Publishing** with
`--provenance` attestation, tag-triggered, tag-vs-`package.json` version enforced
(`.github/workflows/publish.yml`). It is MIT-licensed, has issue templates, a
16 KB CHANGELOG, and `docs/CONSUMING.md` written for strangers.

Its best CI job has no monorepo equivalent:

> **`consumer-path`** — installs the *published* package into `examples/starter`
> with **no auth and no `.npmrc`**, builds it, and asserts the emitted CSS proves
> both the token layer and the `@source dist-lib` line landed. Deliberately runs
> no `npm ci` first, "or we would no longer be reproducing a stranger's machine."

Fold MVDS into the hub and you either stop publishing (breaking every consumer
story above) or publish a library out of an application repo, where git tags mean
deploys, not releases. `verify:consumer` becomes unwritable either way.

### 2.2 The toolchain gap is major-version-wide, not cosmetic

| | Hub | MVDS |
| --- | --- | --- |
| Package manager | pnpm 10 + turbo workspaces | npm (`package-lock.json`, 445 KB) |
| Build | Next 16 | Vite 8 + tsup (dual: app + `dist-lib`) |
| **TypeScript** | `5.9.3` | `~6.0.2` — **major apart** |
| **ESLint** | `^9.39.1` | `^10.3.0` — **major apart** |
| Test runner | vitest + jsdom | vitest **browser mode**, Playwright Chromium, every story × light + dark |
| Also present | — | Storybook 10, Chromatic visual regression, `addon-a11y`, `addon-mcp` |
| Extra gates | — | `check:contrast`, `check:principles`, `check:figma`, `verify:consumer`, `verify:figma-share` |

Making MVDS a `packages/mvds` workspace member forces **one** resolution of
TypeScript and ESLint across both. That is the bill, and it is paid in the hub's
CI, not MVDS's.

The design-system discipline (contrast, principles, Figma-manifest drift,
Chromatic baselines, 24 stories × 2 themes) runs *because* MVDS is a standalone
release-gated repo. In the hub it becomes six more jobs on a 20-minute budget
guarding code that already shipped.

### 2.3 The shared secret infra solves a problem MVDS doesn't have

The hub's 1Password → `sync-secrets.sh` → Vercel/GitHub pipeline is built for
**runtime application config** (Supabase, Stripe, Notion, OpenAI). MVDS is a
static library:

- **Zero** runtime credentials. No `.env.example`, no `op run`, no `process.env`
  in any script.
- Exactly **one** CI secret in the whole repo: `CHROMATIC_PROJECT_TOKEN`.

Absorbing MVDS to inherit secret infra would import ~1 secret's worth of benefit
against the whole toolchain cost above. (There *is* a real secrets finding here —
see §4B — but it is fixable without moving a line of code.)

### 2.4 The honest case *for* absorbing

To be fair to the option: one toolchain bill, no version lag between a hub UI need
and an MVDS release, no cross-repo PR dance, and the drift problem in §3 vanishes
by construction rather than by discipline.

If those pains are what's actually driving the question, note that **only the last
one is real today** — and §3/§5 solve it directly. The version lag is currently
zero (hub pins `^0.3.0`; `0.3.0` is latest). Revisit absorption if you find
yourself cutting MVDS releases *only* to unblock the hub, three times in a row.

---

## 3. The real problem: the OpenSpec copy has already drifted

MVDS bootstrapped `experiment-hub-lite` as a **copy**. `openspec/README.md` there
says so: *"A future npm distro may own the shared schema; for now this is a copy."*

That copy is now behind, and the drift splits cleanly into two kinds.

### 3.1 Intentional adaptation — correct, should persist

Storybook replaces `experiments/<slug>/prototype/` · npm not pnpm · MVDS
tokens/`AGENTS.md` not hub Tailwind/Fraunces · MVDS Core Figma file
(`C20nU0mROzk3Zr0I9BELJF`) · `docs/CONSUMING.md`/`THEMING.md`/`SYNC.md` links.
Roughly **40 lines** of a ~100-line schema. These are the reason a naive
`cp -r` sync would be wrong.

### 3.2 Missed upstream hardening — unintentional, and invisible

| Upstream change (hub) | MVDS still has |
| --- | --- |
| **Figma gate is now non-skippable**: every UI change needs an **as-is + proposed frame pair** | soft "Visual design / Figma table is required" |
| **Removals count as UI changes** (precedent: `remove-workflow-page`, 2026-07-21) | *(absent)* |
| **N/A narrowed** to genuinely API-only — "reuses existing components" is explicitly not grounds to skip | broad N/A allowance |
| `design.md` template rows: **As-is frame(s)**, **Proposed frame(s)**, **Libraries/version**, **Code Connect** | single flat table, no as-is/proposed split, no Code Connect row |
| PR opens **ready-for-review, not draft**, so Copilot reviews immediately | draft PR |
| Branch `<harness>/<change-name>` (e.g. `claude/…`, not hardcoded `cursor/`) | hardcoded `cursor/<change-name>` fallback |
| Scope-pivot protocol (rename change dir, requote anchor, record the pivot) | *(absent)* |

The draft-vs-ready and branch-naming rows are **arguably legitimate divergence** —
MVDS's `AGENTS.md` deliberately uses `feat/|fix/|docs/|chore/` branches and draft
PRs as house convention. The Figma rows are not: they are hub thinking that got
better and never propagated.

### 3.3 Drift, measured

**Schema + templates** — `spec.md` identical; everything else adapted:

```
schema.yaml         ~35 changed lines    (mixed: adaptation + missed hardening)
templates/design.md ~20 changed lines    (missed hardening — as-is/proposed, Code Connect)
templates/tasks.md    6 changed lines    (adaptation — Storybook, npm test)
templates/proposal.md 5 changed lines    (adaptation — doc links)
templates/spec.md     IDENTICAL
```

**Skills** — the good news. 4 of 9 are **byte-identical**, 1,469 lines of pure
duplication that could be shared verbatim:

```
design-advisor.md         0 changed / 527 lines   IDENTICAL
prototype-builder.md      0 changed / 429 lines   IDENTICAL
prd-writer.md             0 changed / 376 lines   IDENTICAL
experiment-creator.md     0 changed / 137 lines   IDENTICAL
openspec-artifacts-output 2 changed /  49 lines
openspec-explore.md       2 changed / 305 lines
openspec-propose.md      30 changed / 141 lines
openspec-archive-change  33 changed / 143 lines
openspec-apply-change.md 43 changed / 210 lines
```

**Rules** — effectively rewritten, not copied:

```
figma.mdc            117 changed / 101 hub lines
openspec-workflow.mdc 80 changed /  83 hub lines
github-workflow.mdc   61 changed /  42 hub lines
```

Rules are where MVDS legitimately diverges most (`AGENTS.md` is its canonical
authority). **Skills are where duplication is nearly total and sharing is nearly
free.** Any sync mechanism should target skills + schema, and leave rules alone.

### 3.4 Nothing detects any of this

No version stamp on the copy. No checksum. No CI check on either side. No hub test
asserts the schema is mirrored anywhere. The only marker is prose in
`openspec/config.yaml` saying it was copied. **This is the actual defect** — the
drift is a symptom.

---

## 4. Two findings worth fixing regardless of the decision

### A. The hub's session-start hook wires a registry MVDS no longer uses

`.claude/hooks/session-start.sh:58-68` writes GitHub Packages auth for
`@beckharrisdesign/*` and warns:

```
NODE_AUTH_TOKEN not set — @beckharrisdesign/* packages cannot be installed this session.
```

**This is false.** MVDS moved to public npmjs.org with trusted publishing in July
2026 (`02dd47e` OIDC auth, `2f57704` provenance `repository.url`). The hub's
`.npmrc` has no `npm.pkg.github.com` line, and `pnpm-lock.yaml` resolves
`@beckharrisdesign/mvds@0.3.0` from the default registry.

*Proof:* this session installed `@beckharrisdesign/mvds 0.3.0` successfully with
`NODE_AUTH_TOKEN` unset — the warning printed anyway. It will send someone hunting
a credential that no longer exists.

**Fix:** delete the block, or scope it to a package that actually lives on GitHub
Packages.

### B. `CHROMATIC_PROJECT_TOKEN` sits outside the vault discipline

`.env.example` declares itself *"THE REGISTRY. Every key below is one you already
have somewhere."* It registers `FIGMA_ACCESS_TOKEN` — but has **no Chromatic
entry**, and `sync-secrets.sh`'s manifest has no target for the MVDS repo (targets
are `vercel` / `gh` on experiment-hub only).

So MVDS's one and only CI secret is a hand-set repo secret nobody tracks — exactly
the failure mode `sync-secrets.sh`'s own header calls out:

> *"it is what stopped the GitHub Actions OPENAI_API_KEY sitting five months stale
> with nobody noticing."*

**Fix:** register it in `.env.example` as `vault (CI/deploy only)`, and add a
manifest row targeting the MVDS repo — this is the one piece of shared secret
infra MVDS genuinely should inherit, and it needs no code move.

---

## 5. Recommendation

**Keep MVDS alongside. Promote the schema from "copy with a note" to a versioned
artifact.** Cheapest first — do #1 now, #2 at the next schema change, #3 only if a
third repo appears.

**1. Stamp and check (~1 hour) — do this now.**
Add `x-source: experiment-hub@<commit>` to MVDS's `schema.yaml`, plus a CI step
that fetches the hub's schema and diffs it, failing (or warning) on upstream
changes outside an allowlist of adapted lines. Closes §3.4 — you find out the
copy is behind on the next PR, not on the next archaeology session.
Then apply the §3.2 backlog once, deciding row by row which rows are adaptation.

**2. Base + overlay (~half a day) — at the next schema change.**
Hub owns the `experiment-hub-lite` base; MVDS keeps a small `overlay.yaml` holding
only its ~40 adapted lines. Drift surface shrinks from the whole schema to the
overlay.

**3. Publish `@beckharrisdesign/openspec-schemas` (~a day+) — only on a third consumer.**
Same trusted-publishing pattern MVDS already proved. Both repos install it; the
four byte-identical skills (§3.3, 1,469 lines) ride along. Overkill for two repos.

### The middle path, named explicitly

If the pull toward absorption is really about *process* drift rather than code:
**absorb the OpenSpec/skills layer, not the package.** That is precisely what
hurts today, and it leaves the npm boundary, the release gates, and
`verify:consumer` completely untouched. Options 1–3 above are that middle path,
in increasing order of durability.
