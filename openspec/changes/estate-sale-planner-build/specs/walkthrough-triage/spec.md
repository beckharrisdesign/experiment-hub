## Outcomes

See `../../proposal.md` — Who: the adult child clearing a parent's house. Job: know what is
worth keeping before the junk truck comes; decide the rest one item at a time. Done when
the three requirements below hold on a phone. Not doing: appraisals, selling, accounts.

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

### Requirement: Flags come back as two lists

The user gets a *Sell* list of items that could be worth something and a *Keep / Toss* list
of everything else, grouped by room.

**Fails until:** the vision route returns structured items for a fixture frame set and the
page renders both lists from that response.

The vision route SHALL return each flagged item with `name`, `room`, `band`, `reason`, and `confidence`, and the page SHALL show flagged items under Sell and the rest under Keep / Toss.

#### Scenario: Flags render as Sell and Keep / Toss

- **WHEN** the frames are sent and the model responds
- **THEN** the Sell list shows each flagged item with its value band, reason, and confidence, and the Keep / Toss list shows the remaining items grouped by room

#### Scenario: The model finds nothing worth flagging

- **WHEN** the response contains no flagged items
- **THEN** the Sell list shows an honest empty state ("Nothing stood out — that happens") and the Keep / Toss list is still usable

### Requirement: Decide one item at a time

The user swipes or taps keep / toss on one item at a time, can undo the last decision, and
can move a sell item to keep or toss.

**Fails until:** a full swipe pass on the fixture set ends with every item in exactly one of Keep, Toss, or Sell.

The swipe surface SHALL present one item at a time with Keep and Toss as buttons as well as gestures, SHALL offer Undo for the last decision, and SHALL let a Sell item be moved to Keep or Toss.

#### Scenario: User sorts the Keep / Toss list

- **WHEN** the user taps or swipes Keep or Toss on an item
- **THEN** the item leaves the stack, the running counts update, and Undo restores it

#### Scenario: User overrides a Sell flag

- **WHEN** the user moves a Sell item to Keep or Toss
- **THEN** it leaves the Sell list, the override is counted for the flag-acceptance metric, and the value band is still visible on the item
