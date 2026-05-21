# Snap Issue (Chrome extension)

Manifest **V3** extension: draw a **viewport** rectangle on any `http(s)` page, crop the visible-tab screenshot (DPR-aware), review, then create a **GitHub issue** and save the PNG to **Downloads**.

## Load unpacked

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Choose this folder: `experiments/snap-issue/extension` (the directory that contains `manifest.json`).

## First-time setup

1. Click **Extension options** (or open the Snap Issue options tab from the extensions list).
2. Fill in **GitHub owner**, **repository**, and a **personal access token** that can **create issues** and **write repository contents** (see [GitHub-hosted screenshots](#github-hosted-screenshots) below).
3. Optionally set default **labels** (comma-separated) for Bug vs Feedback, and an **assignee** login.
4. Save.

## Keyboard shortcut

The manifest suggests **Ctrl+Shift+.** (Windows/Linux) and **⌘+Shift+.** (macOS). Chrome may require you to confirm or change the binding:

- Open **`chrome://extensions/shortcuts`**, find **Snap Issue**, and assign **“Start region capture on the current tab”** to your preferred key.

## How to capture

- **Toolbar icon** — click the Snap Issue icon on an `http(s)` tab to start the overlay (no separate popup on left-click; use the shortcut or **Options → Open quick panel** for the button UI).
- **Command** — use the shortcut you configured.
- **Context menu** — right-click the extension icon → **Capture region on this tab** (when supported).

Then **drag** a rectangle, **Enter** to confirm, **Escape** to cancel. A **Review** tab opens with the cropped preview; choose Bug or Feedback, optional note, **Create GitHub issue**.

## Permissions (why)

| Permission / host          | Purpose                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| `activeTab`                | Capture the current tab and inject the overlay after a user gesture.                              |
| `scripting`                | Inject `content-script.js` when starting capture.                                                 |
| `storage`                  | `sync` for GitHub settings; `session` for the in-flight review draft; `local` for last issue URL. |
| `tabs`                     | Resolve the active tab for shortcuts and capture window id.                                       |
| `downloads`                | Save the cropped PNG with a stable filename referenced in the issue body.                         |
| `contextMenus`             | Optional “Capture region” entry on the extension icon.                                            |
| `https://api.github.com/*` | Create issues and upload capture PNGs via the GitHub REST API.                                    |

## GitHub-hosted screenshots

On **Create GitHub issue**, the extension:

1. Saves the crop to **Downloads** (as before).
2. Uses branch **`snap-issue-media`** for uploads (not `main`): if that branch does not exist, Snap Issue **creates** `refs/heads/snap-issue-media` pointing at the **current default-branch tip**, then [`PUT`s](https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28) the PNG to `snap-issue-captures/<unique>.png` on **that branch**. Typical **protect-main** rulesets therefore do not block the upload.
3. Inserts the returned **`raw.githubusercontent.com`** URL as `![Snap Issue capture](…)` in the issue body, plus the local download line.

**Optional:** **Upload branch for screenshots** in Options replaces `snap-issue-media` with another branch name (same create-if-missing behavior).

**Token scopes**

- **Classic PAT:** `repo` (private) or `public_repo` (public only) — must allow **contents** (commits + refs) and **issues**.
- **Fine-grained PAT:** **Contents: Read and write**, **Issues: Read and write**, **Metadata: Read**.

**If upload still fails:** your org may block **creating refs/branches** or apply rules to **all** branches — the issue is still created with an explanation; check the yellow warning on the review tab or the **Screenshot** section on GitHub.

**Repo footprint:** one-time branch pointer plus one commit per capture on the media branch under `snap-issue-captures/…`.

## MVP limitations

- **Viewport only** — uses `chrome.tabs.captureVisibleTab` (not full-page scroll capture).
- **Restricted pages** — `chrome://`, the Chrome Web Store, and other blocked URLs cannot be captured; you’ll see an on-page toast.
- **iframes** — selection is viewport-level; cross-origin iframe contents are not isolated in the crop.
- **PAT** — stored in **synced** storage; use a minimally scoped token and rotate if exposed.
- **Images in GitHub** — uploads go to **`snap-issue-media`** (auto-created) by default so **protect-main** does not block them. If upload still fails, the issue is created with an explanation and the PNG stays in Downloads.

## Manual QA checklist (ship gate)

Mirror of OpenSpec user outcomes — run before merge or release. Automated smoke: `npm run test -- tests/snap-issue-crop.test.ts tests/snap-issue-github.test.ts` (crop math + issue body).

- [ ] 1.1 Start capture from the extension icon (supported `http(s)` page).
- [ ] 1.2 Start capture from the keyboard command / shortcut.
- [ ] 1.3 Drag shows dimmed outside region and visible rectangle border.
- [ ] 1.4 **Enter** confirms and opens review with crop.
- [ ] 1.5 **Escape** cancels with no issue or review draft.
- [ ] 1.6 Second capture in the same browser session works without reload.
- [ ] 1.7 On Retina / `devicePixelRatio` ≠ 1, crop matches the framed region.
- [ ] 1.8 Very small selection is rejected with feedback (no review).
- [ ] 1.9 Restricted URL shows capture error toast, not a silent failure.
- [ ] 1.10 Options save and reload persist settings (sync).
- [ ] 1.11 Submit without owner/repo/token is blocked with pointer to Options.
- [ ] 1.12 Created issue has correct title + Capture / Note / Follow-up body and **renders the screenshot inline** (not only local path text).
- [ ] 1.13 Downloads contains `snap-issue-*.png` and the issue body still mentions the local filename; repo has a new file under `snap-issue-captures/` on branch **`snap-issue-media`** (or your override).
- [ ] 1.14 Invalid token or repo shows a readable GitHub error on submit.

## File map

| File                          | Role                                                                    |
| ----------------------------- | ----------------------------------------------------------------------- |
| `manifest.json`               | MV3 entry, permissions, command                                         |
| `background.js`               | Service worker: inject, capture, crop, session draft, GitHub, downloads |
| `content-script.js`           | Overlay, drag selection, Enter/Escape                                   |
| `crop.js`                     | CSS viewport rect → bitmap crop using capture/image size ratio          |
| `github.js`                   | Issue title/body + `POST` issue                                         |
| `image-host.js`               | Upload PNG via GitHub Contents API → markdown image URL                 |
| `popup.html` / `popup.js`     | Optional quick panel (open from Options)                                |
| `options.html` / `options.js` | GitHub + label settings                                                 |
| `review.html` / `review.js`   | Preview, type, note, submit                                             |
| `extension-ui.css`            | Dark styling aligned with hub palette                                   |

## Development notes

- **DPR:** Crop math uses `imageWidth / innerWidth` and `imageHeight / innerHeight` as scale factors so fractional DPR and browser rounding stay aligned with the bitmap returned by Chrome.
- **Module worker:** `background.js` is an ES module (`import` of `crop.js` / `github.js`).
