# Design — hosted single-tenant PDF Metadata Viewer

## Context

v1 is an Express app on `localhost:3004` reading a local directory. Every route
takes a filename, resolves it against one process-wide `PDFS_DIR`, loads the
whole PDF with `pdf-lib`, and writes it back. The activity log is a JSON file
truncated to 1000 entries. Entities come from Notion through a module-level
cache. None of it is authenticated.

v2 puts the same workflow on the hub's Vercel pipeline for one user. The bytes
stay in Google Drive; a database becomes the working store so editing doesn't
require a full-file round trip.

Constraints that shape everything below:

- **`pdf-lib` needs whole-file bytes.** There is no partial metadata write. Every
  file write is a download-modify-upload against Drive.
- **Serverless has no persistent disk.** `activity-log.json` and
  `.entities-snapshot.json` have nowhere to live.
- **The archive is household medical, financial, and school records**, including
  minors'. It is on a public URL for the first time.

## Goals / Non-Goals

**Goals:**

- Editing a document's metadata makes zero writes to Drive until commit.
- Listing and opening documents fetch no PDF bytes.
- Field-level history is uncapped and survives rename and file deletion.
- One authenticated principal; every route refuses everyone else.

**Non-Goals:**

- Multi-tenancy, accounts, sharing, permissions.
- Per-user Notion OAuth — the integration token stays.
- Google restricted-scope verification. Deferred by staying inside the
  unverified-app test-user allowance.
- OCR, image formats, AI split points, taxonomy validation of model output.
  All still on `docs/roadmap.md`; none are load-bearing for the move.

## Decisions

### D1 — The database is the working store; the PDF stays the durable artifact

The PRD's first goal is *"make embedded metadata the only source of truth …
delete the tool and the archive still works."* A database working store appears
to contradict it. It doesn't, if commit is real.

**Decision:** edits accumulate in Postgres. An explicit commit writes them into
the PDF in one pass. The PDF remains the artifact that outlives the tool; the
database is the editing surface and the history that the file format cannot hold.

**Why not database-only** (never write the PDF): faster and simpler, but it
abandons the thesis. The archive would become worthless outside this tool —
exactly the Paperless-ngx/DEVONthink failure the PRD was written against.

**Why not file-only** (v1 behaviour over Drive): preserves the thesis and needs
no schema, but every field edit is a full download-modify-upload of a file that
can reach 100MB, and Drive versions each one. Unusable.

The cost of the middle path is a window where the database and the file disagree.
That window is *visible* — pending state is surfaced, not hidden — and closing it
is a single user action.

### D2 — Schema

Three tables. Names follow the hub's existing lowercase-plural convention
(`experiments`, `prototypes`, `notes`).

**`pdf_documents`** — one row per Drive file, holding *current* (staged) values.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` pk | |
| `drive_file_id` | `text` unique not null | The reference. Bytes never copied |
| `drive_head_revision_id` | `text` | Captured at read; compared at commit for conflict detection |
| `file_snapshot` | `jsonb` | The file's own metadata as last read from Drive. The merge baseline for D8 — written in the same operation as `drive_head_revision_id` so the two can never describe different versions |
| `filename` | `text` | |
| `title`, `subject`, `author` | `text` | |
| `keywords` | `text[]` | Ordered list, not a delimited string — see D3 |
| `page_count` | `int` | |
| `committed_at` | `timestamptz` | Last successful write into the PDF. Null = never |
| `deleted_at` | `timestamptz` | Soft delete, so history outlives the file |
| `created_at`, `updated_at` | `timestamptz` | |

**`pdf_document_history`** — append-only, one row per field change.

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial` pk | |
| `document_id` | `uuid` fk → `pdf_documents(id)` | Never cascade-deleted |
| `field` | `text` | `title` \| `subject` \| `author` \| `keywords` \| `filename` |
| `old_value`, `new_value` | `jsonb` | jsonb so `keywords` arrays and scalars share one shape |
| `change_type` | `text` | `stage` \| `commit` \| `rename` \| `split` \| `delete` |
| `changed_at` | `timestamptz` | |

No row cap. v1's 1000-entry truncation was a consequence of rewriting one JSON
file; a table has no such pressure.

**`pdf_drive_grant`** — single row. `access_token`, `refresh_token`,
`expires_at`, `scope`, `google_account_email`.

**Pending state: history is the record, a trigger-maintained boolean is the hook.**

The authoritative answer is always this, and it is what any repair reads from:

