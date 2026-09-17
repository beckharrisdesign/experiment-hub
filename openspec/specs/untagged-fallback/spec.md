# untagged-fallback

## Purpose

What a shape sews comes from its `st-` tag or, when it declares nothing, from one documented fallback. The converter panel carries no control that changes stitch type, so a design converts to the same stitches whoever opens it and however the panel was last left.

## Requirements

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

### Requirement: The design file is the only override of stitch type

Changing one shape's stitch type means saying so in the file.

**Fails until:** the same file, converted from two different panel
states, produces the same stitch plan.

A declared tag SHALL determine that shape's stitch type, and no panel
control SHALL change the stitch type of any shape.

#### Scenario: Stitch type is reproducible from the file alone

- **WHEN** the same SVG is converted twice, in two sessions with the
  panel left in different states
- **THEN** both conversions produce the same stitch count, colour blocks
  and sew order
- **AND** the only panel control left, **Fabric**, changes the preview
  backdrop and nothing about the stitches

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
