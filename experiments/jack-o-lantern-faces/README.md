# Jack-o'-lantern faces

Turn a short prompt into a funny jack-o'-lantern in simple line art, then
export an SVG an xTool can cut and engrave.

I'm attempting to turn a short prompt into a funny jack-o'-lantern line
drawing you can engrave on an xTool.

This is a local prototype for an [Atomm generator](https://dev.atomm.com/).
It is not registered in the BHD Labs Notion database.

## Run it

```bash
cd experiments/jack-o-lantern-faces/prototype
python3 -m http.server 5173
```

Open http://localhost:5173. Type something like `grumpy librarian cat`.
The face updates as you type. Download SVG saves the machine file. Inside
Atomm, the platform Export button calls the same file.

```text
https://www.atomm.com/creativetools/community/generator/<generator-name>?local=http://localhost:5173/
```

Hub tests:

```bash
pnpm exec vitest run tests/jack-o-lantern-faces.test.ts
```

## What the file contains

One millimetre in the file is one millimetre on the machine. The pumpkin
outline is a red cut (`#FE0002`). The face is a blue line engrave
(`#2366FF`), unless Face is set to Cut holes. Words the generator knows
(a cat, a librarian, a vampire) add ears, glasses, fangs, and so on. Anything
it does not know still gets a face, seeded by the prompt, and the caption
says it improvised.

## Layout

The page follows Atomm layout 3 (prompt rail, canvas, parameters) from
[design.md](https://dev.atomm.com/design.md). The skeleton HTML at
`https://dev.atomm.com/templates/layout-3-generate.skeleton.html` could not
be fetched from the environment that built this, so the stylesheet uses that
document's measurements and token names directly.
