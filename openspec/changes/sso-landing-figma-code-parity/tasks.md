## 1. Landing inventory (docs)

- [x] 1.1 Open Figma file `S8YJQugvMmn5jaRqwFM5XO` — scope landing frames under `18:2709` (and related instances); capture node ids/names for each major block (hero, pricing, auth, footer, etc.).
- [x] 1.2 Read `LandingPage.tsx` and list matching JSX regions, noting existing subcomponents (e.g. `PricingCard`, `AuthForm`) vs inline blocks.
- [x] 1.3 Create or extend markdown inventory (embed in `docs/figma-source.md` or add `docs/landing-figma-inventory.md` and link) with columns per design doc: region, Figma ref, code ref, parity status, Code Connect state, notes.
- [x] 1.4 Mark rows requiring action vs aligned vs deferred; include a short “verified” date at top of inventory.

## 2. Figma updates (as needed)

- [x] 2.1 For each “promote Figma component” row, create or tidy main component(s), sensible naming, and consistent auto-layout; record final node ids in inventory.
- [x] 2.2 Replace duplicated raw frames with instances where applicable; ensure Header/brand tokens remain consistent with `brand/primary` usage on linked chrome.

## 3. Prototype code updates (as needed)

- [x] 3.1 For each “extract code component” row, add or move files under `prototype/app/components/`, preserve behavior, add `/** @figma S8YJQugvMmn5jaRqwFM5XO:<node> */` per conventions, and wire imports in `LandingPage.tsx`.
- [x] 3.2 When touching styles, prefer `globals.css` tokens and Tailwind patterns already used in the experiment; avoid introducing new one-off palette unless matching an updated Figma variable (document in inventory).
- [x] 3.3 Run the SSO app locally (`experiments/simple-seed-organizer/prototype/app`, port per project script) and smoke-test landing: render, auth path, pricing toggles if present.

## 4. Code Connect (optional)

- [x] 4.1 For pairs where both a Figma main component and a stable React component exist, add or update Code Connect mapping (e.g. `.figma.ts`) **or** mark “deferred / n/a” in inventory with reason.
- [x] 4.2 If no mappings added, ensure inventory explicitly states deferral per row so spec “Code Connect state recorded” is satisfied.

## 5. Verify and handoff

- [x] 5.1 Re-read `openspec/changes/sso-landing-figma-code-parity/specs/` against implemented work; adjust docs if gaps remain intentionally deferred.
- [x] 5.2 Run project tests / lint as appropriate for touched files (hub + SSO prototype scopes).
