# document-declared-size

## Purpose

Physical size is declared in the design file — an `st-size` tag in millimetres or inches, or real SVG physical units — not chosen in the tool. The tagged element's own box is the design's extent, so margin drawn around artwork survives and the height follows the document's proportions. One size per file.

## Requirements

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

### Requirement: One size per file

A design declares its size once.

**Fails until:** a second `st-size` anywhere in the file fails the
conversion, naming both layers.

Exactly one `st-size` SHALL apply to a file. A second declaration nested
inside the first SHALL fail the conversion, naming both layers.

#### Scenario: A nested size is refused

- **WHEN** a frame tagged `st-size w635` contains a group tagged
  `st-size w200`
- **THEN** the conversion fails, naming both layers, and says nesting is
  not supported

> Originally specified as the CSS containing-block model: the outer
> element sets the document extent while a nested declaration sizes its
> own subtree. The subtree half was **waived on 2026-09-17** — it was
> written while reasoning about the model rather than from a need, and
> one frame per patch is the actual use. Refusing the nested tag is the
> honest form of that cut: ignoring it would hand back a plausible design
> at the wrong scale, which is the silent fallback this contract exists
> to remove. If a real use appears, it comes back as its own change.

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
