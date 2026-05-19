## Human anchor

> review my test coverage of these seed flows. An inability to hit save should not be left untested.

## Outcomes

- **Who:** You (solo builder) shipping Simple Seed Organizer and relying on CI before integration previews.
- **Job:** Know that create/update seed saves fail loudly in tests when persistence breaks—not only when happy paths pass.
- **Done when:** Automated tests cover at least one failing save path for **insert** and **update** (Supabase error or validation guard), plus the converter rules that previously broke edit/save (NOT NULL JSONB, photo upload policy, year parsing).
- **Not doing:** Full Playwright production E2E in this spike; no load or security fuzzing beyond save failure visibility.

## Why

Recent production issues showed **save could fail** while the suite stayed green: expiring header assets, `fetch(https)` on packet photos, JSONB `null` vs `[]`, and `NaN` year were all fixable in code but **were not asserted by tests** that simulate “user hit save and the app told them the truth.” `storage.test.ts` only exercises **read** paths (`getSeedsWithoutPhotos` retries and column fallbacks). `seedConverters.test.ts` covers round-trips and one partial update, plus empty JSON arrays after the fix—still **no `saveSeed` / `updateSeed`**, and **no `AddSeedForm` submit** wiring.

## Current coverage (seed-related)

| Area                      | File(s)                                             | What is tested                                                               | Save / update gap                     |
| ------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------- |
| DB read fallbacks         | `lib/storage.test.ts`                               | `getSeedsWithoutPhotos` retries, legacy columns, planting month parsing      | No insert/update                      |
| Converters                | `lib/seedConverters.test.ts`                        | Insert round-trip, partial update, manual seed, empty JSONB arrays on update | Does not call Supabase or form submit |
| Import queue              | `hooks/useImportQueue.test.ts`                      | `buildQueueExtractionFailurePatch` only                                      | No `saveSeed` failure                 |
| Import payload merge      | `lib/import/seedPayload.test.ts`                    | Payload merge                                                                | Not save pipeline                     |
| Auto-entry / retranscribe | `lib/autoEntry.test.ts`, `lib/retranscribe.test.ts` | Field merge / AI refresh                                                     | Not persistence                       |

**Untested today:** `saveSeed`, `updateSeed`, and `AddSeedForm` `handleSubmit` behavior when `supabase.from().insert/update` returns an error, when photo upload throws, or when the payload would violate DB constraints before the fixes.

## What should be tested next (concrete)

1. **`saveSeed` / `updateSeed` (Vitest + mocked `supabase.from`)**
   - Assert thrown error message (or returned shape) when `.insert` / `.update` returns `error` with a realistic Postgres/PostgREST payload.
   - Assert **success** still returns `convertDbRowToSeedWithUrls`-compatible seed when mock returns a row.
   - **Guardrail:** persistence test file uses an explicit Vitest `testTimeout` (e.g. ≤10s per test) or per-`it` timeout so a stuck promise cannot hang CI; any test that touches `fetch` mocks it or races with `AbortSignal.timeout` / short timer.

2. **`convertSeedToDbSeed` regression guards** (extend `seedConverters.test.ts`)
   - Empty `customFields` / `instructionAnnotations` / `rawPacketText` on **update** → `[]` not `null` (already added—keep as contract test).
   - Invalid `year` never serializes as `NaN` (prefer a tiny pure helper tested next to form, or assert omitted/null-safe in converter if year moves there).

3. **`AddSeedForm` submit policy** (component test or extracted pure function)
   - **Only** `blob:` / `data:` triggers `fetch` + `uploadSeedPhoto`; `https:` display URLs with existing `photoFrontPath` do not call `fetch` (mock `uploadSeedPhoto` and assert not called when images unchanged).
   - Optional: `vi.mocked(fetch)` rejects → user-visible error path / `setError` (if you extract submit builder to a testable module, avoid brittle full mount).

4. **Integration smoke (optional §4 later)**
   - README or one `vitest` file that documents manual “edit seed → save” on preview—does not replace (1).

## Capabilities

### New capabilities

- `seed-persistence-test-harness`: Mocked Supabase client tests for `saveSeed` and `updateSeed` failure and success; documented as the minimum bar before merging seed storage changes.

### Modified capabilities

- (none at hub platform level — scoped to `experiments/simple-seed-organizer/prototype/app`.)

## Impact

| Location                                                                                            | Action                                                                                 |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `experiments/simple-seed-organizer/prototype/app/lib/storage.test.ts` or new `storage.save.test.ts` | Add save/update tests with hoisted supabase mock                                       |
| `experiments/simple-seed-organizer/prototype/app/lib/seedConverters.test.ts`                        | Keep/extend JSONB + year contracts                                                     |
| `experiments/simple-seed-organizer/prototype/app/components/AddSeedForm.tsx`                        | Optional extract of “build save payload / photo policy” for unit test without full DOM |

## Stop / next step (lite)

**Artifacts:** `proposal.md` ✓ · `specs/seed-persistence-test-harness/spec.md` ✓ · `design.md` ✓ · `tasks.md` ✓ — ready for **`/opsx:apply`** when you want implementation.

## Optional links

- Prior fix (implementation, not tests): PR that restored header + save behavior on `simple-seed-organizer` (`fix/simple-seed-organizer-ui-save` / merged follow-up).
- Related product intent: `openspec/changes/seed-packet-crud-and-custom-fields/proposal.md` (field model; still needs persistence tests when those land).
