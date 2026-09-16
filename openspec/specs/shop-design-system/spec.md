# shop-design-system

## Purpose

Codify the W&H standards layer as two written chapters — image principles and content principles — so that both a human reviewer today and the evaluation rubric later can check work against them.

## Outcomes

See [proposal.md](../../changes/archive/2026-09-16-etsy-ecosystem-map/proposal.md) Outcomes — the W&H standards layer codified from fragments so both a human and, later, the evaluation rubric can check work against it; MVDS as the base plus Etsy-specific extensions.

## Requirements

### Requirement: Two chapters codified from existing fragments

The shop design system exists as two written chapters — image principles (scene composition language, palette, template photography, thumbnail lessons) and content principles (copy rules, house-style description skeleton, alt-text role templates) — assembled from the fragments already living in code, docs, and session memory, expressed on MVDS's base with Etsy-specific extensions.

**Fails until:** either chapter exists only as scattered fragments.

The system SHALL be one findable document set, not a trail of code comments.

#### Scenario: A principle is findable where it governs

- **WHEN** someone drafts listing copy or generates listing images
- **THEN** the chapter governing that work is one link away and states the applicable principles

### Requirement: Every principle carries its receipt

Each principle cites where it came from — the code that embodies it, the data pull that evidenced it, or the dated session lesson that taught it. No invented rules.

**Fails until:** any principle appears without provenance.

Every principle SHALL name its source.

#### Scenario: Reading a principle's provenance

- **WHEN** a principle is questioned or revisited
- **THEN** its citation points to the artifact that justifies it, and a principle with no surviving justification is removed rather than kept on inertia

### Requirement: The system is checkable

The chapters are written so adherence is a yes/no question per principle — the form the evaluation rubric's future brand tier needs, and the form a human reviewer can apply today.

**Fails until:** checking a listing against the system requires interpretation rather than reading.

Each principle SHALL be verifiable against a real listing or image without judgment calls about what the principle means.

#### Scenario: A batch review checks the system

- **WHEN** a new listing batch reaches its review deck
- **THEN** each principle can be marked met or not met for the batch, and misses are visible before anything ships
