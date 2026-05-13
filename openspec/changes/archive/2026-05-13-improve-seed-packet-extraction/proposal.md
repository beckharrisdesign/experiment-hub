## Why

The current seed organizer prototype can scan seed packets, but extraction quality is hard to reason about because OCR, AI prompting, side-specific merging, normalization, storage mapping, and form prefill are tightly coupled. This change creates a more testable seed packet metadata pipeline so scanning techniques can evolve independently, users can still enter data manually when AI is unavailable, and accuracy can be measured against known-good packet data.

## What Changes

- Introduce a canonical seed packet metadata extraction contract that is independent of whether data appeared on the packet front or back.
- Treat front/back as image capture provenance for photos and evidence, not as separate user-facing metadata sources that drive the stored seed record.
- Split the extraction flow into swappable stages: image preparation, text/OCR transcription, AI vision extraction, structured parsing, candidate merge/resolution, confidence scoring, and form prefill.
- Add an extraction result model that can preserve raw evidence, technique metadata, confidence, and warnings without forcing those details into the saved `Seed` fields.
- Preserve easy manual entry as a first-class fallback: the form remains usable without AI, failed/token-limited scans keep captured images available for review, and users can accept/edit extracted candidates before saving.
- Add an accuracy regression harness based on known-good seed packet fixtures so OCR/AI/parser changes can be evaluated without guessing whether scanning still works.
- Keep saved seed data focused on canonical fields while retaining enough extraction diagnostics for iteration and review.

## Capabilities

### New Capabilities
- `seed-packet-metadata-extraction`: Defines canonical extraction results, technique-independent scanning stages, manual fallback behavior, persistence boundaries, and golden-data accuracy testing for seed packet metadata.

### Modified Capabilities
- None.

## Impact

- Affected prototype areas:
  - `experiments/simple-seed-organizer/prototype/app/lib/packetReader.ts`
  - `experiments/simple-seed-organizer/prototype/app/lib/packetReaderAI.ts`
  - `experiments/simple-seed-organizer/prototype/app/lib/autoEntry.ts`
  - `experiments/simple-seed-organizer/prototype/app/components/AddSeedForm.tsx`
  - `experiments/simple-seed-organizer/prototype/app/hooks/useImportQueue.ts`
  - packet read API routes under `experiments/simple-seed-organizer/prototype/app/app/api/packet/`
  - seed storage mapping under `experiments/simple-seed-organizer/prototype/app/lib/storage.ts`
- Expected test impact:
  - Add fixture-driven tests for known-good packet data.
  - Keep unit tests for parsing, normalization, merging, and form prefill behavior.
  - Add repeatable scoring output for extraction accuracy by field and by technique.
- Possible data impact:
  - Existing saved seeds should remain readable.
  - New extraction diagnostics may require additional local structures and may later justify database columns or a companion extraction-attempt table, but canonical saved seed fields should not depend on front/back source labels.
