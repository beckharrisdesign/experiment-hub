# hosted-instance-access

## ADDED Requirements

### Requirement: Every route requires an authenticated session

The system SHALL require an authenticated session for every route that reads or
mutates documents, metadata, history, or the Drive connection. An unauthenticated
request MUST be refused before any storage, database, or third-party call is
made, and MUST NOT reveal whether a given document exists.

In v1 nothing was authenticated, which was defensible when the server bound to
localhost and read a local directory. On a public URL the same routes are an
open read and an open delete over the household archive.

#### Scenario: Unauthenticated read

- **WHEN** an unauthenticated request asks for a document's metadata
- **THEN** it is refused
- **AND** no Drive or database call is made

#### Scenario: Unauthenticated destructive request

- **WHEN** an unauthenticated request attempts a delete or a commit
- **THEN** it is refused
- **AND** nothing is modified

#### Scenario: Existence is not leaked

- **WHEN** an unauthenticated request names a document that exists and one that
  does not
- **THEN** the two responses are indistinguishable

#### Scenario: Session expires mid-session

- **WHEN** a request arrives with an expired session
- **THEN** it is refused and re-authentication is prompted
- **AND** any pending edits already persisted remain intact

### Requirement: The instance serves exactly one account

The system SHALL treat all documents, metadata, history, and the Drive grant as
belonging to a single account, and MUST NOT expose any interface for creating
additional accounts. Where a design decision would differ under multi-tenancy,
the single-tenant assumption SHALL be recorded rather than left implicit.

Stated so the boundary is a deliberate scope decision with a known exit cost,
not an accident to be discovered later. The module-level entity cache in
`entities-notion.js` is correct only under this requirement.

#### Scenario: No account creation surface

- **WHEN** the hosted instance is browsed
- **THEN** no sign-up or account-creation path exists

#### Scenario: Cached data is not tenant-scoped

- **WHEN** entity data is cached in process memory
- **THEN** that is permitted under this requirement
- **AND** the assumption is recorded as blocking multi-tenancy

### Requirement: Credentials live in host configuration, not in the interface

The system SHALL read the OpenAI key, the Notion token, and Drive client
credentials from host environment configuration. It MUST NOT provide a UI for
entering them and MUST NOT persist them in the application database. No
credential SHALL ever be included in a response to the browser.

A credentials UI would mean building secret storage, encryption, and rotation for
a single user — work that would be redone properly at productization anyway.

#### Scenario: Configuring a credential

- **WHEN** the operator sets the OpenAI key
- **THEN** it is set in host environment configuration
- **AND** no application screen accepts it

#### Scenario: Credential absent

- **WHEN** the OpenAI key is not configured
- **THEN** the application still starts
- **AND** metadata editing, commit, and history all work
- **AND** only AI suggestions are unavailable, with that stated

#### Scenario: Credentials never reach the client

- **WHEN** any page or API response is produced
- **THEN** it contains no credential value

### Requirement: Notion keeps its existing integration token

The system SHALL continue to authenticate to Notion with an internal integration
token resolved through the shared auth package, and MUST NOT require a per-user
Notion OAuth flow.

Notion OAuth buys multi-tenancy and nothing else here; the integration token
already works and does not expire. This is a deliberate asymmetry with Drive,
which has no equivalent long-lived credential for personal files.

#### Scenario: Entities load on the hosted instance

- **WHEN** the taxonomy is loaded
- **THEN** entities are fetched from Notion using the integration token
- **AND** no Notion authorization is requested from the user

#### Scenario: Notion is unreachable

- **WHEN** the Notion fetch fails and a cached snapshot is available
- **THEN** the snapshot is used and the staleness is surfaced
- **AND** metadata editing and commit continue to work
