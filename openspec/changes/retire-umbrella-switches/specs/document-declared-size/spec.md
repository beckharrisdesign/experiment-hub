# Spec: document-declared-size

## Outcomes

- **Who:** Stitchers who design a patch at a real physical size and
  expect the file to carry that size, rather than re-picking it in the
  tool on every conversion.
- **Job:** Say once, in the design, how big the thing is — and have any
  conversion of that file come out at that size.
- **Done when:** A file declaring its size converts to that size with no
  size control present in the panel; a file that declares nothing keeps
  today's default.
- **Not doing:** Translating or resizing artwork from the tool — parked
  by the founder, "not today". No unit conventions inferred from bare
  user units.

## ADDED Requirements

### Requirement: Size is declared in the design file

A tagged layer states the design's physical width, and the conversion
honours it.

**Fails until:** an `st-size` tagged file converts to its declared width
with no panel control involved.

A layer tagged `st-size` with a `w` parameter (mm ×10) SHALL set the
converted design's physical width.

#### Scenario: A declared size survives the round trip

- **WHEN** a user names the frame `patch st-size w635` and converts it
- **THEN** the design converts at 63.5 mm, and the **Size** readout
  reports it
- **AND** converting the same file again produces the same size, with no
  size control to set

### Requirement: Undeclared files keep today's size

A file that says nothing about size still converts.

**Fails until:** an untagged file converts at 63.5 mm with no size
control present.

A file with no declared size SHALL convert at the documented 63.5 mm
default.

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
