## Outcomes

See `../../proposal.md` — Who: the adult child clearing a parent's house. Job: know what is
worth keeping before the junk truck comes; decide the rest one item at a time. Done when
the three requirements below hold on a phone. Not doing: appraisals, selling, accounts. Round 03 (founder instruction): there is no Toss — keep, sell, donate are the only destinations, toggled per item; items can be corrected, removed, added, and re-read from detail shots.

## ADDED Requirements

### Requirement: Photos become frames on the device

The family photographs a room (the phone's camera, several shots at a time, or photos
picked from the library); each photo is scaled on the device and becomes one frame for
the model. No video is accepted (round 05a, founder: *"stick to images - a live camera
instead of video since that adds complexity out of the gate"*). A confirm grid shows every
photo with a way to leave one out; nothing is sent until the user taps Send. At most 48
photos go in one pass.

#### Scenario: User photographs a room and confirms

- **WHEN** the user takes or picks one or more photos and the grid appears
- **THEN** every photo is shown with a count, any one can be left out, and no network request carrying a photo has been made yet

#### Scenario: User picks a video

- **WHEN** the files chosen contain a video and no images
- **THEN** the video is ignored and the user is told to take a few photos instead

### Requirement: The app says where you are

Every screen carries a top bar with the sale's name and the screen's name, and Back
wherever there is somewhere to go. A tab bar — Home · Items · [camera] · Sort · Progress —
shows on every screen except the camera flows, which take the full screen with Cancel.
Each screen has its own URL, so refresh, the back button and a shared link all land on
the same place (round 05a, founder: *"no persistent nav - can't really tell where I am in
the app"*).

#### Scenario: Deep link into a sale

- **WHEN** the user opens `/estate-sale-planner/sales/<id>/sort` on the phone that holds that sale
- **THEN** the Sort screen renders with the top bar reading the sale's name and "Sort", the Sort tab lit, and Back going to the sale's items

#### Scenario: A sale that is not on this device

- **WHEN** the user opens a sale URL on a different phone
- **THEN** the screen says the sale is saved on the phone that photographed it and offers Home

#### Scenario: The center camera

- **WHEN** the user taps the camera in the tab bar
- **THEN** it opens "add a room" for the sale in context, or a new sale when there is none, with the tabs hidden until Send or Cancel

### Requirement: Flags come back as a Sell list and an undecided pile

The user gets a *Sell* list of items that could be worth something (the model's
suggestion) and everything else as a still-to-sort pile, grouped by room.

**Fails until:** the vision route returns structured items for a fixture frame set and the
page renders the Sell cards and the pile from that response.

The vision route SHALL return each item with `name`, `room`, `band`, `reason`, `confidence`, `frame` and `box`, and the page SHALL start flagged items at Sell and the rest undecided, grouped by room.

#### Scenario: Flags render as Sell and still-to-sort

- **WHEN** the frames are sent and the model responds
- **THEN** the Sell list shows each flagged item with its picture, value band, reason, and confidence, and the still-to-sort pile shows the remaining items grouped by room

#### Scenario: The model finds nothing worth flagging

- **WHEN** the response contains no flagged items
- **THEN** the Sell list shows an honest empty state and every item is still toggleable from the pile

### Requirement: Sort one item at a time

The user works the undecided pile one item at a time, can undo the last change, and can
move any item between destinations at any time.

**Fails until:** a full pass on the fixture set ends with every item in exactly one of Keep, Sell, or Donate.

The sort surface SHALL present one item at a time with Donate, Keep and Sell as buttons as well as gestures, SHALL offer Undo for the last change, and SHALL let any item, Sell items included, be moved between destinations.

#### Scenario: User sorts the pile

- **WHEN** the user taps or swipes a destination on an item
- **THEN** the item leaves the stack, the running counts update, and Undo restores it

#### Scenario: User overrides a Sell flag

- **WHEN** the user moves a Sell item to Keep or Donate
- **THEN** it leaves the Sell list, the override is counted for the flag-acceptance metric, and the value band is still visible on the item

### Requirement: Three destinations, toggled per item

Every item is headed to exactly one of Keep, Sell, or Donate, and the user can change that
for any item at any time.

**Fails until:** the reducer exposes `setDestination` with undo, and every list surface carries the toggle on each item.

The session SHALL hold a destination of `keep | sell | donate` (or undecided) per item, model-flagged items SHALL start at Sell, every card and row SHALL carry a keep / sell / donate toggle, the swipe surface SHALL offer all three (drag left donate, drag right keep, Sell a deliberate tap), and undo SHALL walk back one change at a time; there SHALL be no Toss destination.

#### Scenario: User moves a Sell item to Donate and back

- **WHEN** the user taps Donate on a Sell card, then Sell again
- **THEN** the item moves to the Donate list and back to Sell, both changes undoable, and the override counts only while it is off Sell

### Requirement: An item can be corrected, removed, or added

Tapping an item opens it full-screen (the mobile list → detail push), where the user can
rename it, change its room or band, write what the family knows, remove it if it is not a
real object, or add an item the model missed from the lists.

**Fails until:** the item screen edits save as the user types, remove asks once, and the add form puts a new item in the chosen list.

The item screen SHALL offer the destination toggle, editable name, room, band and note, SHALL remove an item only after a second confirmation, SHALL never change the destination as a side effect of an edit or a re-read, and the lists SHALL offer an add form whose new item starts with an honest low-confidence read.

#### Scenario: The model called it wrong

- **WHEN** the user renames "Upright piano" to "Spinet cabinet" and picks a lower band
- **THEN** the item keeps its destination and shows the new name and band everywhere, including the sell summary

#### Scenario: Not a real item

- **WHEN** the user taps Remove and confirms
- **THEN** the item and its history are gone and the user is back on the lists

### Requirement: A detail shot re-reads the item

When an item needs a closer look — a seam, a stamp on the bottom, a label — the user can
take up to three detail photos; each goes to the model with what the family knows and the
read updates.

**Fails until:** the refine route accepts one item plus detail photos and returns a better name, band, reason, confidence and mark reading; the item shows them.

The refine route SHALL validate the item and up to `DETAIL_SHOT.maxPerItem` base64 JPEGs, SHALL use the same provider order as the walkthrough pass, SHALL return `markReading` (what the mark says, or null), SHALL keep the photo and say so in fixture mode, and the UI SHALL show the re-read badge, the mark reading, and the detail thumbs on the card, the item screen and the sell sheet.

#### Scenario: A stamp on the bottom

- **WHEN** the user adds a photo of a maker's stamp and the provider is keyed
- **THEN** the item's name, band, reason and confidence update, the mark reading is shown, and the destination is untouched

#### Scenario: Demo mode

- **WHEN** no provider is keyed
- **THEN** the photo is kept on the item and the user is told nothing was re-read

### Requirement: A walkthrough grows room by room

A second use adds to the same walkthrough: the user films another room, the new items join
the existing lists, and the model is told what is already listed so it does not repeat it.
Starting over is an explicit choice, and the earlier walkthrough stays in history.

**Fails until:** a second capture appends items to the active session, the flag request carries the existing items as context, and the capture screen offers Start a new walkthrough separately.

The lists and the finish screen SHALL offer Film another room; a capture in that mode SHALL send the walkthrough's existing names and rooms with the frames and SHALL append what comes back (flagged items at Sell, the rest undecided) without moving anything already sorted; the capture screen SHALL offer Start a new walkthrough, which keeps the active one in history; a walkthrough MAY be named and the name SHALL show in history and on the summary; in fixture mode the sample house SHALL grow room by room from the known list.

#### Scenario: User films the next room on another day

- **WHEN** the user taps Film another room, films the kitchen, and sends
- **THEN** the kitchen's items append to the same walkthrough, the lists say how many were added, and nothing already sorted changes

#### Scenario: Re-walking a room

- **WHEN** the user films the living room again
- **THEN** the request names the living room's items as already listed and the model returns only objects it had not listed

#### Scenario: A different house

- **WHEN** the user taps Start a new walkthrough
- **THEN** a clean capture screen opens and the earlier walkthrough is still in Earlier walkthroughs
