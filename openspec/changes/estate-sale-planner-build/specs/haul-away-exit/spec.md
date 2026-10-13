## Outcomes

See `../../proposal.md`. This capability is the exit: the toss list goes to a haul-away
service in one tap, and the user keeps a printable sell summary. Not doing: booking in-app,
the sell-side referral (Build Unit 2).

## ADDED Requirements

### Requirement: One tap to clear the toss list

When the sort is finished the user sees one call-to-action that hands the toss list to a
haul-away service, and the tap is counted before it redirects.

**Fails until:** the exit route records a tap for a session and then redirects to the configured link.

The exit SHALL be a single centered button on its own line, SHALL record the tap server-side, and SHALL then open the haul-away deep link or `tel:` link from `config.ts`; while no affiliate deal exists the link SHALL carry a placeholder referral parameter and the page SHALL say so in plain language.

#### Scenario: User taps the haul-away button

- **WHEN** the sort is complete and the user taps the haul-away button
- **THEN** the tap is recorded with the session id and item count, and the haul-away link opens

#### Scenario: Haul-away is not available in the user's area

- **WHEN** the user indicates the service does not cover them
- **THEN** a generic "find a hauler" link is offered and the tap is still counted, labelled as fallback

### Requirement: The sell list survives the session

The user can print or save the Sell list as a one-page summary, because closing the tab
loses the session.

**Fails until:** the summary renders as a print-friendly page with every Sell item, its band, and its reason.

The summary SHALL be a print-friendly page listing every Sell item with its band and reason, SHALL state that the bands are a model's guess and not an appraisal, and the session screen SHALL say that closing the tab loses it.

#### Scenario: User prints the sell summary

- **WHEN** the user taps Print or save summary
- **THEN** a one-page layout of the Sell list opens with the "not an appraisal" line at the top
