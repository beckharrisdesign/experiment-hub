# Spec delta: paid-asset-pack (elk-preview-feedback)

Modifies the *Watermarked preview of the asset pack* requirement of the active
[`etsy-listing-kit`](../../../etsy-listing-kit/specs/paid-asset-pack/spec.md) spec.
Everything else in the capability is unchanged.

## MODIFIED Requirements

### Requirement: Watermarked preview of the asset pack

Before paying, the visitor sees a watermarked preview of every image in the curated pack so value is demonstrated honestly — and the act of generating it gives feedback at every step: the visitor always knows generation is running, and the finished previews are brought to them rather than left below the fold.

**Fails until:** submitting a valid design (a) shows an explicit in-progress state at the point of action, (b) returns watermarked versions of the full v1 pack, and (c) brings the generated previews into view and announces the state change to assistive tech.

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