```sql
EXISTS (
  SELECT 1 FROM pdf_document_history h
  WHERE h.document_id = d.id
    AND h.change_type = 'stage'
    AND h.changed_at > COALESCE(d.committed_at, '-infinity')
)
```

Running that per row is a correlated subquery on every list load, and the list is
the main view over a corpus in the thousands. It is also awkward to subscribe to.
So `pdf_documents` carries `has_pending_edits boolean not null default false`,
and the application **never writes it** — two triggers do:

- `after insert on pdf_document_history` where `change_type = 'stage'` → set true
- `after update of committed_at on pdf_documents` → recompute from the predicate
  above

Keeping the writes in the database is what stops it becoming a second source of
truth. No route handler can set it, so no route handler can get it wrong, and it
cannot drift by being forgotten on a new code path.

It stays a cache because it is rebuildable from the record in one statement:

```sql
UPDATE pdf_documents d SET has_pending_edits = EXISTS (
  SELECT 1 FROM pdf_document_history h
  WHERE h.document_id = d.id AND h.change_type = 'stage'
    AND h.changed_at > COALESCE(d.committed_at, '-infinity')
);
```

That statement is the tie-breaker if the two ever disagree, and it should ship as
a maintenance task rather than existing only in this document.

Index `pdf_document_history (document_id, changed_at)` regardless — the repair
statement and the per-document history view both want it.

**Why not `committed_title` / `committed_subject` shadow columns:** doubles the
column count, and still can't express "which fields are pending" without
comparing each one. History already answers it.

**RLS:** enabled on all three tables with no permissive policies. Access is
service-role only, from Next route handlers, via `getAdminClient()` in
`lib/supabase.ts`. Nothing reaches the browser directly. `pdf_drive_grant` holds
refresh tokens, so this is a hard requirement, not hygiene.

### D3 — Keywords as `text[]`

The spec requires a keyword containing a comma or semicolon to survive as one
keyword. A delimited string cannot promise that; v1 split on commas and had a
second, incompatible legacy path splitting on whitespace. `text[]` preserves
order and content natively, and the delimiter question only arises at the file
boundary where `pdf-lib` demands it.

### D4 — Commit is read-modify-write with conflict detection

1. Re-fetch the Drive file's `headRevisionId`.
2. If it differs from `drive_head_revision_id`, stop and surface a conflict.
3. Download bytes, apply all staged fields with `pdf-lib`, upload to the **same**
   `drive_file_id` via update — not create, so links and sharing survive.
4. On success write a `commit` history row, set `committed_at`, store the new
   revision id.
5. On any failure, write nothing and leave staged values untouched.

Staged edits are never cleared by a failed commit. That is the difference between
a retry and lost work.

**Failures accumulate on the dashboard; they do not interrupt.** A conflict, a
refused write, or a vanished file becomes an *instance* in a **Needs attention**
list on the document dashboard, reviewed when the user chooses. Nothing blocks
mid-commit and nothing is resolved by a modal the user dismisses to get on with
what they were doing.

This matters more than it looks. The work happens in batches over a backlog; an
interruption per exception is what makes a batch stop. Accumulating them also
means the exception has a *resting state* — it can be looked at tomorrow, and it
is still there — which a modal cannot provide.

Instance types, each carrying cause, age, and one resolving action:

| Type | Cause | Action |
|---|---|---|
| Conflict | File changed in Drive after it was read | Compare |
| Commit failed | Drive refused the write, or the write errored | Retry |
| File missing | Drive file no longer exists; metadata and history kept | Locate |

Every instance states that no work was lost, because in every one of these paths
the staged edits survive. Saying so at the point of alarm is the difference
between the guarantee existing and the user believing it.

**Commit is available from the dashboard, not only per document.** The batch
model exists so a run of documents can be tagged and then written; making the
user open each one to commit it reinstates the per-document friction the batch
was meant to remove. The dashboard carries a primary
*Commit N documents to Drive*, with *Review pending* beside it for inspecting
first.

Bulk commit is N independent read-modify-write cycles, not a transaction. Each
document succeeds or fails on its own, and **anything that fails lands in Needs
attention** — which is what makes the two sections one loop rather than two
features. The button states its own exclusions up front (`3 excluded — see Needs
attention`) so the count on the button always matches what will actually be
attempted.

Rendered at `02 Proposed` — see the Figma table below.

### D5 — Google is the identity provider; no static shared secret

