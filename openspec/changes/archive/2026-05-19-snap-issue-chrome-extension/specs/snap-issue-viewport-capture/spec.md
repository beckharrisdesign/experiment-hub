## Outcomes

(See [proposal.md](../../proposal.md) — Who / Job / Done when / Not doing.)

## ADDED Requirements

### Requirement: User starts rectangle capture from the toolbar action or a keyboard command

The extension SHALL offer both the extension action click and a `commands`-registered shortcut path that starts the same capture flow on the active tab where programmatic capture and scripting are allowed.

**Fails until:** Triggering either path on a supported page results in the selection overlay appearing without a full page reload.

#### Scenario: Start capture from the extension icon

- **WHEN** the user clicks the extension toolbar action on a page where the extension may run
- **THEN** the extension SHALL begin the selection-overlay flow (inject or message content script as designed) so the user can drag a rectangle

#### Scenario: Start capture from the keyboard command

- **WHEN** the user invokes the manifest command (including a user-customized binding from `chrome://extensions/shortcuts`)
- **THEN** the extension SHALL start the same selection-overlay flow as the toolbar action on the active tab

### Requirement: User selects a viewport rectangle with dimmed context, clear affordances, and clean teardown

The extension SHALL present a full-viewport overlay that dims outside the drag rectangle, shows a clear rectangle border while selecting, cancels on Escape, confirms on Enter when a valid selection exists, removes the overlay after completion or cancel, and supports another capture later in the session without restarting the browser.

**Fails until:** Escape always dismisses the overlay; Enter with a valid selection hands off to capture; a second trigger works after a full flow.

#### Scenario: Draw a rectangle with dimmed outside region

- **WHEN** the user presses the primary button and drags on the overlay
- **THEN** the overlay SHALL dim page content outside the current drag rectangle and show a visible border for the active selection

#### Scenario: Confirm selection with Enter

- **WHEN** the user has a non-degenerate selection and presses Enter
- **THEN** the overlay SHALL hand coordinates to the capture pipeline, then remove itself and restore normal page interaction

#### Scenario: Cancel selection with Escape

- **WHEN** the user presses Escape during an active selection session
- **THEN** the overlay SHALL close without capturing or creating an issue

#### Scenario: Capture again in the same browser session

- **WHEN** the user completes or abandons a flow and triggers capture again
- **THEN** the selection overlay SHALL behave the same as the first time without requiring an extension reload

### Requirement: Cropped screenshot matches the selected viewport region on high-DPI displays, with recoverable capture errors

The extension SHALL capture the visible tab with `chrome.tabs.captureVisibleTab()`, map the user’s CSS-pixel viewport rectangle to bitmap crop coordinates accounting for `devicePixelRatio` (and related scaling rules), produce a cropped image for preview and downstream use, reject invalid or zero-area selections with user-visible feedback, and surface capture failures (for example restricted URLs or API errors) without silent failure.

**Fails until:** On a Retina (`devicePixelRatio` > 1) display, visual spot-check shows the crop matches the chosen region; zero-area selection never reaches GitHub submit.

#### Scenario: Crop aligns with selection on high-DPI

- **WHEN** the user confirms a rectangle on a display where `devicePixelRatio` is not 1
- **THEN** the cropped image SHALL match the pixels the user framed over the live page inside that rectangle (within expected browser capture behavior)

#### Scenario: Invalid selection is blocked

- **WHEN** the selection is zero area or below the extension’s documented minimum
- **THEN** the extension SHALL not proceed to review/GitHub submit and SHALL show recoverable feedback

#### Scenario: Visible-tab capture failure is surfaced

- **WHEN** `captureVisibleTab` fails or the active page cannot be captured under extension permissions
- **THEN** the user SHALL see an actionable error message (for example permission or restricted page) instead of a silent no-op
