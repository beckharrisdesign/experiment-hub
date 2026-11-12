## Outcomes

See `../../proposal.md`. This capability is the engine: any image becomes a pure black-and-white
pattern (dither or halftone) at an exact physical size, entirely in the browser. Done when every
algorithm and screen outputs only black and white while keeping the image's tone, the PNG imports
at the millimetre size set, and previews and exports stay inside the brief's time budgets. Not
doing: server-side processing, colour or CMYK halftones, DXF/SVG export.

## ADDED Requirements

### Requirement: Dithering keeps the image's tone in pure black and white

An image dithered with any of the eight algorithms comes out as only black and white dots that
still read as the original's light and dark.

**Fails until:** every algorithm's output is strictly 0/255, and a flat gray keeps its share of white within tolerance.

The engine SHALL offer Floyd–Steinberg, Atkinson, Jarvis–Judice–Ninke, Stucki, Sierra Lite (error-diffusion kernels as one data table, with a serpentine toggle), Bayer 4×4, Bayer 8×8 and threshold, and every output pixel SHALL be exactly 0 or 255.

#### Scenario: Eight dither algorithms output only black and white

- **WHEN** any of the eight algorithms runs on a photo
- **THEN** every output pixel is exactly 0 or 255

#### Scenario: Flat gray keeps its tone

- **WHEN** a flat 50% or 25% gray is dithered with an error-diffusion algorithm
- **THEN** the share of white pixels is within ±2% of the gray (Atkinson ±8% at 25%, set explicitly because it drops a quarter of the error by design)

### Requirement: Halftone screens keep tone and follow the angle

A halftone turns the image into a regular screen of dots, lines or crosses, at the angle and
frequency chosen.

**Fails until:** a flat 50% gray at 45° with round dots inks 50% ± 3%, and the dominant frequency follows the angle.

The engine SHALL offer dot (round, square, ellipse, diamond), line and cross screens with angle and LPI, SHALL make ink coverage track tone for every screen and shape, and SHALL output only 0 or 255.

#### Scenario: Flat 50% gray at 45° with round dots inks 50% ± 3%

- **WHEN** a flat 50% gray is halftoned with round dots at 45°
- **THEN** between 47% and 53% of the pixels are ink

#### Scenario: The screen angle rotates the screen

- **WHEN** a line or dot screen is rendered at a given angle
- **THEN** its dominant frequency direction, measured by an FFT, is within 3° of that angle (plus 90° for lines)

### Requirement: Exports are the exact physical size

A downloaded PNG opens in laser software at the size set in millimetres.

**Fails until:** 100 mm at 300 DPI gives 1181 px, and the PNG carries a valid pHYs chunk for 300 DPI.

The engine SHALL convert millimetres and DPI to whole pixels with the aspect locked to the source, and SHALL write a pHYs chunk (pixels per metre, unit = metre) before the first IDAT, with a valid CRC, replacing any existing pHYs.

#### Scenario: 100 mm at 300 DPI is 1181 px and the PNG records 300 DPI

- **WHEN** a 4:3 image is exported at 100 mm wide and 300 DPI
- **THEN** the PNG is 1181 × 886 px and its pHYs chunk records 11811 pixels per metre on both axes

### Requirement: Laser transforms are exact

Invert and mirror change the picture without changing its dot pattern.

**Fails until:** inverted 25% gray dithers to 75% ± 2% white, and the mirrored output is the unmirrored output flipped pixel for pixel.

The pipeline SHALL run tone → invert → resample → (dither or halftone) → mirror, with mirror applied to the 1-bit output so a mirrored burn is the preview flipped.

#### Scenario: Invert and mirror for slate and back-engraved acrylic

- **WHEN** invert or mirror is on
- **THEN** inverted flat 25% gray comes out 75% ± 2% white, and every mirrored pixel (x, y) equals the unmirrored pixel (w − 1 − x, y), for every algorithm and for halftones

### Requirement: Previews and exports stay within budget

Moving a control or downloading never makes the person wait long.

**Fails until:** the brief's three benchmarks are measured in a real browser through the worker and meet their budgets.

The engine SHALL run in a Web Worker, and previews SHALL update within 300 ms on a 2 MP image, all eight tiles SHALL render within 1.5 s for a 12 MP photo, and a full-resolution Floyd–Steinberg export of a 12 MP photo SHALL finish within 2 s.

#### Scenario: Previews and exports stay within budget

- **WHEN** a slider moves on a 2 MP image, a 12 MP photo is loaded, and a 12 MP export is downloaded
- **THEN** the preview updates in under 300 ms, the eight tiles paint in under 1.5 s, and the PNG is ready in under 2 s
