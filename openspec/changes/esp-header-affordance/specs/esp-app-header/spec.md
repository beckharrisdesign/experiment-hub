## Outcomes

See `../../proposal.md` for Who / Job / Done when / Not doing. In short: on a phone, the way back
up a level is unmistakably a button, the page's name still shows, and a placeholder menu sits in
the upper right on every planner page, ready for account and persona work. Option A was picked
(Katy, 2026-10-28: "A for now"): one Back button to the parent, then the title, then the menu.

## ADDED Requirements

### Requirement: The way back is a button

On any screen below Home, the header's left edge is a Back button that names the screen it goes
back to.

**Fails until:** on the Sort screen at 428 px, the header's first control is a button with a back
chevron and the sale's name, at least 44 px tall, with a visible container.

The header SHALL render the parent screen as a single MVDS `Button` (chevron + parent label,
≥ 44 × 44 px on touch) linking to the parent, and SHALL NOT render deeper ancestors.

#### Scenario: Back from a sale's inner screens

- **WHEN** the family is on a sale's Sort, Progress, Add photos or item screen
- **THEN** the header shows one Back button labelled with the sale's name, and tapping it opens that sale's Items screen

#### Scenario: Back from a sale to Home

- **WHEN** the family is on a sale's Items screen, or on Take photos for a new sale
- **THEN** the Back button is labelled "Home" and returns to Home

#### Scenario: Back from a source photo

- **WHEN** the family is on an item's source photo
- **THEN** the Back button is labelled with the item's name and returns to that item

#### Scenario: Home has no Back button

- **WHEN** the family is on Home
- **THEN** the header shows no Back button

### Requirement: The page's name stays visible

The current screen's name always shows in the header, after the Back button, and never pushes the
menu off the row.

The header SHALL show the current title after the Back button, truncating with an ellipsis before
the Back label or the menu shrinks.

#### Scenario: Long names truncate, the controls stay

- **WHEN** a sale or item name is long enough to overflow the row at 360 px
- **THEN** the title truncates with an ellipsis, the parent label truncates inside the Back button, and the Back button and menu stay fully visible and at least 44 px

### Requirement: A menu button sits in the upper right on every planner page

A placeholder menu button is pinned to the header's right edge everywhere under
`/estate-sale-planner`, ready for account and persona work.

**Fails until:** on Home, a sale screen, an item screen and the sell list, the header's last
control is a 44 px button named "Menu" for screen readers.

The header SHALL render a 44 × 44 px MVDS icon `Button` with a menu glyph and the accessible name
"Menu" at its right edge on every planner page.

#### Scenario: Menu on every page

- **WHEN** the family opens Home, a sale screen, an item screen, or the sell list
- **THEN** a Menu button shows at the right edge of the header, and a screen reader announces it as "Menu, button"

### Requirement: The menu opens a placeholder and nothing else

Tapping the menu opens an empty "Account & profile" panel, which closes without side effects.

The Menu button SHALL open a dismissible panel headed "Account & profile" with a Close button and
no other content or actions, closable by its close button, Escape, or tapping outside, with
focus returned to the Menu button on close.

#### Scenario: Open and close the placeholder

- **WHEN** the family taps Menu
- **THEN** a panel headed "Account & profile" opens with only a Close button, and closing it (close button, Escape, or tapping outside) returns focus to Menu and changes nothing else

### Requirement: The taller header still fits its contents

The header grows to hold 44 px controls without clipping anything, including the item screen's
destination toggle underneath.

The header SHALL set `--chrome-top-height` to fit its rows (the control row alone, or the control
row plus the item screen's destination toggle) so nothing is clipped.

#### Scenario: Item screen keeps its toggle

- **WHEN** the family is on an item screen at 428 px
- **THEN** the sticky header shows the Back / title / Menu row and, beneath it, the Sell / Donate / Keep toggle, with neither row clipped
