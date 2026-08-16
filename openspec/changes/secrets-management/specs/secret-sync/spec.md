# secret-sync

## Outcomes

See [proposal.md](../../proposal.md) Outcomes. In short: deployed environments stop drifting from the source of truth, and rotating a credential stops being an incident.

- **Who:** Katy, rotating or updating a credential.
- **Job:** Change a value once and have every environment pick it up, without hand-copying into dashboards.
- **Done when:** One command reports and corrects drift; every credential has a written rotation path.
- **Not doing:** Adopting a new paid service. Rotating credentials that have not leaked.

## ADDED Requirements

### Requirement: One command propagates values to deployed environments

A single command pushes current values from 1Password into Vercel and GitHub Actions and says exactly what it changed, so hand-copying stops and silent divergence becomes visible.

**Fails until:** a value updated in 1Password leaves Vercel and GitHub Actions serving the old one with nothing reporting the difference — the state that let the GitHub Actions `OPENAI_API_KEY` sit five months stale.

The sync command SHALL read current values from the `Experiment Hub` vault, write them to Vercel and GitHub Actions, and report each variable as added, updated, or unchanged.

#### Scenario: Sync reports drift and corrects it

- **WHEN** a credential differs between 1Password and a deployed environment and the sync command runs
- **THEN** the variable is updated in that environment and reported as updated, while variables already matching are reported as unchanged

#### Scenario: Sync previews before it writes

- **WHEN** the sync command runs without an explicit flag to apply changes
- **THEN** it reports what it would change and writes nothing, so a mistake targeting production requires deliberate confirmation

#### Scenario: Orphaned secrets are surfaced, not silently kept

- **WHEN** a deployed environment holds a secret with no counterpart in the vault
- **THEN** the command reports it as orphaned rather than ignoring it, and does not delete it automatically

### Requirement: Every credential has a written rotation path

Rotating any credential is a documented procedure in the repo, so the knowledge is not rediscovered under pressure from old session transcripts.

**Fails until:** rotating a credential requires reading a prior session transcript to learn where it lives, what consumes it, and whether the vendor supports in-place rotation.

The repo SHALL document, for each credential, where it is stored, what consumes it, and its vendor-specific rotation steps.

#### Scenario: Rotating a key with no prior context

- **WHEN** Katy needs to rotate a credential months later with nothing else loaded
- **THEN** the runbook tells her the vendor's rotation mechanics, every place the value must land, and the order that avoids an outage

#### Scenario: The runbook records vendor differences that caused past mistakes

- **WHEN** the runbook is consulted for OpenAI, Stripe, or Google
- **THEN** it states that OpenAI has no in-place rotate and requires create-then-revoke, that Stripe rolls with a grace period, and that revoking before the new value is deployed breaks CI and production while local dev keeps working
