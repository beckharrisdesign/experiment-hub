## Context

Snap Issue (`experiments/snap-issue/extension/`) crops a viewport region, previews it on `review.html`, creates issues via `github.js`, saves a PNG through the downloads API, and uploads the same PNG to **`snap-issue-captures/`** on a **dedicated media branch** (default **`snap-issue-media`**, auto-created at the default-branch tip when missing) via the GitHub Contents API (`image-host.js`) so the issue body can embed `![Snap Issue capture](raw.githubusercontent.com/...)`.

## Goals / Non-Goals

**Goals:**

- After submit, anyone with repo access sees the screenshot **inline** on GitHub (description or an immediate follow-up comment—see Decisions).
- Local `snap-issue-*.png` behavior stays for the reporter’s archive.
- Failures during upload or issue creation are visible and actionable (token, scope, network).
- PAT remains in `chrome.storage.sync` only; no service role or server-side proxy in v1 of this change.

**Non-Goals:**

- Third-party image hosts as the primary store.
- Redesigning crop handles, overlay chrome, or options layout beyond minimal status/error copy on the review surface.

**Trade-off (accepted for v1):** each successful submit adds a small commit on the **media branch** under `snap-issue-captures/` (GitHub Contents API), not on `main`, so typical **protect-main** rulesets do not block uploads. This is intentional so PAT-only extensions avoid undocumented browser upload endpoints; see README for cleanup, optional branch override, and org ruleset caveats.

## User flow / IA

```
Review (review.html)
  └─ Submit
       ├─(A) chrome.downloads — save PNG locally
       ├─(B) PUT Contents API → snap-issue-captures/{file}.png → download_url
       ├─(C) buildIssueBody (markdown image + local filename line)
       └─(D) POST issue
```

## Visual design / Figma

| Item             | Value                                                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary file URL | N/A — no Figma file for this spike                                                                                                                                                       |
| Frames in scope  | N/A                                                                                                                                                                                      |
| Libraries        | N/A                                                                                                                                                                                      |
| Breakpoints      | S · 480px / L · 1024px (hub guidelines) apply only if review/options pick up new layout; default is **no layout change** beyond optional status line                                     |
| Status           | **Extension-only** — optional short status text on `review.html` (e.g. “Uploading screenshot…”) and inline error styling consistent with existing dark toast patterns in `background.js` |

## Decisions

1. **Chosen flow (implemented):** `PUT /repos/{owner}/{repo}/contents/snap-issue-captures/{unique}.png` on the configured media branch (default `snap-issue-media`); use `content.download_url` from the response in issue Markdown. Order: **download → upload → build body → create issue**. If upload fails, the issue is **still created** with an explanatory Screenshot section and a **warning** on the review tab; the PNG remains in Downloads.
2. **Where the image appears:** **Issue description** includes `![Snap Issue capture](download_url)` plus local filename line.
3. **CORS / hosts:** Service worker `fetch` to `api.github.com` only (`manifest.json` unchanged).
4. **Body assembly:** `uploadScreenshotForMarkdown` in `image-host.js` returns `markdownImage`; `buildIssueBody` in `github.js` accepts `screenshotMarkdownImage`.

## Risks / Trade-offs

- **Media-branch commits:** each capture is a commit on the media branch; noisy auxiliary history vs. user-attachments UX. Mitigation: dedicated `snap-issue-captures/` path; periodic cleanup documented in README.
- **Branch protection / rulesets:** `main` stays protected; uploads target the media branch. Org-wide rules that block all branches can still fail; README documents token scope and optional **Upload branch for screenshots** in Options.
- **Token scope creep:** Contents **Write** required in addition to Issues; README lists classic and fine-grained scopes.
- **Latency:** sequential download + upload + issue; optional in-progress UI deferred unless needed.
