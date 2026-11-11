# walkthrough-triage Specification

## Purpose
The Estate Sale Planner's core loop: photograph a parent's house room by room, get back what might be worth selling, and sort everything into Keep, Sell or Donate one item at a time. From `estate-sale-planner-build` (archived 2026-11-11), brought up to the app as built: photos instead of video (round 05a), sales on Home instead of walkthrough history, the header in `esp-app-header`, the donation pickup and Sell Sheet exits out of the UI until the CTA design pass (review queue #58). Sales are saved on the server as well as the phone (`esp-server-sales`).

## Requirements

### Requirement: Photos become frames on the device

The family photographs a room (the phone's camera, several shots at a time, or photos picked
from the library); each photo is scaled on the device and becomes one frame for the model. No
video is accepted (round 05a, founder: *"stick to images - a live camera instead of video since
that adds complexity out of the gate"*). A confirm grid shows every photo with a way to leave one
out; nothing is sent until the user taps Send. At most 48 photos go in one pass
(`CAPTURE.maxPhotos`).

#### Scenario: User photographs a room and confirms

- **WHEN** the user takes or picks one or more photos and the grid appears
- **THEN** every photo is shown with a count, any one can be left out, and no network request carrying a photo has been made yet

#### Scenario: User picks a video

- **WHEN** the files chosen contain a video and no images
- **THEN** the video is ignored and the user is told to take a few photos instead

### Requirement: The app says where you are

A sticky tab bar on every planner page, camera flows included, reads Home · Items · [camera] ·
Sort · Progress · Sell list, and lights the tab for the current screen (the header is
`esp-app-header`). Each screen has its own URL, so refresh, the back button and a shared link all
land on the same place (round 05a, founder: *"no persistent nav - can't really tell where I am in
the app"*).

#### Scenario: Deep link into a sale

- **WHEN** the user opens `/estate-sale-planner/sales/<id>/sort` on the phone that holds that sale
- **THEN** the Sort screen renders with the header naming the sale and the Sort tab lit

#### Scenario: A sale that is not on this device

- **WHEN** the user opens a sale URL on a phone that neither holds it nor created it on the server
- **THEN** the screen says sales are saved on the phone that photographed them and offers Home or a new sale

#### Scenario: The center camera

- **WHEN** the user taps the camera in the tab bar
- **THEN** it opens "add photos" for the sale in context, or starts a new sale when there is none

#### Scenario: No sale yet

- **WHEN** the device has no sale
- **THEN** Items, Sort, Progress and Sell list are disabled and the camera starts a sale

### Requirement: Flags come back as a Sell list and an undecided pile

The user gets a *Sell* list of items that could be worth something (the model's suggestion) and
everything else still to sort.

The vision route SHALL return each item with `name`, `room`, `band`, `reason`, `confidence`, `frame` and `box`, and the Items screen SHALL start flagged items at Sell and the rest undecided.

#### Scenario: Flags render as Sell and still-to-sort

- **WHEN** the photos are sent and the model responds
- **THEN** the Items screen shows each flagged item under Sell with its picture, value band and reason, and the remaining items as still to sort

#### Scenario: The model finds nothing worth flagging

- **WHEN** the response contains no flagged items
- **THEN** the Sell section is left out and every item can still be moved from the pile

### Requirement: Sort one item at a time

The user works the undecided pile one item at a time, can undo the last change, and can move any
item between destinations at any time.

The Sort screen SHALL present one item at a time with Donate, Keep and Sell as buttons as well as gestures, SHALL offer Undo for the last change, and SHALL let any item, Sell items included, be moved between destinations.

#### Scenario: User sorts the pile

- **WHEN** the user taps or swipes a destination on an item
- **THEN** the item leaves the stack, the running counts update, and Undo restores it

#### Scenario: User overrides a Sell flag

- **WHEN** the user moves a Sell item to Keep or Donate
- **THEN** it leaves the Sell list, the override is counted for the flag-acceptance metric, and the value band is still visible on the item

### Requirement: Three destinations, toggled per item

Every item is headed to exactly one of Keep, Sell, or Donate, and the user can change that for
any item at any time.

The sale SHALL hold a destination of `keep | sell | donate` (or undecided) per item, model-flagged items SHALL start at Sell, every card and the item screen SHALL carry a keep / sell / donate toggle, the swipe surface SHALL offer all three (drag left donate, drag right keep, Sell a deliberate tap), and undo SHALL walk back one change at a time; there SHALL be no Toss destination.

#### Scenario: User moves a Sell item to Donate and back

- **WHEN** the user taps Donate on a Sell card, then Sell again
- **THEN** the item moves to Donate and back to Sell, both changes undoable, and the override counts only while it is off Sell

### Requirement: An item can be corrected, removed, or added

Tapping an item opens its own screen, where the user can rename it, change its band, write what
the family knows, remove it if it is not a real object, or add an item the model missed. Photo
corrections (box, split, merge, lot, message) are `item-correction`.

The item screen SHALL offer the destination toggle and editable name, band and note, SHALL remove an item only after a second confirmation, SHALL never change the destination as a side effect of an edit or a re-read, and the Items screen SHALL offer an add form whose new item starts with an honest low-confidence read.

#### Scenario: The model called it wrong

- **WHEN** the user renames "Upright piano" to "Spinet cabinet" and picks a lower band
- **THEN** the item keeps its destination and shows the new name and band everywhere, including the Sell list

#### Scenario: Not a real item

- **WHEN** the user taps Remove item and confirms
- **THEN** the item and its history are gone and the user is back on Items

### Requirement: A detail shot re-reads the item

When an item needs a closer look (a seam, a stamp on the bottom, a label) the user can add a
detail photo; it goes to the model with what the family knows and the read updates.

The refine route SHALL validate the item and up to `DETAIL_SHOT.maxPerItem` base64 JPEGs, SHALL use the same provider order as the walkthrough pass, SHALL return `markReading` (what the mark says, or null), SHALL keep the photo and say so in fixture mode, and the UI SHALL show the mark reading and the detail thumbs on the card and the item screen.

#### Scenario: A stamp on the bottom

- **WHEN** the user adds a photo of a maker's stamp and the provider is keyed
- **THEN** the item's name, band, reason and confidence update, the mark reading is shown, and the destination is untouched

#### Scenario: Demo mode

- **WHEN** no provider is keyed
- **THEN** the photo is kept on the item and the user is told nothing was re-read

### Requirement: A sale grows room by room

Adding photos to a sale adds to it: the new items join the existing lists, and the model is told
what is already listed so it does not repeat it. A different house is a new sale, and Home lists
every sale.

The Items screen SHALL offer Add photos; a capture for an existing sale SHALL send the sale's existing names and rooms with the photos and SHALL append what comes back (flagged items at Sell, the rest undecided) without moving anything already sorted; Home SHALL list the device's sales and offer Start a new sale; a sale MAY be named and the name SHALL show on Home and in the header.

#### Scenario: User photographs the next room on another day

- **WHEN** the user taps Add photos on a sale, photographs the kitchen, and sends
- **THEN** the kitchen's items append to the same sale, the app says how many were added, and nothing already sorted changes

#### Scenario: Re-photographing a room

- **WHEN** the user photographs the living room again
- **THEN** the request names the items already listed and the model returns only objects it had not listed

#### Scenario: A different house

- **WHEN** the user taps Start a new sale on Home
- **THEN** a new sale opens for photos and the earlier sale is still listed on Home

### Requirement: The Sell list can be printed

The Sell list tab opens a print-friendly page of every Sell item, so the family has a copy to
take to a dealer or an estate-sale company.

The Sell list page SHALL list every Sell item with its band, reason, any mark reading and the family's note, SHALL hide the app's chrome when printed, and SHALL state, in its own block after everything else, that the bands are a model's guess and not an appraisal.

#### Scenario: User prints the Sell list

- **WHEN** the user opens the Sell list tab and prints
- **THEN** a page of the Sell items prints without the header or tab bar, ending with the "not an appraisal" line
