# Panel reviews — mvds-combined.md

Five Voices reviewed [mvds-combined.md](mvds-combined.md) (2026-09-04), each
grounded in the corresponding skill's rubric. Verbatim reviews below;
synthesis at the end.

## Strategist (business-case-writer rubric)

**Verdict.** The narrative is honest and well-evidenced about *what was
built*, but as a business argument it asserts its central economic claims
instead of demonstrating them, and its biggest outcome claim is a hypothesis
dressed as a result.

**Top findings.**

1. **"MVDS is a system for teams" is speculative, framed as outcome.** The
   Outcome section says the realization "is bigger than my own workflow" —
   but the evidence trail shows exactly one production consumer (Katy's own
   hub), one early feedback-filer, and friends recruited "only recently."
   Zero teams have used it. The rubric's own standard — numbers over
   adjectives, data carries the case — says this belongs as the *next test*,
   not a conclusion. Reframing it as "the hypothesis this earns me the right
   to test" would cost nothing and read stronger.
2. **"It's more expensive NOT to check a rule than to check it" is asserted,
   never shown.** Decision 2's economics paragraph is the load-bearing
   business logic of the whole piece, and it's a gradient argument with no
   data point on it. The trail never cites a single instance of a gate
   *catching* something — only gates existing, landing, and being verified.
   One caught regression, or one drift incident from the pre-gate era, would
   convert the claim from belief to evidence. The mirror "repair passes"
   actually cut the other way: the enforcement system itself drifts and costs
   maintenance, and that cost is never counted against the benefit.
3. **The problem is scaled to "every team" on a sample of one.** "Every team
   maintains the same design system three times" is a universal claim; the
   stated evidence is Katy's own hats. The solo-founder problem is real and
   fully justifies the investment — the piece doesn't need the inflation.
4. **No cost side of the ledger.** Twelve weeks, 107 PRs — for a founder
   whose actual product is the experiments. The skeptical read is
   "beautifully engineered avoidance." The counter-evidence exists (dogfood
   walls, hub consuming it in production, the keep-alongside ruling) but it's
   buried in one short late section. That's the piece's strongest business
   material; it under-sells it.

**What works.** The refusals are excellent strategy writing — the
12,000-element shadcn refusal and the eleven-steps-nobody-consumed cut show
real judgment, quoted verbatim. The honesty texture (red statuses shown red,
OpenSpec arriving late, repairs recorded) is exactly the credibility a hiring
reader is scanning for.

## PRD Writer (prd-writer rubric + template)

**Verdict.** The decisions are well-anchored and the scope-out discipline is
genuinely PRD-grade, but the piece asserts a universal problem and a
team-sized outcome on evidence from exactly one user — Katy — and its success
section counts outputs, not outcomes.

**Top findings.**

1. **The problem statement is vivid but untested beyond n=1.** "Every team
   maintains the same design system three times and calls it one" is a
   universal claim; the only sourced user need is Katy's own Notion row about
   solo founders. Then the Outcome escalates to teams. No team has used it —
   demand a user, or soften to hypothesis language.
2. **Success metrics are outputs, not outcomes.** "Four releases… 107 merged
   PRs" is activity. The stated real goal — "take off my design hat and my
   dev hat" — has no measure attached: no hours reclaimed, no drift incidents
   caught by the guard, no time-to-first-screen number. Even one "Fails
   until:"-style line would land harder than the PR count.
3. **"Machine-enforced where possible" needs a number.** How many principles
   exist, and how many actually fail CI? The draft names two rules and
   concedes the ten Nielsen heuristics aren't checkable. If the ratio is 2
   enforced of 15, say so — the manifest's own honesty earns it.
4. **An asserted cost model with no cost.** The Decision 2 economics are
   stated as fact with zero evidence — not even one anecdote of a gate
   catching something that would have shipped.
5. **"Who it's not for" never appears.** Decision 3 excludes features
   brilliantly, but the piece never excludes an audience — that absence lets
   the solo-founder → teams slide go unchallenged.

