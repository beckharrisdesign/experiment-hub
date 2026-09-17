# Archive — retire-umbrella-switches

**Archived:** 2026-09-17 · **Created:** 2026-09-16 · **Tasks:** 20/20
**Outcome:** SHIPPED

The converter panel lost every control that changed the sewn output, and
physical size moved into the design file.

**Evidence:** `app/svg-to-stitch/page.tsx` on `main` carries no `Switch`
and no size, fill-angle or fill-density select; `lib/svg-to-stitch/convert.ts`
has no `fillMode`/`satinStrokes`/`satinFills` option and no outline branch;
`lib/svg-to-stitch/svg-parse.ts` exports `findDeclaredSize`. Merged in #488,
closed out in #492. Live at `labs.beckharrisdesign.com/svg-to-stitch`.
1237 tests pass, including `tests/svg-to-stitch-size.test.ts` (12) and
`tests/svg-to-stitch-fixtures.test.ts` (12), which run
`experiments/svg-to-stitch/fixtures/sticker-sheet.svg` and its eight failure
files. Founder walkthrough passed 2026-09-17: "sticker sheet looks good".

**Left open:** Nested `st-size` was waived, not built — a second declaration
is refused by name rather than sizing its own subtree; it returns as its own
change if a use appears. Per-property cascade _extend_ (a child changing one
parameter and keeping the rest) is still missing from the tag grammar and
was deferred here because the lite schema caps a change at two capabilities.
Reorderable stitch layers are designed on Figma page `03.6` and unproposed.
