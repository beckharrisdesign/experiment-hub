## Why

The seed packet entry flow captures what's printed on a packet, but there's no way to control which canonical fields are relevant to a specific packet, and no structured place to record the user's own observations or corrections to printed instructions. Right now, personal knowledge lives in the single `notes` blob alongside AI-extracted packet content, with no distinction between "what the packet says" and "what I actually do."

## What Changes

- Add per-seed **field visibility control**: users can show or hide canonical fields for that seed, so the entry form and detail view only surface fields that matter. Stored as `hidden_fields` (text array of camelCase keys).
- Add a new **personal notes** field (`my_notes`) that is explicitly separate from the AI-extracted `notes` (packet content). The existing `notes` field retains packet-sourced text; `my_notes` is always user-authored.
- **Instruction annotations** (per-field user comments, e.g. "I use 6 inches in raised beds" on `spacing`) continue to use the existing **`instruction_annotations`** JSONB column and `Seed.instructionAnnotations` — no new `field_annotations` column.
- Surface visibility, personal notes, and instruction annotations in the detail view; surface **instruction annotations** in both **new-seed (add)** and **edit** flows on `AddSeedForm` (with clear labeling: "Packet notes" vs "My notes" where applicable).
- Complete the **edit experience** by adding inline quick-edit actions for `use_first` and `custom_expiration_date` directly from the detail view (currently only editable via the full edit form), when that slice is scheduled.

## Capabilities

### New Capabilities

- `seed-field-visibility`: Per-seed hiding of canonical fields. A `hidden_fields` column (text array) records which canonical field keys a user has removed from that seed's view. The seed form and detail view skip hidden fields. The user can restore any hidden field from an "add field back" affordance in the form. **AI transcription and import MUST NOT** add keys to `hidden_fields` just because a field was empty or missing from extraction.
- `seed-instruction-annotations`: Per-field notes stored in **`instruction_annotations`** (existing JSONB array). Detail view shows annotations inline; **add and edit** flows on `AddSeedForm` expose the same per-row annotation affordance and persist annotations on create and update.
- `seed-personal-notes`: A `my_notes` column (text) for user-authored observations. Rendered in a dedicated "My notes" section in the detail view and edit form, visually distinct from packet-extracted content.

### Modified Capabilities

- `simple-seed-organizer-design-system`: The `Seed` type, `AddSeedForm`, and `SeedDetail` components gain `hiddenFields` / `myNotes` and clarified copy; instruction annotations remain the existing shape; **add (create) and edit** flows on `AddSeedForm` both expose per-row instruction annotations consistent with the design system.

## Impact

- **Schema**: New migration adding `hidden_fields text[]` and `my_notes text` to `seeds`. No `field_annotations` column.
- **Type**: `types/seed.ts` updated with `hiddenFields?`, `myNotes?`; `instructionAnnotations?` unchanged.
- **Components**: `AddSeedForm.tsx` and `SeedDetail.tsx` extended for visibility and my notes; annotations use existing state/converters.
- **Storage**: `lib/storage.ts` column projection includes `hidden_fields`, `my_notes` (annotations columns already present).
- **No breaking changes** — new columns have defaults; existing seeds work after migration.
