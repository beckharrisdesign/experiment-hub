# brush-library

## Outcomes

See `../../proposal.md` — the six motifs from the founder's Figma
stitch-brush explorations, reachable by name from the design file.

## ADDED Requirements

### Requirement: Six motifs sew on straight and curved paths

The built-in library ships `cross`, `tick`, `chain`, `dot`, `bird`, and
`bean`, each visually recognizable as its Figma exploration along both
straight and curved paths.

**Fails until:** each named brush converts a straight and a curved test
path into penetrations matching its motif geometry.

#### Scenario: Six motifs sew on straight and curved paths

- **WHEN** a stroke is tagged `st-brush-cross`, `st-brush-tick`,
  `st-brush-chain`, `st-brush-dot`, `st-brush-bird`, or `st-brush-bean`
- **THEN** the path sews as that motif — X pairs, angled ticks, linked
  loops, compact dot clusters, V tracks, or tripled bean segments — at
  the declared pitch, on straight and curved paths alike

### Requirement: Tag routing with pitch and readout

Brushes are declared per the authoring contract — `st-brush-<name>`
with an optional `p<n>` pitch (mm ×0.1) — inherit from groups like
every other tag, and their effect is visible in the design readout.

#### Scenario: Tag routing with pitch and readout

- **WHEN** a layer or group is named with `st-brush-<name>` and
  optionally `p<n>`, exported from Figma with Include ID, and converted
- **THEN** the tagged strokes sew with that brush at the given pitch
  (library default when omitted), children may override the group tag,
  and the panel's stats count the brush runs so the tag has a visible
  effect
