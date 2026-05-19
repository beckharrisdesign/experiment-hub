## Human anchor

> Build a Chrome extension (Manifest V3) called “Snap Issue” for personal/internal use.
>
> Primary goal: Let me press a keyboard shortcut or click the extension icon, draw a rectangle over the current page, capture only that selected area, and immediately create a lightweight GitHub issue from it.

## Outcomes

- **Who:** You (solo builder) logging bugs and feedback while using your own web tools and internal pages.
- **Job:** In one fast path, capture **exactly** the viewport region you care about—not a vague full-page shot—and turn it into a GitHub issue you can refine later.
- **Done when:** From toolbar click or keyboard command, you dim the page, drag a rectangle, see a cropped preview, choose Bug vs Feedback, optionally add a note, submit, and get an issue in a configured repo with structured metadata; cropped screenshot is at least saved locally and referenced in the issue body for MVP; Retina/DPR cropping matches what you selected.
- **Not doing:** Full-page scrolling capture, annotation tools, OAuth login flows, hosted image automation in v1 (code may isolate a future “image host” module only).

## Why

Full-page screenshots lose the signal that mattered in the moment. A keyboard-first, rectangle-default flow keeps friction near zero and preserves UI state for later triage.

## What changes

Add a new **Manifest V3** Chrome extension (personal/internal) under the repo—likely `experiments/snap-issue/` or a dedicated top-level folder aligned with tasks—with:

- **Service worker** background: orchestrate command/icon triggers, `captureVisibleTab`, message passing, GitHub API calls, downloads for local image artifact.
- **Content script:** viewport-based selection overlay (dim outside selection, clear border), Escape cancel, Enter confirm when selection exists, clean teardown.
- **Helpers:** DPR-aware crop (CSS pixels → screenshot pixels), GitHub REST helper, optional stub module for future image hosting/embed.
- **UI:** `popup` (trigger + status), `options` (owner, repo, PAT, default labels for Bug/Feedback, optional assignee, `chrome.storage.sync`), `review` step (preview, type toggle, note, submit).
- **Commands API** for suggested shortcuts (Mac `Command+Shift+.` / Win/Linux `Ctrl+Shift+.`) with README note for `chrome://extensions/shortcuts` if Chrome does not bind automatically.
- **README:** load-unpacked steps, permission rationale, limitations.

Issue title/body rules follow the summarized template (truncated note vs page title fallback; capture metadata block; follow-up placeholders; note section).

## Capabilities

### New Capabilities

- `snap-issue-viewport-capture`: Trigger paths (action + command), overlay selection behavior, `captureVisibleTab` + canvas crop with **devicePixelRatio**-correct mapping, review UI, repeated captures per session, error handling for invalid selection and failed capture.
- `snap-issue-github-config`: Options page and `chrome.storage.sync` for repo, token, labels, assignee; create issue via GitHub API; MVP strategy—local download + filename in body and/or prefilled compose flow—structured so automated upload can plug in later.

### Modified Capabilities

- _(none — new surface area only)_

## Impact

- New codebase and docs; no change to existing hub app runtime unless you later wire catalog/prototype metadata (tasks will align with `PROTOTYPE_PORTS` / `data/prototypes.json` if this is registered as a hub experiment).
- **Security:** PAT lives in extension storage—treat as sensitive; document scope (`repo` or fine-grained equivalent) and rotation.

## Optional links

- PRD (if separate): _none yet — can add `experiments/snap-issue/docs/PRD.md` if you want a commercial narrative track._
- Experiment directory: _to be created on apply, e.g. `experiments/snap-issue/`_
