## Outcomes

(See [proposal.md](../../proposal.md) — Who / Job / Done when / Not doing.)

## ADDED Requirements

### Requirement: `saveSeed` and `updateSeed` are covered by automated tests with a mocked Supabase client

The Simple Seed Organizer prototype SHALL include Vitest coverage that invokes `saveSeed` and `updateSeed` against a hoisted or injected mock of `supabase.from('seeds')` so CI fails when persistence wiring regresses.

**Fails until:** At least one test run demonstrates a rejected insert, a rejected update, and a successful round-trip per function (mock returns `{ data, error }` shapes consistent with PostgREST). **No async test in this suite may run without an explicit time bound:** the persistence test file SHALL set a file-level Vitest `testTimeout` (recommended ceiling **10 seconds** or less) or each `it`/`test` that awaits promises SHALL pass a per-test `timeout`, so a stuck mock or forgotten `resolve` fails fast instead of hanging CI.

#### Scenario: Insert fails when Supabase returns an error

- **WHEN** the mocked `.insert().select().single()` chain resolves with a non-null `error` (for example constraint or RLS message)
- **THEN** `saveSeed` SHALL reject with an `Error` whose message surfaces the failure (or the project’s established error type), and the test SHALL assert that rejection

#### Scenario: Update fails when Supabase returns an error

- **WHEN** the mocked `.update().eq().select().single()` chain resolves with a non-null `error`
- **THEN** `updateSeed` SHALL reject with an `Error` (or established type), and the test SHALL assert that rejection

#### Scenario: Insert and update succeed when Supabase returns a row

- **WHEN** the mock returns a valid `data` row and null `error` for insert and again for update
- **THEN** each test SHALL assert the returned `Seed` matches expected identifiers and required fields after conversion (name, variety, type, ids, timestamps as applicable)

#### Scenario: Persistence async tests are time-bounded

- **WHEN** the persistence-focused test file runs under Vitest in CI or locally
- **THEN** the file or each async `it` SHALL enforce a maximum wall time (via `testTimeout` / per-test `timeout` / `describe` timeout) so a non-resolving mock or accidental real network wait **cannot block the runner indefinitely** (recommended default for this file: ≤10s per test)

### Requirement: JSONB array columns never receive SQL null from `convertSeedToDbSeed`

For `custom_fields`, `instruction_annotations`, and `raw_packet_text`, the converter SHALL emit JSON-serializable empty arrays where the database columns are `NOT NULL DEFAULT '[]'`, including on partial updates that clear lists.

**Fails until:** A dedicated test fails if any of these columns would be set to `null` when the intent is “no items.”

#### Scenario: Partial update clears annotations to empty list

- **WHEN** `convertSeedToDbSeed` is called in `update` mode with `instructionAnnotations: []` (and similarly for `customFields` / `rawPacketText`)
- **THEN** the resulting payload SHALL contain `[]` for the matching snake_case keys, not `null` or omitted keys that would coerce to null in the client

#### Scenario: Insert supplies empty JSON arrays for required JSONB columns

- **WHEN** `convertSeedToDbSeed` runs in `insert` mode for a minimal manual seed without `customFields`, `instructionAnnotations`, or `rawPacketText` on the input object
- **THEN** the payload SHALL include `[]` for `custom_fields`, `instruction_annotations`, and `raw_packet_text` so NOT NULL columns are satisfied

### Requirement: Year written to the database is never `NaN`

Any code path that builds a seed row for insert or update SHALL omit `year` or set it to a finite integer; tests SHALL lock this contract.

**Fails until:** A test fails if `year` would be `NaN` after parsing user or form input.

#### Scenario: Non-numeric year input yields no invalid DB value

- **WHEN** the user-facing year string is non-numeric or whitespace-only before save
- **THEN** the persisted payload SHALL not include `NaN` as `year` (omit the field or set a valid integer only when parse succeeds)

### Requirement: Remote `https` packet images are not re-fetched for upload when storage paths already exist

The save path SHALL treat `blob:` and `data:` sources as requiring upload, and SHALL not call `fetch` on stable `https` display URLs solely to re-upload unchanged photos when `photoFrontPath` / `photoBackPath` are already known.

**Fails until:** A unit test fails if `uploadSeedPhoto` or `fetch` is invoked for unchanged `https` images with existing paths.

#### Scenario: Existing HTTPS preview with path skips upload helpers

- **WHEN** the submit builder runs with `frontImage` and `backImage` pointing at `https` URLs, `initialData` carries `photoFrontPath` / `photoBackPath`, and the user did not replace images with a new file
- **THEN** `uploadSeedPhoto` SHALL not be called for those sides, and `fetch` SHALL not be invoked for those URLs

#### Scenario: New local blob image triggers upload

- **WHEN** the user replaces a photo so the source is a `blob:` URL (or legacy `data:`)
- **THEN** the save path SHALL call `fetch` on that URL and SHALL call `uploadSeedPhoto` for the corresponding side

#### Scenario: Upload path tests do not hang on `fetch`

- **WHEN** a test exercises the `fetch` + `uploadSeedPhoto` path (blob or data URL)
- **THEN** `fetch` SHALL be mocked or stubbed to resolve synchronously or within the same Vitest timeout window, **or** the test SHALL use `AbortSignal.timeout` / `Promise.race` against a short timer so a hung network adapter cannot stall the suite past the file’s `testTimeout`

### Requirement: Developers can run seed persistence tests from documented commands

The prototype (or experiment README) SHALL document the exact `pnpm`/`npm`/`vitest` command to run persistence-related tests so integration previews are not the first line of defense.

**Fails until:** A contributor can copy-paste one command from the doc and run only the new persistence tests without hunting the repo, **and** the doc SHALL mention that these tests are time-bounded (point to the file’s `testTimeout` or Vitest flag) so CI operators know a failure mode is “slow hang,” not “silent pass.”

#### Scenario: Documented test command runs in prototype app

- **WHEN** a contributor follows the README (or `prototype/app/README`) instructions for seed persistence tests
- **THEN** Vitest SHALL execute the new/updated test file(s) successfully in a clean install
