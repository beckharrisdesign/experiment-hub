## 1. User outcomes (from spec scenarios)

- [ ] 1.1 **Spacing variable lookup matches Tailwind utility** — User can pick a `space/{n}` Figma Variable on a frame's Auto Layout and find the matching `gap-{n}` / `p-{n}` class in code at the same pixel value, with the variable name cited verbatim in the component's parity row.
- [ ] 1.2 **Typography token lookup matches Tailwind class** — User can pick a `text/{size}` Figma Variable on a text node and find the matching `text-{size}` class in code with identical font-family, font-size, line-height, and font-weight, with the variable name cited verbatim in the component's parity row.
- [ ] 1.3 **Reader checks parity at a glance** — User can open [`figma-source.md`](../../../experiments/simple-seed-organizer/docs/figma-source.md), scan the component table, and see every row showing a parity status from `{full, partial, drifted, not-yet-linked}` with a legend defining each value immediately above the table.
- [ ] 1.4 **Visit preview route without signing in** — User can run `npm run dev` in `experiments/simple-seed-organizer/prototype/app/`, open `http://localhost:3009/dev/components` in an unauthenticated browser, see each priority component rendered with mock props, and watch HMR update the page when they edit a component source file.
- [ ] 1.5 **Walk the loop on one component end-to-end** — User can take `ViabilityBadge` (fallback: `SeedPill`) through the full loop — spacing/typography Variables applied to its Figma frame, parity row in `figma-source.md` set to `full`, rendered on `/dev/components` with mock props — and edit a token on either side and see the other side track without ambiguity.

## 2. Prototype shell

- [ ] 2.1 **Audit existing token usage** — run `grep -rEho "(gap|p|px|py|m|mx|my|w|h|text)-[a-z0-9]+" experiments/simple-seed-organizer/prototype/app/components/ | sort -u` and capture the distinct classes; this is the scope for the Figma Variables collections.
- [ ] 2.2 **Create Figma "Tokens" page** in the SSO file ([file key `S8YJQugvMmn5jaRqwFM5XO`](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=1-2)) with two Variables collections:
  - `space/*` — every `space/{n}` value used by the audit (4px per unit).
  - `text/*` — for each `text/{size}` used, four Variables grouped under it: `text/<size>/family`, `text/<size>/size`, `text/<size>/line-height`, `text/<size>/weight`.
- [x] 2.3 **Update `figma-source.md`**:
  - Add the parity-status legend immediately above the component table (legend wording from `design.md` → Decisions → "Parity status column legend").
  - Add a **Parity** column to the table; fill every row (most will start `not-yet-linked`).
  - Add a new section "**Token sync (manual)**" with: when to re-sync, where the canonical Tailwind class list lives (the grep command from 2.1), how to add a new Variable in Figma.

## 3. Implementation

- [x] 3.1 **Scaffold the dev route** — create `experiments/simple-seed-organizer/prototype/app/app/dev/components/page.tsx` as a server component with one `<section>` per priority component (heading + `@figma` node link + rendered component with mock props inline in the same file).
- [x] 3.2 **Bypass auth for `/dev/components`** — N/A: the SSO prototype has no `middleware.ts`. Auth is enforced client-side via `AuthProvider` / `AppShell` (which always renders children — header just hides). The new route renders without sign-in by default.
- [x] 3.3 **Production guard** — at the top of `page.tsx`, add `import { notFound } from 'next/navigation'` and `if (process.env.NODE_ENV !== 'development') notFound();` so the route 404s in prod builds.
- [ ] 3.4 **Apply Variables to first-proof component in Figma** — open `ViabilityBadge`'s frame (per `figma-source.md` mapping), swap its Auto Layout gap/padding and text properties to reference the new `space/*` / `text/*` Variables. If `ViabilityBadge` is already trivially mirrored, fall through to `SeedPill`.
- [ ] 3.5 **Mark the first-proof row `full`** in the `figma-source.md` parity column and record the component name + rough effort (minutes) in this change's `tasks.md` under a short "Effort log" sub-bullet below.
- [ ] 3.6 (Optional) **Parallel Text Styles** — only if the Variables-only typography approach feels clunky in practice during 3.4: add Text Styles that *reference* the typography Variables, so single-click application works while Variables remain the source of truth.

## 4. QA

- [ ] 4.1 **Manual walkthrough** — follow the User flow from `design.md` end-to-end on `ViabilityBadge`: edit a Figma frame to swap one pixel value to a Variable, confirm it renders correctly in Figma, open `/dev/components`, edit the React source, watch HMR. Confirm parity row reads `full`.
- [x] 4.2 **Route smoke check** — added a "Dev surfaces" section to `experiments/simple-seed-organizer/prototype/app/README.md` linking to `http://localhost:3009/dev/components` and noting the `NODE_ENV=development` guard. No vitest added (route renders static markup; manual check covers failure modes).
- [ ] 4.3 **Drop archived reference** — after merge, leave a one-line note in the closed [PR #171](https://github.com/beckharrisdesign/experiment-hub/pull/171) thread pointing readers to this change folder, so future searches for "Code Connect" land here.
