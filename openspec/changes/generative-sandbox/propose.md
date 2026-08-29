# Propose — Generative Sandbox

> **Stores:** Business Patterns, Service Patterns, and BHD Ecosystem stores are named by
> `rules/bhd-experiment.mdc` for this phase, but `openspec/config.yaml` defines no paths
> for them. Noted and continuing, per the rule. No
> `experiments/<slug>/docs/business-case.md` exists to link.

## Business Brief

### Monetization model

**Utility — no monetization model attached (founder, 2026-08-27).** This is classified as
a utility: internal creative infrastructure whose return is generative ideas actually
getting made, a reusable server-side transform pipeline, and a module catalogue other hub
work can draw on.

Following the precedent set by `etsy-notion-sync` (Propose, 2026-07-15): deliberately
**not** "free-for-now", which implies future pricing pressure — a utility has no
monetization question to answer. An earlier draft of this file said free-for-now; that
was the wrong frame and is corrected here.

If the deferred gallery permutation (Explore, Permutation C) is ever picked up, it
becomes a separate change with its own Business Brief, informed by what this utility
proves.

Cost is what makes that viable regardless: the sandbox rides the hub's existing Vercel
project, vaulted credentials, and Supabase buckets, so marginal infrastructure cost is
close to zero.

### Pricing

n/a — utility.

### SKUs / tiers

n/a — utility.

### Internal Positioning

> A no-ceremony surface where transforms stack, reorder, and re-run in seconds — and the
> stack behind a good accident is never lost.

Three claims, all testable: **stack** (composition without writing code), **seconds**
(friction at the moment of impulse), and **never lost** (the forgetting problem). If any
fails, the sandbox is not doing its job — see Kill criteria.

The composition claim is where the founder's "gray area between generative art and code"
actually lives: **you write code to add a module; you write none to compose them.** The
module catalogue is the extensible seam, and playing in the stack is the creative act.

## Service Brief

### Use cases included in v1

- Bring in a source image — upload, or the bundled reference image for quick starts.
- **Compose a stack of transform modules**, each independently:
  - **toggled** on and off, so a module can be muted without losing its settings,
  - **reordered**, because the pipeline is order-dependent — blur-then-quantize and
    quantize-then-blur are different images, and that difference is the creative material,
  - **adjusted** through its own parameters.
- v1 module catalogue: blur, colour simplify (quantize), the existing presets (slate,
  mono-pop, high-contrast), and banner overlays — each becoming a module rather than a
  fixed pipeline stage.
- Heavy pixel work runs server-side (sharp), so the page never freezes on a large file.
- Pan and zoom source and result independently.
- Keep an output **together with the stack that produced it** — module order, toggles,
  parameters, seed — and reopen that stack later to build on it.
- Export a PNG at full resolution.

**One design consequence worth naming now:** re-running an entire stack server-side on
every slider nudge threatens the "seconds" claim. Caching intermediate results per stack
prefix — so editing the last module re-runs only the tail — is the obvious answer, and it
gets settled in the child change's design.md, not here.

### Use cases NOT included in v1

- **In-browser code editing.** No live-coding a sketch, no authoring a transform from
  the browser. Adding a *new* module is a code change in the repo; v1 ships a fixed
  catalogue that is composed freely rather than authored freely. Confirmed by the founder
  (2026-08-27) as the right cut — the wanted freedom is in stacking, toggling,
  reordering, and tuning, not in typing code at the canvas.
- **Plotter / SVG output.** No vector export, no pen-plotter paths — a natural fit for
  generative work and a real v2 candidate, but a separate pipeline from raster sharp.
- Gallery, feed, or publishing of any kind (Explore Permutation C — the exclusion is
  load-bearing, not an oversight).
- Accounts, multi-user, collaboration, sharing links.
- ML effects: segmentation, depth, style transfer, upscaling.
- Paint-by-number or embroidery pattern output (`pbn-research` owns that question).
- Batch processing; one image at a time.
- Print pipeline — no CMYK, bleed, or DPI handling.
- Mobile-first layout; desktop editing surface.
- Animation or video output.

### Surfaces involved

Web app only — a route inside the hub's Next.js application, with the prototype living
under `experiments/<slug>/prototype/` per `rules/bhd-experiment.mdc`.

### Platforms involved

Vercel (hosting and the sharp serverless route), Supabase Storage (private buckets for
source and output, following `lib/etsy-listing-kit/orders.ts`), desktop browsers.

## Validation Plan

### Method

**A time-boxed build spike, used as the instrument — not a landing page and not ads.**

The template's default methods assume a market hypothesis to test on strangers. This
experiment's hypothesis is about one person's friction: *does removing setup cost, making
transforms composable, and remembering what produced a good result change how often
generative ideas actually get made?* A landing page cannot answer that, and running ads
at it would manufacture a signal nobody asked for.

