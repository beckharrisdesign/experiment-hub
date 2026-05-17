# photo-filters-banner-studio

## Purpose

Client-only photo ingest, filter presets, banner overlays, composite canvas preview, and PNG download for the photo banner studio experiment prototype.

## Requirements

### Requirement: Visitors ingest a local JPEG, PNG, or WebP for compositing

Guests SHALL upload a JPEG, PNG, or WebP file from disk; upon decode the client MUST hydrate an drawable bitmap that powers the Canvas preview without persisting pixels to disk beyond memory.

#### Scenario: Happy path ingest

- **WHEN** a visitor selects `hero.jpg`
- **THEN** the preview MUST visibly render imported pixels within acceptable interactive latency budgets noted in README

#### Scenario: Unsupported MIME

- **WHEN** a visitor selects TIFF or plaintext
- **THEN** an inline error MUST appear and ingest MUST gracefully abort **without crashing** subsequent interactions

---

### Requirement: Visitors apply reusable filter presets atop the sourced bitmap

The UI MUST expose at least three named filter presets (for example Normal, Slate Duotone, High Contrast) that SHALL mutate drawn pixels deterministically prior to overlays; swapping presets MUST repurpose the untouched source backing store so repeat toggles preserve fidelity until the visitor replaces the asset.

#### Scenario: Preset switch

- **WHEN** a visitor toggles from `normal` to `mono-pop`
- **THEN** tonal response MUST visibly change compared to luminance probes captured in screenshots

---

### Requirement: Promo banner overlays frame the composite without blocking readability

Visitors SHALL optionally apply at least two predetermined banner/frame overlays anchored to predefined safe rails (such as header strip and footer ribbon) authored in-repo while preserving dominant portrait unobstructed zones.

#### Scenario: Banner layering

- **WHEN** a visitor enables the footer ribbon overlay
- **THEN** overlays MUST redraw above filtered pixels AND beneath future additive stickers if layering expands later

---

### Requirement: Visitors download a flattened PNG export

Selecting **Download MUST** marshal the finalized Canvas backing store into PNG bytes surfaced through a deterministic filename (`photo-studio-export.png`) and MUST revoke temporary object URLs afterward so repeat exports remain leak-safe.

#### Scenario: Export fidelity

- **WHEN** a visitor composites filters plus banners before downloading
- **THEN** resultant PNG SHOULD match Canvas snapshot tolerances enumerated in QA notes modulo codec rounding allowances

---

### Requirement: Operators navigate controls via keyboard

Every interactive authoring control (pick photo, presets, overlays, export) MUST be reachable through Tab traversal with visible `:focus-visible` silhouettes aligning to hub dark-theme contrast guidance.

#### Scenario: Keyboard-only path

- **WHEN** a visitor never uses pointing devices after initial load completes
- **THEN** ingest → presets → overlays → Download MUST retain predictable focus sequencing without traps or hidden skips
