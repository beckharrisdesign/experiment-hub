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
inside it.

**Fails until:** a tagged frame with an inset motif converts to the
declared width with the inset preserved, rather than the motif scaled up
to fill it.

The tagged element's own box SHALL be the declared physical width, and
artwork inside it SHALL keep its relative position and scale.

#### Scenario: Margin inside the frame survives

- **WHEN** a user tags a 200×200 frame `patch st-size w635` with a motif
  drawn across the middle 100 units
- **THEN** the design converts 63.5 mm wide overall, with the motif
  sewing about 31.75 mm and the surrounding margin intact
- **AND** the layout rules the design tool applies inside that container
  still govern where the artwork sits — the converter re-fits nothing

### Requirement: The outermost declaration wins

When sizes are declared at more than one level, the outer one is the
document's size.

**Fails until:** a tagged frame containing a differently tagged child
converts at the outer frame's declared size.

Where more than one ancestor of a shape declares `st-size`, the
**outermost** declaration SHALL apply.

#### Scenario: A nested size does not shrink the document

- **WHEN** a frame tagged `st-size w635` contains a group tagged
  `st-size w200`
- **THEN** the design converts at 63.5 mm

> This inverts the rest of the tag grammar, where a child overrides the
> group it sits in (`ownDirective(el) ?? inheritedDirective`). Size is a
> property of the document, not a style of a shape, so the outer frame is
> authoritative. An implementer following the existing pattern will get
> this backwards.

### Requirement: An unmeasurable declaration errors loudly

A tag on something with no box is refused rather than guessed at.

**Fails until:** tagging a bare group with no clip and no background
fails the conversion by name.

Where the tagged element has no determinable box, the conversion SHALL
fail, naming the layer, rather than silently falling back to the artwork
bounds.

#### Scenario: A bare group cannot declare a size

- **WHEN** a user tags a group that exports with neither a clip nor a
  background rect
- **THEN** the conversion fails, naming the layer, and says the frame
  needs to clip its contents for its size to be readable

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

### Requirement: Out-of-range sizes error loudly

A size the machine cannot sew is refused by name, not quietly clamped.

**Fails until:** a declared size outside 10–400 mm names the offending
layer in the error banner.

A declared size outside the supported 10–400 mm range SHALL fail the
conversion, naming the layer and the value.

#### Scenario: An impossible size is refused

- **WHEN** a user tags a layer `st-size w5000` (500 mm) and converts it
- **THEN** the conversion fails, the banner names the layer and the
  value, and nothing is silently resized
