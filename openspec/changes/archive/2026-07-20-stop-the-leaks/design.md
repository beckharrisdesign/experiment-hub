# stop-the-leaks — design

## Context

The public experiment detail page currently renders a database dump: a 240px side-label `<dl>` of every non-empty Notion property, including bookkeeping fields (`LAST EDITED TIME` raw ISO, `NAME ALT`, `SCORE TAG`, `PUBLIC`). The approved spec ([public-content-gate](specs/public-content-gate/spec.md)) curates this to three narrative statements and a hero Status chip — with silent empty states publicly and ghost prompts in admin edit mode. A Figma prototype was built by @design-advisor on 2026-07-17: current state reconstructed from code first, then the proposed frames, using MVDS `@beckharrisdesign/mvds@0.2.0` primitive specs and tokens ported 1:1 from `app/globals.css`.

## Goals / Non-Goals

**Goals:**

- The detail page reads as a curated case-study opening (why → hypothesis → summary), not a field dump.
- Every visual decision uses hub tokens and MVDS primitive specs — no arbitrary hex, no new component vocabulary.
- Empty states are honest: missing fields disappear publicly; in edit mode they become todos (ghost prompts).
- Internal process indicators (phase chip) are visually demoted to metadata and gated to admin.

**Non-Goals:**

- The History/timeline section (`tell-the-story`).
- Homepage table redesign beyond the phase-chip gating.
- Agreeing a shared `success` token across MVDS and the hub (follow-up under issue #285 — see Risks; the Status chip already uses the hub value).
- Status vocabulary changes (owned by `publish-the-graveyard`).

## User flow / IA

Public: Header → Hero (breadcrumb · Fraunces title · type badge · **Status chip** · statement) → narrative section (Why this matters → Hypothesis → Exec Summary, stacked label-over-prose) → Footer. No link buttons in v1 (deferred to `clickable-artifacts`). Fields missing → row omitted; all three missing → the light content band is removed entirely (header → hero → footer).

Admin edit mode: same page + ghost prompt rows ("Add a hypothesis →") in place of missing statements; phase chip visible in restyled admin form.

## Visual design / Figma

| Item             | Value                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Primary file URL | https://www.figma.com/design/HKy2SdRDyCJ37V29mvMpma ("experiment-detail — stop-the-leaks")            |
| Frames in scope  | Page `01 Current state`: Desktop 1440 (4:2). Page `02 Proposed` (this change's build scope, 5 frames): Desktop 1440 (5:2), Small 480 (6:73), Partial content (5:36), All empty (5:70), Admin edit mode (5:104). Page `02.1 Proposed — History preview`: with-History frame (9:82) — forward preview for `tell-the-story`, out of scope here. Components + "hub tokens" variables on `00 Components`. **File convention:** each proposal iteration is a new numbered page (02.1, 02.2, …), never frames appended to an approved page. |
| Libraries        | **MVDS Core** — https://www.figma.com/design/C20nU0mROzk3Zr0I9BELJF/MVDS-Core (node 95-4). Not enabled as a team-library dependency (absent from `get_libraries`), but reachable by component key: `importComponentByKeyAsync`/`importVariableByKeyAsync` succeed. Status chips are real MVDS `Badge / variant=success` instances; the full MVDS Button + Badge sets are imported and parked on `00 Components` for the deferred `clickable-artifacts` change. Hub theme values still come from a local "hub tokens" collection (18 colors ported from `app/globals.css` `@theme`, e.g. background/primary `#194B31`); the type badge, ghost prompt, phase chip, header, and footer stay local (no MVDS equivalent). Fraunces SemiBold / Inter. |
| Breakpoints      | S · 480px mobile / L · 1024px desktop (BHD Content Types) — see `.cursor/rules/design-guidelines.mdc` |
| Status           | **Approved 2026-07-17.** File reconciled: button rows removed from all proposed frames; Status chips are real MVDS Core `Badge / variant=success` instances (imported by component key). |

## Decisions

1. **Status chip ≠ type badge shape.** Type badge keeps the hub pill (rounded-full); Status uses MVDS Badge `success` variant (rounded-md, 15% tint). State and taxonomy stay distinguishable at a glance.
2. **Narrative rows drop the 240px side-label grid** — stacked label-over-prose, 18px/170% Inter on a 720px measure. The side-label grid is what made the page read as a database; reading-size prose is what makes it read as a case study.
3. **Demo/code buttons: cut from v1 (founder call, 2026-07-17 — "Simplify").** The detail page ships statements-only; buttons and their settled decisions transfer to `clickable-artifacts`: hierarchy (demo = primary, code = outline), monorepo-accurate labels ("View experiment in repo" for `experiments/{slug}` paths; "View repo" only for genuine standalones like MVDS), and destinations (demo ← `Demo URL` Notion property; code ← explicit external repo URL when real, else `github.com/beckharrisdesign/experiment-hub/tree/main/experiments/{slug}`). Note: the Notion `Repo` field is unreliable today (Best Day Ever's points at a nonexistent repo) — correct or supersede it when `clickable-artifacts` lands. Button components remain on `00 Components` for that reuse.
4. **S=480: buttons full-width stacked** (touch-target class); desktop inline hug-width.
5. **Ghost prompts:** dashed 1px `border-dark`@30%, 8px radius, muted text @70% with trailing → — reads as "empty slot," never as content.
6. **Phase chip admin restyle:** "OpenSpec · Apply" in 11px muted mint, dashed unfilled border, rounded-md. Shares no signature with Button (no fill, no h-32) so it can't read as a CTA.
7. **All-empty fallback removes the content band entirely** rather than rendering an empty section.
8. **History preview (for `tell-the-story`, not built here):** dates in a fixed 88px left gutter, mono 13px muted (Roboto Mono stand-in — implement with the CSS mono stack), sentences 14px Inter on the 720px measure — vertical scan line, tabular dates. History sits as an appendix band below the narrative section (Exec Summary), before the footer. Receipts are numbers carried in the entry sentence itself — no link chips in the first pass (founder call, 2026-07-17: don't overbuild v1; a chip vocabulary can come later if entries need linked artifacts).

## Risks / Trade-offs

- **Type badge bug surfaced during reconstruction:** `ExperimentTypeBadge` returns `null` for `commercial` — so Business-type experiments (Notion "Business" → hub `commercial`) render no type badge live today. The proposed hero leans on badge + chip pairing; fix or consciously accept during apply (likely a one-line fix, but it's a behavior change to note).
- **Current-state frame contains plausible fabrications** for values not derivable from code (Score tag, dates, URLs, tags); labels/ordering/styling are faithful. Treat the frame as reference, not pixel truth (per `rules/figma.mdc`: MCP/Figma output is reference, not literals).
- **`success` token delta (feeds issue #285).** MVDS Core `Color/success` = `#0A7E3A` (dark green, tuned for light surfaces); hub `--color-success` = `#3ecf8e` (bright mint, tuned for the dark hero — `app/globals.css:37`). The Status chip sits on the dark hero, so it uses the **hub** value (authoritative per globals.css; also the legible choice — MVDS's dark-green would render dark-on-dark). This is fine for stop-the-leaks, but a shared success token must be agreed under #285 before MVDS Badges are used on light sections.
- Local components without an MVDS equivalent (type badge, ghost prompt, phase chip, header, footer) can still drift from the hub's real components; they're recreations, not bindings. Low risk at this scale.
- Hover/focus states and mobile nav are approximated in the prototype; implementation follows code conventions, not the prototype, for interaction states.
