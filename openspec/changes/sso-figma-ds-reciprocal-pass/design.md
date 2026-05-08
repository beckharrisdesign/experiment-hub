## Context

- **Pass 2** produced [`landing-figma-inventory.md`](../../../experiments/simple-seed-organizer/docs/landing-figma-inventory.md): **gap** on **footer** (in code, not in symbol `18:2709`); **deferred** promotion of landing **groups** to main components; **partial** Stash copy (**5** vs **50** AI packets); optional **“Most popular”** badge vs Figma; duplicate **Section Three Points** naming in Figma.
- **Design system entry in Figma (user anchor):** [Simple Seed Organizer — node `13-128`](https://www.figma.com/design/S8YJQugvMmn5jaRqwFM5XO/Simple-Seed-Organizer?node-id=13-128) (`13:128` in API). Same file key as the rest of SSO: **`S8YJQugvMmn5jaRqwFM5XO`** (`fileKey`). This frame is the starting point for “what lives in the **SSO design system**” vs app screens.
- **Prototype root:** `experiments/simple-seed-organizer/prototype/app/`, components under `components/`, tokens in `app/globals.css`.

## Goals / Non-Goals

**Goals:**

- Close **inventory-documented gaps** where the fix is in Figma (footer representation), in code (DS component missing in repo), or **both** with matching `@figma` ids.
- Use **`get_design_context`** (and metadata) on **`13:128`** and landing nodes before structural edits; load **`figma-use`** before any `use_figma` write, per project rules.
- Resolve **Stash tier** AI copy **one way** (product) and mirror in Figma + code.
- **Promote** high-value landing shells (pricing cards, feature + problem column cells, optional badge) to **main components** in the SSO file when it reduces drift; name consistently with DS nearby.

**Non-Goals:**

- Full **Code Connect** rollout (still optional / org-dependent).
- Redesigning **hub** app or non-SSO experiments.
- Changing Stripe **price IDs** or subscription semantics—**copy only** unless product expands scope.

## Decisions

1. **Footer placement in Figma:** Prefer a **dedicated footer block** on the same **marketing / landing page** parent as `18:2709` (or sibling frame), labeled as **production parity**, so reviewers see chrome next to landing. Alternative: separate page—acceptable if file IA demands it; **document in inventory**.

2. **“Production in Figma”:** Match **structure and copy** of `LandingPage` footer links and © line; visual tokens aligned to **`--brand-primary` / grays** as in code—no pixel-perfect bitmap requirement.

3. **Code from DS (`13:128`):** For each Figma **main component** that maps to a reusable primitive (button, card shell, input group) not yet extracted in React, either **add** `components/<Name>.tsx` with `@figma …:<node>` or **document** “Figma-only / deferred” in inventory if extraction would duplicate existing Tailwind without value.

4. **Copy source of truth for Stash AI line:** **Product decision** recorded in task **1.1**; implement Figma + code to match; if product keeps **50**, update Figma **7:111** text in pass 3.

## Risks / Trade-offs

- **[Risk] Figma write conflicts** (multiplayer) → **Mitigation:** short sessions, note page/frame in tasks before editing.
- **[Risk] Over-abstraction in React** → **Mitigation:** extract only where DS component is stable and reused or explicitly required by spec.
- **[Risk] MCP asset URLs expire** → **Mitigation:** prefer vectors/components in Figma; avoid relying on export bitmaps for parity.

## Migration Plan

- Ship docs + prototype in PR; Figma saves in-file; **no** data migration.
- **Rollback:** revert git PR; use Figma version history for canvas.

## Open Questions

- Exact list of **DS components under `13:128`** to mirror in code—resolved during **apply** by inspecting the node with MCP.
- Whether **badge** “Most popular” is added to Figma for Home Garden or removed from code for parity—**product/design** call during implementation.
