## Human anchor

> “Propose the next step in that browser extension such that images are stored in the github issue as well as locally.”

## Outcomes

- **Who:** You (and teammates) triaging Snap Issue reports in GitHub without relying on the reporter’s machine.
- **Job:** After capture and submit, the new issue shows the screenshot inline (GitHub-hosted) while still saving the PNG locally for your own archive.
- **Done when:** A successful submit produces an issue whose description (or an immediate follow-up comment) includes a rendered image from GitHub’s asset pipeline, and the cropped file still lands in Downloads with a predictable name.
- **Not doing:** Replacing local save with cloud-only; switching to a third-party image host as the primary store (optional fallback only if GitHub upload is infeasible with the chosen token model); redesigning crop/review UX beyond what’s needed for upload progress and errors.

## Why

Issues created today only point at a **local** filename. Collaborators and future-you cannot see the capture unless someone manually attaches it in the browser. Closing that gap keeps the issue record self-contained and matches how you already expect GitHub issues to behave.

## What changes

- Implement real behavior behind `uploadScreenshotForMarkdown` (or equivalent) in `experiments/snap-issue/extension/`: after the crop exists as a `Blob`, perform an authenticated upload path that yields a **stable HTTPS URL** GitHub accepts in Markdown, then fold that into `buildIssueBody` (e.g. `![…](url)` plus optional short caption).
- Keep the existing **Downloads** save and filename discipline so local + remote artifacts stay in sync.
- Extend README and manifest permission notes only as required by the chosen upload flow (token scopes, CORS, hosts).
- Add or extend automated tests where pure logic can be covered (e.g. body assembly); browser-only upload may need a thin seam + manual smoke checklist.

## Capabilities

### New Capabilities

- `snap-issue-github-screenshot-embedding`: GitHub-hosted screenshot URL produced on submit and embedded in the issue body (or first comment) while local download remains.

### Modified Capabilities

- `snap-issue-github-config` (canonical spec under `openspec/specs/snap-issue-github-config/spec.md`): extend requirements from “MVP local filename only” to “local + inline GitHub asset,” including failure modes (token scope, upload API errors) and security notes (no service role in extension; PAT stays in `chrome.storage.sync` per current model).

## Impact

- **Users:** Less manual drag-and-drop; issues readable by anyone with repo access.
- **Security:** Upload flow must not widen token exposure beyond current PAT usage; spike whether fine-grained vs classic PAT affects asset upload endpoints.
- **Maintenance:** `image-host.js` becomes a real integration surface; versioning if GitHub changes upload policies.

## Optional links

- Experiment directory: `experiments/snap-issue/`
- Extension README: `experiments/snap-issue/extension/README.md`
- Current stub: `experiments/snap-issue/extension/image-host.js`
