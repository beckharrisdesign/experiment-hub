## Outcomes

- **Who:** Solo founder + gardeners adding or correcting a packet's details, including those cataloging saved seed and hand-labeled packaging.
- **Job:** Present a packet in the edit view as an ordered photo rail beside one merged field set, with an obvious way to add another photo — replacing the front/back two-pane layout.
- **Done when:** `/seeds/[id]/edit` renders `photos[]` as a rail beside a single field set (per Figma `156-9525`); an add-photo affordance appends to the collection; capture/extraction shows one merged field set with no per-side panels or F/B badges.
- **Not doing:** Photo data-model changes (Change 1); drag-reorder beyond setting `order`; extraction-logic rework; new field types.

## ADDED Requirements

### Requirement: Photo-rail edit layout

The edit view shows a packet's photos as an ordered rail beside a single column of fields, instead of two front/back photo panes.

**Fails until:** Opening `/seeds/[id]/edit` for a seed with three photos shows all three as rail thumbnails in `order`, with one field set beside them and no "front"/"back" pane labels.

The edit view SHALL render `seed.photos` as an ordered rail adjacent to one merged field set, matching the Figma "Packet Edit" layout (`S8YJQugvMmn5jaRqwFM5XO` node `156-9525`).

#### Scenario: Open a seed and see its photos as a rail beside one field set

- **WHEN** a user opens `/seeds/[id]/edit` for a seed that has two or more photos
- **THEN** the photos render as ordered thumbnails in a rail beside a single field set, with no front/back pane split and no F/B labels

#### Scenario: Rail stacks above the field set on narrow screens

- **WHEN** the edit view is viewed at the S breakpoint (480px)
- **THEN** the photo rail stacks above the field set (single column) and remains scrollable, while at the L breakpoint (1024px) the rail sits beside the fields

### Requirement: Add a photo from the rail

The user can add another photo to the packet directly from the rail, and it joins the collection in order.

**Fails until:** Using the add-photo affordance on a seed with one photo and saving yields a seed with two photos, the new one last in `order`.

The edit view SHALL provide an add-photo affordance that appends the selected image to `seed.photos` with the next `order` and persists it on save.

#### Scenario: Add a photo and it appears at the end of the rail and saves

- **WHEN** a user activates the add-photo affordance and selects an image
- **THEN** a new thumbnail appears at the end of the rail, and saving persists it as the last photo in the collection

### Requirement: One merged field set on capture

Capturing one or more photos for a packet produces a single merged field set, not per-side panels.

**Fails until:** Capturing two photos for one packet shows one field set with no "back image evidence" panel and no F/B badges anywhere in the form.

The capture/extraction UI SHALL fold all photos into one field set, removing the front/back evidence panel, F/B badges, and `side` parameter threading.

#### Scenario: Capture two photos and get one merged field set with no evidence panel

- **WHEN** a user captures or uploads two photos for a single packet
- **THEN** the form shows one merged field set with no back-image evidence panel and no front/back badges
