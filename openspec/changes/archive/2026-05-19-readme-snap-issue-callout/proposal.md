## Human anchor

> a callout for the extension in my hub readme so I have a spot to grab it from and install it

## Outcomes

- **Who:** You, working from the repo root and hub `README.md`, wanting a **single obvious place** to remember where Snap Issue lives and how to load it.
- **Job:** Skim the hub README and immediately see **what** Snap Issue is, **where** the extension folder is, and **how** to install it (Chrome load-unpacked + pointer to the extension’s own README for shortcuts, permissions, and PAT setup).
- **Done when:** Root `README.md` includes a short, scannable **callout** (e.g. blockquote or “###” section) with repo-relative path `experiments/snap-issue/extension/` and a one-line “Load unpacked” cue linking or deferring to `experiments/snap-issue/extension/README.md` for full steps.
- **Not doing:** Re-documenting the full extension spec, OpenSpec change text, or duplicating long permission tables in the hub README (link out instead).

## Why

The extension already ships under `experiments/` with its own README; the **hub** README is the mental entry point when you open the repo. A callout reduces “where was that again?” friction without bloating the top-level doc.

## What changes

- Edit **root** [`README.md`](../../../README.md) only: add a compact **Snap Issue** callout in a sensible section (e.g. after “What’s inside”, “Testing”, or a small new **“Internal tools”** / **“Chrome extensions”** blurb—exact placement in `design.md` / tasks on apply).
- Callout content: name, one-sentence purpose, **folder path**, link to [`experiments/snap-issue/extension/README.md`](../../../experiments/snap-issue/extension/README.md) for install + configuration.

## Capabilities

### New Capabilities

- `hub-readme-snap-issue-callout`: Hub root README gains a discoverable Snap Issue install entry point with path + link to extension README; no new runtime code.

### Modified Capabilities

- _(none — documentation surface only; optional treat as doc delta under same capability)_

## Impact

- **Docs only** for this slice; no build or deploy behavior change.
- Keeps hub README honest: short callout, details stay in the extension README.

## Optional links

- Extension install + QA: [`experiments/snap-issue/extension/README.md`](../../../experiments/snap-issue/extension/README.md)
- OpenSpec (prior ship): [`openspec/changes/snap-issue-chrome-extension/`](../snap-issue-chrome-extension/) _(context only; not required in hub README)_
