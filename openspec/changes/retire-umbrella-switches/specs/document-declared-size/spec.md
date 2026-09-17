# Spec: document-declared-size

## Outcomes

- **Who:** Stitchers who design a patch at a real physical size and
  expect the file to carry that size, rather than re-picking it in the
  tool on every conversion.
- **Job:** Say once, in the design, how big the thing is — and have any
  conversion of that file come out at that size, with the artwork sitting
  inside it exactly as it was drawn.
- **Done when:** A file declaring its size converts to that size with no
  size control present in the panel; a file that declares nothing keeps
  today's default.
- **Not doing:** Translating or resizing artwork from the tool — parked
  by the founder, "not today". No size inferred from bare user units.

## ADDED Requirements

### Requirement: The tagged element is the declared size

The layer carrying the tag is the thing being measured — not the ink
inside it — and its own proportions set the rest.

**Fails until:** a tagged frame with an inset motif converts to the
declared width with the inset preserved, and a non-square frame reports
both of its dimensions.

The tagged element's own box SHALL be the declared physical width;
artwork inside it SHALL keep its relative position and scale; and the
converted height SHALL follow that element's aspect ratio rather than any
value the tool supplies.

#### Scenario: Margin inside the frame survives

- **WHEN** a user tags a 200×200 frame `patch st-size w635` with a motif
  drawn across the middle 100 units
- **THEN** the design converts 63.5 mm wide overall, with the motif
  sewing about 31.75 mm and the surrounding margin intact
- **AND** the layout rules the design tool applies inside that container
  still govern where the artwork sits — the converter re-fits nothing

#### Scenario: A non-square frame stays non-square

- **WHEN** a user tags a 200×120 frame with a declared width
- **THEN** the converted design keeps that 5:3 proportion and the size
  readout reports both dimensions, not one

### Requirement: Both unit systems are declarable

A design says its size in whichever system its maker works in.

**Fails until:** the same physical size declared in inches and in
millimetres converts identically.

`st-size` SHALL accept a metric form (`w<n>`, mm ×10) and an imperial
form (`in<n>`, inches ×100), and real SVG physical units (`mm`, `cm`,
`in`, `pt`) SHALL be honoured on a tagged root. Declaring both forms on
one element SHALL fail, naming the layer.

#### Scenario: Inches and millimetres agree

- **WHEN** one file declares `st-size in350` and another declares
  `st-size w889` for the same artwork
- **THEN** both convert to the same physical size, 3.5 in / 88.9 mm

#### Scenario: The readout speaks the declared system

- **WHEN** a design declares its size in inches
- **THEN** the **Size** readout reports inches; a design declared in
  millimetres, or declaring nothing, reports millimetres

> Founder, 2026-09-17: "we still use imperial but the world uses mm - I
> want both systems supported." The tool offers no unit control — this
> change is removing controls — so the file's own system is what the
> readout follows.

### Requirement: Size cascades like CSS

An outer declaration sets the document's size; an inner one sizes its own
subtree inside it.

**Fails until:** a frame tagged 63.5 mm containing a group tagged 20 mm
converts 63.5 mm overall with that group sewing 20 mm wide.

The outermost `st-size` SHALL set the converted design's physical extent.
A nested `st-size` SHALL size its own subtree within that extent, and
SHALL NOT change the document's overall size.

#### Scenario: A nested size sizes its own subtree

- **WHEN** a frame tagged `st-size w635` contains a group tagged
  `st-size w200`
- **THEN** the design converts 63.5 mm wide overall
- **AND** that group's box sews 20 mm wide, scaled within the frame
  rather than redefining it

> This is the CSS model, not a special rule: the outer element is the
> containing block, and a child's own declaration applies to the child.
> Size is therefore consistent with the rest of the tag grammar rather
> than an exception to it.

### Requirement: A declaration that cannot be honoured errors loudly

A size the converter cannot measure, or the machine cannot sew, is
refused by name rather than guessed at.

**Fails until:** tagging a bare group, and tagging a size outside
10–400 mm, each fail the conversion naming the layer.

Where the tagged element has no determinable box, or the declared size
falls outside the supported 10–400 mm range, the conversion SHALL fail,
naming the layer and the offending value, rather than falling back to the
artwork bounds or clamping.

#### Scenario: A bare group cannot declare a size

- **WHEN** a user tags a group that exports with neither a clip nor a
  background rect
- **THEN** the conversion fails, naming the layer, and says the frame
  needs to clip its contents for its size to be readable

#### Scenario: An impossible size is refused

- **WHEN** a user tags a layer `st-size w5000` (500 mm) and converts it
- **THEN** the conversion fails, the banner names the layer and the
  value, and nothing is silently resized

> Today `svg-parse.ts` lists `clippath` in `SKIP_TAGS`, so a group's box
> is invisible; only the root `<svg>` carries `width`/`height`/`viewBox`.
> Reading the clip rect for tagged elements is part of the work. Falling
> back to content bounds would silently discard the margin this
> capability exists to preserve, which is why it errors instead.

### Requirement: Undeclared files keep today's size

A file that says nothing about size still converts.

**Fails until:** an untagged file converts at 63.5 mm with no size
control present.

A file with no declared size SHALL convert at the documented 63.5 mm
default, scaled from the artwork bounds as it is today.

#### Scenario: Bought art still converts

- **WHEN** a user converts an SVG with no `st-size` tag and no physical
  units
- **THEN** it converts at 63.5 mm, exactly as it does today
