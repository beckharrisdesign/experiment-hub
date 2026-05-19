## 1. User outcomes (from spec scenarios)

- [x] 1.1 User can start capture from the extension icon (Scenario: Start capture from the extension icon)
- [x] 1.2 User can start capture from the keyboard command (Scenario: Start capture from the keyboard command)
- [x] 1.3 User can draw a rectangle with dimmed outside region (Scenario: Draw a rectangle with dimmed outside region)
- [x] 1.4 User can confirm selection with Enter (Scenario: Confirm selection with Enter)
- [x] 1.5 User can cancel selection with Escape (Scenario: Cancel selection with Escape)
- [x] 1.6 User can capture again in the same browser session (Scenario: Capture again in the same browser session)
- [x] 1.7 User gets a crop that aligns with selection on high-DPI (Scenario: Crop aligns with selection on high-DPI)
- [x] 1.8 User sees blocked flow when selection is invalid (Scenario: Invalid selection is blocked)
- [x] 1.9 User sees an actionable error when visible-tab capture fails (Scenario: Visible-tab capture failure is surfaced)
- [x] 1.10 User can persist GitHub settings in sync storage (Scenario: Persist settings in sync storage)
- [x] 1.11 User is blocked from submit with a clear path to Options when GitHub settings are missing (Scenario: Missing required GitHub settings block submit)
- [x] 1.12 User can create an issue with structured title and body (Scenario: Create issue with structured title and body)
- [x] 1.13 User gets a locally saved screenshot artifact referenced in the issue for MVP (Scenario: MVP screenshot is saved locally and referenced in the issue)
- [x] 1.14 User sees a readable GitHub error when issue creation fails (Scenario: Failed issue creation surfaces GitHub error)

## 2. Prototype shell

- [x] 2.1 Create `experiments/snap-issue/extension/` with Manifest V3 `manifest.json` wiring `background` service worker, `action`, `commands`, `options_ui`, `permissions` / `host_permissions` as per README, and placeholder HTML for `popup`, `options`, and `review` (paths match [design.md](design.md) decision: review as full extension page).
- [x] 2.2 Add `experiments/snap-issue/extension/README.md` with **Load unpacked** steps (`chrome://extensions` → Developer mode → Load unpacked), suggested command keys, link to `chrome://extensions/shortcuts`, permission list + rationale, MVP limitations (no full-page capture, iframe caveats, PAT handling).
- [x] 2.3 Register the experiment prototype in [`data/prototypes.json`](../../../data/prototypes.json) (new `id`, `title` “Snap Issue”, `linkPath` `experiments/snap-issue/extension`, `experimentId` `snap-issue`, tags including `chrome-extension`; **omit `port`** like other extension entries). If [`docs/PROTOTYPE_PORTS.md`](../../../docs/PROTOTYPE_PORTS.md) exists and documents non-server prototypes, add a one-line note there; otherwise skip.

## 3. Implementation

- [x] 3.1 **Background service worker** (`background.js`): handle `action.onClicked` and `commands.onCommand`; message content script to start/stop overlay; receive selection rect + tab metadata; call `chrome.tabs.captureVisibleTab`; route to crop helper then open `review.html` with preview payload (e.g. `chrome.storage.session` or URL-safe handoff per MV3 limits).
- [x] 3.2 **Content script** (`content-script.js`): inject full-viewport overlay; pointer drag for CSS-pixel rectangle; dim outside + border; `Escape` / `Enter` handling; postMessage or `chrome.runtime.sendMessage` to background; teardown DOM and listeners on complete/cancel.
- [x] 3.3 **Crop helper** (`crop.js` or equivalent): map viewport CSS rect → bitmap coordinates using `devicePixelRatio` (document tricky scaling in short comments); return `ImageData` / canvas blob / data URL for preview + download.
- [x] 3.4 **GitHub helper** (`github.js`): read `chrome.storage.sync`; build title (note truncation vs page-title fallback) and body (Capture / Note / Follow-up blocks per [proposal.md](proposal.md)); `POST /repos/{owner}/{repo}/issues`; map errors to user-visible strings.
- [x] 3.5 **Stub module** (e.g. `image-host.js`): export no-op or README-only placeholder for future upload/embed automation; crop + GitHub paths import boundary only.
- [x] 3.6 **Popup** (`popup.html` / `popup.js`): status line, “Capture” trigger, link to Options and last issue URL if stored; align styling with [design.md](design.md) token notes.
- [x] 3.7 **Options** (`options.html` / `options.js`): fields for owner, repo, PAT, default Bug/Feedback labels, optional assignee; Save → `chrome.storage.sync`; validation copy for token scope.
- [x] 3.8 **Review** (`review.html` / `review.js`): image preview, Bug/Feedback control, optional note, Submit; on submit → download cropped file via `chrome.downloads` (filename convention) → create issue → show success with link or error per §1.14.
- [x] 3.9 **Polish & errors:** handle missing config, failed capture, invalid selection, and failed issue creation without silent failure (inline or banner errors).

## 4. QA

- [x] 4.1 **Manual walkthrough:** On a normal HTTPS page, run icon path and shortcut path → draw rect → Enter → review → submit with/without note → confirm GitHub issue content and local file reference; repeat second capture; test Escape cancel; test invalid drag; test `chrome://` or Web Store page to confirm capture error messaging; on macOS Retina, visually confirm §1.7.
- [x] 4.2 **Automated or documented smoke:** Either add a tiny **Vitest** suite for pure `crop` math (DPR scaling) if extracted to a testable module, **or** document a **README checklist** (checkbox list mirroring §1) executed before merge—pick one in apply and note which in the extension README.

---

**Applied:** Implementation lives under `experiments/snap-issue/extension/`; crop math covered by `tests/snap-issue-crop.test.ts` and README manual checklist.
