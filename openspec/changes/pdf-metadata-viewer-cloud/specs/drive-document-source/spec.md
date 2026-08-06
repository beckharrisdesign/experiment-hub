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

#### Scenario: Tokens are never exposed to the browser

- **WHEN** any page or API response is produced
- **THEN** it contains no Drive access or refresh token

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

#### Scenario: Write permission is missing

- **WHEN** the grant allows reading but not writing a file
- **THEN** the commit fails with that reason
- **AND** the pending edits remain intact

### Requirement: Drive access is limited to what the tool needs

The system SHALL request the narrowest OAuth scope sufficient to read and write
the documents the user selects, and the granted scope SHALL be recorded so it can
be re-examined when the tool moves beyond a single account.

Scope choice is the gate on Google's restricted-scope security assessment, which
a single-user instance defers but a multi-user one does not.

#### Scenario: Scope is recorded at grant time

- **WHEN** a Drive grant is stored
- **THEN** the scope granted is stored alongside it
