## Context

Add a **Snap Issue** install callout to the **hub root** [`README.md`](../../../README.md) so the repo entry doc points to [`experiments/snap-issue/extension/`](../../../experiments/snap-issue/extension/) and the extension’s own README. Specs: [`specs/hub-readme-snap-issue-callout/spec.md`](specs/hub-readme-snap-issue-callout/spec.md). Proposal: [`proposal.md`](proposal.md).

## Goals / Non-Goals

**Goals:**

- **Scan-first:** Heading + ≤1 short paragraph (or tight blockquote) so the eye catches “Snap Issue” without reading the whole README.
- **Actionable path:** Repo-relative folder path is copy-pasteable; link to extension README is one click from GitHub render.
- **Tone match:** Voice stays consistent with the rest of the hub README (first person / lab, plain sentences).

**Non-Goals:**

- No Figma or marketing layout work; no new hub UI routes or components.
- No duplication of extension permission tables or PAT walkthrough (spec requirement).

## User flow / IA

1. Reader opens **root** `README.md` on GitHub or locally.
2. Scrolls to **Getting started** (clone / install dev server) — the same place they already look for “how do I run this repo?”
3. Sees a new subsection **Snap Issue (Chrome extension)** (exact title can vary slightly in apply) **after** the existing Getting started commands and **before** **Project structure** — optional Supabase paragraph can stay grouped above; if that feels crowded, **alternate placement** documented below.
4. Reads: one-line what it does → path `experiments/snap-issue/extension/` → “Load unpacked” cue → link to the extension README at [`experiments/snap-issue/extension/README.md`](../../../experiments/snap-issue/extension/README.md) once applied in the **root** README (GitHub-relative from repo root).

**Alternate placement (if apply edits prefer):** Immediately under **What’s inside** after the **Active experiments** table, as a third `###` sibling to **Active experiments** and **The infrastructure** — keeps “things in this repo” together.

## Visual design / Figma

| Item             | Value                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary file URL | **N/A** — change is Markdown in `README.md` only; not represented in Figma.                                                                          |
| Frames in scope  | **N/A**                                                                                                                                              |
| Libraries        | **N/A**                                                                                                                                              |
| Breakpoints      | **N/A** — GitHub / editor render full-width Markdown; keep lines **~72 chars** where practical for raw readability (not a product breakpoint).       |
| Status           | **Docs-only** — use a `###` heading + short paragraph or a single **blockquote** for visual separation on GitHub; avoid large tables in the callout. |

## Decisions

| Topic              | Decision                                                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary placement  | **Prefer** a `### Snap Issue (Chrome extension)` block **inside [Getting started](../../../README.md)** after `npm run dev` / env notes and **before** `## Project structure`, so install-minded readers see it next to clone/run steps. |
| Fallback placement | If Getting started becomes too dense, place the same content under **What’s inside** after the experiments table.                                                                                                                        |
| Markdown pattern   | Prefer `###` + **bold** product name + inline `` `path` `` + one relative link to `experiments/snap-issue/extension/README.md`; optional `>` blockquote for contrast — pick one style in apply, not both long forms.                     |
| Link style         | Use repo-relative paths from README root (`experiments/snap-issue/extension/README.md`) so GitHub linking works on default branch.                                                                                                       |

## Risks / Trade-offs

| Risk                                               | Mitigation                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| README grows noisy                                 | Cap callout at **~6 lines** inclusive of heading; link out for everything else. |
| Two “entry points” (hub vs extension README) drift | Extension README remains source of truth; hub callout only summarizes.          |
