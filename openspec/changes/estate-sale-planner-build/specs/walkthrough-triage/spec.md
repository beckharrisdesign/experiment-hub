## Outcomes

See `../../proposal.md` — Who: the adult child clearing a parent's house. Job: know what is
worth keeping before the junk truck comes; decide the rest one item at a time. Done when
the three requirements below hold on a phone. Not doing: appraisals, selling, accounts. Round 03 (founder instruction): there is no Toss — keep, sell, donate are the only destinations, toggled per item; items can be corrected, removed, added, and re-read from detail shots.

## ADDED Requirements

### Requirement: Walkthrough becomes frames on the device

The user films or picks a walkthrough video (or photos) and sees the sampled frames before
anything is sent.

**Fails until:** a 10-minute phone video yields a frame set that stays inside the budget in
`lib/estate-sale-planner/config.ts`, with no raw video in any request.

The route SHALL sample frames from the video in the browser, drop near-duplicates, downscale, and send only on the user's confirm.

#### Scenario: User films a walkthrough and confirms the frames

- **WHEN** the user records or picks a video and taps Continue
- **THEN** a grid of sampled frames appears with a count and a Send button, and no network request carrying video or frames has been made yet

#### Scenario: User has photos instead of video

- **WHEN** the user picks one or more photos
- **THEN** the same frame grid appears with those photos as the frames

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
