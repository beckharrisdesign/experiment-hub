## 1. Database migration

- [x] 1.1 Ensure `006_seed_field_extensions.sql` is applied (includes `instruction_annotations` if not already on `seeds`)
- [x] 1.2 Apply `007_seed_hidden_and_personal_notes.sql` (`hidden_fields text[] NOT NULL DEFAULT '{}'`, `my_notes text`) locally via Supabase CLI or dashboard SQL editor
- [ ] 1.3 Apply migrations to production Supabase project when ready

## 2. Type system

- [x] 2.1 Add `hiddenFields?: string[]` to the `Seed` interface in `types/seed.ts`
- [x] 2.2 Add `myNotes?: string` to the `Seed` interface in `types/seed.ts`
- [x] 2.3 Confirm `instructionAnnotations?: SeedInstructionAnnotation[]` remains the only per-field note shape (no `fieldAnnotations` on `Seed`)

## 3. Storage layer

- [x] 3.1 Update `SEEDS_COLUMNS_WITHOUT_PHOTOS` in `lib/storage.ts` to include `hidden_fields` and `my_notes` (and existing `instruction_annotations` if not already)
- [x] 3.2 Update `convertDbSeedToSeed` / `convertSeedToDbSeed` in `lib/seedConverters.ts` for `hidden_fields` ↔ `hiddenFields`, `my_notes` ↔ `myNotes`
- [x] 3.3 Verify insert defaults include empty `hidden_fields` where required
- [x] 3.5 Confirm Auto Entry / `packetReaderAI` / import paths never write to `hidden_fields` based on empty extraction alone (only user-driven updates)

## 4. Field visibility — edit form

- [x] 4.1 Use shared hideable-field helpers (e.g. `lib/seedPacketHideableFields.ts`) for keys and labels
- [x] 4.2 In `AddSeedForm`, initialize `hiddenFields` from `initialData?.hiddenFields ?? []`
- [x] 4.3 Add a Hide affordance on each hideable canonical row in edit mode; clicking adds the key to `hiddenFields` and hides the row
- [x] 4.4 Conditionally render canonical rows: skip keys in `hiddenFields`
- [x] 4.5 Render an "Add field back" chip list when `hiddenFields.length > 0`
- [x] 4.6 Selecting a chip removes that key from `hiddenFields`
- [x] 4.7 Include `hiddenFields` in `seedData` on submit

## 5. Field visibility — detail view

- [x] 5.1 In `SeedDetail`, read `seed.hiddenFields` and skip rendering hidden canonical rows (and respect hiding in printed packet block where applicable)
- [x] 5.2 Visibility management remains edit-only (no hide control on detail view unless product later adds it)

## 6. Instruction annotations — add and edit form (`AddSeedForm`)

- [x] 6.1 Maintain `instructionAnnotations` state: `initialData?.instructionAnnotations || []` in edit mode; `[]` in create (new seed) mode
- [x] 6.2 In **both** create and edit modes, each annotatable canonical row SHALL use the same per-field annotation affordance and inline textarea behavior as today in edit
- [x] 6.3 Updates merge into `instructionAnnotations` by `fieldKey`; include `instructionAnnotations` in `seedData` on submit for **insert and update**
- [x] 6.4 After Auto Entry on the add form, user-entered annotations for fields AI left empty MUST remain mergeable and persist on first save (no reset of annotation state unless the user clears it)

## 7. Instruction annotations — detail view

- [x] 7.1 In `SeedDetail`, render annotations from `seed.instructionAnnotations` inline below values (muted / "My note:" styling as per design system)

## 8. Personal notes — edit form

- [x] 8.1 Initialize `myNotes` from `initialData?.myNotes ?? ''`
- [x] 8.2 "My notes" section in edit mode with textarea
- [x] 8.3 Include `myNotes` in `seedData` on submit
- [x] 8.4 Relabel `notes` as "Packet notes" where shown

## 9. Personal notes — detail view

- [x] 9.1 Render "My notes" when `seed.myNotes` is non-empty
- [x] 9.2 Relabel packet-sourced notes as "Packet notes"

## 10. Design system compliance

- [x] 10.1 Annotation / secondary text uses muted palette and italic where specified
- [x] 10.2 Hide and annotation controls are visually secondary (ghost / icon)
- [x] 10.3 "Add field back" only when there are hidden fields

## 11. Verification

- [ ] 11.1 Manual: **create** new seed — add an instruction annotation on a field, save — confirm detail view shows it; repeat on **edit**
- [x] 11.2 Auto Entry / AI flows populate `notes` (packet) and do not wipe `myNotes` without explicit user action; they MUST NOT append keys to `hidden_fields` solely because fields are empty post-extraction
- [ ] 11.3 Restore hidden field via chips and confirm persistence
- [x] 11.4 Clearing an instruction annotation removes that entry from the array (not an empty string row), on save
