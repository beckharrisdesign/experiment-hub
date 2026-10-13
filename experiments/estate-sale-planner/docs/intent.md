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

Two instructions shape the build:

- **Autonomous.** The agent runs the hub's own ladder (Explore → Propose → lite build
  change → apply), takes the consequential defaults itself, and logs each one in
  [`review-queue.md`](review-queue.md) for the founder to approve or revise. Money-out,
  deploy-to-production, and anything irreversible still wait for her.
- **MVDS gate.** No code is built until the next MVDS release is published and folded in.
