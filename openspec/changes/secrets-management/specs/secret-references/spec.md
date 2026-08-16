# secret-references

## Outcomes

See [proposal.md](../../proposal.md) Outcomes. In short: `.env.local` stops holding secret values, and local dev keeps working without a manual step.

- **Who:** Katy, and the agents working in the monorepo alongside her.
- **Job:** Read, share, or accidentally print the env file without leaking a credential.
- **Done when:** `cat .env.local` is boring, and `npm run dev` still works.
- **Not doing:** Moving non-secret config out of `.env.local`. Encrypting anything at rest ourselves.

## ADDED Requirements

### Requirement: Secret values are not readable from disk

Every credential in `.env.local` is a pointer to 1Password rather than the secret itself, so printing the file — deliberately or by accident — reveals nothing usable.

**Fails until:** `grep -E '^(OPENAI_API_KEY|STRIPE_SECRET_KEY_LIVE|STRIPE_SECRET_KEY_TEST|STRIPE_WEBHOOK_SECRET_LIVE|STRIPE_WEBHOOK_SECRET_TEST|SUPABASE_SERVICE_ROLE_KEY|FIGMA_ACCESS_TOKEN|GITHUB_DISPATCH_TOKEN)=' .env.local` returns any line whose value does not begin with `op://`.

The system SHALL store every credential in `.env.local` as an `op://` reference and never as a literal value.

#### Scenario: Printing the env file leaks nothing

- **WHEN** a person or an agent prints the full contents of `.env.local`
- **THEN** every credential line shows an `op://` reference, no usable secret appears in the output, and non-secret config is still readable in plain text

#### Scenario: A dedicated vault holds the hub's credentials

- **WHEN** the references in `.env.local` are resolved
- **THEN** they resolve against a standalone `BHD Labs` vault, not `Private` and not a vault shared with family members

### Requirement: Local dev resolves references with no manual step

Starting the dev server picks up real credential values automatically, so the safer file costs nothing in daily use.

**Fails until:** `npm run dev` starts a server whose first OpenAI-backed request fails authentication because the process received a literal `op://…` string as its API key.

The dev server SHALL resolve all `op://` references at process start-up without any manual export, sourcing, or copy step.

#### Scenario: Dev server starts with working credentials

- **WHEN** Katy runs `npm run dev` in a fresh shell with no environment prepared
- **THEN** the server starts and a request exercising an external credential succeeds

#### Scenario: A broken CLI integration fails loudly, not silently

- **WHEN** the 1Password CLI cannot resolve references (integration disabled, or the app unavailable)
- **THEN** start-up fails with a message naming 1Password as the cause and pointing at the documented bypass, rather than starting with empty credentials

### Requirement: Agent tooling cannot bulk-read env files

A tool call that would print an env file wholesale is refused, so the exact failure that caused the 2026-08-14 leak cannot repeat through the same route.

**Fails until:** an agent Bash call running `cat .env.local` (or `sed`/`head`/`tail` over it) returns file contents.

The pre-tool-use hook SHALL block agent shell commands that read `.env*` files in bulk, and SHALL explain the refusal.

#### Scenario: An agent attempt to print the env file is refused

- **WHEN** an agent issues a shell command that would output the contents of `.env.local`
- **THEN** the hook blocks it and returns a reason naming the safe alternative

#### Scenario: Legitimate key-name inspection still works

- **WHEN** an agent lists variable *names* without values, as when checking whether a key exists
- **THEN** the command is allowed, because the guard must not make ordinary env work impossible
