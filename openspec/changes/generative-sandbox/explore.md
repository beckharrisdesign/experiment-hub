# Explore — Generative Sandbox

> Parent experiment change (`schema: bhd-experiment`). Code ships via the child change
> `generative-sandbox-build` (`schema: experiment-hub-lite`), per `rules/bhd-experiment.mdc`.
>
> **Classification: utility** (founder, 2026-08-27) — internal creative infrastructure,
> not a product experiment. Following `etsy-notion-sync`, which is the hub's precedent for
> a utility running on this schema: no monetization question, `type: tool` in the registry,
> and a return measured in workflow rather than revenue.
>
> **Supersedes the photo-studio framing** (2026-08-27, same session). That version treated
> this as a photo-editing tool — upload, presets, banners, export. The founder's reframe
> makes the sandbox the point and photo filtering one module inside it.

> **Stores:** Soul and Goals stores are referenced by `rules/bhd-experiment.mdc` as
> "paths in `openspec/config.yaml`", but that file defines no such paths. Noted and
> continuing with placeholders, per the rule.

## Hypothesis

If there is a place where a generative idea can go from impulse to something visible in
seconds — parameters to push, seeds to reroll, heavy pixel work that never blocks the
browser, and a record of what produced what — then more ideas get made, and the good
accidents get kept instead of lost.

The bet is that the bottleneck on generative work is not skill or tooling power. It is
friction at the moment of impulse, and forgetting what you did when something worked.

## Why this matters

### Personal

> "I still love the creativity and flexibility of generative art and the gray area
> between it and code. I want a sandbox to work in when the inspiration strikes."
>
> — Katy, 2026-08-27 (Claude Code session)

This is the thread that runs back to the original p5 sketch — the one that froze for
seconds on a 4.6 MB image and started this whole chain. Every step since has been about
removing an obstacle between an idea and seeing it.

### Strategic

**Deferred by the founder (2026-08-27).** Not answered, and deliberately not defaulted to
a theme that would flatter the scorecard.

Recorded for whenever it is picked up: neurodiversity is the closest fit — the hub's own
README opens with *"I'm a neurodiverse founder. My best ideas come fast and from
everywhere,"* and a surface built to catch fast-arriving ideas before they evaporate is
that theme applied to creative practice. Makers is the secondary reading, since these
transforms feed pattern work downstream (`pbn-research`).

Deferring is also the honest move for a **utility**: internal infrastructure does not
need a Soul theme to justify itself.

## Who it's for

Katy. Not proxy mode. Other generative artists are a possible later audience, but
nothing here is scoped for them, and pretending otherwise would put an audience in a
room that works better without one.

## What it does

- **Opens fast.** A sketch is running and editable without a build step standing between
  impulse and output.
- **Stacks transform modules.** Each module can be toggled off without losing its
  settings, reordered within the stack, and tuned through its own parameters — the
  pipeline is order-dependent, and that is the creative material, not a caveat.
- **Offloads heavy pixel work.** sharp on the server for blur, quantize, dominant colors,
  and resampling, so a large image never freezes the page.
- **Remembers.** An output is kept together with the whole stack that produced it —
  module order, toggles, parameters, seed. The good-accident problem is the one thing a
  sandbox must not lose.
- **Keeps code and play on the right sides of the line.** Adding a new module is a code
  change in the repo; composing modules needs no code at all. That split is where "the
  gray area between generative art and code" actually sits.
- **Absorbs the photo work.** Presets, banner overlays, and upload handling become one
  module in the sandbox rather than a separate tool.

## What it does NOT do

- **Does not impose ceremony per sketch.** No proposal, no scorecard, no review to make
  a thing. The lifecycle governs *the sandbox*; it does not govern what happens inside
  it. If using it ever requires paperwork, the utility has failed.
- Not a photo-editor product. No Photopea or Canva ambitions.
- No accounts, no multi-user, no collaboration.
- No gallery, feed, or publishing — see Permutation C for why that exclusion is load-bearing.
- No ML effects — segmentation, depth, style transfer, upscaling all still deferred.
- No paint-by-number or embroidery pattern output. `pbn-research` owns that question.
- No print pipeline — no CMYK, bleed, or DPI handling.
- No polish gate. Sketches are allowed to be ugly and unfinished.

## Existing options

| Product | Price | Strength | Limitation |
|---|---|---|---|
| p5.js web editor | Free | Instant, zero setup, the reference implementation for exactly this | All client-side, so the large-image freeze is unfixable there; no saved stacks |
| OpenProcessing | Freemium | Sketches plus a community, forking is natural | Platform-locked; audience-facing by default, which changes what you make |
| Observable | Freemium | Best-in-class reactive iteration on parameters | Notebook/data-viz shaped; image pipelines are against the grain |
| CodePen / Glitch | Freemium | Fast start, shareable | No server-side image processing; not built to remember a stack |
| TouchDesigner | Free tier / ~$600 | Enormously powerful node-based generative work | Desktop, steep, and a different craft than writing code |
| Local p5 + editor | Free | Total freedom — this is what `generative-art` is today | No parameter UI, no server muscle, no record of what produced what |

