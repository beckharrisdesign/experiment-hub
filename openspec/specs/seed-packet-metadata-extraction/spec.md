## ADDED Requirements

### Requirement: Canonical seed packet metadata result
The system SHALL produce a canonical seed packet metadata result whose extracted seed fields are independent of whether supporting text appeared on the packet front, packet back, or another captured image label.

#### Scenario: Metadata fields are not side-owned
- **WHEN** a packet extraction returns values for seed name, variety, brand, planting details, description, or planting instructions
- **THEN** the result SHALL expose those values as canonical field candidates rather than separate front-field and back-field values

#### Scenario: Photo provenance remains available
- **WHEN** a canonical field candidate is supported by text or image evidence
- **THEN** the result SHALL be able to reference the supporting image label, text snippet, region, and extraction technique without making that image label part of the saved seed field identity

### Requirement: Technique-independent extraction pipeline
The system SHALL support multiple seed packet extraction techniques behind a shared input/output contract so OCR, AI vision, prompt variants, and parser strategies can be tested or swapped without changing the add-seed form contract.

#### Scenario: Technique can be run through a common interface
- **WHEN** the app invokes an extraction technique for one or more packet images
- **THEN** the technique SHALL return the canonical extraction result with a technique identifier, technique version or configuration metadata, diagnostics, and field candidates

#### Scenario: Technique output can be compared
- **WHEN** two techniques process the same known-good packet fixture
- **THEN** the system SHALL be able to compare their field-level outputs against the same expected metadata file

### Requirement: Candidate resolution and confidence
The system SHALL resolve raw OCR, AI, and parser outputs into canonical field candidates with confidence and warnings sufficient for review before saving.

#### Scenario: Conflicting candidates are preserved for review
- **WHEN** multiple techniques or text regions produce different values for the same seed field
- **THEN** the resolved result SHALL select one preferred candidate and retain enough alternative candidate or warning information to explain the conflict during review or testing

#### Scenario: Normalized values are separated from raw text
- **WHEN** a field requires normalization before saving, such as sun requirement or numeric year
- **THEN** the result SHALL preserve the raw extracted text separately from the normalized value used by the form or saved seed payload

### Requirement: Manual form entry fallback
The add/import flow SHALL remain usable as a manual seed-entry form when the user chooses not to use AI, when AI tokens are unavailable, or when extraction fails.

#### Scenario: User skips scanning
- **WHEN** a user opens the add-seed flow and enters seed metadata manually without invoking AI
- **THEN** the user SHALL be able to save the seed record using the same required fields and validation as a scanned packet

#### Scenario: Token limit or extraction failure
- **WHEN** AI extraction cannot run because of token limits, network errors, or unreadable images
- **THEN** the flow SHALL keep any captured images available for review and SHALL allow the user to enter or edit metadata manually instead of losing the seed entry

#### Scenario: Extraction does not overwrite manual edits
- **WHEN** a user edits a form field before or during an extraction request
- **THEN** the extraction response SHALL NOT overwrite that user-entered value without an explicit user action

### Requirement: Seed persistence boundary
The system SHALL persist accepted seed metadata into the existing canonical seed fields while keeping extraction diagnostics and evidence separate from the saved seed field values.

#### Scenario: Saved seed remains compatible
- **WHEN** a user saves a seed after manual entry or extraction-assisted entry
- **THEN** the saved seed SHALL remain readable through the existing seed storage mapping and SHALL NOT require front/back field-source labels to reconstruct the seed metadata

#### Scenario: Extraction diagnostics are optional for product data
- **WHEN** extraction evidence, warnings, raw OCR text, prompt output, or technique metadata are retained
- **THEN** those diagnostics SHALL be stored or reported separately from the canonical seed field values and SHALL NOT be required to display the user's seed list

### Requirement: Known-good accuracy testing
The system SHALL include repeatable accuracy tests for seed packet metadata extraction using known-good packet fixtures.

#### Scenario: Fixture defines expected metadata
- **WHEN** a known-good packet fixture is added
- **THEN** it SHALL include expected canonical metadata fields that can be used to score extractor output without manual interpretation

#### Scenario: Deterministic tests run without live AI
- **WHEN** the default automated test suite runs
- **THEN** seed packet extraction accuracy tests SHALL be able to run deterministically without requiring live OpenAI calls or token usage

#### Scenario: Live technique evaluation is opt-in
- **WHEN** a maintainer explicitly enables live OCR or AI evaluation
- **THEN** the test harness SHALL report field-level accuracy by fixture and technique, including enough detail to identify regressions

#### Scenario: Accuracy failure is actionable
- **WHEN** a technique fails to meet expected output for a known-good fixture
- **THEN** the test output SHALL identify the field, expected value, actual value, technique, and fixture name
