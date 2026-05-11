## Why

The seed packet entry flow captures what's printed on a packet, but there's no way to control which canonical fields are relevant to a specific packet, and no structured place to record the user's own observations or corrections to printed instructions. Right now, personal knowledge lives in the single `notes` blob alongside AI-extracted packet content, with no distinction between "what the packet says" and "what I actually do."

## What Changes

- Add per-seed **field visibility control**: users can show or hide any field from the canonical field list for that seed, so the entry form and detail view only surface fields that are relevant to that packet.
- Add a new **personal notes** field (`my_notes`) that is explicitly separate from the AI-extracted `notes` (packet content). The existing `notes` field retains packet-sourced text; `my_notes` is always user-authored.
- Add **instruction annotations**: a structured list of inline user comments attached to specific packet fields (e.g., attach "I use 6 inches in raised beds" to the `spacing` field value). Stored as a JSON column `field_annotations` (`{ [fieldKey: string]: string }`).
- Surface all three user-editable surfaces (field visibility, personal notes, instruction annotations) in the detail view and edit form.
- Complete the **edit experience** by adding inline quick-edit actions for `use_first` and `custom_expiration_date` directly from the detail view (currently only editable via the full edit form).

## Capabilities

### New Capabilities

- `seed-field-visibility`: Per-seed opt-in/opt-out of canonical fields. A `hidden_fields` column (text array) records which canonical field keys a user has explicitly removed from that seed's view. The edit form and detail view skip hidden fields. The user can restore any hidden field from an "add field" affordance.
- `seed-instruction-annotations`: A `field_annotations` column (JSONB) stores a map of `fieldKey → annotation string`. In the detail view, annotated fields show the annotation inline below the packet value. In the edit form, each field row has a small "annotate" toggle that reveals a textarea for the annotation.
- `seed-personal-notes`: A `my_notes` column (text) for user-authored observations. Rendered in a dedicated "My notes" section in the detail view and edit form, visually distinct from packet-extracted content.

### Modified Capabilities

- `simple-seed-organizer-design-system`: The `Seed` type, `AddSeedForm`, and `SeedDetail` components gain new fields and UI surfaces; visual treatment of packet-sourced vs. user-authored content needs a clear design pass.

## Impact

- **Schema**: New Supabase migration adding `hidden_fields text[]`, `field_annotations jsonb`, and `my_notes text` columns to the `seeds` table.
- **Type**: `types/seed.ts` updated with the three new fields.
- **Components**: `AddSeedForm.tsx` and `SeedDetail.tsx` extended to render and edit the new fields.
- **Storage**: `lib/storage.ts` column projection updated to include new fields.
- **No breaking changes** — all new columns are nullable with sensible defaults; existing seeds work without migration.
