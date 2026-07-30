# Spec: paid-asset-pack

## Outcomes

- **Who:** An embroidery / craft seller with one finished design file who wants Etsy-ready listing assets without hand-prepping them.
- **Job:** One design file → a curated pack of Etsy-ready listing images, paid once, downloaded immediately.
- **Done when:** Upload → watermarked preview → one-time Stripe payment → webhook-verified un-watermarked download + confirmation email, no account.
- **Not doing:** Subscriptions, accounts, editor, multi-file/bulk, Etsy API write-back, AI generation, **video (v1)**, alt-size exports or a "hero" concept (Etsy handles display sizing; all images ship as ~2000px squares).

## Pack composition (v1)

All outputs are **~2000px square** (Etsy recommends ≥2000px; keeps first-photo ≥635px), delivered as web-optimized JPG/PNG under Etsy's 1MB-per-image guidance. The pack is a **curated set of ~6 distinct listing images** (not padded toward Etsy's 20 ceiling), generated from the single uploaded design:

1. **Flat product render** — design cleaned and centered on a neutral background
2. **Framed / wall mockup** — design shown framed in a styled interior
3. **On-fabric / in-hoop mockup** — embroidery context (hoop or garment)
4. **Detail crop** — close zoom emphasizing stitch/texture detail
5. **Scale / context shot** — design shown at size against a reference object
6. **"What you get" info card** — text overlay stating format, dimensions, and contents

Exact mockup backgrounds/props are reviewable defaults (see REVIEW_QUEUE #11); the *set* above is the v1 contract.

## ADDED Requirements

### Requirement: Upload one design file

A visitor can upload a single design image and see it accepted, with clear format and size limits.

**Fails until:** the landing route accepts a PNG/JPG/SVG upload and rejects unsupported/oversized files with a readable message.

#### Scenario: Visitor uploads a valid design file

- **WHEN** a visitor selects or drops a PNG/JPG/SVG within the size limit
- **THEN** the file is accepted, a thumbnail is shown, and the "generate preview" action becomes available

#### Scenario: Visitor uploads an unsupported or oversized file

- **WHEN** a visitor uploads a non-image, an unsupported type, or a file over the size limit
- **THEN** the upload is rejected client- and server-side with a specific, non-technical error and no order is created

### Requirement: Watermarked preview of the asset pack

Before paying, the visitor sees a watermarked preview of every image in the curated pack so value is demonstrated honestly — and the act of generating it gives feedback at every step: the visitor always knows generation is running, and the finished previews are brought to them rather than left below the fold. *(Feedback clauses merged from change `elk-preview-feedback`, shipped PR #345 / closed #336.)*

**Fails until:** submitting a valid design (a) shows an explicit in-progress state at the point of action, (b) returns watermarked versions of the full v1 pack (the ~6 curated 2000px-square images listed under Pack composition), and (c) brings the generated previews into view and announces the state change to assistive tech.

#### Scenario: Visitor previews the generated pack

- **WHEN** a visitor generates a preview from a valid design
- **THEN** watermarked renders of every image in the curated pack are shown, with the price and exactly what they receive (count, dimensions, Etsy-ready) stated

#### Scenario: Visitor sees generation in progress

- **WHEN** a visitor submits their design for preview and generation has not yet completed
- **THEN** the button/action area shows an explicit in-progress state (the click visibly "took"), and repeat submissions are prevented while running

#### Scenario: Finished previews are brought into view

- **WHEN** preview generation completes
- **THEN** the page scrolls the previews section into view without the visitor scrolling manually — smoothly, or instantly when `prefers-reduced-motion` is set

#### Scenario: State changes are perceivable without vision

- **WHEN** generation starts, completes, or fails
- **THEN** the state change is announced via an `aria-live` region so screen-reader users get the same "it's running / it's ready / it failed" signal, and focus order still reaches the previews naturally

### Requirement: One-time Stripe payment

The visitor pays a single fixed price via Stripe Checkout; no subscription and no account are required.

**Fails until:** a preview leads to a Stripe Checkout session in `payment` mode carrying `experiment_id` and `order_id` metadata, and an order row is created before redirect.

#### Scenario: Visitor completes a one-time payment

- **WHEN** a visitor clicks pay and completes Stripe Checkout (test mode)
- **THEN** Stripe processes a one-time charge and redirects to a success URL tied to their `order_id`

#### Scenario: Visitor cancels payment

- **WHEN** a visitor abandons or cancels Stripe Checkout
- **THEN** they return to the preview with their upload intact and no charge and no fulfillment occur

### Requirement: Webhook-verified, idempotent fulfillment and delivery

Fulfillment happens only after a signature-verified webhook confirms payment, exactly once, and the un-watermarked pack plus a confirmation email are delivered.

**Fails until:** a verified `checkout.session.completed` event marks the order paid, generates the un-watermarked pack once, and exposes a signed download while sending one email.

#### Scenario: Payment webhook fulfills the order once

- **WHEN** Stripe sends a signature-valid `checkout.session.completed` for an order
- **THEN** the order is marked paid, the un-watermarked pack (all curated images, as a zip) is generated, a signed download link is available, and one confirmation email is sent

#### Scenario: Duplicate webhook does not double-fulfill

- **WHEN** the same Stripe event or session is delivered more than once
- **THEN** the order is fulfilled only once and no duplicate download, email, or revenue count occurs

#### Scenario: Buyer retrieves the result later

- **WHEN** a paid buyer revisits their signed download link before it expires
- **THEN** they can download the un-watermarked pack again without an account
