## Outcomes

See `../../proposal.md`. This capability is the paid moment on the family's side: the sell
list with its photos, bought once and saved at a link that survives closing the tab. It
also makes every counted event a database row, so the validation plan is a query. Not
doing: accounts, editing a saved sheet, refunds in-app (Stripe dashboard), the sell-side
referral (Build Unit 2).

## ADDED Requirements

### Requirement: The sell list can be bought once as a Sell Sheet

From the summary the user can pay once to save the Sell list, with each item's photo, band,
confidence, and reason, at a link they can share.

**Fails until:** the checkout route saves the sheet unpaid, opens a Stripe Checkout carrying the experiment and sheet ids, and returns its URL.

The checkout SHALL accept only the Sell list (name, room, band, reason, confidence, and an optional JPEG thumbnail under the size cap), SHALL save it before opening Checkout, SHALL use the hub's shared Stripe key with this experiment's id in the session metadata, and SHALL hand back the existing link without a charge when that browser session's sheet is already paid.

#### Scenario: User buys the sheet

- **WHEN** the user taps Save the sell sheet on the summary
- **THEN** the sheet is saved and Stripe Checkout opens for the one-time price from `config.ts`

#### Scenario: Payments are not configured

- **WHEN** no Stripe key is present
- **THEN** the summary says payments are not configured yet and the free print still works

### Requirement: Payment is confirmed by the webhook, never the success URL

A sheet is unlocked only when Stripe's signed `checkout.session.completed` event for it
arrives.

**Fails until:** the webhook route verifies the signature, marks the sheet paid exactly once per Stripe event, and the sheet page shows a holding note until then.

The webhook SHALL verify the signature against this route's own signing secret, SHALL ignore events scoped to other experiments, SHALL be idempotent on the Stripe event id, SHALL record the buyer's email in the shared `experiment_submissions` table, and SHALL return a 5xx so Stripe retries when the database write fails.

#### Scenario: Stripe confirms the payment

- **WHEN** a paid `checkout.session.completed` event for the sheet arrives with a valid signature
- **THEN** the sheet is marked paid with the event id, and the buyer's email is recorded once

#### Scenario: The user lands on the success URL before the webhook

- **WHEN** the sheet page is opened with `?paid=1` and the sheet is not yet marked paid
- **THEN** the page says the payment is settling and offers a reload, and shows no items

### Requirement: Every counted event is a row

Exit taps and checkout starts are stored where they can be counted for the Propose
thresholds.

**Fails until:** the exit route inserts an `esp_events` row (and still logs the record) before redirecting.

The exit and checkout routes SHALL insert a row in `esp_events` with the session id, event, count, and fallback / via labels; when Supabase is not configured they SHALL fall back to the structured log line and SHALL NOT fail the request.

#### Scenario: Exit tap with the database configured

- **WHEN** the user taps the donation pickup button
- **THEN** an `esp_events` row is written and the redirect still happens

#### Scenario: Exit tap without the database

- **WHEN** Supabase is not configured
- **THEN** the record is logged, nothing is thrown, and the redirect still happens