**Rejected: reusing the hub's `ADMIN_SECRET` gate.** It was the obvious choice —
`middleware.ts` already gates `/admin` on it, and extending the matcher is nearly
free. Reading the implementation is what killed it. In
[`lib/admin-auth.ts`](../../../lib/admin-auth.ts) the check is
`cookieStore.get("hub-edit")?.value === adminSecret`: the cookie value **is** the
secret, verbatim. It is not a session token derived from a credential — it is the
master credential, sitting in the browser jar of every device that has ever
signed in.

So the exposure is not "a secret might leak." One compromised browser profile
yields the credential for every device and every future session, the only remedy
is rotating an env var and redeploying, and nothing signals that you need to.
Proportionate for editing experiment metadata. Not for a family's medical,
financial, and school records on a public URL.

**Decision: authenticate with Google OAuth, pinned to an allowlisted account.**

The reason this is cheap rather than a new subsystem: **a Google OAuth handshake
is already being built for Drive.** Adding `openid email profile` to the same
client is near-free — they are non-sensitive scopes requiring no verification
review, so the restricted-scope question stays entirely about Drive and does not
get worse. The identity is already inside the token being fetched.

What it changes:

- No static secret exists, so there is nothing to leak that cannot be revoked.
- Revocation is real and singular — revoking the app in Google account settings
  ends both sign-in and Drive access.
- The account's MFA, passkeys, and security alerting are inherited.
- Google's third-party-apps list becomes the session audit; devices are visible
  and killable.
- One consent instead of two — "sign in" and "connect Drive" collapse into a
  single handshake.

**Pin the allowlist on the `sub` claim, not the email.** Emails are reassignable,
particularly in Workspace. Verify `email_verified` as well. An allowlist check
that is missing or keyed on something mutable means any Google account can sign
in — this is the one line where the design fails catastrophically rather than
gracefully.

**The session cookie must be signed and stateless.** Middleware has to verify
signature and expiry at the edge with no database call, because the spec requires
refusal *before* any storage, database, or third-party call is made. A
database-backed session would forfeit that property.

**Costs, stated honestly:**

- Google requires exact redirect-URI registration, and Vercel preview URLs are
  hash-based. Either register only the production callback and bounce previews
  through it, or keep authenticated routes production-only. This is the real
  implementation tax.
- Sign-in depends on Google being reachable. Acceptable; the tool already depends
  on Drive.
- More code than comparing a string to an env var.

**Why it is not more expensive than the alternative:** the static secret is work
that gets deleted entirely the moment a second person needs access. Google OAuth
with a one-entry allowlist is the first increment of the real thing — the same
flow, with the allowlist later swapped for a user table. The auth layer gets
built once rather than twice, and the version built is not the weakest part of
the design.

### D6 — Route layout

Follows the hub's existing collision-avoiding convention (`app/api/experiments/id/[id]`),
where a literal `id/` segment separates the collection from the dynamic param.

| Route | Purpose |
|---|---|
| `GET /api/pdf-documents` | List. Database only, no bytes |
| `GET /api/pdf-documents/id/[id]` | Metadata + pending state |
| `PATCH /api/pdf-documents/id/[id]` | Stage field edits |
| `POST /api/pdf-documents/id/[id]/commit` | Write the batch to Drive |
| `GET /api/pdf-documents/id/[id]/history` | Field-level history |
| `GET /api/pdf-documents/id/[id]/content` | Proxy Drive bytes for preview |
| `POST /api/pdf-documents/id/[id]/suggestions` | Vision suggestions |
| `GET /api/pdf-drive/connect`, `/callback` | OAuth handshake |

**Documents are addressed by database id, not filename.** v1's routes took
`:filename` and resolved it against `PDFS_DIR`, which is the only reason
`resolvePdfPath()` and its traversal guard had to exist. With a uuid key no
user-supplied string reaches a filesystem path, so that guard is deleted rather
than ported — the vulnerability class becomes unreachable instead of defended.

**`/commit` is a verb on purpose.** It is not RESTful, and that is the point:
commit is not updating a resource, it is an operation with side effects on a
third-party system that can partially fail. Folding it into `PATCH` would make
the one dangerous operation indistinguishable from the safe ones.

**`/content` proxies the bytes; no direct Drive link is ever minted.** Drive can
issue short-lived direct download URLs, which would be faster and would keep
document bytes off the Vercel function entirely. Rejected: it puts a URL to a
household medical record outside the authenticated session, where its lifetime is
governed by a token in a link rather than by the session that requested it.

