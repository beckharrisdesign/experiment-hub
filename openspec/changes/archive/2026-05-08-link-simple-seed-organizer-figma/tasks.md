## 1. Documentation

1. [x] Add `experiments/simple-seed-organizer/docs/figma-source.md` with:
   - Full Figma URL and file key `S8YJQugvMmn5jaRqwFM5XO`
   - Note that hub DS file key `9VJTxmBWKgeCDTyJLsYM7I` does **not** apply to this prototype
   - Steps: `/add-plugin figma`, `get_design_context` before visual edits, link to [`docs/FIGMA_SETUP.md`](../../../docs/FIGMA_SETUP.md)

## 2. Component traceability (incremental)

2. [x] Add `@figma S8YJQugvMmn5jaRqwFM5XO:<node>` above props interfaces for priority components (suggested order: `AppShell`, `Header`, `BottomNav`, `LandingPage`, `SeedList`, `SeedCard`, `AddSeedForm` — resolve node IDs from Figma via MCP / file).
3. [x] Run prototype lint/tests for touched files (`pnpm` from `prototype/app` per that package’s scripts).

## 3. Canonical spec

4. [x] After merge, copy the ADDED requirements into `openspec/specs/simple-seed-organizer-design-system/spec.md` (full spec, not delta-only) and archive this change per [`agents/README.md`](../../../agents/README.md) / `/opsx:archive`.

## 4. Optional

5. [x] If Org/Code Connect enabled: add Code Connect templates for 1–2 pilot components using `/figma-code-connect`; otherwise skip and note “deferred” in `figma-source.md`.
