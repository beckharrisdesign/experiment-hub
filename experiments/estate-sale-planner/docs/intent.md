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

Then the product shape itself, same day:

> "how do users move between selling and keeping and donating lists? how do they refine the
> estimated cost or what the provenance of something is. what are my info sources for
> genuinely valuable things?"

> "and no we won't call it tossing -- keep, sell, donate are the options, and we should be
> able to toggle between then per item. but there are moments where a user needs to take
> additional details like a seam or a stamp on the bottom."

> "consider mobile navigation paradigms - editing a profile, finding history, crud operations
> on each elements, correcting an object recognition decision that isn't right"

— round 03: keep / sell / donate on every item, the full-screen item with edit / detail
shots / remove, add-item, a bottom tab bar, on-device history, and the exit re-pointed at a
donation pickup (review queue #36–#42).

> "so what does the second use of the product do - keep adding to the same list? start over?"

> "sure approved - I want to try this out!"

— round 04: rooms append to the same walkthrough with the model told what is listed, an
explicit Start a new walkthrough, and names (review queue #43–#45).

Two instructions shape the build:

- **Autonomous.** The agent runs the hub's own ladder (Explore → Propose → lite build
  change → apply), takes the consequential defaults itself, and logs each one in
  [`review-queue.md`](review-queue.md) for the founder to approve or revise. Money-out,
  deploy-to-production, and anything irreversible still wait for her.
- **MVDS gate.** No code is built until the next MVDS release is published and folded in.

Two days later, after the first real use on her phone (2026-10-15):

> "I'm personally going to stick to images - a live camera instead of video since that adds
> complexity out of the gate.
> the ability to go back and recrop the og images into new elements.
> the future func of using ML or AI models to identify objects and outline them.
> no peristent nav - can't really tell where I am in the app.
> no persistent saving of previous listings. I want this to be the core app where I kick off
> those listings and monitor their progress and also what my estimated vs sold values were."

— round 05, **proposed and awaiting her veto** before any code:
[`round-05-proposal.md`](round-05-proposal.md) (review queue #46–#50). The last line
re-defines the product: not a throwaway triage, a system of record for the sales she runs.
