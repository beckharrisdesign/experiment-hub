# Spec: untagged-fallback

## Outcomes

- **Who:** Stitchers preparing their own artwork — the founder first —
  who tag layers in Figma and expect the converter to sew what the file
  declares, not what a panel switch decides on top of it.
- **Job:** Drop a prepped SVG in and get the stitches the design asks
  for, without having to notice, remember, or re-set global toggles that
  can silently contradict every tag in the file.
- **Done when:** The panel carries no all-or-nothing stitch switch, a
  design converts identically however the panel was last left, and the
  only way to change one shape's stitch is to say so in the design file.
- **Not doing:** Changing the heuristics themselves; deleting the fill
  parameters (they are hidden, still tag-overridable); building the
  per-colour-block controls that replace them later.

## ADDED Requirements

### Requirement: No global stitch switch

The panel offers no control that changes how every shape in the file is
sewn.

**Fails until:** the converter page renders zero stitch-behaviour
switches.

The panel SHALL expose no control that alters stitch type for more than
the shape it names.

#### Scenario: Panel carries no all-or-nothing stitch control

- **WHEN** a user opens the converter and inspects the panel
- **THEN** **Fill shapes**, **Satin narrow fills** and **Satin strokes
  (min 0.5 mm)** are absent, and **Fabric** remains

### Requirement: Untagged shapes keep today's behaviour

A design that declares nothing sews exactly as it does now.

**Fails until:** an untagged fixture produces a byte-identical plan to
today's default-panel conversion.

Untagged geometry SHALL sew by the documented fallback: fills hatch as
tatami, narrow fills sew as two-rail satin where they qualify, and
strokes at or under 10 mm sew as satin.

#### Scenario: Un-prepped art converts unchanged

- **WHEN** a user converts an SVG carrying no `st-` tags
- **THEN** the stitch plan matches what the same file produced before
  the switches were removed

### Requirement: The design file is the only override

Changing one shape's stitch means saying so in the file.

**Fails until:** the same file converts identically twice from different
panel states.

A declared tag SHALL determine that shape's stitch, and no panel state
SHALL change it.

#### Scenario: Conversion is reproducible from the file alone

- **WHEN** the same SVG is converted twice, in two separate sessions
  with the panel left in different states
- **THEN** both conversions produce the same stitch count, colour blocks
  and sew order

### Requirement: Fill parameters stay declarable

Angle and density are still controllable, from the file rather than the
panel.

**Fails until:** an `a`/`d` tagged fill sews at its declared angle and
spacing with no panel control present.

The converter SHALL keep its fill angle and spacing defaults at 45° and
0.4 mm, and `a`/`d` tag parameters SHALL override them per shape.

#### Scenario: A tagged fill overrides the hidden defaults

- **WHEN** a user tags a filled shape `st-tatami a0 d8` and converts it
- **THEN** that region sews at 0° and 0.8 mm spacing while untagged
  regions sew at 45° and 0.4 mm

### Requirement: Boundary-only sewing is declared per shape

The outline view goes away, and the thing it was used for is said in the
file instead.

**Fails until:** `st-run` on a filled shape sews only its boundary rings
with no outline mode present.

A filled shape tagged `st-run` SHALL sew only its boundary rings.

#### Scenario: A fill tagged st-run sews its outline

- **WHEN** a user tags a filled shape `st-run` and converts it
- **THEN** only the shape's boundary rings are sewn, and no interior
  hatching appears
