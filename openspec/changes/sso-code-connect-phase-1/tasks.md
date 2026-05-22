## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Developer opens `SeedDetail.tsx` and sees `@figma S8YJQugvMmn5jaRqwFM5XO:98:1398` on lines 1–3
- [ ] 1.2 Developer opens each of the 4 remaining files and sees correct `@figma` annotation: `SearchBar.tsx` → `17:706`, `FilterBar.tsx` → `17:727`, `SeedPill.tsx` → `13:791`, `ViabilityBadge.tsx` → `100:1408`
- [x] 1.3 `figma connect parse` exits 0 from the prototype app directory and lists all annotated components without error
- [ ] 1.4 Designer opens Figma Dev Mode, selects a wired component, and sees the React import path and a usage snippet in the Code panel ⛔ blocked — see §3.9
- [ ] 1.5 `figma connect publish` can be re-run and exits 0 without creating duplicate mappings ⛔ blocked — see §3.9
- [ ] 1.6 Designer opens the Components page (`1:2`) and sees `⚡` prefix on every wired component (e.g. `⚡ SeedCard`) ⛔ blocked — depends on 3.9
- [ ] 1.7 Designer opens the Components page and confirms unwired components have no `⚡` prefix ⛔ blocked — depends on 3.9

## 2. Prototype shell

N/A — modifying the existing prototype at `experiments/simple-seed-organizer/prototype/app/`. No new prototype directory or port needed.

**Pre-flight: FIGMA_ACCESS_TOKEN required for publish.**
Get a personal access token from Figma → Settings → Security → Personal access tokens. The token needs read+write access to the SSO file (`S8YJQugvMmn5jaRqwFM5XO`). Set it before running publish:
```bash
export FIGMA_ACCESS_TOKEN=<your-token>
```

> ⛔ **Plan blocker (discovered during apply):** `figma connect publish` and the Figma MCP `send_code_connect_mappings` both require a **Developer seat on an Organization or Enterprise Figma plan**. The SSO file is on a free/starter plan. Steps 3.8–3.10 and QA 4.2–4.5 are blocked until the plan is upgraded. All code-side work (annotations, config, `.figma.tsx` files) is complete and ready to publish the moment the plan allows it.

## 3. Implementation

- [x] 3.1 Install `@figma/code-connect` as a dev dependency
  ```bash
  cd experiments/simple-seed-organizer/prototype/app
  npm install --save-dev @figma/code-connect
  ```

- [x] 3.2 Create `figma.config.ts` at `experiments/simple-seed-organizer/prototype/app/`
  ```ts
  import { defineConfig } from "@figma/code-connect";

  export default defineConfig({
    documentUrl: "https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer",
  });
  ```
  _(Access token supplied via `FIGMA_ACCESS_TOKEN` env var at publish time — not committed to source.)_

- [x] 3.3 Add `@figma` annotation to `SeedDetail.tsx` — node `98:1398` (Seed Detail mobile frame)
  Place in JSDoc block immediately above the props interface:
  ```ts
  /**
   * @figma S8YJQugvMmn5jaRqwFM5XO:98:1398
   */
  ```

- [x] 3.4 Add `@figma` annotation to `SearchBar.tsx` — node `17:706` ("Search Bar" symbol, Blocks)
  ```ts
  /** @figma S8YJQugvMmn5jaRqwFM5XO:17:706 */
  ```

- [x] 3.5 Add `@figma` annotation to `FilterBar.tsx` — node `17:727` ("Search Filters" symbol, Blocks)
  ```ts
  /** @figma S8YJQugvMmn5jaRqwFM5XO:17:727 */
  ```

- [x] 3.6 Add `@figma` annotation to `SeedPill.tsx` — primary node `13:791` (Type=Badge); note sibling variants
  ```ts
  /**
   * @figma S8YJQugvMmn5jaRqwFM5XO:13:791
   * Variant symbols (no component set): Filter Plain `17:1227`, Filter Selected `17:1265`
   */
  ```

- [x] 3.7 Add `@figma` annotation to `ViabilityBadge.tsx` — primary node `100:1408` (Status=Watch); note sibling
  ```ts
  /**
   * @figma S8YJQugvMmn5jaRqwFM5XO:100:1408
   * Sibling variant: Use First `100:1410` (both in Blocks frame `100:1412`)
   */
  ```

- [x] 3.8 Verify parse
  ```bash
  cd experiments/simple-seed-organizer/prototype/app
  npx figma connect parse
  ```
  ✓ Exits 0. All 5 `.figma.tsx` files parsed: SearchBar, FilterBar, SeedPill, ViabilityBadge, SeedDetail.
  _Note: `SeedDetail` maps to the mobile surface frame `98:1398` (not a Figma component symbol). Publish will reject it with "not a component" — remove `SeedDetail.figma.tsx` or replace with a component-level node when/if one is created._

- [ ] 3.9 Publish ⛔ **BLOCKED — requires Figma Org/Enterprise plan with Developer seat**
  ```bash
  cd experiments/simple-seed-organizer/prototype/app
  FIGMA_ACCESS_TOKEN=<token> npx figma connect publish --skip-validation
  ```
  Both `figma connect publish` (CLI) and the Figma MCP `send_code_connect_mappings` return:
  _"You need a Developer seat in an Organization or Enterprise plan to access Code Connect."_
  Unblock by upgrading the SSO Figma file's plan and enabling a Developer seat.

- [ ] 3.10 Apply `⚡` prefix to wired component names in Figma ⛔ **BLOCKED — depends on 3.9**
  On the **Components page (`1:2`) only** — rename each symbol whose Code Connect mapping just published:
  - `SeedCard` → `⚡ SeedCard`
  - `SeedDetail` → `⚡ SeedDetail`
  - `SearchBar` → `⚡ SearchBar`
  - `FilterBar` → `⚡ FilterBar`
  - `SeedPill` (and its variant symbols) → `⚡ SeedPill`
  - `ViabilityBadge` (and its variant symbols) → `⚡ ViabilityBadge`
  - _(Plus any of the 15 previously-annotated components that were already wired but never renamed)_
  Surface frames on the Surfaces page are **not** renamed.

- [x] 3.11 Update `experiments/simple-seed-organizer/docs/figma-source.md`
  - Change Code Connect status from "Deferred" to active
  - Document `figma.config.ts` location and publish command
  - Add `⚡` naming convention note under the components table

## 4. QA

- [x] 4.1 Manual: `grep "@figma" components/SeedDetail.tsx components/SearchBar.tsx components/FilterBar.tsx components/SeedPill.tsx components/ViabilityBadge.tsx` — all 5 files return a match with the correct node ID
- [x] 4.2 Manual: `npx figma connect parse` exits 0 — confirmed. _(SeedDetail will show "not a component" on publish; acceptable until a component symbol is created.)_
- [ ] 4.3 Manual: open Figma Dev Mode → select a wired component instance → Code panel shows React import and usage ⛔ blocked on 3.9
- [ ] 4.4 Manual: re-run `figma connect publish` → exits 0, no duplicates ⛔ blocked on 3.9
- [ ] 4.5 Manual: Components page (`1:2`) — wired components show `⚡` prefix, unwired do not ⛔ blocked on 3.9
