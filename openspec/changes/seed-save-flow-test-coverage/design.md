## Context

This change adds **automated test coverage and documentation** for Simple Seed Organizer seed **create/update (save)** paths. There is **no new end-user UI**; guardrails are Vitest-level (mocked Supabase, timeouts, converter contracts). See [proposal.md](../proposal.md) and [specs/seed-persistence-test-harness/spec.md](specs/seed-persistence-test-harness/spec.md).

## Goals / Non-Goals

**Goals**

- Tests fail fast when persistence breaks (insert/update errors, JSONB null, bad year, wrong photo `fetch` policy).
- Async tests are **time-bounded** so CI cannot hang on a stuck mock or network.
- One documented command runs persistence-focused tests from `experiments/simple-seed-organizer/prototype/app/`.

**Non-Goals**

- New Figma frames or hub shell layout changes.
- Playwright / full browser E2E for this spike (proposal **Not doing**).

## User flow / IA

N/A — no user-facing flow changes. Contributors run Vitest from the prototype app directory per README.

## Visual design / Figma

| Item             | Value                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| Primary file URL | **N/A — no UI**                                                             |
| Frames in scope  | None                                                                        |
| Libraries        | None                                                                        |
| Breakpoints      | N/A                                                                         |
| Status           | Test + doc only; hub `design-guidelines.mdc` unchanged for product surfaces |

## Decisions

### D1: No Figma deliverable

Rationale: scope is unit/integration tests and README; visual parity is unchanged.

### D2: Time bounds live in Vitest config for the persistence file

File-level `testTimeout` (≤10s per spec) or per-`it` timeout, aligned with spec **Fails until**.

## Risks / Trade-offs

| Risk                         | Mitigation                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| Flaky timing on slow runners | Prefer file-level `testTimeout` slightly above p95 local run, still capped (e.g. 10s) |
| Over-mocking hides real bugs | Keep one success path per insert/update with realistic row shape                      |
