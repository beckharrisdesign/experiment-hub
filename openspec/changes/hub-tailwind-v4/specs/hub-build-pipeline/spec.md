# hub-build-pipeline (Tailwind v4 migration)

## Outcomes

See [proposal.md](../../proposal.md) — toolchain migration only: the hub becomes a native MVDS consumer with no visual or behavioral change to existing surfaces.

## ADDED Requirements

### Requirement: Hub builds and renders unchanged on Tailwind v4

Every existing hub surface looks and behaves the same after the migration — a user cannot tell the toolchain changed.

**Fails until:** `npm run build` and the full vitest suite are green on Tailwind v4, and the hub shell (home, experiment detail, header/nav, dark theme) visually matches its v3 appearance on the deploy preview.

The hub SHALL build with the Tailwind v4 toolchain (`@tailwindcss/postcss`, CSS-first `@theme` config) with existing theme tokens preserved and no unapproved visual deltas.

#### Scenario: Hub looks unchanged on Tailwind v4

- **WHEN** the migrated hub is built and its key pages are compared against production
- **THEN** home, experiment detail, and navigation render identically (or with deltas the founder explicitly approved)

### Requirement: MVDS installs and renders natively

`@beckharrisdesign/mvds` is a normal dependency: tokenless install from public npm, components render with their own tokens.

**Fails until:** a dev-only route renders `Button`, `Badge`, `Card`, and `Section` from the package in the running hub.

The hub SHALL install `@beckharrisdesign/mvds` from the public npm registry and SHALL render its core components via the consumer wiring from the MVDS docs (`styles.css` import + `@source` scan).

#### Scenario: MVDS components render on the dev route

- **WHEN** Katy opens the dev-only MVDS proof route in the hub
- **THEN** Button, Badge, Card, and Section render styled by MVDS tokens in the hub's dark context (the hub pins `.dark` on `<html>` — it is a dark-only app, so MVDS light mode is unreachable inside it; discovered at apply time 2026-07-15)

### Requirement: No private-registry credentials remain

Installing the hub needs zero registry auth, locally and in CI/Vercel.

**Fails until:** `.npmrc` carries no `@beckharrisdesign:registry` line and a clean CI install succeeds with no registry credentials configured.

The hub SHALL resolve all dependencies from public registries without authentication.

#### Scenario: CI installs without registry credentials

- **WHEN** CI or Vercel runs a clean dependency install
- **THEN** it completes successfully with no GitHub Packages token or scoped-registry configuration present
