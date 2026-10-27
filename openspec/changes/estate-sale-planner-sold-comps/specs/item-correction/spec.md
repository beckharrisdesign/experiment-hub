## Outcomes

See `../../proposal.md`. This capability is part 1 of the change: before anything is looked
up, the family can see what the model decided the subject of each item is, fix it on the photo
it came from, and confirm it. Done when any item opens its source photo with its box drawn, the
box can be adjusted, one item can become several (or several one, or one lot), a missed object
can be drawn in, each correction gets a fresh read, and an item is confirmed once it is fixed or
marked right. Not doing: outlines or segmentation (round 05 #48), cloud photo storage or
accounts (05b), confirming items in bulk.

## ADDED Requirements

### Requirement: The original photos stay on the device

The photos from a walkthrough are kept on the phone, so there is always something to re-crop.

**Fails until:** after a walkthrough, every photo sent is stored at up to 1600 px on its long edge in IndexedDB, and each item it produced carries a reference to it.

The capture flow SHALL keep each sent photo at up to 1600 px long edge in IndexedDB, SHALL link every item to the photo it came from, and SHALL stay within a configured storage cap by dropping the originals of the oldest sale first, never thumbnails, names, bands, destinations or corrections.

#### Scenario: Photos are kept after the walkthrough

- **WHEN** a room's photos are sent and the items come back
- **THEN** each photo is stored on the device at up to 1600 px and every item references the photo it was found in

#### Scenario: Device storage runs short

- **WHEN** storing a new walkthrough's photos would pass the storage cap or the browser's quota
- **THEN** the originals of the oldest sale are dropped first, the new photos are kept, and that older sale's items keep their thumbnails and every correction

#### Scenario: An item has no original

- **WHEN** an item's original is gone (dropped for space, imported from before this change, or added by hand)
- **THEN** the item still opens and can be renamed, re-banded, moved or removed, and the source-photo actions say the photo is no longer on this device

### Requirement: Every item shows the photo it came from

From any item, the family can see the whole photo and the box the model drew around the subject.

**Fails until:** the item screen opens a source-photo view showing the full original with the item's box outlined.

The item screen SHALL offer a source-photo view that shows the full original with this item's box outlined and the boxes of the other items found in the same photo shown more faintly, and SHALL fall back to the whole photo when the item has no box.

#### Scenario: User opens the source photo

- **WHEN** the user opens an item and chooses to see its source photo
- **THEN** the full photo is shown with this item's box outlined and other items from the same photo drawn faintly

#### Scenario: The model gave no box

- **WHEN** the item's box is empty
- **THEN** the whole photo is shown as the subject, and the user can draw a box to set one

### Requirement: The box can be adjusted and re-read

When the model framed the wrong thing, the family drags the box to fit and the item follows the new subject.

**Fails until:** saving an adjusted box replaces the item's thumbnail with the new crop and sends that crop through the re-read, updating name, band, reason and confidence.

Adjusting SHALL let the user move and resize the box on the source photo, and saving SHALL crop a new thumbnail from the original and send the new crop through the existing re-read call, applying its name, band, reason and confidence to the item.

#### Scenario: User adjusts the box

- **WHEN** the user drags the box to frame the clock instead of the table and saves
- **THEN** the item's picture becomes the clock, the re-read runs on the new crop, and the item's name, band, reason and confidence update

#### Scenario: The re-read fails after an adjustment

- **WHEN** the new box is saved but the re-read call fails or is unavailable
- **THEN** the new box and picture are kept, the previous name and band stay, and the item says it has not been re-read yet

### Requirement: Items can be split, drawn in, merged or grouped as a lot

When the model counted wrong, the family fixes the count on the photo: one item into several, a missed object into a new item, several into one, or several into a lot.

**Fails until:** each of split, draw-a-missed-item, merge and lot produces the right number of items with crops from the original and a re-read for every new or changed item.

The source-photo view SHALL let the user draw one box per object to split an item into several, draw a box with no item to add one, select items to merge into one, or select items to mark as a single lot; every resulting item SHALL get a crop from the original and a re-read, and merged or lotted items SHALL keep the most specific destination the family had set.

#### Scenario: User splits one item into three

- **WHEN** the model listed "three vases" as one item and the user draws a box around each vase
- **THEN** the one item is replaced by three, each with its own crop and its own re-read

#### Scenario: User draws a missed item

- **WHEN** the user draws a box around a lamp the model did not list
- **THEN** a new item is added with that crop as its picture, marked as added by the family, and it is re-read

#### Scenario: User merges two items

- **WHEN** the model listed a lamp and its shade separately and the user merges them
- **THEN** one item remains, framed around both, and it is re-read

#### Scenario: User marks items as a lot

- **WHEN** the user selects six Pyrex bowls and marks them as one lot
- **THEN** one lot item remains, named and banded as a set by the re-read, and it can be split back into its parts

### Requirement: An item is confirmed once it is fixed or marked right

The family tells the app the subject is right, either by correcting it or with one tap, and only confirmed items go on to a price lookup.

**Fails until:** an item carries a confirmed flag that is set by any correction or by **Looks right**, and is shown on the item.

Each item SHALL carry a confirmed state that any correction in this capability sets, that a **Looks right** action on the item and on the source-photo view sets, that persists with the sale, and that the item shows; editing a confirmed item's name, room or band SHALL keep it confirmed.

#### Scenario: User taps Looks right

- **WHEN** the user checks an item's source photo and taps **Looks right**
- **THEN** the item is marked confirmed and shows it

#### Scenario: A correction confirms the item

- **WHEN** the user adjusts, splits, merges, lots or draws an item
- **THEN** every resulting item is confirmed without a separate tap

#### Scenario: Unconfirmed items stay out of the lookup

- **WHEN** an item flagged for Sell at a high band has not been confirmed
- **THEN** it keeps the model's band, labelled as a guess, and no lookup runs for it
