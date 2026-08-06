# drive-document-source

## ADDED Requirements

### Requirement: The user connects Google Drive by OAuth

The system SHALL obtain access to Drive through an OAuth authorization the user
grants, and SHALL store the resulting tokens server-side. It MUST refresh an
expired access token without user involvement, and MUST report a revoked or
unrecoverable grant as a re-authorization prompt rather than a generic failure.

#### Scenario: First connection

- **WHEN** a user with no Drive grant starts the connect flow and authorizes
- **THEN** the tokens are stored server-side
- **AND** the connected account is shown

#### Scenario: Access token has expired

- **WHEN** a request is made with an expired access token
- **THEN** the token is refreshed and the request proceeds
- **AND** the user is not prompted

#### Scenario: Grant revoked in Google's settings

- **WHEN** a request is made after the user revokes the grant
- **THEN** the system prompts for re-authorization
- **AND** does not present the failure as a missing document

#### Scenario: The refresh token never leaves the server

- **WHEN** any page or API response is produced
- **THEN** it contains no refresh token

#### Scenario: An access token reaches the browser only for the Picker

- **WHEN** the user opens the folder picker
- **THEN** a short-lived access token is issued to the browser for that purpose
- **AND** it is requested at that moment rather than embedded in page HTML

This is a correction to an earlier requirement that said no token of any kind
reaches the browser. That is not achievable alongside `drive.file`: a grant over
*existing* files can only be established through the Google Picker, and the
Picker is a browser API that takes an access token. The requirement described a
property the chosen scope forbids.

The distinction that does hold, and matters more: the **refresh token** — the
long-lived credential — never leaves the server. What the browser receives is an
access token that expires in about an hour and is scoped to `drive.file`, so
before any folder is granted it can reach almost nothing.

### Requirement: Document bytes are served only through the authenticated session

The system SHALL serve document bytes through its own authenticated route and
MUST NOT issue, embed, or expose a direct Drive URL that would grant access to a
document outside that session.

Drive can mint short-lived direct download links, and they are faster. They are
excluded deliberately: a link to a household medical record whose lifetime is
governed by a token in a URL, rather than by the session that requested it, is a
worse trade than the bandwidth. Drive already provides deliberate per-document
sharing when it is actually wanted.

#### Scenario: Rendering a preview

- **WHEN** a document preview is requested
- **THEN** the bytes are streamed through the authenticated route
- **AND** no direct Drive URL appears in the response or the page

#### Scenario: An unauthenticated byte request

- **WHEN** the content route is requested without a valid session
- **THEN** it is refused
- **AND** no request for the bytes is made to Drive

### Requirement: Documents are referenced, not copied

The system SHALL record a reference to each document — the Drive file id plus
what is needed to display and re-fetch it — and MUST NOT keep a second durable
copy of the PDF. Drive remains the only home for the bytes.

#### Scenario: Bringing a folder into the tool

- **WHEN** a user selects a Drive folder
- **THEN** a reference row is created for each PDF found
- **AND** no PDF is copied into other storage

#### Scenario: A referenced file is opened

- **WHEN** a user opens a document for preview
- **THEN** the bytes are fetched from Drive using the stored reference

#### Scenario: A referenced file is removed in Drive

- **WHEN** a user opens a document whose Drive file no longer exists
- **THEN** the reference is reported as broken
- **AND** the document's metadata and history remain intact

### Requirement: Commit writes back to the original Drive file

On commit the system SHALL write the modified PDF back to the same Drive file
rather than creating a new one, so the user's existing links, folder placement,
and sharing survive.

#### Scenario: Committing to a Drive-hosted document

- **WHEN** a commit succeeds
- **THEN** the same Drive file id holds the updated bytes
- **AND** no duplicate file is created

#### Scenario: The file changed in Drive since it was read

- **WHEN** a commit would overwrite a version written by something else
- **THEN** the conflict is surfaced rather than silently overwritten

### Requirement: A conflict resolves against the baseline the file had when it was read

