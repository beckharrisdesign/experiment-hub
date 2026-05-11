## ADDED Requirements

### Requirement: Seed packet records support complete inventory CRUD

The system SHALL support creating, reading, listing, searching, updating, and deleting seed packet records owned by the signed-in user while preserving current auth/RLS boundaries and photo storage behavior.

#### Scenario: Create a manual seed packet

- **WHEN** a signed-in user creates a packet with the required canonical fields and any optional packet facts, notes, photos, custom fields, or annotations
- **THEN** the system SHALL save one seed packet record owned by that user and return it in list and detail views

#### Scenario: Read packet detail

- **WHEN** a signed-in user opens a seed packet detail view
- **THEN** the system SHALL show canonical packet facts, custom field values, notes, annotations, photos, use-first state, and timestamps available for that packet

#### Scenario: Update packet fields

- **WHEN** a signed-in user edits canonical fields, custom fields, notes, annotations, photos, or use-first metadata on an existing packet
- **THEN** the system SHALL persist the accepted changes without dropping unchanged packet facts or user-authored values

#### Scenario: Delete packet and photos

- **WHEN** a signed-in user confirms deletion of a seed packet
- **THEN** the system SHALL remove the packet from future lists/details and delete associated storage photos when storage paths are known

### Requirement: Canonical seed fields are centrally defined

The system SHALL define canonical seed fields in a single registry that includes stable field key, label, value type, input control, display group, display order, required state, source category, search/filter participation, and active/hidden/retired status.

#### Scenario: Field metadata drives UI and storage mapping

- **WHEN** add, edit, detail, import review, or storage conversion code needs canonical field information
- **THEN** it SHALL read the field key and metadata from the central registry rather than duplicating field definitions locally

#### Scenario: Canonical field is added

- **WHEN** a maintainer adds a new active canonical field to the registry and matching persistence mapping
- **THEN** the system SHALL make the field available in the appropriate add/edit/import/detail surfaces according to its metadata

#### Scenario: Canonical field is retired

- **WHEN** a maintainer marks a canonical field as hidden or retired
- **THEN** the system SHALL stop showing that field for new entry by default while preserving existing seed values for detail, export, rollback, or migration

### Requirement: Canonical field types cover seed packet data

The canonical field registry SHALL support the value types needed for seed packets: short text, long text, number/integer, date, boolean, single-select, multi-select/month list, photo reference, and structured instruction text.

#### Scenario: Field renders with the correct control

- **WHEN** a canonical field is rendered in an editable surface
- **THEN** the system SHALL choose validation and input controls consistent with the field value type

#### Scenario: Invalid value is rejected

- **WHEN** a user or import flow submits a value that does not match the field value type
- **THEN** the system SHALL reject or normalize the value before save and expose a recoverable validation message in user-facing flows

### Requirement: Custom seed fields are user-managed

The system SHALL allow a signed-in user to create, update, reorder, hide, and delete custom seed fields for packet data that is not covered by active canonical fields.

#### Scenario: Add a custom field definition

- **WHEN** a signed-in user creates a custom field with a label, value type, and optional display group/order
- **THEN** the system SHALL make that field available for the user's seed packets without changing other users' field lists

#### Scenario: Save custom field value on a packet

- **WHEN** a signed-in user enters a value for one of their custom fields on a seed packet
- **THEN** the system SHALL persist that value with the packet and show it in detail/edit views according to the field metadata

#### Scenario: Hide or delete custom field

- **WHEN** a signed-in user hides or deletes a custom field definition
- **THEN** the system SHALL remove it from default entry surfaces and preserve or remove existing values according to the confirmed destructive choice

### Requirement: Packet facts remain separate from user notes

The system SHALL distinguish printed or extracted packet facts from user-authored notes so users can record personal context without overwriting what the packet says.

#### Scenario: Add a freeform note

- **WHEN** a signed-in user adds or edits a general note on a seed packet
- **THEN** the system SHALL store it as user-authored note content separate from canonical packet facts

#### Scenario: AI import updates packet facts only

- **WHEN** AI extraction suggests packet facts for a seed that already has user notes
- **THEN** accepting the extraction SHALL NOT overwrite user notes unless the user explicitly edits the note field

### Requirement: Printed instructions support user annotations

The system SHALL allow users to attach annotations to printed instruction fields or instruction blocks while preserving the original printed value.

#### Scenario: Annotate spacing instruction

- **WHEN** a seed packet has printed spacing instructions and the user adds an annotation such as "plant closer together in raised beds"
- **THEN** the system SHALL display both the printed spacing value and the user annotation in packet detail

#### Scenario: Edit or remove annotation

- **WHEN** a signed-in user edits or removes an instruction annotation
- **THEN** the system SHALL update only the annotation and leave the underlying packet fact unchanged

### Requirement: Import and AI extraction map through canonical fields

Packet import and AI extraction flows SHALL map extracted values to active canonical packet fields through a single review/merge layer before saving to a seed packet.

#### Scenario: Review extracted fields before save

- **WHEN** AI or OCR extracts known packet facts from packet photos
- **THEN** the system SHALL present the mapped canonical fields for user review before creating or updating a packet

#### Scenario: Preserve unknown packet text

- **WHEN** import extracts a key/value pair that does not map to an active canonical field
- **THEN** the system SHALL preserve the value as reviewable raw packet text or a candidate custom field rather than silently dropping it

#### Scenario: Do not overwrite manual values silently

- **WHEN** an import update targets a packet field that already has a user-authored value or annotation
- **THEN** the system SHALL require an explicit user choice before replacing that value

### Requirement: Search and display respect active packet fields

Seed list, search, filter, and detail surfaces SHALL use canonical and custom field metadata to decide which fields are searchable, filterable, summarized, or shown only in detail.

#### Scenario: Search includes configured fields

- **WHEN** a user searches their seed list
- **THEN** the system SHALL search active canonical fields and enabled custom fields marked searchable without requiring hardcoded field-specific search logic

#### Scenario: Detail groups field sections

- **WHEN** a user views seed packet detail
- **THEN** the system SHALL group packet facts, growing instructions, notes, annotations, custom fields, photos, and system metadata according to field registry/display metadata