**What works.** Every Decision section states its driving constraint like a
requirement — "Figma Pro, not Enterprise" cleanly explains the one-way sync;
the 12,000-element shadcn refusal is scope-out done right. The dated source
logs are acceptance evidence in miniature — PR-linked, honest about repairs
and the collapsed OpenSpec gates.

## Designer (design-advisor rubric)

**Verdict.** This piece would make me trust Katy to build design
*infrastructure* for an org; it doesn't yet show me the design eye that
infrastructure exists to serve.

**Top findings.**

1. **The craft is present only as CI rule names.** The 8pt scale, type ramp,
   gradation roles, and the "eight spatial/layout primitives shadcn
   deliberately doesn't ship" surface as `step-on-color-gradations`,
   `step-on-type-ramp` — strings that fail a build. A design director reads
   that as engineering discipline. One paragraph showing a composed screen —
   why five gradation steps, what the primitives make possible that shadcn
   doesn't — would prove the rules encode taste, not just tidiness. Right now
   the piece's only visual evidence is a Figma link.
2. **The Figma story is argued defensively, never demonstrated.** "The
   trade-off turned out to be a repositioning, not a loss" is an assertion.
   Not one design decision in the piece actually begins in Figma — the best
   moment ("why are we deriving the ramp at all?") starts in a design review,
   in words. Show a single spec change born as a Figma exploration and the
   mirror claim stops reading as ceding ground.
3. **"Guardrails even when the designer isn't there" cuts both ways for this
   audience.** A hiring reader leading a design org may hear a designer
   automating designers out. The counter-argument — "orchestrate the design
   process… at different inflection points" — is the thesis for this
   audience; it arrives late and abstractly, and belongs nearer the top.
4. **Evidence-band rhythm decays.** The dated blockquotes are a genuine
   signature through Decisions 1–2; by Decision 4 and the dogfood loop,
   strings of PR numbers are texture, not proof. The bands earn their keep
   when they hold a verbatim voice; consider trimming the pure PR-inventory
   ones.

**What works.** Decision 3 is the piece — refusing the 12,000-element shadcn
library and "the ramp's value was never the formula; it was the discipline of
stepping" is design judgment stated as judgment, the single strongest trust
signal here. The honesty posture is rare and credible — directors hire people
who audit themselves.

## UX Writer (user-communication rubric)

**Verdict.** The argument is strong and the voice is honest, but the piece
leaks internal vocabulary and process labels that a design-leadership reader
can't parse, and the evidence blocks switch to a narrator voice that keeps
interrupting the first-person essay.

**Top findings.**

1. **"the `stepped-scales` Human anchor, scoped-theming design review" —
   cold jargon at the emotional peak.** This attribution lands on the best
   quote in the piece and is unreadable to an outsider. Same class:
   "MVDS adopted OpenSpec in week 11 of 13" (OpenSpec never introduced),
   "OIDC trusted publishing and provenance attestation," "the discovery eval
   rubric." One clause each would fix them ("OpenSpec, the spec-tracking
   workflow I adopted late"; "a Human anchor — my own words, preserved
   verbatim in the change record").
2. **The self-quote reads as someone else's voice.** The Decision 3
   pull-quote is Katy's own thinking, but attributing it to "the Human
   anchor" makes it read like a third party reviewing her. The reader needs
   to know *she* is the speaker before the quote, not after.
3. **Process residue up top.** The opening draft-note blockquote and the
   heading "Hook" are drafting scaffolding, not portfolio copy — exactly what
   her own plain-labels standard forbids. "Hook" should be a real heading or
   nothing; the draft note should not ship.
4. **Title vs. body tension: "a design system that can't drift" — but it
   drifted.** The body says, correctly and admirably, "It has needed repair
   passes." The absolute title slightly overclaims against it. "A design
   system that can't drift silently" or "…that repairs toward code" would
   keep the promise the body actually keeps.
5. **Evidence-block voice.** The dated logs are telegraphic and third-person.
   They work as footnote texture, but two per section, mid-argument, chop the
   read. Consider a consistent one-line format or moving links inline.

**What works.** The first 30 words are excellent — concrete numbers, then a
genuine turn ("But MVDS isn't really a component library"). Decision headings
carry the argument on a skim: "Code is the source of truth; Figma is the
mirror" tells the whole story by itself. Tone throughout is calm, plain,
unhyped — fully on standard.

