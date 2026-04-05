# Bulk Camera Mode Build Spec (Simplified)

Status: Draft (awaiting implementation approval)
Owner: Product + Engineering
Area: `experiments/simple-seed-organizer/prototype/app`

## 1) Goal

Add a mobile-first "bulk photographing" flow between single packet entry and pile scan:

1. User taps **Start bulk photographing**
2. Camera opens in continuous capture mode
3. User captures packet photos one after another
4. Captured images are processed in the background
5. On exit, queue shows `Processing` until AI extraction finishes
6. Successful items are automatically saved to account (minimal taps)
7. Failed items are grouped into `Needs review`

Primary outcome: reduce steps and keep capture momentum high.

## 2) Product principles for this feature

- **Simplicity first**: no complex controls in v1
- **Reduced steps**: avoid per-item save taps in bulk mode
- **Fast loop**: capture next packet immediately while background work continues
- **Modular design**: keep camera concerns separate from queue concerns
- **Safe fallback**: manual shutter always available, even after auto-capture is added

## 3) Scope and non-goals

## In scope (v1)

- Continuous camera mode with manual rapid capture
- Background queue integration with existing extraction pipeline
- Auto-save behavior for successful bulk-captured items
- Import list status updates: `Queued`, `Processing`, `Saved`, `Needs review`

## Not in scope (v1)

- Required edge detection / auto-capture (planned for v2)
- Required perspective deskew/crop (planned for v3 if needed)
- New backend batch extraction endpoint

## 4) User flow (target v1)

1. Open Import page
2. Tap **Start bulk photographing**
3. Full-screen camera opens
4. Tap shutter repeatedly as packets are swapped into view
5. Each capture is immediately enqueued and shown as `Queued`
6. Background workers process extraction and save
7. Tap **Done** to leave camera
8. Import screen shows active processing and saved results
9. Only failed items require user action (`Retry` or `Edit`)

## 5) Architecture (modular)

Create/reshape into three modules:

1. `components/BulkCameraCapture.tsx`
   - Owns camera lifecycle only:
     - permission request
     - stream setup/teardown
     - preview UI
     - capture button + capture events
   - Emits `File` objects via callback

2. `hooks/useImportQueue.ts` (new)
   - Owns queue state machine + transitions
   - Owns background concurrency
   - Owns extraction + save orchestration
   - Exposes queue actions (`enqueue`, `retry`, `skip`, etc.)
   - Supports bulk mode policy: `autoSaveOnReady = true`

3. `lib/import/capturePipeline.ts` (new)
   - Normalizes captured files before enqueue (`processImageFile`)
   - Adds metadata for source (`bulk-camera`, `manual-upload`, `pile-scan`)
   - Keeps capture-specific logic out of queue UI

`BatchImport.tsx` becomes orchestration UI (not core processing logic).

## 6) State model

Queue statuses:
- `queued`
- `processing` (AI extraction in flight)
- `saving`
- `saved`
- `needs_review`

Notes:
- Keep internal error details but map user-facing failures to `needs_review`
- In bulk mode, items auto-transition from `processing -> saving -> saved` when valid

## 7) API/backend approach

Use existing endpoints and services:
- `/api/packet/read-ai-single`
- existing usage limit checks
- `uploadSeedPhoto(...)`
- `saveSeed(...)`

No backend API changes required for v1.

## 8) Phased delivery

## Phase 1 — MVP (ship first)

- Add full-screen `BulkCameraCapture` with manual rapid shutter
- Integrate with queue through `useImportQueue`
- Enable auto-save for successful bulk items
- Add import page CTA and exit path back to queue
- Show processing summary + needs-review section

Exit criteria:
- User captures 15+ packets in one session without leaving camera mode
- Most successful captures save without extra taps

## Phase 2 — Auto-capture (flagged)

- Add packet edge detection overlay
- Add stability threshold + auto-shutter
- Keep manual shutter fallback always visible
- Gate behind feature flag

Exit criteria:
- Auto-capture increases capture speed without raising failure rate

## Phase 3 — Image polish (optional)

- Add perspective correction/deskew
- Add quality heuristics tuning from real-device testing

Exit criteria:
- Clear measurable improvement in extraction quality

## 9) UX details (v1)

Camera mode UI:
- Full-screen preview
- Top bar: `Done`
- Primary action: large shutter button
- Secondary feedback: brief "Captured" toast/haptic
- Counter: `X captured this session`

Import screen after exit:
- Sticky progress summary (`Processing N`, `Saved M`, `Needs review K`)
- Queue items update live as processing completes

## 10) Performance and reliability constraints

- Stop camera stream on unmount/exit
- Prevent duplicate capture events from rapid taps
- Keep background extraction concurrency bounded
- Ensure queue state survives camera mode transitions

## 11) Test plan

Automated:
- Queue transition unit tests for bulk auto-save path
- Retry/error transition tests into `needs_review`
- Component tests for camera mode open/close and enqueue callbacks

Manual (mobile required):
- iOS Safari and Android Chrome permission flow
- 20-packet continuous session
- low light / glare / shaky hand scenarios
- verify failures are isolated to `needs_review` and not blocking success items

## 12) Rollout

- Ship Phase 1 behind `bulkCameraMode` feature flag
- Enable for internal testing first
- Collect qualitative feedback before enabling Phase 2

## 13) Acceptance criteria (ship gate)

- Bulk camera mode is discoverable from Import
- User can capture continuously with minimal interruption
- Exiting camera mode preserves in-flight processing
- Successful captures auto-save
- Failed captures are clearly separated and recoverable
- No regressions to existing single import or pile scan flows
