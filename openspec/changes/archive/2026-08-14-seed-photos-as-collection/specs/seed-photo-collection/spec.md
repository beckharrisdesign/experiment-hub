## Outcomes

- **Who:** Solo founder + gardeners cataloging packets, saved seed, and homemade/hand-labeled packaging where "front/back" has no meaning.
- **Job:** Store a packet's photos as an ordered collection; extraction folds all photos into one common field set; every surface reads from the collection.
- **Done when:** `Seed.photos: SeedPhoto[]` is the model the app reads/writes; legacy front/back rows still display via a read-time shim with no DB backfill; extraction folds N photos into one canonical field set; all read surfaces consume `photos[]`.
- **Not doing:** Edit-view photo-rail layout (Change 2); eager backfill or dropping legacy columns; merge-conflict logic rework; reordering UX beyond storing `order`.

## ADDED Requirements

### Requirement: Photos stored as an ordered collection

A seed owns an ordered list of photos instead of a fixed front/back pair.

**Fails until:** A seed can be saved and reloaded with three photos, all three present in `order`, with no "front"/"back" identity on any of them.

The system SHALL model a seed's photos as `Seed.photos: SeedPhoto[]` where each `SeedPhoto` has `{ id, path, order, label? }` and SHALL treat this collection as the canonical photo model for reads and writes.

#### Scenario: Save a seed with three photos

- **WHEN** a user saves a seed that has three photos attached
- **THEN** all three persist as `SeedPhoto` entries with stable ids and ascending `order`, and none carries a front/back role

### Requirement: Legacy front/back rows display via lazy shim

Existing seeds saved under the old front/back model keep showing their photos with no database migration.

**Fails until:** A seed row that has only `photoFront`/`photoBack` (no `photos[]`) renders its photos on every surface exactly as before.

The system SHALL synthesize `photos[]` at read time from legacy `photoFront`/`photoBack`(`Path`) when `photos[]` is absent, SHALL leave the legacy columns intact, and SHALL run no backfill against the database.

#### Scenario: Read a legacy seed with no photos collection

- **WHEN** the app loads a seed that has `photoFront` and `photoBack` but no `photos[]`
- **THEN** the converter returns a `photos[]` of two entries (front then back) and the legacy columns are left unchanged in storage

### Requirement: First save upgrades a legacy seed in place

Touching an old seed quietly moves it onto the collection shape.

**Fails until:** After editing and saving a legacy seed once, its persisted record carries `photos[]`.

The system SHALL write the `photos[]` collection shape on the next save of any seed, so legacy rows upgrade as they are touched without a bulk migration.

#### Scenario: Edit and save a legacy seed

- **WHEN** a user opens a legacy front/back seed, makes any change, and saves
- **THEN** the saved record contains a `photos[]` collection derived from its photos, and subsequent reads use it directly without the shim

### Requirement: Extraction folds all photos into one field set

Reading a packet pulls data from every photo into a single common set of fields.

**Fails until:** Capturing two photos populates one merged field set with no per-side panels or F/B source badges.

The system SHALL fold every photo's extraction into the single canonical field set (building on `mergeExtractedData` / `canonicalExtraction`) and SHALL NOT split extracted data by photo source.

#### Scenario: Capture two photos for one packet

- **WHEN** a user adds two photos and runs extraction
- **THEN** the recognized fields merge into one common field set, with no separate "back image evidence" panel and no front/back provenance badges

### Requirement: All read surfaces consume the collection

Every place that shows a packet reads from `photos[]`.

**Fails until:** Detail, cards, list, gallery, and import all render photos sourced from `photos[]` (via the shim for legacy rows).

The system SHALL source packet imagery from `Seed.photos` in SeedDetail, SeedCard, SeedList, SeedGallery, BatchImport, and the import payload, resolving legacy rows through the read-time shim.

#### Scenario: Browse and import after the model change

- **WHEN** a user views the list, opens a packet's detail, and runs a batch import
- **THEN** each surface renders the correct photos from `photos[]`, with legacy seeds resolved through the shim and no missing or broken images