The founder's reasoning is the deciding one — *Drive itself provides that*. If a
shareable URL to a document is ever wanted, Drive already has that feature, and
it is a decision made deliberately per document. This application should not
manufacture one as a side effect of rendering a preview.

The cost is accepted: every page preview goes through a function, and bandwidth
is paid for twice. Preview rendering is already client-side via pdf.js, so the
function streams rather than processes.

`prototype/lib/taxonomy-loader.js` and `entities-notion.js` port across
essentially unchanged — they already read config and Notion, not the filesystem.
The snapshot fallback loses its disk; on serverless it degrades to
cache-or-error, which is acceptable when the operator can retry.

## Visual design / Figma

| Item | Value |
|---|---|
| Primary file | **https://www.figma.com/design/NGybYS2piBw5Q8T4c35Z2M** — `pdf-metadata-viewer-cloud` |
| Published libraries | MVDS (`@beckharrisdesign/mvds`), bumped `^0.2.0` → `^0.3.0` by this change. Figma component import still outstanding |
| Local variables | `hub tokens` — 24 colour variables ported 1:1 from the `@theme` block in `app/globals.css`, scoped per role |
| Code Connect deltas | `N/A` — no component mappings change; the UI is composed from existing hub components |

**Pages** (file convention, restated per `rules/figma.mdc`): numbered pages, each
proposal iteration a *new* page — never edited or appended in place.

| Page | Node id | State |
|---|---|---|
| `00 Components` | `0:1` | `hub tokens` collection + bound swatch board at `5:27` |
| `01 Current state` | `1:2` | Built — reconstructed from `index.html` / `styles.css` |
| `02 Proposed` | `1:3` | First iteration — Dashboard, Detail, Compare. Frozen; further changes go to a new numbered page |
| `02.1 Proposed — Stat pattern` | `20:14` | Second iteration — Dashboard and Compare rebuilt on the `Stat` component. Only the two frames that changed |
| `02.2 Proposed — document change leads` | `23:14` | Third iteration — Compare only, with the content change raised above the field decisions and its three outcomes made explicit |
| `02.3 Proposed — contained width (xl 1280)` | `24:8` | Fourth iteration — all three surfaces capped at the `xl` breakpoint and centred, per MVDS `Container` |

### Content width

