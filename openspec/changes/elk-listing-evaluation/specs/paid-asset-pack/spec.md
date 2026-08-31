## Outcomes

See [proposal.md](../../proposal.md) — the pack is repositioned as the fix the evaluation recommends, de-niched from embroidery to any listing type, and rebuilt to generate from the evaluated listing itself (approved Figma 02.26/02.27; design decisions 27–30).

## MODIFIED Requirements

### Requirement: The full listing kit is offered as the evaluation's remedy, without the embroidery frame

The paid offer is a full listing kit — ten new-or-updated Etsy-ready images plus a reusable template, a suggested 140-character title, 13 suggested tags, and alt text for every photo — presented beneath the evaluation report as the remedy for the gaps it showed, with each report card stating what the kit does about its gap ("What's in the kit") and a listing-video add-on teased as coming soon. No ELK surface frames the product as embroidery-specific.

**Fails until:** the evaluation result renders the kit offer listing its contents mapped to the flagged gaps, the fulfilled kit delivers title/tag/alt-text suggestions alongside the images as paste-ready text (no Etsy writes), and no user-facing ELK copy mentions embroidery, hoops, or stitch-specific language.

#### Scenario: The report resolves into the kit offer

- **WHEN** a visitor's evaluation report renders with flagged gaps
- **THEN** the kit offer appears beneath the report cards listing what it fixes — photos, title, tags, alt text — with the video add-on shown as "coming soon" (not purchasable), and its CTA leads to checkout for the evaluated listing — never to an upload flow

#### Scenario: The kit delivers suggestions, not writes

- **WHEN** a kit purchase is fulfilled
- **THEN** the buyer receives the ten images and template plus a suggested title, suggested tags, and per-photo alt text as copy-ready text, and nothing is ever written to their Etsy shop

#### Scenario: No embroidery framing survives anywhere

- **WHEN** any user-facing ELK surface is reviewed (landing, evaluation, result, emails)
- **THEN** the copy addresses Etsy sellers generally — no embroidery-specific wording, imagery labels, or keywords remain

## ADDED Requirements

### Requirement: The kit is bought for, and built from, the evaluated listing

Checkout is seeded by the scraped listing — the buyer never uploads anything and never re-enters what the evaluation already read. Fulfillment regenerates the kit from the listing's own photos and API fields. The upload dropzone does not exist on this path.

**Fails until:** `POST /api/checkout` accepts a `listing_id` (replacing the upload token on this path), the checkout view renders the listing's identity (photo, title, "read from your public listing"), and a fulfilled order's images derive from the listing's CDN photos rather than an uploaded design.

#### Scenario: Checkout knows the listing

- **WHEN** a visitor clicks a kit CTA from an evaluation
- **THEN** the checkout view shows that listing's photo and title with the deliverables list and price, and proceeding creates a Stripe session tied to the `listing_id` — with no upload step anywhere between report and payment

#### Scenario: A paid order generates while the buyer watches

- **WHEN** payment completes and the buyer lands back on `/result`
- **THEN** the page renders a GENERATING state — the sourced listing brief as a "what we read from your listing" block, a progress list, and images appearing as they finish — until the webhook-driven fulfillment completes, and a mid-generation refresh of the same URL is safe

### Requirement: Ten images and a template are built by the scene ladder from three inputs only

Every kit image derives from (1) the listing's own photos — re-edits first: squared, toned, detail-cropped; (2) the listing's API fields — a data card renders only when its field exists; (3) a palette sampled from the photos, so "on brand" is a mechanic, not taste. When photos or fields run short, slots backfill with additional photo treatments — never blanks, never fabrication. The reusable template ships as a deliverable carrying the sampled palette, with dashed slots for what only the seller knows.

**Fails until:** the generator produces ten 2000px Etsy-ready images plus the template from a listing snapshot (no uploaded design input), the six embroidery-hoop compositions are retired from this path, and a wording-thin fixture (placeholder description, zero tags) still yields ten ready-to-upload images.

#### Scenario: A two-photo listing still gets a full kit

- **WHEN** the kit is generated for a listing with two photos and thin wording
- **THEN** ten ready-to-upload images result — photo re-edits and detail crops plus facts-only data cards — with no blank images and no invented copy

#### Scenario: Data cards never invent facts

- **WHEN** a template card's backing field is absent from the listing (no variations, no dimensions)
- **THEN** that card does not render as a kit image; its blank version exists only in the shipped template for the seller to complete

### Requirement: Kit wording comes from a sourced brief; text deliverables are grounded generation

A deterministic listing brief is extracted verbatim from the listing's title, description, tags, and alt text — every phrase naming its source field. Scene-card copy quotes the brief only. The three text deliverables (suggested 140-character title, 13 tags, per-photo alt text) are composed by a small LLM pass grounded strictly in the brief and the listing's photos, behind an interface so fixtures and tests run without an API key.

**Fails until:** the brief module exists with per-phrase source attribution, scene copy is traceable to brief entries, the composer runs as a swappable interface (deterministic stub for tests, Claude Haiku in production), and a wording-thin listing renders facts-only cards regardless of the composer.

#### Scenario: Scene copy is traceable

- **WHEN** any generated template card carries a phrase
- **THEN** that phrase exists in the listing brief with a named source field (title, description, tag, alt text, or API fact) — an invented phrase is a defect

#### Scenario: Generation is grounded

- **WHEN** the composer writes the suggested title, tags, or alt text
- **THEN** its inputs are the brief and the listing's photos only, and its output makes no product claim absent from them (no materials, dimensions, or qualities the listing never stated)

#### Scenario: Tests run keyless

- **WHEN** the fixture test suite generates a kit
- **THEN** the deterministic composer stub is used and no external API is called