## Historian (case-study + experiment-narrative rubrics)

**Verdict.** The evidence-block form is disciplined and most receipts check
out on the live repo, but two headline numbers in the Hook/Outcome fail
verification and a few quoted sources still lack checkable links.

**Top findings.**

1. **"Four releases (v0.1.0 → v0.4.0)" — the repo shows three.** Tags are
   v0.1.0, v0.3.0, v0.4.0; there is no v0.2.0 tag. The Hook compounds it:
   "four releases on public npm" — v0.1.0 predates the public-npm move
   (Jul 15). *(Verified and fixed 2026-09-04: three tagged releases, 0.2.0
   noted as untagged.)*
2. **"107 merged PRs" — actual merged count is 104.** 107 is the highest PR
   *number*; three closed unmerged. *(Verified via gh and fixed 2026-09-04.)*
3. **The Notion and OpenSpec quotes lack checkable links.** The BHD Labs row
   block has no date; the `stepped-scales` verbatim quote links to nothing —
   the change record it quotes is the one receipt a reader would want.
4. **Timeline inconsistencies.** Hook said "twelve weeks" vs Reflection's
   "week 11 of 13"; "four days into the repo's life" for PR #24 is five.
   *(Both fixed 2026-09-04.)*
5. **Unreceipted numbers.** "12,000 elements," "ten controls," "eight
   spatial/layout primitives" carry no source — and the combined draft
   dropped the staging table the skill requires, so nowhere pins them.

**What works.** The dated PR receipts spot-checked (#10, #17, #24, #48,
#64–65, #72, #81–82, #85, #92, #98, #101, #103, release dates) all match the
live repo exactly — the source-log blocks are genuinely honest, including the
repair pass and the collapsed one-day gates. Every decision names its
trade-off; the terminal Reflection is a real lesson, not a victory lap, which
fits an active/Validating project.

## Synthesis

**Applied immediately (verified factual errors):** 104 merged PRs not 107;
three tagged releases not four (0.2.0 untagged); thirteen weeks not twelve;
five days not four for the drift guard. Corrected in `mvds-combined.md`,
`mvds.md`, and `mvds-approaches.md`.

**Where the voices converge (Katy's call, in rough priority):**

1. **The teams claim outruns the evidence — 3 of 5 voices.** Strategist, PRD
   Writer, and (implicitly) Designer all flag "MVDS is a system for teams"
   and "every team maintains the same design system three times" as
   universal claims on n=1. Shared recommendation: keep the insight, reframe
   as the hypothesis the work has earned the right to test.
2. **The enforcement economics need one receipt — 2 voices.** "More
   expensive NOT to check" is the load-bearing claim and no gate is ever
   shown catching anything. One caught regression, or one pre-gate drift
   incident, converts belief to evidence. (Open question for Katy — the
   trail may hold one.)
3. **Show the design eye, not just the discipline — Designer + UX Writer.**
   The craft appears only as CI rule names; the piece's only visual is a
   link. One composed screen, or a paragraph on why five gradation steps and
   what the layout primitives buy, would prove the rules encode taste. The
   inflection-points thesis ("still use our skills, at different inflection
   points") is the answer to the automating-designers-out worry and belongs
   earlier.
4. **Jargon needs one-clause introductions — UX Writer + Designer.**
   OpenSpec, "Human anchor," OIDC, "discovery eval rubric" drop cold; the
   stepped-scales quote must be identified as Katy's own words *before* the
   quote, not after.
5. **Title honesty — UX Writer.** "Can't drift" vs the body's admitted
   repair passes; "can't drift silently" keeps the promise the body keeps.
6. **Missing measures — PRD Writer.** Hats-off has no number (hours,
   time-to-first-screen, drift catches); "who it's NOT for" never appears;
   the enforced-vs-guiding principle ratio would strengthen, not weaken.
7. **Trim the PR-inventory evidence blocks — Designer + UX Writer.** Blocks
   earn their keep when they carry a voice or a finding; bare PR-number
   strings are texture. Restore a compact staging table (Historian) so
   numbers stay pinned without cluttering the prose.
