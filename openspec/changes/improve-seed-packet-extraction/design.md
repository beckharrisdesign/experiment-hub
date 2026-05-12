## Context

The Simple Seed Organizer prototype currently has multiple packet-reading paths:

- `lib/packetReader.ts` runs Tesseract OCR and parses combined packet text with regexes.
- `lib/packetReaderAI.ts` calls OpenAI Vision for two-image, single-image, and pile-photo flows, then normalizes loose JSON.
- `lib/autoEntry.ts`, `components/AddSeedForm.tsx`, and `hooks/useImportQueue.ts` merge AI results into form state and saved seed payloads.
- `lib/storage.ts` persists the canonical `Seed` fields and packet photo paths.

This works for prototyping but makes extraction hard to improve safely. The side labels `front` and `back` are currently used both as photo provenance and as field ownership (`fieldSources`, `rawKeyValuePairs.source`). That creates misleading behavior when the model knows a type of data usually appears on the back even though the scanned image is currently labeled front, and it makes the UI reason about the packet side instead of the actual field quality.

The improved approach keeps front/back only as image capture metadata. The user-facing seed record should receive one canonical candidate per field, plus optional evidence and diagnostics that explain how the value was produced.

UI impact is limited to the add/import flow: the form should stay editable, continue using the existing dark prototype patterns, and present scanning as an optional accelerator rather than a required step. No Figma canvas change is required for the first implementation unless the review UI materially changes layout.

## Goals / Non-Goals

**Goals:**

- Make packet metadata independent of front/back field ownership while still preserving photo provenance and evidence.
- Allow OCR, AI vision, OCR-plus-parser, and future techniques to be iterated independently behind a shared contract.
- Keep manual form entry first-class for users who skip AI, hit token limits, or distrust an extraction.
- Preserve existing saved seed compatibility while improving extraction diagnostics for development and review.
- Add known-good fixture tests that report extraction accuracy by field and by technique.
- Make failures understandable: users can retry, inspect/edit candidates, or save manually without losing captured images.

**Non-Goals:**

- Replacing the current seed database schema wholesale.
- Guaranteeing perfect OCR or AI accuracy.
- Building a full annotation tool for packet images in this change.
- Requiring live OpenAI calls in the default test suite.
- Removing separate front/back photo storage; photos may still be captured and saved as separate images.

## Decisions

### Canonical extraction result, not side-specific extracted fields

Introduce a canonical extraction result shape for packet metadata. The result contains flat seed fields such as `name`, `variety`, `brand`, `year`, `quantity`, `daysToGermination`, `daysToMaturity`, `plantingDepth`, `spacing`, `sunRequirement`, `description`, and `plantingInstructions`. Each field can include value, confidence, normalized value where relevant, warnings, and evidence references.

Evidence references may point to an image id, capture label (`front`, `back`, `unknown`, or future labels), text snippet, region, page/side, and technique. This keeps provenance available for debugging without making `front` or `back` part of the saved seed metadata model.

Alternative considered: keep `fieldSources` as the primary merge mechanism. This is cheaper but preserves the current error mode where side labels become business logic and make it harder to compare different extraction techniques.

### Pipeline stages are swappable

Create an internal pipeline boundary with explicit stages:

1. image preparation
2. transcription/OCR
3. structured field extraction
4. candidate merge/resolution
5. normalization for the form and `Seed` payload
6. accuracy scoring in tests

Each scanning technique should expose a stable interface such as `run(input): Promise<ExtractionAttempt>`, including a technique id/version and diagnostics. Initial adapters can wrap the current Tesseract parser and OpenAI Vision prompts; later adapters can try different image preprocessing, OCR engines, prompt variants, or model choices without changing the form.

Alternative considered: add more branches to the existing `packetReaderAI.ts` functions. That would be faster short term but keeps prompt experimentation coupled to UI merge behavior and persistence.

### Saved seed fields remain canonical and compact

The `Seed` record remains the product-facing storage model. It should receive only accepted/canonical values, normalized as needed for existing fields such as `sunRequirement`. Rich extraction information belongs in an extraction attempt model, local debug artifact, or a future companion table if durable diagnostics are needed.

The first implementation can keep persistence compatible by mapping the canonical extraction result into the existing `Seed` payload and by retaining photo path storage. If durable extraction attempts are added, they should be append-only and linked to the seed or queued item rather than replacing seed columns.

Alternative considered: add columns for every AI-only field and raw pair now. That would store more information but risks schema churn before the extraction contract is stable.

Implementation decision for this slice: do not add Supabase persistence for extraction attempts yet. Return diagnostics in API responses and keep them in form/import state so the extraction contract can stabilize before schema changes.

### Manual entry and review use the same canonical fields

Manual form entry should be the baseline path. Scanning fills candidates into the same fields the user can type, and auto-entry must not overwrite user-entered values. Token-limit and extraction errors should leave the item in a reviewable/manual state with any captured images still available.

The UI can show confidence/warnings and allow an accept/edit/save flow, but the core requirement is that a user can complete the seed record without AI.

Alternative considered: keep scan-first flows separate from manual forms. That would make AI behavior easier to isolate but would duplicate validation and create a weaker fallback story.

### Accuracy testing uses golden packet fixtures

Add a repeatable accuracy harness with fixture directories containing:

- known-good expected metadata JSON
- packet images when available
- optional precomputed transcripts or mocked model outputs for deterministic tests
- technique-specific expected tolerances when exact matching is not realistic

Default CI tests should run deterministic fixtures without network calls. Live OCR/AI evaluation should be opt-in behind environment flags and should write a field-level report with pass/fail counts, normalized comparisons, and regressions from a baseline.

Alternative considered: rely on unit tests around parser helpers. Those tests are still useful but do not answer whether real packet scanning works end-to-end.

## Risks / Trade-offs

- [Risk] Additional extraction models may feel heavier than the prototype needs. -> Mitigation: start with small TypeScript types and adapters around existing code; avoid database migrations until persistence needs are proven.
- [Risk] Golden fixtures require known-good packet data that may not exist yet. -> Mitigation: define the fixture schema now and allow a small starter set with text/transcript fixtures while the user supplies real packet photos.
- [Risk] AI output can vary across model versions. -> Mitigation: keep deterministic normalization tests in CI, pin technique ids/model names in reports, and make live AI accuracy tests opt-in.
- [Risk] Removing side-based field ownership could hide useful provenance. -> Mitigation: preserve side/image labels as evidence metadata, just not as canonical stored field identity.
- [Risk] Manual fallback could become buried if scan-first UI grows. -> Mitigation: require the form to remain usable before, during, and after extraction, with clear retry/manual copy on errors.

## Migration Plan

1. Add the new extraction result and technique interfaces beside existing packet reader code.
2. Wrap the current Tesseract and OpenAI flows as adapters that return the new canonical result.
3. Update merge/form prefill logic to consume canonical fields and evidence instead of side-owned fields.
4. Keep existing `Seed` storage mapping, photo paths, and manual fields working.
5. Add fixture schema and deterministic tests with starter known-good packet data or transcript fixtures.
6. Optionally add durable extraction-attempt persistence after the interface stabilizes.

Rollback is straightforward while saved seed schema remains compatible: route the add/import flow back to the current `read-ai-single`, `read-ai`, and `PacketReader` paths and ignore extraction-attempt diagnostics.

## Open Questions

- Which known-good seed packets and expected fields should be the starter fixture set?
- What field-level accuracy threshold should block a technique from becoming the default?
- Should AI usage reports distinguish extraction, retranscription, pile identification, and future prompt variants as separate techniques?
