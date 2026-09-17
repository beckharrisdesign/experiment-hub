# brush-library

## Purpose

The six built-in motifs — `cross`, `tick`, `chain`, `dot`, `bird`, `bean` — and their `st-brush-<name>` tag routing with a `p` pitch parameter. Unknown names and out-of-range pitches fail by layer name rather than falling back to a running stitch.

## Requirements

### Requirement: Six motifs sew on straight and curved paths

The built-in library SHALL ship `cross`, `tick`, `chain`, `dot`,
`bird`, and `bean`, each with a declared default pitch and each
visually recognizable as its Figma exploration along both straight and
curved paths.

**Fails until:** each named brush converts a straight and a curved test
path into penetrations matching its motif geometry.

#### Scenario: Six motifs sew on straight and curved paths

- **WHEN** a stroke is tagged `st-brush-cross`, `st-brush-tick`,
  `st-brush-chain`, `st-brush-dot`, `st-brush-bird`, or `st-brush-bean`
- **THEN** the path sews as that motif — X pairs, angled ticks, linked
  loops, compact dot clusters, V tracks, or tripled bean segments — at
  the declared pitch, on straight and curved paths alike

### Requirement: Tag routing with pitch and readout

The system SHALL route strokes declared per the authoring contract —
`st-brush-<name>` with an optional `p<n>` pitch (mm ×0.1) — to the
named brush, inherit the tag from groups like every other tag, and
surface the effect in the design readout: **Brush runs** counts one per
tagged path routed to a brush, the same unit Satin sections uses for
satin runs.

#### Scenario: Tag routing with pitch and readout

- **WHEN** a layer or group is named with `st-brush-<name>` and
  optionally `p<n>`, exported from Figma with Include ID, and converted
- **THEN** the tagged strokes sew with that brush at the given pitch
  (library default when omitted), children may override the group tag,
  and the panel's stats count the brush runs (one per tagged path) so
  the tag has a visible effect