MVDS breakpoints are `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. At a 1440
viewport the next smaller breakpoint is **`xl` = 1280**, so content caps there and
centres — 80px gutters — via `<Container size="xl">`. Full-bleed bands keep their
background edge to edge; only their contents are capped, so the cap produces the
gutter rather than section padding faking one.

The Detail view did not survive this unchanged, and that is worth recording. Its
metadata panel had been styled as an edge-anchored drawer — left border only,
outward shadow — which only reads correctly when it is flush to the viewport.
Contained, it floated with background visible past it. The panel is now a bordered,
rounded column inside the container. The alternative was to exempt Detail and let
it run full-bleed; the split editor is the one screen with a real argument for
that. Rejected for now because one screen opting out of the layout system is how
a layout system stops being one.

**Frames in scope:**

| Frame | Node id | Status |
|---|---|---|
| `Current · File list · Desktop 1440` | `3:2` | Done |
| `Current · Detail · Desktop 1440` | `3:95` | Done |
| `Proposed · Dashboard · Desktop 1440` | `10:2` | `02` — Needs attention list, bulk commit action, pending state on rows |
| `Proposed · Detail · Desktop 1440` | `12:10` | `02` — per-field edited markers, in-the-file values, pinned commit bar |
| `Proposed · Compare (conflict) · Desktop 1440` | `16:2` | `02` — three-way merge, baseline shown, content-change block |
| `… — Stat` (Dashboard, Compare) | `20:15`, `20:128` | `02.1` — same two surfaces rebuilt on the `Stat` component |
| `Proposed · Detail · Mobile 480` | — | Required if the hosted tool is used on a phone |

Iterations live on their own pages per `rules/figma.mdc`: `02 Proposed` is frozen
as the first iteration and `02.1` carries the change, so the two can be compared
rather than one overwriting the other. `02.1` holds only the two frames that
changed — Detail was untouched and stays on `02`.

### D7 — Build the UI from MVDS 0.3, not by hand

0.3 is a different proposition from the 0.2 the hub was pinned to. It adds a
form layer (`Field`, `Label`, `Checkbox`, `Switch`, `RadioGroup`, `Select`,
`Textarea`), layout primitives (`Grid`, `GridItem`/`Col`, `Container`, `Spacer`),
and `Chrome`, `Layer`, `Hero`, `MediaFrame`, `CardAction`, `CardFooter`.

`Field` is close to purpose-built for the metadata panel — `{ label, help,
error, required }` with the aria wiring done:

| Panel need | `Field` prop |
|---|---|
| Field name | `label` |
| *"In the file: Untitled"* | `help` |
| Conflict on this field | `error` |

So the staged-versus-committed treatment is a prop, not a bespoke component.

**What MVDS still lacks: `Table`, a single-line `Input`, and `Stat`.** The first
two are not gaps to hand-roll beside the system — MVDS is shadcn-based and its
README names the path (`npx shadcn@latest add input …`), so both land inside the
same tokens. `cn`, `buttonVariants`, and `badgeVariants` are exported, so
anything genuinely custom composes from the same variant source rather than
drifting from it.

`Stat` is different: shadcn has no equivalent, so it is a genuine MVDS addition
rather than an install. It is a label over a value, with a tone that colours the
value — the dashboard's counts and Compare's decision summary are the same
pattern, and building it twice is how two surfaces drift apart. Built in Figma
first as a variant set (`19:17` on `00 Components`) with a `Tone` axis of
Default / Warning / Success / Danger / Muted and TEXT properties for `Label` and
`Value`. Both frames consume instances, so there is one source rather than two
hand-built copies.

Proposed MVDS API, matching the Figma properties:

```tsx
<Stat label="Pending edits" value="17" tone="warning" />
```

Three additions to MVDS come out of this change, in the order they are needed:
`input` and `table` via shadcn, then `Stat` authored against the token set.

Compatibility was checked against the 0.3 typings before bumping: every
component and variant the hub already uses — `Badge` success/destructive/muted,
`Button` outline/ghost, `Section` `bg`/`py`, `Stack`/`Inline` `gap`, all `Card`
subcomponents — exists unchanged. The bump is additive for existing usage.

The bump regenerated `pnpm-lock.yaml`, which also picked up
`packages/notion-auth` — added to the workspace by the migration change but
never written into the lockfile.

### D8 — Conflict resolution is a three-way merge, not "yours or theirs"

Designing Compare showed the two-way framing is wrong. There are three states:

1. What you staged
2. What is in the Drive file now
3. **What was in the file when you opened it** — the common ancestor

With the baseline, each field classifies itself and most fields stop being
conflicts at all:

| You changed | Drive changed | Outcome |
|---|---|---|
| yes | no | Your edit applies. Not a conflict |
| no | yes | Drive's value applies. Not a conflict |
| yes | yes, same value | Agreement. Not a conflict |
| yes | yes, differently | **The only real conflict** |

So the screen leads with a count — *2 need your decision, 2 apply with no
conflict* — and shows the non-conflicts quietly rather than making the user
adjudicate five fields when two need them. The baseline appears on each conflict
as `was: …`, because without it "you both changed this" is unreadable: you cannot
tell who moved.

**A content change is not resolvable by picking field values, and it leads the
page.** If the page count or bytes changed, the document may no longer be the one
the staged metadata describes — a re-scan, an appended page, a signature. Field
conflicts ask *which value wins*; a content change asks *is this even the same
document*. The second dominates the first, because picking a title for a document
that no longer exists in that form is wasted work. So it sits directly under the
what-happened band, above the decision summary, at alert weight rather than as a
footnote.

**One conflict per document, never a stack.** A conflict is keyed to the document,
not appended to a list. It is "your staged edits versus Drive's current state,"
and there is only ever one current state — so a further change in Drive makes the
open conflict stale and recomputes it rather than adding a second instance.
Without this, a document edited five times produces five rows in Needs attention
and the list stops being readable.

**Inspection never re-baselines.** *Open the new version* is a look, not a
resolution: it clears nothing and changes no stored state. Re-baselining — moving
`file_snapshot` and `drive_head_revision_id` to the new version — must be an
explicit outcome the user picks, because doing it silently would make Drive's own
metadata changes part of the new baseline. "Drive changed the title" would stop
being detectable, and the staged title would overwrite theirs on the next commit
with no conflict shown at all. That is the one path in this design that loses
someone else's work without saying so.

The three outcomes are therefore stated on the block itself: look, keep my edits
(same document), or discard and re-tag (different document). A fourth exists and
is deliberately out of scope for now — that the file became *two* documents, which
is a split rather than an edit.

Nothing is written until a choice is made, and leaving the page keeps the edits
staged — consistent with D4: the exception waits, it does not corner the user.

**Schema consequence — this needs a baseline the current schema does not store.**
`pdf_documents` holds staged values and `pdf_document_history` holds old→new, so
the baseline is *derivable* — the `old_value` of the earliest `stage` row after
`committed_at`, falling back to the current value for fields never staged. That
derivation is fiddly and easy to get subtly wrong at exactly the moment
correctness matters most.

Store it instead: **`pdf_documents.file_snapshot jsonb`**, the file's own metadata
as last read from Drive, captured in the same operation that sets
`drive_head_revision_id` so the snapshot and the revision it describes can never
disagree. Compare then reads three explicit values rather than reconstructing one.

### Frames and tokens

All fills on the proposed frames are bound to `hub tokens` variables rather than
hardcoded, so a token edit moves the design. Note the visual consequence of
living in the hub: the proposed surface is the hub's dark green, where v1 was
light grey. That is correct — it is the same application — but it is a real shift
to look at against `01 Current state`.

The detail frame is the remaining visual question. v1 has no save control at all;
each field commits itself. v2 needs to express staged-versus-committed, a commit
action, what pending looks like at rest, and what a Compare resolution does. That
is composition, so it is gated on a rendered page and an explicit go, not on this
document.

## Risks / Trade-offs

**The `pdf-lib` keyword read-back bug is now a launch blocker.** → It was an
annoyance when one person read the file back in the same tool. With Drive as the
destination and a database asserting what the file *should* contain, a bad write
is silent divergence across the archive. Verify a committed keyword list against
an external reader before any real commit. If `pdf-lib` cannot be trusted to
write keywords correctly, the library gets replaced before this ships, not after.

**Database and file can disagree.** → Inherent to D1. Mitigated by making pending
state visible in the UI at rest, not just during editing, and by never clearing
staged values on a failed commit.

**Drive version churn.** → Batch-per-document keeps it to one version per commit
instead of one per field. Acceptable; Drive versions are cheap and it is the
price of the file staying authoritative.

**A single static secret guards the archive.** → See D5. Proportionate now,
first thing to replace, and it must be replaced *before* the tool has a second
user rather than as part of that work.

**OpenAI still receives document images.** → Her own data, her own call, no
paperwork needed at one user. The moment a second account exists this becomes a
subprocessor relationship over other families' records, needing a DPA and
zero-retention. Recorded here so the boundary isn't crossed silently.

**Large files over a network.** → v1 warned above 100MB on local disk. The same
file now moves twice per commit over Drive. Preview already renders page images
client-side via pdf.js; commit is the operation to watch, and page-count or size
thresholds may need surfacing before a commit rather than after it fails.

## Migration Plan

The local Express prototype keeps working throughout and is retired only once the
hosted instance has round-tripped a real document end to end.

1. **Keyword round-trip proof against an external reader.** Hard gate — stop here
   if it fails. It runs first because it is the cheapest thing that can
   invalidate the change and it needs none of the rest: the v1 prototype and one
   PDF are enough. Proving it after the schema and OAuth are built would mean
   discovering the premise is broken having already paid for everything else.
2. Migration for the three tables, RLS on, no policies.
3. Google identity and the Drive handshake; confirm a token refresh survives
   expiry and that revocation ends both.
4. Import a folder — reference rows only, no bytes copied.
5. Read path: list, detail, and history served from the database.
6. Figma `02 Proposed` — Compare in particular — then the write path: stage,
   commit, conflict.
7. Retire the prototype; rewrite `README.md`, `PRD.md`, `.env.example`, which
   still say local-only.

Rollback at any step is to keep using the local prototype; nothing in Drive has
been restructured, and no bytes have been moved.

## Open Questions

- **Which Drive scope?** `drive.file` only reaches files the app created, which
  doesn't fit an existing scanned archive. `drive.readonly` plus write means a
  restricted scope. Resolve before the OAuth consent screen is configured, since
  it decides how much of the verification question is deferred versus incurred.
- **Does the split feature survive the move?** It creates N new Drive files per
  split and needs its own reference rows and naming. Not specified; may be worth
  leaving on the local prototype for now.
- **What happens to `from-split` / `already-split` / `needs-deleting`?** These are
  keyword flags standing in for workflow state that a database can now hold
  properly as columns. Migrating them is a taxonomy decision, not a schema one.