Honest read: the last row is the real incumbent. The sandbox has to beat *her current
setup*, not the commercial tools.

## Market analysis

TAM/SAM: **unknown, and not the point.** Nothing here is being sold. Generative art does
have real markets (fx(hash), Feral File, plotter-art print sales), but none is proposed,
and inventing a band would be manufacturing evidence — `rules/market-research-template.mdc`
says bottom-up or nothing.

## Final scorecard

> **Rubric note:** scored on **v3** (`rules/scoring-criteria.mdc`, 2026-08 — PI/SI/BI,
> 1–5, total /15). The template's table above is still the retired **v1** five-dimension
> form, and `openspec/config.yaml:23` still advertises **v2**. See Open questions.

| Dim | Score | Reasoning |
|---|---|---|
| PI — Personal Impact | 4/5 | "Solves a regular problem, would use frequently." Inspiration striking is not daily, so not a 5 — but this is the thing the founder says she loves, and it replaces a setup that currently loses good accidents. |
| SI — Social Impact | 2/5 | Minor need as scoped. Becomes a 3 if the neurodiversity framing is claimed *and* the sandbox is eventually shared — an idea-capture surface for fast-arriving thinking is a real underserved need, but only if someone else can reach it. |
| BI — Business Impact | 1/5 | No demand evidence, no revenue path, free incumbents. A 1 by the v3 anchor — and the expected reading for a utility, whose return is capability rather than revenue. |
| **Total** | **7/15** | |

**Score shape:** *Mission-driven* — the total is unchanged from the photo-studio framing,
and I want to be straight about that rather than claim the reframe improved the number.
What changed is durability: a photo filter tool competes with Photopea and loses, while a
personal creative surface has a reason to exist that no incumbent addresses. Same score,
better argument.

## Permutations

### Permutation A: Sandbox with server-side muscle — **chosen**

- **What changes:** Nothing from the scope above. Fast-opening sketch surface, parameter
  controls, sharp on the server for heavy operations, outputs saved with the stack that made them.
- **Projected scorecard:** PI:4 SI:2 BI:1 = 7/15, shape: Mission-driven
- **Trade-offs:** Requires the server pipeline and Supabase storage, so it is not the
  cheapest option — but the hub already supplies the deploy, the vault, and the buckets,
  so the marginal cost is small.
- **Verdict:** chosen
- **Reasoning:** It is the only version that fixes the actual failure — the freeze that
  started this, and the forgetting that loses good work — without adding an audience or
  a market thesis that nothing supports.

### Permutation B: Pure client sandbox

- **What changes:** No server at all. Everything in the browser, closest to the p5 web
  editor, nothing to deploy.
- **Projected scorecard:** PI:3 SI:2 BI:1 = 6/15, shape: Cheap-and-useful
- **Trade-offs:** Simplest possible thing, instant to start, nothing to maintain — and
  it walks straight back into the wall.
- **Verdict:** rejected
- **Reasoning:** This is where `sketch.js` and `photo-filters-banner` already are, and
  both froze on large images. `image-lab` exists *because* client-side pixel work fails
  at real photo sizes. Choosing this would undo the one thing already proven.

### Permutation C: Sandbox plus gallery

- **What changes:** Finished pieces get published — a gallery, maybe editions or prints.
  Adds an audience and a possible revenue path.
- **Projected scorecard:** PI:4 SI:3 BI:3 = 10/15, shape: Strong-go
- **Trade-offs:** Highest score of the three, and it is genuinely tempting.
- **Verdict:** rejected (for now)
- **Reasoning:** A sandbox with an audience is not a sandbox. The moment output is
  publishable, what gets made bends toward what is worth publishing, and the freedom to
  produce something ugly — which is the stated point — quietly disappears. This is a
  real v2 once there is a body of work worth showing, but shipping it alongside v1 would
  compromise the thing being built. Noting explicitly that the higher score does not win
  here, and why.

## Open questions

1. ~~**Strategic Why**~~ — deferred by the founder (2026-08-27); see above.
2. **Registry identity.** This is no longer `photo-filters-banner`. Options: a new
   `generative-sandbox` experiment that absorbs both `photo-filters-banner` and
   `image-lab`, or keep photo-filters-banner as a separate tool and let the sandbox stand
   alone. My read is the former — one surface, with photo filtering as a module — but it
   means a new row in `data/experiments.json` and retiring or graduating the old one.
3. **What happens to `generative-art`.** If the sandbox lives in the hub, that repo
   becomes the p5 archive rather than the working surface. Its CLAUDE.md explicitly says
   "do not add tooling unless explicitly requested" — worth deciding deliberately whether
   the sandbox replaces it or sits beside it.
4. **The child change needs rewriting.** `generative-sandbox-build/proposal.md` is still
   written as a photo-studio merge. It gets rebuilt against this framing before specs.
5. **Two stale rubric pointers** — `openspec/config.yaml:23` advertises retired v2, and
   the `bhd-experiment` explore template ships the v1 table. One-line fixes, own change.
