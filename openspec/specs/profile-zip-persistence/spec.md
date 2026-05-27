# profile-zip-persistence Specification

## Purpose
TBD - created by archiving change sso-zip-code-persistence. Update Purpose after archive.
## Requirements
### Requirement: Zip code persists across reload

A zip code entered into the Profile editor and saved MUST survive a page reload, a navigation away-and-back, and a sign-out/sign-in cycle — the same value reappears in the Profile editor every time.

**Fails until:** Entering a zip, saving, and reloading Profile returns the same zip in the editor field. Currently the field reverts to empty.

SHALL: `UserProfile.zipCode` written from the Profile editor MUST be retrievable on subsequent Profile loads for the same user.

#### Scenario: Save zip, reload, see same zip

- **WHEN** I enter a 5-digit zip in Profile and save, then reload the page or navigate away and back to Profile
- **THEN** the zip field shows the value I entered, not blank

#### Scenario: Save zip, sign out and back in, see same zip

- **WHEN** I save a zip in Profile, sign out, sign back in, and open Profile
- **THEN** the zip field still shows my saved value

### Requirement: Save action gives unambiguous success or error feedback

Saving in the Profile editor MUST surface an immediate, unambiguous result — either a success confirmation (toast, inline message, or button-state change) when the write succeeds, or a visible error with cause when it fails. The user never has to guess whether their save took.

**Fails until:** Clicking Save in Profile produces no visible feedback (or feedback that disappears so quickly the user misses it), so the only way to verify is to reload and check whether the value stuck.

SHALL: After a Profile save attempt, the editor MUST display either a success indicator or an error message that is visible until acknowledged or until another save attempt.

#### Scenario: Successful save shows confirmation

- **WHEN** I click Save in Profile with valid data and the save succeeds
- **THEN** I see a clear success indicator (e.g. "Profile saved" toast or inline checkmark) without having to reload

#### Scenario: Failed save shows actionable error

- **WHEN** I click Save in Profile and the underlying write fails (network down, auth expired, validation error)
- **THEN** I see an error message that names the failure type and remains visible until I act on it

### Requirement: Planting widget reads persisted zip

The "Planting in your region" widget on `/seeds/<id>` MUST read `UserProfile.zipCode` and, when a value is present, show zone-aware planting dates instead of the "Add your zip code in Profile" prompt.

**Fails until:** With a saved zip in Profile, opening any seed detail page still shows the "Add your zip code in Profile" callout instead of planting dates.

SHALL: The seed-view planting widget MUST hide its zip-prompt callout when `UserProfile.zipCode` for the current user is a non-empty string.

#### Scenario: Saved zip drives the planting widget

- **WHEN** I have a persisted zip in Profile and open any seed detail page
- **THEN** the "Planting in your region" widget shows zone-aware content (not the "Add your zip code in Profile" prompt)

### Requirement: Automated test covers the persistence round-trip

A vitest test MUST exercise the write → subsequent-read round-trip for `UserProfile.zipCode` at the shipped persistence layer closest to the bug's root cause (for this change, the Supabase-backed admin/data-access layer rather than the Profile editor save flow) so a future regression of the same shape gets caught in CI rather than re-reported by a user.

**Fails until:** No test under `experiments/simple-seed-organizer/prototype/app/` asserts that a saved zip code is retrievable on subsequent reads at the persistence layer used by production.

SHALL: At least one vitest test asserts that `UserProfile.zipCode` written through the shipped persistence/data layer is returned on a subsequent read.

#### Scenario: Round-trip test fails before fix, passes after

- **WHEN** the new vitest test is run against the unfixed code
- **THEN** it fails because the saved zip is not returned on a subsequent read at that layer, proving it catches the persistence regression; after the fix it passes

### Requirement: End-to-end verification on a real account

The fix MUST be validated against the same storage layer the production app uses (Supabase), not only unit tests or local mocks — because the bug class (silent persistence failure) hides easily behind mocks.

**Fails until:** A manual verification on a real signed-in account — entering, saving, reloading, and checking the seed view — has been performed and noted in the change folder.

SHALL: A manual verification walk-through against a real Supabase-backed account is performed and recorded in `tasks.md` before archive.

#### Scenario: Manual round-trip verification on a real account

- **WHEN** I sign in to an account on a Supabase-backed environment, save a zip, reload Profile, then open a seed detail page
- **THEN** the zip persists in Profile and the planting widget reflects it; the verification is logged in the change folder

