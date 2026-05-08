## Context

- **Figma file**: Simple Seed Organizer — `fileKey` `S8YJQugvMmn5jaRqwFM5XO` (see `experiments/simple-seed-organizer/docs/figma-source.md`).
- **Landing anchor**: `LandingPage` is traced at `@figma …:18:2709` but the TSX file embeds large sections (e.g. `PricingCard`, hero, auth) with mixed extraction; Figma may use separate symbols or flat groups.

## Figma source of truth (this change)

| Field                                              | Value                                                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **File**                                           | [Simple Seed Organizer (Figma)](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=1-2) |
| **fileKey**                                        | `S8YJQugvMmn5jaRqwFM5XO`                                                                                               |
| **Landing content node** (prototype `LandingPage`) | `18:2709` — inspect children for per-block symbols                                                                     |

**Libraries in use:** _unchanged from file; note in inventory if a published library attaches to new landing components._

- **Code Connect**: Previously deferred org-wide; this pass **records** mapping status without requiring Org-only features to ship documentation.

## Goals / Non-Goals

**Goals:**

- Produce a **single canonical inventory table** (markdown in-repo) for the landing surface: Figma node/component ↔ React component or inline region ↔ status/parity action.
- Drive **minimal, evidenced** updates: new Figma main components only where reuse/design-system value is clear; extract React components when boundaries match Figma or reduce duplication.
- Keep **design tokens** and `next/font` posture; normalize hardcoded hex where touched to existing CSS variables (`--brand-primary`, etc.) when in scope of edited files.
- Update **`figma-source.md`** to link or embed the inventory (or `docs/landing-figma-inventory.md` if the table is long).

**Non-Goals:**

- Full hub-wide or non-landing surfaces in this change (inventory may note “expand later”).
- Automated visual regression testing or CI against Figma (manual/MCP review only).
- Mandatory Code Connect for every pair if account/plan blocks it—**record deferral** instead.

## Decisions

1. **Inventory format**: Markdown table in `experiments/simple-seed-organizer/docs/` with columns: Region / Element, Figma (node or component), Code location, Parity status, Code Connect (yes / n/a / deferred), Notes. Alternative considered: JSON for tooling—rejected for solo maintainability unless a second consumer appears.

2. **Figma authoring**: Use official Figma MCP / design workflow to inspect `get_design_context` first; create components in-file with consistent naming (`Landing / …` or existing library pattern). Alternative: manual-only in Figma app—acceptable when MCP write is blocked; still document node ids after publish.

3. **Code splits**: Prefer **one new component per clear Figma symbol** or **one per repeated JSX island** (e.g. pricing card already partially isolated as `PricingCard`—evaluate promoting to file-level component with `@figma` if Figma has a matching card). Avoid gratuitous file churn: extract when the inventory row demands it or duplication exceeds one section.

4. **Color alignment**: When editing landing styles, prefer **`--brand-primary`** and shared Tailwind theme over one-off greens unless Figma spec differs; if Figma differs, update token doc + variable together in a single logical commit series.

## Risks / Trade-offs

- **[Risk] Figma structure drift** between inventory time and merge → **Mitigation**: note “verified date” in inventory header; re-run MCP snapshot before large edits.
- **[Risk] MCP asset URLs** for embedded imagery expire → **Mitigation**: prefer components/vectors in Figma; in code use `public/` for stable raster if needed.
- **[Risk] Over-componentizing** small one-off rows → **Mitigation**: “defer” with rationale in table per spec.

## Migration Plan

- **Deploy**: Docs-only and prototype changes ship with normal PR; no migration of user data.
- **Rollback**: Revert PR; Figma changes are versioned in file history—restore components via Figma if needed.

## Open Questions

- Whether **Pricing** and **Auth** blocks deserve separate Figma main components vs staying instances of a library page—resolved row-by-row during inventory, not upfront.
- Exact **Code Connect** path if org enables it mid-pass—optional follow-up PR to add `.figma.ts` files.