The system SHALL retain the document's file-level metadata as last read from
Drive, captured in the same operation that records the revision identifier, so
the two always describe the same version. Conflict resolution SHALL compare three
values per field — staged, current-in-Drive, and that baseline — and SHALL treat
a field as needing a decision only when both sides changed it to different
values.

Where the document's own content has changed, the system SHALL surface that
separately from field conflicts, because choosing between field values does not
address it.

#### Scenario: Only one side changed a field

- **WHEN** a field was changed by the user but not in Drive, or in Drive but not
  by the user
- **THEN** it resolves without asking, and is reported as resolved rather than
  hidden

#### Scenario: Both sides made the same change

- **WHEN** both changed a field to the same value
- **THEN** it is not reported as a conflict

#### Scenario: Both sides changed a field differently

- **WHEN** both changed a field to different values
- **THEN** a decision is required
- **AND** the baseline value is shown alongside both candidates

#### Scenario: The document content changed

- **WHEN** the page count or content differs from what was read
- **THEN** that is surfaced distinctly from field conflicts
- **AND** it is presented ahead of them, because it can invalidate them

#### Scenario: Inspecting the changed document

- **WHEN** the user opens the changed version to look at it
- **THEN** no stored state changes
- **AND** the conflict remains open and unresolved

#### Scenario: Re-baselining is explicit

- **WHEN** the retained baseline is replaced with the current Drive version
- **THEN** that happened because the user chose it
- **AND** it never occurs as a side effect of viewing the document

#### Scenario: The file changes again while a conflict is open

- **WHEN** Drive reports a further change to a document that already has an open
  conflict
- **THEN** the existing conflict is recomputed against the new state
- **AND** no second conflict is created for the same document

#### Scenario: Leaving a conflict unresolved

- **WHEN** the user leaves without choosing
- **THEN** nothing is written and the staged edits remain intact

#### Scenario: Write permission is missing

- **WHEN** the grant allows reading but not writing a file
- **THEN** the commit fails with that reason
- **AND** the pending edits remain intact

### Requirement: Drive access uses the non-sensitive per-file scope, granted by folder

The system SHALL request only `drive.file` and MUST NOT request a restricted
scope such as `drive.readonly` or full `drive`. Access SHALL be granted through
the Google Picker at **folder** granularity; the system MUST NOT require the user
to select documents individually. The granted scope SHALL be recorded alongside
the grant.

`drive.file` is non-sensitive, so it never triggers Google's CASA security
assessment and the app can be published — which also avoids the seven-day refresh
token expiry that applies to apps left in Testing status. Per-file selection is
excluded because it cannot keep pace with a scanning workflow.

#### Scenario: Granting access to an archive

- **WHEN** the user grants access
- **THEN** they select one or more folders, not individual files
- **AND** the documents within become available without further selection

#### Scenario: The requested scope

- **WHEN** authorization is requested
- **THEN** the scope set contains `drive.file`
- **AND** contains no restricted Drive scope

#### Scenario: Scope is recorded at grant time

- **WHEN** a Drive grant is stored
- **THEN** the scope granted is stored alongside it

### Requirement: Documents outside the grant are surfaced, never silently absent

The system SHALL detect documents that exist in a granted folder but are not
accessible under the current grant, and MUST surface them as an item requiring
attention with an action that re-opens the grant. It MUST NOT allow such
documents to be simply missing from the list.

A `drive.file` grant may not extend to files added after it was given, and a file
that is re-scanned, moved, or replaced can drop out of the grant at any time.
Discovering that by noticing an absence is the failure this requirement exists to
prevent.

#### Scenario: New documents appear in a granted folder

- **WHEN** a granted folder contains documents the grant does not cover
- **THEN** they are reported as needing access, with a count
- **AND** an action is offered that re-opens the folder grant

#### Scenario: Access is restored

- **WHEN** the user re-grants access to the folder
- **THEN** the previously inaccessible documents become available
- **AND** the attention item clears
