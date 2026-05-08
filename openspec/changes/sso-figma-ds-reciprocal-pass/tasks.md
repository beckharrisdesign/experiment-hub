## 1. Product / copy

- [x] 1.1 Decide **Stash Starter** AI line source of truth (**5** vs **50** packs/month); record decision in inventory notes.

## 2. Figma file (`S8YJQugvMmn5jaRqwFM5XO`)

- [x] 2.1 Run **`get_design_context`** on [**`13:128`**](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=13-128) (DS overview); list main components and map to prototype files or gaps.
- [x] 2.2 Add **landing footer** (or page-level chrome) matching production links/copy; place per `design.md` (near landing / marketing parent).
- [x] 2.3 **Promote** deferred landing primitives to **main components** as agreed (feature column, problem column, pricing card shells; optional **Most popular** badge frame).
- [x] 2.4 **Rename** duplicate **Section Three Points** instances for clarity (features vs problem band).
- [x] 2.5 Align **Stash** tier text in Figma (**`7:111`** area) with the **1.1** decision.

## 3. Prototype code

- [x] 3.1 Add or wrap **React** components for Figma DS pieces at / under **`13:128`** that lack a clear code counterpart (each with `@figma S8YJQugvMmn5jaRqwFM5XO:<node>` and tokens from `globals.css`); skip only with inventory deferral.
- [x] 3.2 Update **`LandingPricingSection`** Stash line to match **1.1**; adjust **`PricingCard`** / badge only if Figma parity decision requires it.

## 4. Documentation

- [x] 4.1 Update [`landing-figma-inventory.md`](../../../experiments/simple-seed-organizer/docs/landing-figma-inventory.md) with pass 3 date, footer row, DS rows, and remaining gaps.
- [x] 4.2 Update [`figma-source.md`](../../../experiments/simple-seed-organizer/docs/figma-source.md) with **DS anchor `13:128`** and link to inventory.

## 5. Verify

- [x] 5.1 `cd experiments/simple-seed-organizer/prototype/app && npm run build`
- [x] 5.2 ESLint on touched `components/` files; smoke **landing** route.
