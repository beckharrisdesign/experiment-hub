# Founder intent — cloud pivot

Verbatim, from the working session on 2026-08-05, in the order it was said.
Recorded because the decision was made in conversation and the reasoning is
worth more than the conclusion.

---

## The decision

> Shifting this codebase into experiments is me deciding to think about it as a
> cloud based tool not a local one. Which does definitely mean I need to think
> about it as multi tenant, and with a oauth handshake to a destination like
> google drives and notion, and testing for security standards since this will
> have family data in it.

## The sequencing

> ok so that's a large lift - noted - but what if I started with a personal only
> instance of the tool and then considered productizing it a much later phase. I
> wire up an oauth flow, put my own openai creds into a web ui, and work through
> getting it up and running in the cloud but in much the same footprint as the
> local version.

## The shape

> I want to shift to using my existing vercel ci/cd pipeline because its proven
> already. I think we need to think through a database schema that allows me to
> do batch edits and also store metadata history for a certain pdf without that
> full file round trip. File storage can stay on drive in the short term and we
> just store url refs to it in the database.

---

## What this supersedes

`docs/PRD.md` scopes the tool as single-operator and local:

> **Not for**: Teams, shared archives, or anyone needing multi-user access,
> permissions, or an audit trail. This is a single-operator tool on local files.

That framing is now historical. It described the prototype accurately and should
stay in place until the cloud change lands, at which point the PRD needs a
rewrite rather than an edit.

## Deliberately deferred

Multi-tenancy, per-user OAuth token storage, an OpenAI data-processing
agreement, and Google's restricted-scope security assessment are all out of
scope for the first hosted instance — the founder chose a personal instance
first specifically to defer them. They return the moment a second person has an
account.
