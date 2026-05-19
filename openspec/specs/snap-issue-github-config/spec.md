## Outcomes

(See `experiments/snap-issue/extension/README.md` and OpenSpec change `snap-issue-github-inline-screenshot` — Who / Job / Done when / Not doing.)

## ADDED Requirements

### Requirement: User configures GitHub repository, token, labels, and optional assignee in options with sync storage

The extension SHALL provide an options page backed by `chrome.storage.sync` for GitHub owner, repository name, personal access token, default labels for Bug and Feedback, and optional assignee; README SHALL document token scope expectations and that secrets live in synced storage.

**Fails until:** After save, a browser restart on the same synced profile still loads settings; missing required fields are detectable before submit.

#### Scenario: Persist settings in sync storage

- **WHEN** the user saves valid option fields (including required repo identity and token)
- **THEN** the extension SHALL store them in `chrome.storage.sync` and load them on options open and before issue submission

#### Scenario: Missing required GitHub settings block submit

- **WHEN** the user reaches review submit without owner, repo, or token configured (per MVP validation rules)
- **THEN** the extension SHALL block submission with a clear message and a path to open options

### Requirement: User creates a GitHub issue from review with structured title and body, GitHub-hosted screenshot plus local download, and clear API failure feedback

The extension SHALL show review UI with cropped image preview, Bug vs Feedback toggle, optional note, and submit; on submit it SHALL call the GitHub REST API to create an issue whose title follows the agreed rules (note-based vs page-title fallback) and whose body includes Capture metadata (type, URL, title, timestamp, browser, viewport, DPR), Note section, and Follow-up placeholders; it SHALL persist the cropped image locally via the downloads API **and** embed a **GitHub-hosted** inline image in the issue description using Markdown produced after a successful Contents API upload to `snap-issue-captures/` on a **dedicated media branch** (default `snap-issue-media`, created from the default-branch tip when missing — see README); it SHALL include the local filename for the reporter’s archive; upload logic SHALL live in `image-host.js` separate from title/body assembly in `github.js`; on API error it SHALL show sufficient detail to fix token, scope, or repo.

**Fails until:** A successful submit yields a visible new issue with template sections populated **and** an inline rendered screenshot viewable without the reporter’s machine; a failed API call shows an error to the user.

#### Scenario: Create issue with structured title and body

- **WHEN** the user chooses Bug or Feedback, optionally enters a note, and submits from review after a valid capture
- **THEN** the extension SHALL create a GitHub issue with the title rules and body sections defined in the change proposal (Capture, Note, Follow-up)

#### Scenario: Screenshot is saved locally and embedded inline on GitHub

- **WHEN** issue creation succeeds after a valid capture
- **THEN** the extension SHALL persist the cropped image to disk via the downloads API (or equivalent) **and** SHALL embed a GitHub-hosted image in the issue record per README (Contents API + Markdown)

#### Scenario: Failed issue creation surfaces GitHub error

- **WHEN** the GitHub API responds with an error (for example 401, 403, 404, or validation)
- **THEN** the user SHALL see a readable error with enough context to correct configuration or retry
