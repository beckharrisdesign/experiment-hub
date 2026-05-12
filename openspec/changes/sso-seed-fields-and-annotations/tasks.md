## 1. Database migration

- [ ] 1.1 Add migration `supabase/migrations/006_seed_packet_management.sql` adding `seeds.status` (`active | archived | used_up`, default `active`), `seeds.used_up_at TIMESTAMPTZ NULL`, and `seeds.custom_values JSONB NOT NULL DEFAULT '{}'::jsonb`.
- [ ] 1.2 In the same migration, create `user_field_schema (user_id UUID PRIMARY KEY REFERENCES auth.users, version INT, hidden_canonical_ids TEXT[] NOT NULL DEFAULT '{}', custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())` with RLS scoped to the owner.
- [ ] 1.3 In the same migration, create `seed_annotations (id UUID PK, seed_id UUID FK seeds(id) ON DELETE CASCADE, user_id UUID FK auth.users, target_field_id TEXT NULL, body TEXT NOT NULL, override BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())` with RLS scoped to the owner and index `(seed_id, created_at DESC)`.
- [ ] 1.4 Add a backfill step that sets `status = 'active'` and `custom_values = '{}'::jsonb` on every existing `seeds` row (no-op if defaults already applied).
- [ ] 1.5 Document the migration in a short note in `experiments/simple-seed-organizer/prototype/app/SUPABASE_SETUP.md` so a fresh environment knows how to apply it.

## 2. Types and registry

- [ ] 2.1 Extend `types/seed.ts` with `status: 'active' | 'archived' | 'used_up'`, `usedUpAt?: string`, `customValues?: Record<string, unknown>`, plus shared `Annotation` and `CustomField` interfaces.
- [ ] 2.2 Create `lib/fieldSchema.ts` exporting the canonical registry (id, label, dataType, group, defaultVisible, required) covering every field currently on `Seed`, plus helpers `getEffectiveSchema(userSchema)`, `isVisible(id, userSchema)`, `normaliseCustomValues(seed, userSchema)`.
- [ ] 2.3 Create `lib/annotations.ts` with shape, helpers to group annotations by `target_field_id`, and a `resolveDisplayValue(field, seedValue, annotations)` returning `{ value, isOverride, annotation? }`.
- [ ] 2.4 Add vitest coverage `lib/fieldSchema.test.ts` and `lib/annotations.test.ts` for registry resolution, hidden-field round-trip, custom-field id stability across rename, and override vs additive behaviour.

## 3. Server API

- [ ] 3.1 Add `app/api/seeds/[id]/duplicate/route.ts` (POST) accepting `{ copyPhotos: boolean, copyAnnotations: boolean }`, returning the new seed.
- [ ] 3.2 Add `app/api/seeds/[id]/status/route.ts` (PATCH) accepting `{ status, usedUpAt? }`, validating allowed transitions.
- [ ] 3.3 Add `app/api/seeds/bulk/route.ts` (POST) accepting `{ ids, action, payload? }` for `archive | restore | delete | set_type`, returning per-id success/failure.
- [ ] 3.4 Add `app/api/field-schema/route.ts` (GET, PUT) for the user's `user_field_schema` row, with PUT validation that required fields are not hidden and that custom-field UUIDs are stable.
- [ ] 3.5 Add `app/api/seeds/[id]/annotations/route.ts` (GET, POST) and `app/api/seeds/[id]/annotations/[annotationId]/route.ts` (PATCH, DELETE) enforcing seed ownership.
- [ ] 3.6 Extend the existing seed PATCH path so `customValues` and `status` updates round-trip; ensure `lib/autoEntry.ts` and `lib/packetReaderAI.ts` continue to write canonical fields even when hidden.
- [ ] 3.7 Add vitest coverage for each new route's happy path plus RLS rejection (cross-user request returns 403/404 without leaking data).

## 4. Client UI — schema editor

- [ ] 4.1 Add `app/profile/fields/page.tsx` route and a `FieldSchemaEditor.tsx` component listing canonical fields (with hide/show toggles, disabled for required) and a custom-fields section (create/rename/delete with stable ids).
- [ ] 4.2 Wire `Profile.tsx` and/or the add/edit form to expose "Customise fields" as a clear affordance leading to the new route.
- [ ] 4.3 Annotate new components with `@figma S8YJQugvMmn5jaRqwFM5XO:<node>` once Figma frames exist; record nodes in `figma-source.md`.

## 5. Client UI — CRUD verbs

- [ ] 5.1 Update `SeedDetail.tsx` so the destructive bar is **Archive** (primary), with **Hard delete** moved behind a secondary confirm and **Mark used up** as a third button.
- [ ] 5.2 Add a **Duplicate** affordance to `SeedDetail.tsx` opening a small dialog for the photos / annotations toggles, posting to the duplicate API and routing to the new seed.
- [ ] 5.3 Update `SeedList.tsx` with a multi-select mode, a bulk action bar (`Archive`, `Restore`, `Delete`, `Set type…`), and a status filter chip set (`Active`, `Used up`, `Archived`) defaulting to `Active`.
- [ ] 5.4 Update `FilterBar.tsx` / `FilterChip.tsx` so the new status chips compose with existing type and Use-First filters.

## 6. Client UI — custom fields and annotations on detail

- [ ] 6.1 Update `AddSeedForm.tsx` and the edit equivalent to render fields from `getEffectiveSchema` (canonical visible + custom), including new control types (`select`, `long-text`).
- [ ] 6.2 Update `SeedDetail.tsx` to render visible canonical fields, then custom field values from `customValues`, then an Annotations section. Inline annotations targeted at a specific field appear next to that field with an "edited from packet" badge when `override = true`.
- [ ] 6.3 Add `SeedAnnotationEditor.tsx` for create/edit, exposed from the detail view via a small "+" next to each annotatable field and a "+ Annotation" button for whole-seed notes.
- [ ] 6.4 Ensure the legacy `notes` field still renders for seeds that have it; add inline help pointing users at annotations for field-specific notes.

## 7. Import and AI paths

- [ ] 7.1 Audit `lib/autoEntry.ts`, `lib/packetReaderAI.ts`, `BatchImport.tsx`, and `BulkCameraCapture.tsx` to confirm hidden fields still receive values from AI/import (storage unchanged, presentation hidden only).
- [ ] 7.2 Confirm imported seeds are created with `status = 'active'` and empty `customValues`; add a vitest check for the import code path.

## 8. Documentation

- [ ] 8.1 Update `experiments/simple-seed-organizer/docs/PRD.md` Core Features → Inventory bullet to mention status lifecycle, custom fields, and annotations (one-line additions, no overhaul).
- [ ] 8.2 Add a short `experiments/simple-seed-organizer/docs/field-schema-and-annotations.md` describing the canonical registry, custom-field stability rules, and annotation override semantics for future maintainers.
- [ ] 8.3 Update `experiments/simple-seed-organizer/docs/figma-source.md` with any new node ids for the field schema editor and annotation editor frames.

## 9. Verify

- [ ] 9.1 `cd experiments/simple-seed-organizer/prototype/app && npm run build` passes.
- [ ] 9.2 `npm test` (vitest) passes, including the new `fieldSchema`, `annotations`, and route tests.
- [ ] 9.3 Smoke-test the seeded user flows in dev: create → duplicate → archive → restore → mark used up → hide a canonical field → add a custom field → add an override annotation → reload and confirm round-trip.
- [ ] 9.4 `npx @fission-ai/openspec@latest validate sso-seed-fields-and-annotations` reports the change as valid before opening the PR for merge.
