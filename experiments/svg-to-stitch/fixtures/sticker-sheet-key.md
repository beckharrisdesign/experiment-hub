# Sticker sheet — row key

Read top to bottom against the converted preview. The sheet mixes every
promise, so **only rows 5–11 are brushes** — the rest are run, satin,
tatami, outline and the untagged fallbacks. The separate
`motif-reference.svg` shows the six brushes alone, which is why the two
do not look like each other.

| #   | Colour        | Tag                                            | What it should look like                                                                                         |
| --- | ------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| —   | red `#ff0000` | `st-skip`                                      | **Nothing.** A hoop rectangle that must not sew                                                                  |
| 1   | `#bc213c`     | `st-run l25`                                   | A plain line — pinned to running stitch despite being satin-width                                                |
| 2   | `#0f8452`     | `st-satin w20`                                 | A dense zigzag column, 2 mm wide                                                                                 |
| 3   | `#38639f`     | `st-tatami a0 d8`                              | Filled rectangle, rows running **horizontally** (0°)                                                             |
| 4   | `#d6962d`     | `st-run` on a fill                             | Rectangle **outline only**, hollow centre                                                                        |
| 5   | `#72357c`     | `st-brush-cross`                               | ✕ pairs                                                                                                          |
| 6   | `#bc213c`     | `st-brush-tick`                                | ╱ angled ticks — **curved path**                                                                                 |
| 7   | `#0f8452`     | `st-brush-chain`                               | ◯ linked loops — **curved path**                                                                                 |
| 8   | `#38639f`     | `st-brush-dot`                                 | ● dot clusters                                                                                                   |
| 9   | `#d6962d`     | `st-brush-bird`                                | ∨ bird tracks — **curved path**                                                                                  |
| 10  | `#72357c`     | `st-brush-bean`                                | ▬ tripled bean segments                                                                                          |
| 11  | `#bc213c`     | group `st-brush-tick` + child `st-brush-chain` | **Two halves in one colour:** ticks on the left, loops on the right. This is inheritance and override in one row |
| 12  | `#0f8452`     | untagged stroke                                | Fallback satins it — a dense zigzag                                                                              |
| 13  | `#38639f`     | untagged wide fill                             | Fallback tatami at **45°** — diagonal rows, unlike row 3                                                         |
| 14  | `#d6962d`     | untagged narrow fill                           | Fallback two-rail satin — a zigzag bar                                                                           |

## The 1.4 question

Only rows 5, 6, 7, 8, 9 and 10 answer it. Ignore everything else.

For each, decide: **without this key, could you name the motif?**

Row 3 against row 13 is a useful control — same tatami, different angle,
one declared and one from the fallback. If those two read differently and
the brushes do not, the problem is the brush stamps rather than the
preview.
