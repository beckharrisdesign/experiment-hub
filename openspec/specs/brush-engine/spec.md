# brush-engine

## Purpose

A brush stamps a repeating penetration template along a path in its local tangent/normal frame at a declared pitch, so a motif follows the path's curves the way hand stitching does. Stamped penetrations flow through the plan verbatim — no resampling — and are counted separately from satin runs.

## Requirements

### Requirement: Motifs follow the path frame

The system SHALL sew a path routed to a brush as the brush's repeating
motif, stamped along the path at the declared pitch and oriented by the
path's local direction, so the motif follows curves the way hand
stitching would.

**Fails until:** a curved path tagged with a brush produces penetrations
whose motif orientation rotates with the path tangent.

#### Scenario: Motifs follow the path frame

- **WHEN** a stroke is routed to a brush with pitch p and the path bends
- **THEN** one motif instance is stamped per pitch step along the arc
  length, each instance positioned on the path and rotated to the local
  tangent/normal frame, with taper-free spacing across the bend

### Requirement: Brush output stays within machine bounds

The system SHALL emit brush runs as ordinary machine stitching: exact
penetrations the plan sews verbatim, every thread segment within
machine limits, encoded to DST/EXP like any other run.

**Fails until:** a brush run round-trips through `buildPlan`,
`encodeDst`, and `encodeExp` with no resampling and no segment over the
machine bound.

#### Scenario: Brush output stays within machine bounds

- **WHEN** any built-in brush converts at any supported pitch
- **THEN** the plan carries the brush's penetrations verbatim (no
  stitch-length resampling), no consecutive-penetration segment exceeds
  12.1 mm, and the DST/EXP encoders accept the plan unchanged

### Requirement: Unknown brush errors loudly

The system SHALL fail the conversion with a message naming the layer —
never a silent fallback — when a tag names a brush that is not in the
library or declares a pitch outside the supported range. The supported
pitch range is 1.0–10.0 mm inclusive (`p10`–`p100`); each motif's
default pitch is declared by the library and recorded in the authoring
contract.

#### Scenario: Unknown brush errors loudly

- **WHEN** a layer is tagged `st-brush-<name>` and `<name>` is not in
  the library, or its pitch parameter is outside the supported range
- **THEN** conversion fails with an error containing the layer name and
  the offending value, per the authoring principles' loud-error rule
