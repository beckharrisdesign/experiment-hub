## Design: Dither & Halftone Generator (`image-dithering-build`)

> Approved round: **02.4**. Katy, 2026-11-11: *"Go, build Step 2"* (on the 02.4 check-in).
> Founder intent and the full brief: [`experiments/image-dithering/docs/intent.md`](../../../experiments/image-dithering/docs/intent.md).

### User flow

One page, four stacked steps. Each finished step collapses to a summary with **Change**, every
step has chunky **Back** and **Next** buttons, and **a step renders no previews until the step above has a pick**.

1. **Image**: drop, paste or choose a file. A sample image is shown until one is added.
2. **Pick an effect**: a **Dither | Halftone** switch over a four-column grid of eight results
   (8 dither algorithms, or 8 halftone screens).
3. **Fine-tune**: the current result beside four variations (Lighter, Darker, More contrast,
   Softer). Picking one makes it current and generates four more at half the step. **Advanced
   settings** (a disclosure) holds the exact controls.
4. **Export**: **Screen or print | Laser**. Laser adds mm size + DPI (written into the PNG as
   pHYs), material starting points (`?material=` in the URL), invert and mirror. Then **Download PNG**.

Below the tool: the explainer, the dithering + halftone terms glossary, settings by material, and
FAQs (round 02.2 content, retargeted to the 02.4 keyword family in Step 3).

### Architecture

| Piece | Where | Notes |
| --- | --- | --- |
| Page | `src/pages/index.astro` | Static HTML: header, the four step shells, content. No framework runtime. |
| Island | `src/island/app.ts` | Vanilla TS. State → DOM, step locking, URL sync, download. |
| Engine | `src/engine/*` (Step 1) | Runs in `src/worker/engine.worker.ts`. The main thread never dithers. |
| Presets | `src/data/presets.json` + `presets.schema.json` | One file, shaped for future per-material pages. Every value is a STARTING POINT. |
| URL state | `src/lib/url.ts` | `?material=` in and out; unknown → default, no error. |
| Variations | `src/lib/variations.ts` | Four tone moves around the current settings; the step halves each round. |
| Styles | `src/styles/page.css` | MVDS `tokens.css` variables only; Inter Variable via `@fontsource-variable/inter`. |

Previews render at the tile's real pixel width × devicePixelRatio, so dots map 1:1 and are never
scaled (review queue #31). Export runs at full resolution in the worker.

### Visual design / Figma

| File | Rounds | Frames | Library / version | Breakpoints | Code Connect |
| --- | --- | --- | --- | --- | --- |
| [`image-dithering-build`](https://www.figma.com/design/jillBCo0orNQPZJaCAx0g7) (design file) | `02 Proposed` (`1:267`), `02.1` (`7:10`), `02.2` (`10:2`), `02.3` (`16:2`), **`02.4` (`18:11`, approved)** | 02.4: `Proposed · Desktop 1024 · Step 2, Halftone` (`19:4`), `Proposed · Desktop 1024 · Step 4, Export for laser` (`19:71`); mobile layout per 02.2 `Proposed · Mobile 480 · Step 3 active` (`13:51`) | MVDS Core 0.5.0 (team default); local `Comparison tile · fluid` (`14:8`), `Slider (stand-in)` (`4:23`) | L = 1024, S = 480 | N/A: no React components, a vanilla island |

`01 Current state` notes that the surface is net-new. File convention per `rules/figma.mdc`: numbered pages, a new
page per round, built rounds never edited in place.

### Known gaps

- **MVDS has no Tabs, Slider or thumbnail-select pattern** (review queue #18, #20, #23). The
  segmented control is buttons with `aria-pressed`, sliders are native `<input type=range>`, and tiles are buttons.
- **The sample image is procedural** (the lit sphere). Katy, 2026-11-12: *"I like the sample sphere for now."* Kept; a photo is optional later (review queue #40).
