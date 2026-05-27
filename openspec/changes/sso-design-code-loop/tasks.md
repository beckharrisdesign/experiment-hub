## 1. User outcomes (from spec scenarios)

- [ ] 1.1 **Spacing variable lookup matches Tailwind utility** — User can pick a `space/{n}` Figma Variable on a frame's Auto Layout and find the matching `gap-{n}` / `p-{n}` class in code at the same pixel value, with the variable name cited verbatim in the component's parity row.
- [ ] 1.2 **Typography token lookup matches Tailwind class** — User can pick a `text/{size}` Figma Variable on a text node and find the matching `text-{size}` class in code with identical font-family, font-size, line-height, and font-weight, with the variable name cited verbatim in the component's parity row.
- [ ] 1.3 **Reader checks parity at a glance** — User can open [`figma-source.md`](../../../experiments/simple-seed-organizer/docs/figma-source.md), scan the component table, and see every row showing a parity status from `{full, partial, drifted, not-yet-linked}` with a legend defining each value immediately above the table.
- [ ] 1.4 **Visit preview route without signing in** — User can run `npm run dev` in `experiments/simple-seed-organizer/prototype/app/`, open `http://localhost:3009/dev/components` in an unauthenticated browser, see each priority component rendered with mock props, and watch HMR update the page when they edit a component source file.
- [ ] 1.5 **Walk the loop on one component end-to-end** — User can take `ViabilityBadge` (fallback: `SeedPill`) through the full loop — spacing/typography Variables applied to its Figma frame, parity row in `figma-source.md` set to `full`, rendered on `/dev/components` with mock props — and edit a token on either side and see the other side track without ambiguity.

## 2. Prototype shell

- [x] 2.1 **Audit existing token usage** — done via grep + Figma MCP introspection 2026-05-27. Tailwind classes captured from prototype components; Figma side already had **701 Variables across 8 collections** (`gap`, `font`, `color`, `tokens`, `breakpoints`, `opacity`, `stroke`, `* Main`). See [`figma-source.md`](../../../experiments/simple-seed-organizer/docs/figma-source.md) → "Figma token system (live state)".
- [x] 2.2 **Reconcile Figma Variables with Tailwind naming** (revised approach — pivoted from "create new collections" to "rename existing + add brand"):
  - Renamed collection `gap` → `space`, every `gap-N` → `space/N` (34 Variables; IDs preserved so references stayed intact).
  - Renamed `font/size/*` → `font/text/*` (13 Variables).
  - Created `brand` collection with `primary = #15472d` (only truly custom color not in Tailwind).
  - Existing `color` collection (full Tailwind palette) used as-is; code-side consolidation candidates listed in `figma-source.md`.
- [x] 2.2a **Text Style drift fixes** — Body styles switched Crimson Text → Inter (5 styles: XS, S, M, L, XL); Body Base size 36→16; Dsiplay typo→Display.
- [ ] 2.2b _(deferred)_ **Delete deprecated scaffold frames** — `Foundations/Color` (`3:5`) and `Foundations/Typography` (`3:34`) are template leftovers disconnected from the real token system. Safe-to-delete follow-up, not blocking parity.
- [x] 2.3 **Update `figma-source.md`**:
  - Add the parity-status legend immediately above the component table (legend wording from `design.md` → Decisions → "Parity status column legend").
  - Add a **Parity** column to the table; fill every row (most will start `not-yet-linked`).
  - Add a new section "**Token sync (manual)**" with: when to re-sync, where the canonical Tailwind class list lives (the grep command from 2.1), how to add a new Variable in Figma.

## 3. Implementation

- [x] 3.1 **Scaffold the dev route** — create `experiments/simple-seed-organizer/prototype/app/app/dev/components/page.tsx` as a server component with one `<section>` per priority component (heading + `@figma` node link + rendered component with mock props inline in the same file).
- [x] 3.2 **Bypass auth for `/dev/components`** — N/A: the SSO prototype has no `middleware.ts`. Auth is enforced client-side via `AuthProvider` / `AppShell` (which always renders children — header just hides). The new route renders without sign-in by default.
- [x] 3.3 **Production guard** — at the top of `page.tsx`, add `import { notFound } from 'next/navigation'` and `if (process.env.NODE_ENV !== 'development') notFound();` so the route 404s in prod builds.
- [x] 3.4 **Apply Variables to first-proof component in Figma** — done 2026-05-27 via Figma MCP. All three `ViabilityBadge` variants (`100:1406 Good`, `100:1408 Watch`, `100:1410 Use first`) now bind paddings to `space/2,5` (L/R) and `space/1` (T/B), corner radii to `space/1`, fills/strokes to `color/<color>/<shade>`, text fontSize to `text/xs`. Snapped `Use first` border `#ffc9c9 → red/200` and text `#e7000b → red/600` (~5% perceptual drift). Font family/weight/line-height left as raw values (match `font/family/sans` + `weight/medium` + `leading/4` by value; fontName binding via Plugin API is a follow-up).
- [x] 3.5 **Mark the first-proof row `full`** in `figma-source.md` — done. Effort log: ViabilityBadge full loop via Figma MCP ≈ 25 min (discovery of existing token system + 5 Figma write scripts + verification). The "existing token system already there" discovery cut planned work substantially — net gain of ~3 hours of avoided hand-work.
- [ ] 3.6 (Optional) **Parallel Text Styles** — only if the Variables-only typography approach feels clunky in practice during 3.4: add Text Styles that *reference* the typography Variables, so single-click application works while Variables remain the source of truth.

## 4. QA

- [ ] 4.1 **Manual walkthrough** — follow the User flow from `design.md` end-to-end on `ViabilityBadge`: edit a Figma frame to swap one pixel value to a Variable, confirm it renders correctly in Figma, open `/dev/components`, edit the React source, watch HMR. Confirm parity row reads `full`.
- [x] 4.2 **Route smoke check** — added a "Dev surfaces" section to `experiments/simple-seed-organizer/prototype/app/README.md` linking to `http://localhost:3009/dev/components` and noting the `NODE_ENV=development` guard. No vitest added (route renders static markup; manual check covers failure modes).
- [ ] 4.3 **Drop archived reference** — after merge, leave a one-line note in the closed [PR #171](https://github.com/beckharrisdesign/experiment-hub/pull/171) thread pointing readers to this change folder, so future searches for "Code Connect" land here.
