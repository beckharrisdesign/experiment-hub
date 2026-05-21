## 1. User outcomes (from spec scenarios)

- [x] 1.1 User can submit a valid capture and obtain a GitHub HTTPS image URL suitable for Markdown without manually opening github.com to upload the crop (when credentials meet documented scopes).
- [x] 1.2 User can open the new issue in a fresh session and see the screenshot rendered inline, not only a “Local file (Downloads)” line.
- [x] 1.3 User still receives the cropped `snap-issue-*.png` in Downloads after a successful submit, with local-save behavior unchanged.
- [x] 1.4 User sees a clear, actionable error if GitHub rejects the upload or a follow-up body/comment update fails, without a false “success” state.
- [x] 1.5 User can read required GitHub token scopes and any new `host_permissions` / API hosts in the extension README.
- [x] 1.6 User still gets a GitHub issue whose title and body include Capture, Note, and Follow-up sections as defined for Snap Issue.
- [x] 1.7 User gets both the local PNG artifact and an inline GitHub-hosted image on the same successful submit path.
- [x] 1.8 User sees a readable GitHub API error when issue creation fails (for example 401, 403, 404, or validation).

## 2. Prototype shell

- [x] 2.1 No new app shell — work stays under `experiments/snap-issue/extension/` (MV3 extension already loaded unpacked from that directory per README).

## 3. Implementation

- [x] 3.1 Spike and document the chosen GitHub upload + issue ordering (create vs PATCH vs comment) in `design.md` follow-up or `image-host.js` header once validated.
- [x] 3.2 Implement `uploadScreenshotForMarkdown` (or equivalent) in `image-host.js` using the service worker and existing PAT from `chrome.storage.sync`.
- [x] 3.3 Extend `buildIssueBody` / `github.js` to accept an embeddable Markdown fragment (or URL + alt text) and emit `![…](url)` (or agreed shape) in the Screenshot section while retaining local filename guidance.
- [x] 3.4 Wire `background.js` submit flow: upload → assemble body → `createGitHubIssue` (or split steps per spike), preserving `chrome.downloads` save.
- [x] 3.5 Update `manifest.json` host permissions only as required by the validated upload endpoints.
- [x] 3.6 Update `experiments/snap-issue/extension/README.md` with scopes, hosts, failure modes, and any “fine-grained vs classic PAT” notes from the spike.
- [x] 3.7 Add or extend unit tests for pure functions (e.g. body assembly with a fake URL) under repo-root `npm run test` where practical.

## 4. QA

- [ ] 4.1 Manual walkthrough: capture → review → submit → confirm inline image on GitHub in a clean browser profile and PNG in Downloads; confirm error path with a revoked or under-scoped token.
- [x] 4.2 Automated smoke: `npm run test -- tests/snap-issue-crop.test.ts` plus any new unit tests from §3.7 pass from repo root.