So the thinnest usable sandbox is built first — source in, a stack of modules to toggle
and reorder, server-side processing, saved stacks — and the validation is whether it gets
reached for.

### Traffic / sample

n = 1. The founder, over her own working weeks. Stated plainly because a sample of one
is exactly what a personal-tool hypothesis warrants, and dressing it up as more would be
dishonest.

### Budget

Time: roughly one focused build cycle for the thin version, then **four weeks of
availability** before judging. Money: ~$0 — the hub's existing Vercel project, vault,
and Supabase project absorb it.

### Success thresholds

All three claims in the positioning have to hold:

- **Friction:** reached for on at least 4 separate occasions across the four weeks, when
  inspiration actually struck — not sessions scheduled to test it.
- **Composition:** modules actually get reordered or toggled in real use — not merely
  tuned. If every session runs the default stack top to bottom, the composition claim is
  decoration and the tool is a filter panel.
- **Memory:** at least 2 saved stacks reopened and built on, rather than every session
  starting from zero.

### Kill criteria

- **Fewer than 2 unprompted sessions in four weeks** → the friction thesis is wrong.
  The obstacle was never setup cost, and building more sandbox will not fix it. Stop.
- **Used regularly, but no saved stack ever reopened** → the memory half is wrong. Cut
  it rather than invest further in it; keep the fast surface.
- **Used regularly, but the stack is never reordered or toggled** → composition was not
  the unlock. Simplify back to a fixed pipeline with good controls and stop paying for
  the stack machinery.
- **Reaching for the p5 web editor or a local sketch instead**, while the sandbox exists
  and works → it lost to the incumbent named in Explore. That is the clearest possible
  answer, and the one most worth listening to.

### Decision point

At four weeks:

- **All three met** → continue to a second Build Unit. Strongest candidates: SVG/plotter
  export, and widening the module catalogue (the catalogue is the extensible seam, so
  "more modules" is the cheapest way to grow the sandbox).
- **Friction and composition met, memory missed** → keep the sandbox, drop the saved-stack
  features, re-score.
- **Friction met, composition missed** → simplify to a fixed pipeline with good controls;
  the stack machinery was not earning its cost.
- **Friction missed** → archive as **killed**, and record honestly that the obstacle was
  somewhere other than setup cost.

## Measurement Brief — Intent

Instrumentation belongs in Apply, attached to each Build Unit. Intent only here.

### Success metric

Sessions that produce a kept output — something exported or saved with its stack, rather
than opened and abandoned.

### Leading indicator

**Time from open to first visible result.** If that is not seconds, nothing downstream
matters; it is the whole positioning in one number.

### Kill criteria

Six consecutive weeks unopened, or a sustained pattern where every session starts from
scratch and nothing is ever reopened — the sandbox would then be a toy rather than a
practice surface.

## Score re-run

> **Rubric note:** the template's table is the retired v1 five-dimension form. Logged
> against **v3** (PI/SI/BI) to stay consistent with Explore and `rules/scoring-criteria.mdc`.

| Dim | Explore | Propose | Delta |
|---|---|---|---|
| PI — Personal Impact | 4 | 4 | 0 |
| SI — Social Impact | 2 | 2 | 0 |
| BI — Business Impact | 1 | 1 | 0 |
| **Total** | **7/15** | **7/15** | **0** |

No movement, and nothing in Propose earned any. The v1 scope neither widened nor narrowed
the personal case.

**On BI 1 for a utility:** a low Business Impact score here is the expected reading, not a
warning sign. v3's BI asks "would the market pay, and could this win?" — a question a
utility does not answer, because its return is workflow and capability rather than
revenue. Scored honestly and left alone; the utility's return is measured by the
thresholds above, not by this row.

**The Explore conditional is now resolved, and retired.** Explore recorded that PI would
fall to 3 if in-browser code editing turned out to be essential. The founder clarified
(2026-08-27) that the wanted capability is module composition — toggling, restacking,
parameter tuning — not code authoring. That was the single largest downward risk on this
experiment and it has been closed rather than carried.

PI stays at 4 rather than rising: the scope now matches the intent, which is what a 4
already assumed. A case for 5 exists if the stack model turns out to be the thing reached
for constantly, and that is exactly what the four-week window measures.

## Open questions

1. ~~**Strategic Why**~~ — **deferred by the founder (2026-08-27)**, not answered and not
   defaulted. Left open rather than filled with a guess; revisit if this ever stops being
   a utility.
3. **Experiment identity** — new `generative-sandbox` row absorbing `photo-filters-banner`
   and `image-lab`, or sandbox standing alone beside them.
4. **What `generative-art` becomes** — archive, or working surface beside the sandbox.
