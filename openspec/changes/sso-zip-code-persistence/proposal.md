## Human anchor

> "Fix the bug of the zip code not saving to an account despite adding it in."
> — Katy, [issue #175](https://github.com/beckharrisdesign/experiment-hub/issues/175), 2026-05-26

## Outcomes

- **Who:** A signed-in Simple Seed Organizer user who entered a zip code in their Profile so the app can show personalized planting guidance on seed detail views.
- **Job:** When I type a zip code into Profile and save, I expect the value to persist — so the next time I open Profile it's still there, and the "Planting in your region" callout on a seed view stops asking me to add a zip code in Profile because it already has one.
- **Done when:**
  1. Entering a zip in Profile and clicking save returns the same zip on a Profile reload (refresh, navigate away and back, or new session).
  2. With a persisted zip, the "Planting in your region" widget on `/seeds/<id>` no longer shows the "Add your zip code in Profile" prompt; it shows zone-aware planting dates instead.
  3. Tested manually on a real account against production data (Supabase), not just unit-test happy path.
- **Not doing:** Refactoring the planting-guidance widget itself; adding zip validation (5-digit pattern, US-only check, etc.); supporting international postal codes; redesigning the Profile editor layout; touching `growingZone` derivation logic except where it's affected by zip not loading.

## Why

The user added their zip code, hit save, and the callout on the seed view still asks them to add a zip code. That's a trust-breaking failure on two fronts:

1. **Silent data loss feel** — the user's action appears to do nothing. They can't tell whether they did it wrong, the form is broken, or the save succeeded but the read is broken. All three feel the same.
2. **Personalized planting dates is the feature blocked by this** — the entire "Planting in your region" widget falls back to a generic prompt instead of giving the user the local zone-aware guidance the feature was built to deliver. The zip code is the single input the feature needs.

This is a P1 because it's a data-persistence bug on a core profile field that gates a primary user-facing feature. Cheap to fix once root-caused; expensive to leave because every Profile interaction looks broken.

## What changes

Find the gap in the Profile zip-code save path and close it. The investigation belongs in `design.md` — possible causes span the form (value not in submit), the API/save handler (field not written), the data layer (Supabase column mismatch or RLS rule), and the read path (field not loaded back into state). Surface area is small enough that one careful trace through the code identifies the failure point.

After the fix lands, the "Planting in your region" widget on seed detail should automatically work for users with a persisted zip, because the widget already reads `UserProfile.zipCode` — the read side has been correct, the write side hasn't.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `profile-zip-persistence`: Restore round-trip persistence on `UserProfile.zipCode` from the Profile editor through whichever storage layer the prototype uses, so the value survives reload and is available to downstream features (planting guidance widget).

## Impact

- **Net-new dependency:** none.
- **Edits:** likely 1–3 files in `experiments/simple-seed-organizer/prototype/app/` — most likely candidates are `components/Profile.tsx` (the editor) plus whatever lib module handles profile save/load. Possibly a Supabase migration if a column mismatch is the root cause; treat that as a stretch outcome documented in design.
- **Real cost:** the debug is the work. The fix itself will be small. Estimate: 30–60 min including manual verification on a real account.
- **Risk:** if the cause turns out to be a Supabase schema or RLS issue, the fix may require a migration (low risk, but more steps). Mitigation: design.md surfaces possible causes before implementation; user signs off on scope if a migration is needed.

## Optional links

- PRD (if separate): _none — this is a bug fix, not a new feature_
- Experiment directory: [`experiments/simple-seed-organizer/`](../../../experiments/simple-seed-organizer/)
- Source issue: [#175](https://github.com/beckharrisdesign/experiment-hub/issues/175)
- Profile type definition: [`experiments/simple-seed-organizer/prototype/app/types/profile.ts`](../../../experiments/simple-seed-organizer/prototype/app/types/profile.ts) (`UserProfile.zipCode: string?`)
