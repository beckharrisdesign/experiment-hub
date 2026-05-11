## 1. Database migration

- [ ] 1.1 Create `supabase/migrations/006_seed_custom_fields.sql` adding `hidden_fields text[] DEFAULT '{}'`, `my_notes text`, and `field_annotations jsonb DEFAULT '{}'` columns to the `seeds` table
- [ ] 1.2 Apply migration locally via Supabase CLI or dashboard SQL editor and verify columns are present
- [ ] 1.3 Apply migration to production Supabase project via dashboard migrations panel

## 2. Type system

- [ ] 2.1 Add `hiddenFields?: string[]` to the `Seed` interface in `types/seed.ts`
- [ ] 2.2 Add `myNotes?: string` to the `Seed` interface in `types/seed.ts`
- [ ] 2.3 Add `fieldAnnotations?: Record<string, string>` to the `Seed` interface in `types/seed.ts`

## 3. Storage layer

- [ ] 3.1 Update `SEEDS_COLUMNS_WITHOUT_PHOTOS` in `lib/storage.ts` to include `hidden_fields`, `my_notes`, and `field_annotations`
- [ ] 3.2 Update `convertDbSeedToSeed` to map `hidden_fields → hiddenFields`, `my_notes → myNotes`, `field_annotations → fieldAnnotations`
- [ ] 3.3 Update `convertSeedToDbSeed` to map the three new camelCase fields back to their snake_case column names
- [ ] 3.4 Verify `addSeed`, `updateSeed`, and `getSeedById` all round-trip the new fields correctly with a manual test or unit test

## 4. Field visibility — edit form

- [ ] 4.1 Define a `CANONICAL_FIELD_KEYS` constant (array of camelCase keys matching `Seed` interface packet fields) in a shared utility file, with paired display labels
- [ ] 4.2 In `AddSeedForm`, initialize a `hiddenFields` state from `initialData?.hiddenFields ?? []`
- [ ] 4.3 Add a small remove-field icon button (× or hide icon, secondary/ghost style) to each canonical field row in the edit-mode table; clicking it adds the field key to `hiddenFields` state and hides the row
- [ ] 4.4 Conditionally render canonical field rows: skip any field whose key is in `hiddenFields`
- [ ] 4.5 Render an "Add field" chip below the last visible field row when `hiddenFields.length > 0`; clicking it opens a dropdown or inline chip list of hidden field display labels
- [ ] 4.6 Selecting a label from the "Add field" list removes that key from `hiddenFields` and re-renders the row
- [ ] 4.7 Include `hiddenFields` in the `seedData` object passed to `onSubmit` in `handleSubmit`

## 5. Field visibility — detail view

- [ ] 5.1 In `SeedDetail`, read `seed.hiddenFields` and skip rendering any canonical field row whose key is in that array
- [ ] 5.2 Ensure the detail view does not show the "Add field" affordance (visibility management is edit-only)

## 6. Field annotations — edit form

- [ ] 6.1 Initialize `fieldAnnotations` state in `AddSeedForm` from `initialData?.fieldAnnotations ?? {}`
- [ ] 6.2 Add a small annotation toggle button ("+ note" or pencil icon, unobtrusive) to each canonical field row in the edit-mode table
- [ ] 6.3 When the toggle is activated (or when an existing annotation is present on load), render an auto-growing textarea below the field input for that row
- [ ] 6.4 On textarea change, update `fieldAnnotations` state (set key to new value; delete key when value is empty)
- [ ] 6.5 Auto-expand the annotation textarea on load when `fieldAnnotations[key]` is non-empty
- [ ] 6.6 Include `fieldAnnotations` in the `seedData` object passed to `onSubmit` in `handleSubmit`

## 7. Field annotations — detail view

- [ ] 7.1 In `SeedDetail`, for each canonical field row that has a non-empty `seed.fieldAnnotations?.[key]`, render the annotation text below the field value using muted/italic styling (e.g., text color `#6a7282`, italic) with a pencil icon or "My note:" prefix
- [ ] 7.2 Fields without annotations render unchanged

## 8. Personal notes — edit form

- [ ] 8.1 Initialize `myNotes` state in `AddSeedForm` from `initialData?.myNotes ?? ''`
- [ ] 8.2 Add a "My notes" section below the canonical fields in the edit form (edit mode only, not add mode) with an auto-growing textarea labeled "My notes" and placeholder "Your observations, variations you tried, what worked…"
- [ ] 8.3 Include `myNotes` in the `seedData` object passed to `onSubmit`
- [ ] 8.4 Relabel the existing `notes` field as "Packet notes" in the edit form to distinguish it from "My notes"

## 9. Personal notes — detail view

- [ ] 9.1 In `SeedDetail`, render a "My notes" section when `seed.myNotes` is non-empty, styled distinctly from the packet fields section (e.g., section heading "My notes", body in regular paragraph style)
- [ ] 9.2 Hide the "My notes" section entirely when `seed.myNotes` is NULL or empty
- [ ] 9.3 Relabel the existing notes display as "Packet notes" in `SeedDetail`

## 10. Design system compliance

- [ ] 10.1 Verify annotation text uses `#6a7282` (muted) with italic style, consistent with the SSO prototype's existing type palette
- [ ] 10.2 Verify remove-field and annotation toggle controls are visually secondary (ghost/icon-only) and do not dominate the field row
- [ ] 10.3 Verify "Add field" affordance is below the last visible row and does not appear when all fields are visible
- [ ] 10.4 Verify the "My notes" section heading is clearly distinct from packet field labels in the detail view

## 11. Verification

- [ ] 11.1 Manually create a seed, open it for editing, hide two fields, add an annotation to one field, add a personal note, save, and confirm all changes persist on the detail view
- [ ] 11.2 Verify that running Auto Entry on a packet image populates `notes` (not `myNotes`) and does not overwrite existing personal notes
- [ ] 11.3 Verify that the "Add field" affordance restores a previously hidden field and the field is no longer hidden after saving
- [ ] 11.4 Verify that clearing an annotation and saving removes the key from `field_annotations` in Supabase (not stored as empty string)
