## Outcomes

See `../../proposal.md`. This capability is the exit on the Donate side: the donate list goes
to a pickup service in one counted tap, and the user keeps a printable sell summary (the
Sell Sheet, built but unlinked and free for now, is `../sell-sheet/spec.md`). There is no Toss list (founder instruction,
round 03), and no haul-away exit (founder, 2026-10-30). Not doing: booking in-app, the
sell-side referral (Build Unit 2).

## ADDED Requirements

### Requirement: One tap to schedule a donation pickup

When the sort is finished the user sees one call-to-action that hands the donate list to a
pickup service, and the tap is counted before it redirects.

**Fails until:** the exit route records a tap for a session with `kind: donate` and then redirects to the configured link.

The exit SHALL be a single centered button on its own line, SHALL record the tap server-side as an `esp_events` row (structured log line when the database is absent), and SHALL then open the pickup service's deep link or `tel:` link from `config.ts`; while no partner deal exists the link SHALL carry a placeholder referral parameter and the page SHALL say so in plain language.

#### Scenario: User taps the pickup button

- **WHEN** the sort is complete and the user taps the pickup button
- **THEN** the tap is recorded with the session id, `kind: donate`, and the donate count, and the pickup link opens

#### Scenario: The pickup service is not available in the user's area

- **WHEN** the user indicates the service does not cover them
- **THEN** the fallback pickup link is offered and the tap is still counted, labelled as fallback

#### Scenario: A request for the old haul-away exit

- **WHEN** the exit route is called with `kind=haul`
- **THEN** it is treated as the donation pickup: the tap is recorded with `kind: donate` and the pickup link opens

### Requirement: The sell list survives the session

The user can print or save the Sell list as a one-page summary, and the walkthrough itself
is kept on the device.

**Fails until:** the summary renders as a print-friendly page with every Sell item, its band, reason, mark reading and note; the exit screen says the walkthrough is saved on this device.

The summary SHALL be a print-friendly page listing every Sell item with its band, reason, any mark reading and the family's note, SHALL state that the bands are a model's guess and not an appraisal, and the exit screen SHALL say that the walkthrough is saved on this device and that the Sell Sheet is the copy to share.

#### Scenario: User prints the sell summary

- **WHEN** the user taps Save or print the sell list
- **THEN** a one-page layout of the Sell list opens with the "not an appraisal" line at the top
