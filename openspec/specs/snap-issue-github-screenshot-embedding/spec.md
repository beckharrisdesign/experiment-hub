# snap-issue-github-screenshot-embedding

## Purpose

GitHub-hosted inline screenshots in Snap Issue issues while preserving local PNG downloads.

## Requirements

### Requirement: The extension obtains a GitHub-hosted HTTPS URL for the cropped PNG using the same PAT used for issue creation

The user SHALL NOT need to open github.com to upload the crop for a normal success path; the extension SHALL perform an authenticated upload (or GitHub-supported equivalent) from the service worker and receive a stable `https://` URL suitable for Markdown embedding.

**Fails until:** A successful submit path yields a non-empty `download_url` from the Contents API response, or GitHub returns an error that is shown to the user.

#### Scenario: Successful submit obtains an embeddable URL before the issue is visible with the image

- **WHEN** the user submits a valid capture and GitHub credentials meet documented token type and scopes
- **THEN** the extension SHALL obtain an HTTPS image URL acceptable to GitHub’s Markdown renderer and use it when assembling the issue body or the immediate follow-up comment defined in design

### Requirement: The created GitHub issue shows the screenshot inline for anyone with repo access

The issue description or the first automated follow-up SHALL include Markdown (or equivalent) that renders the capture without referencing only a local filesystem path.

**Fails until:** Opening the new issue in a fresh browser profile (no local Downloads) still shows the image.

#### Scenario: New issue renders the capture inline

- **WHEN** issue creation completes successfully after upload
- **THEN** the GitHub issue view SHALL display the cropped image inline, not only text such as “Local file (Downloads)”

### Requirement: The cropped PNG is still saved locally with a predictable filename pattern

The extension SHALL continue to persist the crop via the downloads API and keep a discoverable `snap-issue-*.png` naming pattern as today.

**Fails until:** After submit, Downloads contains the PNG and the issue body still mentions the local filename for the reporter’s convenience, unless superseded by a single combined line that still confirms local save.

#### Scenario: Local download remains after inline embedding

- **WHEN** submit succeeds including upload and issue create
- **THEN** the extension SHALL still trigger a download of the PNG and SHALL not remove local-save behavior documented in README

### Requirement: Upload or embedding failures are visible, secrets stay in sync storage, and README documents PAT scopes and hosts

If the image URL cannot be obtained or the body cannot be updated to include the image, the user SHALL see a specific error (HTTP status or message snippet where safe) and SHALL NOT see only a silent success state. No new secret channel SHALL be introduced; the PAT remains in `chrome.storage.sync` per existing `snap-issue-github-config`. README SHALL list any additional scopes or `host_permissions` entries required for upload.

**Fails until:** Simulated 403/401 from upload surfaces in the review UI or extension error path used today for issue API errors, and README documents token expectations for both issue create and image upload paths.

#### Scenario: Upload or body-update failure surfaces a clear error

- **WHEN** GitHub rejects the upload or a follow-up PATCH/comment request fails
- **THEN** the user SHALL see an actionable message (e.g. scope, token, or retry) and the issue SHALL not claim an inline image unless one was actually attached

#### Scenario: README documents PAT scope and hosts for upload

- **WHEN** a contributor configures the extension for this version
- **THEN** README SHALL state required GitHub scopes and any new `host_permissions` entries needed for upload endpoints
