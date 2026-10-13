# Estate Sale Planner — Founder intent

> "I liked this idea of the day today. Let's try another autonomous build using MVDS.
> Note that I'm about to release another version of MVDS so make sure we don't build
> until that's able to be folded in."
> — Katy, 2026-10-13 (Claude Code session)

The idea, as it arrived (a newsletter brief, 2026-10-13):

> **The estate sale planner** — An app that tells families what's worth keeping when they
> clear out a parent's house.
>
> 1. Film a walkthrough on your phone.
> 2. AI vision model flags anything that could be worth something.
> 3. Makes 2 lists. The sell or keep/toss list.
> 4. Tinder swipe keep or toss and 1 tap calls 1-800-GOT JUNK *(You'd set up an affiliate
>    deal of course).*

Why now, from the same brief (Cerulli Associates / Visa Business & Economic Insights, via
Walnut): about $106 trillion is estimated to be inherited through 2048, "and a lot of it is
houses full of stuff. The kids getting it are busy parents with their own kids, jobs, and
lives. And they have to sort it all out while they're grieving. Is that lamp $20 or $2,000?
Nobody knows… so they guess, or a clean out company hauls the good stuff out with the junk."

Three later instructions, all 2026-10-13, reshaped the UI and then the model:

> "I want to refine the sophistication of the ui of the proposal - the typography is clunky
> and the card for each found item needs to have more contrast and an image of what it
> thinks it found."

> "what happened to all the shared resources in the experiment hub? why did we fail on an
> api key when I know we have others? … I mean the design of the experiment itself - why
> are we planning on a key I don't have when I do have chatgpt and other openai keys? what
> about stripe or supabase?"

> "do 1 and 2, and we need some sort of payment in the model so we're headed toward 3
> anyways if we want to lump them all together"

— i.e. vision on the hub's OpenAI key, counted events in Supabase, and a paid Sell Sheet
on Stripe, all in the one build (review queue #30–#35).

Two instructions shape the build:

- **Autonomous.** The agent runs the hub's own ladder (Explore → Propose → lite build
  change → apply), takes the consequential defaults itself, and logs each one in
  [`review-queue.md`](review-queue.md) for the founder to approve or revise. Money-out,
  deploy-to-production, and anything irreversible still wait for her.
- **MVDS gate.** No code is built until the next MVDS release is published and folded in.
