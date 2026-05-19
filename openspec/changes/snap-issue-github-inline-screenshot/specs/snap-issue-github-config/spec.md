## Outcomes

(See [proposal.md](../../proposal.md) — Who / Job / Done when / Not doing.)

## MODIFIED Requirements

### Requirement: User creates a GitHub issue from review with structured title and body, MVP screenshot artifact handling, and clear API failure feedback

The extension SHALL show review UI with cropped image preview, Bug vs Feedback toggle, optional note, and submit; on submit it SHALL call the GitHub REST API to create an issue whose title follows the agreed rules (note-based vs page-title fallback) and whose body includes Capture metadata (type, URL, title, timestamp, browser, viewport, DPR), Note section, and Follow-up placeholders; it SHALL persist the cropped image locally via the downloads API **and** embed a **GitHub-hosted** inline image in the issue description or an immediate follow-up comment using Markdown produced after a successful authenticated upload; it SHALL still include the local filename (or equivalent) for the reporter’s archive; it SHALL structure upload logic in `image-host.js` (or successor) separate from title/body assembly; on API error it SHALL show sufficient detail to fix token, scope, or repo.

**Fails until:** A successful submit yields a visible new issue with template sections populated **and** an inline rendered screenshot viewable without the reporter’s machine; a failed API call shows an error to the user.

#### Scenario: Create issue with structured title and body

- **WHEN** the user chooses Bug or Feedback, optionally enters a note, and submits from review after a valid capture
- **THEN** the extension SHALL create a GitHub issue with the title rules and body sections defined in the change proposal (Capture, Note, Follow-up)

#### Scenario: Screenshot is saved locally and embedded inline on GitHub

- **WHEN** issue creation succeeds after a valid capture
- **THEN** the extension SHALL persist the cropped image to disk via the downloads API (or equivalent) **and** SHALL embed a GitHub-hosted image in the issue record per `snap-issue-github-screenshot-embedding`

#### Scenario: Failed issue creation surfaces GitHub error

- **WHEN** the GitHub API responds with an error (for example 401, 403, 404, or validation)
- **THEN** the user SHALL see a readable error with enough context to correct configuration or retry
