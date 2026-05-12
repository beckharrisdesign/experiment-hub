## 1. Characterization and Test Harness

- [x] 1.1 Add characterization tests that document current packet parser, AI normalization, merge, and manual-form no-overwrite behavior before refactoring.
- [x] 1.2 Define a known-good seed packet fixture schema with expected canonical metadata, optional images, optional transcripts, and technique-specific tolerances.
- [x] 1.3 Add a deterministic starter fixture using local expected data or transcript output so default tests can run without live AI calls.
- [x] 1.4 Implement field-level comparison utilities that report fixture name, technique, field, expected value, actual value, and match type.

## 2. Canonical Extraction Contract

- [x] 2.1 Add TypeScript types for packet image inputs, extraction techniques, extraction attempts, canonical field candidates, evidence references, diagnostics, and resolved seed metadata.
- [x] 2.2 Replace side-owned extracted fields with canonical field candidates while retaining image labels only as evidence provenance.
- [x] 2.3 Add normalization helpers that keep raw extracted text separate from normalized form/storage values.
- [x] 2.4 Add candidate resolution rules for preferred values, alternatives, confidence, and warnings when techniques disagree.

## 3. Technique Adapters

- [x] 3.1 Wrap the existing Tesseract OCR plus `parsePacketText` flow as a technique adapter returning the canonical extraction result.
- [x] 3.2 Wrap the existing OpenAI Vision single-image flow as a technique adapter returning the canonical extraction result.
- [x] 3.3 Wrap the existing OpenAI Vision two-image flow as a technique adapter that treats front/back as image evidence labels only.
- [x] 3.4 Preserve pile-photo identification as a separate lightweight technique or explicitly document its reduced field coverage.

## 4. Form, Queue, and API Integration

- [x] 4.1 Update packet read API routes to return canonical extraction results, with compatibility mapping only where needed during transition.
- [x] 4.2 Update `AddSeedForm` to prefill from canonical fields, show reviewable warnings/confidence where available, and never overwrite user-entered values.
- [x] 4.3 Update `useImportQueue` so token-limit and extraction failures keep captured images available for manual review and save.
- [x] 4.4 Ensure users can complete and save a seed entirely manually without invoking OCR or AI.

## 5. Persistence Boundary

- [x] 5.1 Map accepted canonical extraction values into the existing `Seed` fields and storage conversion helpers.
- [x] 5.2 Keep extraction diagnostics, raw text, evidence, and technique metadata separate from canonical saved seed values.
- [x] 5.3 Decide whether extraction attempts need durable Supabase persistence in this slice; if yes, add an append-only companion table and migration.
- [x] 5.4 Verify existing saved seeds remain readable and do not depend on front/back field-source labels.

## 6. Accuracy Evaluation

- [x] 6.1 Add a deterministic test command or Vitest suite that scores known-good fixtures without network calls.
- [x] 6.2 Add an opt-in live evaluation path for OCR or AI techniques gated by environment variables and unavailable in default CI.
- [x] 6.3 Generate a field-level accuracy report by fixture and technique with actionable regression output.
- [x] 6.4 Document how to add user-provided known-good seed packet data and expected metadata fixtures.

## 7. Verification

- [x] 7.1 Run the targeted packet extraction, auto-entry, import queue, and storage tests.
- [x] 7.2 Run the deterministic fixture accuracy suite and confirm failures identify exact fields and techniques.
- [x] 7.3 Run lint/type checks for the Simple Seed Organizer prototype app.
- [ ] 7.4 Manually verify add-seed flows for scan-assisted entry, skipped-AI manual entry, token-limit fallback, and extraction failure fallback.
