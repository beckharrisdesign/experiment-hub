## Human anchor

> "I want it to be dead simple to enter packet info — including simplifying data structures and offering up good defaults."
> — Katy, 2026-06-01

## Outcomes

- **Who:** Me (solo founder) and the gardeners using Simple Seed Organizer who are adding or correcting a packet's details — especially the ones cataloging saved seed and hand-labeled packaging, where typing every field by hand is the friction that stops them.
- **Job:** Make entering and editing a packet dead simple. One edit view shows the packet's photo **collection** as a rail and one **merged** field set beside it — no front/back panes, no F/B badges. Adding another photo is one obvious affordance. Common fields arrive pre-filled with sensible defaults so a user can save with minimal typing.
- **Done when:**
  1. **Photo-rail edit layout** — `/seeds/[id]/edit` renders the seed's `photos[]` as a rail (sticky on wide screens) with a clear "add photo" affordance, beside a single field set. Matches the Figma edit view (file `S8YJQugvMmn5jaRqwFM5XO`, node `156-9525` / `21:1572`), responsive at S·480 / L·1024.
  2. **One merged field set** — capture/extraction presents a single set of fields. The "back image evidence" panel, F/B badges, and `side` threading in `AddSeedForm` are removed (this completes the piece deliberately deferred from Change 1, `seed-photos-as-collection` task 3.7).
  3. **Good defaults** — common packet fields offer sensible defaults (e.g. type, current year, sun/quantity placeholders) so the shortest path to a saved seed is short. Defaults are suggestions, never silent overwrites of what the user or extraction provided.
  4. **Verifiable** — the new layout and defaults render correctly in `/dev/components` and on `/seeds/[id]/edit`, with the photo collection driving the rail.
- **Not doing:** The photo data model (shipped in Change 1 — this change is presentational + entry ergonomics, no DB or `Seed.photos` shape changes). Drag-to-reorder beyond what the rail needs to set `order`. New AI/extraction logic beyond removing per-side rendering. New field types or a custom-field redesign. Backfilling or dropping legacy photo columns (a later cleanup change).

## Why

Change 1 made a packet's photos a real collection at the data layer, but the edit view still wears the old front/back clothes: two photo panes, a "back image evidence" panel, and F/B badges that split one packet's information across the screen. That is exactly the "look too many places" friction the founder called out — and it now contradicts the data model underneath it. This change brings the **UI** in line with the collection: one rail of photos, one field set, one obvious way to add a photo.

The second half of the anchor — "offering up good defaults" — is where the real entry friction lives. Most of a packet is predictable (it's a seed, bought this year, sun-loving more often than not). Pre-filling those with editable defaults turns a long form into a quick confirm-and-save. Keeping this as its own change (separate from the data migration) means the layout is purely presentational and reviewable in `/dev/components` without touching Supabase.

## What changes

- Rebuild the `/seeds/[id]/edit` layout around a photo **rail**: the collection renders as ordered thumbnails with an "add photo" affordance, sticky beside the field set on wide screens, stacked on narrow.
- Collapse `AddSeedForm`'s two-pane capture into one merged field set — remove `getKeyValuePairsBySource().front/.back`, the back-image evidence panel, the F/B badges, and the `side` parameter threading.
- Offer good defaults for common packet fields on a new entry, surfaced as editable suggestions (never overwriting extraction or user input).
- Keep the field set, custom fields, and annotations behavior intact; this is layout + defaults, not a form-logic rewrite.

## Capabilities

### New Capabilities

- `seed-edit-photo-rail`: The edit view presents a packet as an ordered photo rail (with add-photo) beside a single merged field set, replacing the front/back two-pane layout.
- `seed-entry-defaults`: New-packet entry offers sensible, editable defaults for common fields so saving a seed takes minimal typing.

### Modified Capabilities

- `AddSeedForm` capture: folds N photos into one field set — per-side panels, F/B badges, and `side` threading are removed (completes Change 1 task 3.7).

## Impact

- **Edit view / layout:** `app/seeds/[id]/edit/`, `components/AddSeedForm.tsx` (rail layout, single field set, defaults), photo-rail subcomponent(s).
- **Capture fold:** `components/AddSeedForm.tsx` (`getKeyValuePairsBySource`, evidence panel, badges, `side` threading), `extractSingleImage` / `handleFileSelect`.
- **Defaults:** `AddSeedForm` initial state / a small defaults helper; reconcile with `lib/seedFieldRegistry.ts`.
- **Design system:** verify against `/dev/components`; uses tokens per `rules/design-guidelines.mdc`.
- **No data changes:** builds entirely on Change 1's `Seed.photos[]`; no Supabase migration.
- **Depends on:** Change 1 `seed-photos-as-collection` (merged, PR #218).

## Optional links

- Experiment directory: `experiments/simple-seed-organizer/`
- Figma (edit view): `S8YJQugvMmn5jaRqwFM5XO` node `156-9525` (also `21:1572` per component table)
- Component table / parity: `experiments/simple-seed-organizer/docs/figma-source.md`
