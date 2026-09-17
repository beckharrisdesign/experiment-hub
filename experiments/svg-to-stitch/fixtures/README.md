# Fixtures — the sticker sheet

One file that exercises everything Stitch Check promises, plus the failures
that can't share a file with it. Drop `sticker-sheet.svg` at
[/svg-to-stitch](https://labs.beckharrisdesign.com/svg-to-stitch) and check it
against the table below.

**Why the failures are separate files:** a loud error aborts the whole
conversion, so a single bad tag in the sheet would hide every other specimen.
Each failure gets its own file and is opened on its own.

`tests/svg-to-stitch-fixtures.test.ts` runs all of these, so they cannot rot
between walkthroughs.

## `sticker-sheet.svg`

Declares **100 × 140 mm** on the root. Artwork is inset 40 units of 400, so a
correct conversion keeps that margin: the sheet is 100 mm wide while the
stitching spans about 83 mm. Expect **5 thread colours, 8 brush runs, 3 satin
runs, ~3,150 stitches**.

| Row   | Tag                   | What to look for                                                         |
| ----- | --------------------- | ------------------------------------------------------------------------ |
| guide | `st-skip`             | The red hoop rectangle never sews                                        |
| 1     | `st-run l25`          | A running line, though it is satin-width — the tag pins it               |
| 2     | `st-satin w20`        | A 2 mm satin column from a hairline                                      |
| 3     | `st-tatami a0 d8`     | Hatching at 0°, rows 0.8 mm apart                                        |
| 4     | `st-run` on a fill    | Boundary only — no interior hatching                                     |
| 5–10  | the six brushes       | cross, tick, chain, dot, bird, bean; three straight, three curved        |
| 11    | group `st-brush-tick` | First child inherits tick; the second declares chain and wins for itself |
| 12    | untagged stroke       | Fallback satins it                                                       |
| 13    | untagged wide fill    | Fallback hatches it as tatami                                            |
| 14    | untagged narrow fill  | Fallback sews it as two-rail satin                                       |

Then check the panel itself: **no stitch controls at all**, only **Fabric**;
**Size** reads `100 × 140 mm`; both downloads produce a file.

## `errors/`

Each opens on its own and should fail with a message naming the layer.

| File                          | Expected                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `01-brush-on-a-fill.svg`      | filled shape tagged `st-brush` — the shape a Figma stroke becomes when exported outlined |
| `02-unknown-brush.svg`        | names the typo and lists the built-ins                                                   |
| `03-satin-too-wide.svg`       | satin tops out at 10 mm                                                                  |
| `04-size-on-a-bare-group.svg` | the group has no readable box — turn on clip content                                     |
| `05-size-out-of-range.svg`    | 500 mm is outside 10–400 mm                                                              |
| `06-both-unit-systems.svg`    | declares metric and imperial at once                                                     |
| `07-density-out-of-range.svg` | 0.1 mm density is outside 0.2–2 mm                                                       |
| `08-size-in-inches.svg`       | **not an error** — converts at 3.5 in, and **Size** should read inches, not millimetres  |

## Not covered

**Nested `st-size`.** The spec says a nested declaration sizes its own
subtree; only the outermost one is honoured today, and a nested one is
ignored rather than applied. There is no fixture because there is nothing
to look at yet — see task 1.7.
