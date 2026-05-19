## Context

**Snap Issue** is a Manifest V3 Chrome extension for personal/internal use: keyboard or toolbar → viewport rectangle → `captureVisibleTab` → DPR-aware crop → compact review → GitHub issue + local screenshot artifact (see [proposal.md](proposal.md), [specs/snap-issue-viewport-capture/spec.md](specs/snap-issue-viewport-capture/spec.md), [specs/snap-issue-github-config/spec.md](specs/snap-issue-github-config/spec.md)).

Extension surfaces are **plain HTML/CSS/JS** (not Next.js/shadcn). Visually they should **feel consistent with the hub** (dark theme, monospace accent for metadata, calm density) using the palette and spacing intent from [`.cursor/rules/design-guidelines.mdc`](../../../.cursor/rules/design-guidelines.mdc), implemented as CSS custom properties or equivalent—not by importing the hub Tailwind build.

## Goals / Non-Goals

**Goals:**

- **Speed:** Sub-second perceived path from trigger to draggable overlay; review UI is one screen, one primary submit.
- **Keyboard-first:** Shortcuts documented; Enter/Escape behavior matches spec; focus order and visible focus rings on popup/options/review.
- **Clarity:** Dimmed overlay + crisp selection rect; errors are short, actionable (open Options, fix token, retry).
- **Trust:** Preview shows exactly what will be referenced in the issue; PAT never echoed in UI after save.

**Non-Goals:**

- Pixel-perfect parity with hub React components or a dedicated Figma file in v1 (optional later).
- Full-page capture, annotations, OAuth, or automated image hosting (proposal **Not doing**).

## User flow / IA

1. **Trigger** — User clicks toolbar action **or** fires command shortcut → background validates tab (capturable, scripting allowed) → messages content script to mount overlay (or injects then mounts).
2. **Select** — Full-viewport overlay: dim outside rect, drag to define CSS-pixel rectangle, live border; **Escape** → teardown, no side effects; **Enter** with valid rect → message background with `{ x, y, width, height, dpr, viewportWidth, viewportHeight, pageUrl, pageTitle }`.
3. **Capture** — Background `captureVisibleTab` → crop helper maps CSS rect → bitmap crop → data URL or blob for preview + download pipeline.
4. **Review** — Dedicated extension page or popup handoff: image preview, **Bug | Feedback** segmented control or radio, optional **Note** textarea, **Submit** primary; secondary link **Options** when config missing.
5. **Submit** — Validate storage → optional `downloads` save with deterministic filename → GitHub `POST /repos/{owner}/{repo}/issues` → success state with link to issue; failure shows status + body snippet if safe.
6. **Configure (anytime)** — Options page: owner, repo, PAT, default labels (Bug / Feedback), optional assignee; Save; short security copy on PAT.

**Information architecture (surfaces):**

| Surface | Role                                      | Primary actions                        |
| ------- | ----------------------------------------- | -------------------------------------- |
| Popup   | Status, manual “Capture”, link to Options | Capture, Open options, Open last issue |
| Options | Credentials + repo + labels               | Save, (optional) test connection later |
| Review  | Preview + type + note + submit            | Submit, Cancel                         |
| Overlay | Ephemeral on host page                    | Drag, Enter, Esc                       |

**State / transitions (high level):** idle → `overlay_active` → `capturing` → `review` → `submitting` → `done` | `error` (recoverable back to review or overlay).

## Visual design / Figma

| Item             | Value                                                                                                                                                                                                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary file URL | **N/A** — MVP UI ships as in-repo HTML/CSS for `popup`, `options`, and `review` only; no Figma board is required to start implementation. Optional: add a Figma file later and link here if screens are formalized with the hub design file.                                                                    |
| Frames in scope  | **Deferred** — If/when designing in Figma: Popup (~320×auto), Options (form, ~480–560 wide), Review (preview + form, min height for 16:9 thumb).                                                                                                                                                                |
| Libraries        | **N/A** — Not using hub `tailwind.config.ts` in the extension bundle; **map semantically** to hub baseline colors (background `#0d1117`, surfaces `#161b22` / `#21262d`, text `#c9d1d9` / `#8b949e`, border `#30363d`, accent `#58a6ff`, error `#f85149`, success `#3fb950`).                                   |
| Breakpoints      | **S · 480px / L · 1024px** (BHD Content Types) — treat **popup width ≤ 400px** as “below S” (single column, 12–14px body); **options/review** windows: default `min-width: 360px`, comfortable form at `max-width: 520px`, optional `min-width: 768px` for two-column preview+form at **L** if opened as a tab. |
| Status           | **Implement from guidelines** — match hub dark tokens and accessibility checklist (focus, contrast, keyboard). Figma sync is optional post-MVP.                                                                                                                                                                 |

**Component-level UI notes (implementation hints, not Figma):**

- **Overlay:** `rgba(0,0,0,0.55)` full-screen scrim; selection hole uses `box-shadow` inset trick or cutout; rectangle stroke 1–2px accent `#58a6ff`; ignore pointer events on page below except through overlay.
- **Review:** Preview top (max-height ~40vh) with `object-fit: contain` and `background: #161b22`; form below; primary button filled accent; destructive/secondary as outline per guidelines spirit.
- **Options:** Group fields with `<fieldset>` or section headings; PAT input `type="password"`; helper text for `repo` scope and `chrome://extensions/shortcuts`.

## Decisions

| Topic            | Decision                                                                                                                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Review host      | Prefer **`chrome-extension://` full page** (e.g. `review.html`) for room for preview + note + errors; popup remains status + quick actions. Alternative acceptable if tasks specify popup-only, at cost of cramped layout. |
| Theming          | CSS variables mirroring hub hex values; system sans for UI labels, **monospace for capture metadata** in issue body only (UI can stay sans for readability).                                                               |
| Shortcut UX      | Manifest `suggested_key` where supported; README + Options footer: set or change in `chrome://extensions/shortcuts`.                                                                                                       |
| PAT display      | Never show full token after save; optional “token on file” badge.                                                                                                                                                          |
| Success feedback | Toast or inline alert + `window.open` issue URL.                                                                                                                                                                           |

## Risks / Trade-offs

| Risk / trade-off              | Mitigation                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **No Figma v1**               | Risks subjective polish gaps; mitigate with explicit token table above and screenshot QA in tasks.                                        |
| **iframe / restricted pages** | Overlay cannot see inside cross-origin iframes; capture is viewport-only—document in README; surface `captureVisibleTab` errors per spec. |
| **Narrow popup**              | Complex review in popup hurts usability—bias to dedicated review page.                                                                    |
| **PAT in sync storage**       | Document threat model (personal machine, fine-grained token, rotation); never log token.                                                  |
