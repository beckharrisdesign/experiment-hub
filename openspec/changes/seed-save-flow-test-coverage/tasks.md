## 1. User outcomes (from spec scenarios)

- [x] 1.1 CI fails when insert returns a Supabase error (Scenario: Insert fails when Supabase returns an error)
- [x] 1.2 CI fails when update returns a Supabase error (Scenario: Update fails when Supabase returns an error)
- [x] 1.3 CI proves insert and update succeed when Supabase returns a row (Scenario: Insert and update succeed when Supabase returns a row)
- [x] 1.4 CI cannot hang indefinitely on persistence async tests (Scenario: Persistence async tests are time-bounded)
- [x] 1.5 Empty list partial updates emit JSON arrays not SQL null (Scenario: Partial update clears annotations to empty list)
- [x] 1.6 Minimal insert seeds get empty JSON arrays for required JSONB columns (Scenario: Insert supplies empty JSON arrays for required JSONB columns)
- [x] 1.7 Invalid year never becomes NaN in the DB payload (Scenario: Non-numeric year input yields no invalid DB value)
- [x] 1.8 Unchanged HTTPS packet previews do not trigger upload or fetch (Scenario: Existing HTTPS preview with path skips upload helpers)
- [x] 1.9 New blob or data packet images still trigger upload path (Scenario: New local blob image triggers upload)
- [x] 1.10 Tests that hit fetch for upload cannot hang (Scenario: Upload path tests do not hang on `fetch`)
- [x] 1.11 Documented command runs persistence tests in a clean install (Scenario: Documented test command runs in prototype app)

## 2. Prototype shell

- [x] 2.1 No new prototype directory: work stays under `experiments/simple-seed-organizer/prototype/app/` (existing Next app).
- [x] 2.2 Do **not** add or change `data/prototypes.json` or `docs/PROTOTYPE_PORTS.md` unless this change introduces a new server entry (it does not).

## 3. Implementation

- [x] 3.1 Add `lib/storage.save.test.ts` (or extend `lib/storage.test.ts`) with hoisted `vi.mock` for `./supabase` matching the pattern in `storage.test.ts`; implement tests for `saveSeed` and `updateSeed` error and success paths per §1.1–1.3.
- [x] 3.2 At top of the persistence-focused `describe` (or file), set `vi.setConfig({ testTimeout: 10000 })` **or** equivalent per-test `timeout` to satisfy §1.4; document the value in a one-line comment.
- [x] 3.3 Extend `lib/seedConverters.test.ts` if any JSONB insert/update edge from §1.5–1.6 is not already covered; add year contract test for §1.7 (pure parse helper or form payload — align with where `year` is set today).
- [x] 3.4 Extract or test **pure** “photo upload decision” logic from `AddSeedForm` (recommended: small `buildSeedPhotoPathsForSave(...)` in `lib/` with unit tests) so §1.8–1.9 hold without a full RSC mount; mock `uploadSeedPhoto` and `global.fetch`.
- [x] 3.5 For §1.10, ensure `fetch` in upload-path tests is mocked to resolve immediately or wrapped with `AbortSignal.timeout` / `Promise.race` under the same file `testTimeout`.
- [x] 3.6 Update `experiments/simple-seed-organizer/prototype/app/README.md` (or add a short “Testing” section): copy-paste command to run **only** persistence tests (e.g. `npm run test -- lib/storage.save.test.ts` once that file exists), note **time-bounded** behavior and pointer to `testTimeout` per §1.11.

## 4. QA

- [x] 4.1 **Manual:** Run the documented npm command from `prototype/app/`; confirm suite completes &lt; 1 minute locally and no test exceeds the configured timeout in normal conditions.
- [x] 4.2 **CI:** Open a draft PR and confirm hub / prototype CI runs the same Vitest scope (or document if only local until wired).

---

**After tasks:** Approve this file (or edit), then run **`/opsx:apply`** to implement. Per `experiment-hub-lite` apply instruction, follow [`skills/openspec-apply-change.md`](../../../skills/openspec-apply-change.md) when coding finishes (branch `cursor/seed-save-flow-test-coverage` or similar, conventional commit, draft PR via `gh`).
