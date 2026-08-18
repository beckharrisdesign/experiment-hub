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

### D0 — The keyword gate: run, and it passes with a constraint

Task group 1 executed 2026-08-06 against `pdf-lib` 1.17.1. The result changes the
diagnosis the roadmap carried.

**What was believed:** `docs/roadmap.md` — *"`getKeywords()` returns keywords as
space-separated characters rather than the string that was written. Keywords do
appear to be saved correctly — the failure is on read."*

**What is actually true:** the failure is on **write**. `setKeywords(array)` joins
the array with a single space and stores one flat string in the Info dictionary.
Decompressing the object stream of a file written by `pdf-lib` shows literally:

```
/Keywords <FEFF...>   →   "invoice Smith, Jane paid"
```

The array boundaries are never written, so no reader — `pdf-lib`, Acrobat,
Preview, anything — can recover them. There is also **no XMP packet**, so no
`dc:subject` array exists as a second copy. The Info string is all there is.

**Why this is survivable.** Round-tripping was tested per case:

| Keywords written | Read back by splitting on whitespace |
|---|---|
| `invoice`, `utilities`, `paid`, `year-2026`, `keep-7yr` | identical to input |
| `invoice`, `Smith, Jane`, `paid` | broken — four tokens, unrecoverable |

Every tag in this taxonomy is a space-free kebab-case slug, from
`config/tag-vocabulary.md` and from the Notion `Slug` field. **For the data this
tool actually handles, the round trip is lossless.**

**Decision (task 1.4): keep `pdf-lib`, and make the constraint explicit rather
than implicit.** Replacing the library to gain a real XMP array is a large change
to buy correctness for keywords the taxonomy does not permit anyway. Instead:

- A keyword containing whitespace MUST be rejected before it can be committed.
  Today nothing enforces that — Notion's `Slug` is free text, so a slug typed with
  a space would silently corrupt on write.
- The database keeps `text[]`, which stays the authoritative ordered list. D1
  already makes the file the durable artifact and the database the working store;
  this simply means the file's copy is lossy in a bounded, known way.

**What was not proved:** no external PDF reader was available on this machine
(no `exiftool`, `qpdf`, `mutool`, `pypdf`), so the check went to the raw bytes
instead — arguably stronger for this question, since it shows what is stored
rather than what one library reports. Confirming a third-party reader displays
the same string remains worth doing once, but the failure mode is now understood
and it is not a read-side problem.

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

### D9 — Drive scope is `drive.file`, granted by folder

> **SUPERSEDED 2026-08-18 by D9a below.** The premise this decision rests on —
> that a Picker folder grant reaches the files inside the folder — is false.
> Kept in full because the reasoning is still sound wherever the premise holds,
> and because the cost comparison is exactly the one D9a re-runs.


**Decision: `drive.file`, with access granted through the Google Picker at
folder granularity — never file by file.**

`drive.file` covers files the app created *and* files the user explicitly hands
over through the Picker, so it reaches an existing scanned archive. An earlier
draft of this document said otherwise; that was wrong and drove the comparison
the wrong way for a while.

**Why not `drive.readonly` (+ write):**

| | `drive.file` | `drive.readonly` |
|---|---|---|
| Classification | Non-sensitive | **Restricted** |
| CASA security assessment | Never | Required to publish |
| Refresh tokens in Testing status | n/a — publishable | **Expire after 7 days** |
| What the app can read | Only what was handed to it | Every file in the Drive |
| Survives productization | Yes | Hits the assessment wall |

The 7-day expiry is the one that decides it operationally. A restricted-scope app
left in Testing status re-authenticates weekly, forever — so sitting down to
clear a backlog would begin with an OAuth dance every time, which is friction
aimed squarely at the workflow this tool exists to make survivable.

The least-privilege argument is not decorative either. This archive is household
medical and financial records; "the app cannot see files you did not hand it" is
a materially smaller blast radius than "the app can read your Drive," and it is
worth the Picker integration to have it.

**Confirmed in the Console, 2026-08-06.** The premise was worth verifying rather
than trusting, since everything else in D9 rests on it. All four requested scopes
register under **"Your non-sensitive scopes"**:

| Scope | Console description |
|---|---|
| `openid` | Associate you with your personal info on Google |
| `.../auth/userinfo.email` | See your primary Google Account email address |
| `.../auth/userinfo.profile` | See your personal info… |
| `.../auth/drive.file` | See, edit, create, and delete **only the specific Google Drive files you use with this app** |

Two things follow. No CASA assessment applies, so the app is publishable and the
seven-day refresh-token expiry of Testing status is avoidable. And the Drive
wording — *files you use with this app*, rather than *files created by this app* —
is the phrasing that covers Picker-handed folders, which is what makes an
existing archive reachable at all.

**Folder granularity is part of the decision, not an implementation detail.**
Per-file picking would mean handing over documents one at a time, which is
unusable against a scanning workflow. The Picker must select folders.

**The open risk, and the plan for it.** Whether a folder grant extends to files
added to that folder *later* is the question the whole option rests on, and it is
not settled here — it is a property of Google's current behaviour that needs
observing rather than assuming. Task 2.1a spikes it before any Drive code is
written.

If inheritance does not cover later files, the design does **not** collapse — it
degrades into something the app already has a shape for. The app knows the folder
id, so it can compare what Drive reports against what it can actually open and
surface the difference as **a fourth Needs attention instance type**: *"3 new
documents in this folder need access."* Its action re-opens the Picker. That
turns a silent gap into the same accumulating, resolvable exception as a conflict
or a failed commit, rather than documents quietly never appearing.

That fallback is worth building regardless of how the spike resolves: a
re-scanned or moved file could drop out of the grant at any time, and finding out
by noticing an absence is the failure mode worth designing out.

### D9a — Drive scope is full `drive`, with the consent screen set to Internal

**Decision, 2026-08-18: request `https://www.googleapis.com/auth/drive`, and set
the OAuth consent screen to User type `Internal`.**

**What forced it.** D9 assumed a Picker folder grant covers the files inside the
folder. Task 2.1a existed to check that assumption before anything was built on
it, and the check was never run — the folder workflow was written against the
assumption, and the domain-wide Drive block masked the result for eleven days.

Measured against the live grant on 2026-08-18, with a folder selected and stored
successfully:

| Query against the grant | Result |
|---|---|
| All accessible items | **1** — the folder itself |
| PDFs in any folder | **0** |
| Folders | 1 |

A `drive.file` folder grant conveys the folder and nothing within it. The scope
description — *files you use with this app* — does not extend to a folder's
contents, and D9 read more into that wording than it carries.

**Why this was expensive to see.** Drive answers a listing for files the grant
does not cover with an **empty list, not a 403**. So the import ran, succeeded,
and reported `imported: 0`. Nothing failed. The tool and the logs both said the
folder was empty, and only a direct probe of the grant distinguished "empty
folder" from "grant covers nothing".

**Why not the alternatives.**

| Option | Verdict |
|---|---|
| Multi-select files in the Picker | Works, and stays non-sensitive. Rejected: every new scan needs re-picking, so the archive is never current by default |
| App creates the folder it manages | Does not work. `drive.file` covers files the app created or opened; a PDF scanned into that folder is neither |
| `drive.readonly` | Restricted anyway, and cannot write. Commit would be impossible |
| Full `drive` | Chosen |

Since any workable scope here is restricted, `drive.readonly` buys nothing over
full `drive` — it pays the same compliance price and cannot support commit.

**What makes it affordable: Internal.** A restricted scope normally means
Google's CASA assessment, an unverified-app warning, and the seven-day
refresh-token expiry that D9 correctly called decisive. An app whose consent
screen is **User type: Internal** is exempt from verification entirely. D9's cost
table was right about External and simply did not consider Internal, which was
available the whole time because every account already lives in the
`beckharrisdesign.com` Workspace.

| | D9 (`drive.file`, External) | D9a (`drive`, Internal) |
|---|---|---|
| CASA assessment | No | No |
| Refresh-token expiry | None | None |
| Folder listing | **Broken** | Works |
| Reach | Files handed over | Every file in the Drive |
| Serves accounts outside the domain | Yes | **No** |

**What it costs.** Two things, both accepted deliberately.

The least-privilege argument in D9 is genuinely lost. "The app can read your
Drive" is a larger blast radius than "the app cannot see files you did not hand
it", and this archive is household medical and financial records. What remains
is that the grant is single-tenant, the refresh token never leaves the server,
and bytes are served only through the authenticated session — the mitigations
D5 and the spec already require, now carrying more weight than they used to.

And Internal is a one-way door for as long as it lasts: the day an account
outside the Workspace needs access, this becomes External **and** restricted,
which is a taller wall than D9 would ever have faced. Founder decision, recorded
2026-08-18: *"it already can only serve accounts in beckharrisdesign.com — I'm ok
with the future lift."* Multi-tenancy was already out of scope, so this moves a
cost that was always coming rather than creating a new one.

### D10 — The splitter belongs in v2; its schema lands now, its screen later

Splitting is not optional and not peripheral. An earlier draft here framed it as
"ingest work" that could stay on the local prototype — wrong. Finding split
boundaries means studying page thumbnails and deciding where one document ends,
which is a considered, screen-based task, as suited to the hosted tool as tagging
is. A local-only splitter would mean a document's journey cannot be finished from
the hosted app, which undercuts the reason for hosting it.

It is also not free to leave local, because both tools read the same bytes: the
PDF directory already lives inside Google Drive (`roadmap.md`, Phase 6). A local
split writes `already-split` and `needs-deleting` into the original, so the
hosted tool's `file_snapshot` baseline stops matching and the next commit is a
conflict; and the outputs, created through the filesystem rather than by the web
app, fall outside a `drive.file` grant.

**Decision: the splitter moves to v2. The schema for it lands now; the interface
comes after the write path.**

Splitting the decision this way is deliberate. The screen is the most complex in
v1 — a thumbnail grid with click-to-insert break markers, 21 references in
`app.js` — and appears in none of the proposal iterations, so it needs design
before it needs code. But the *data model* is expensive to defer and cheap to
add: outputs need a reference back to what they came from, and discovering that
the model is wrong after documents exist is a migration against real data rather
than an empty table.

So `pdf_documents` gains:

| Column | Purpose |
|---|---|
| `split_from_document_id` | The document this was produced from. Null for originals |
| `split_index` | Position within that split, so ordering survives |
| `superseded_at` | When an original was replaced by its outputs |

This also settles the flags question (D11 below): with splitting in v2, the
workflow states it produces are written by this application, not inherited from
another one — so they belong in columns.

### D11 — Split workflow states are columns, not keywords

`from-split`, `already-split`, `needs-deleting`, and `no-split-needed` are
application state wearing a keyword's clothing. They exist as tags in v1 because
the PDF's keyword field was the only place to put anything.

`from-split` and `already-split` are now expressed by
`split_from_document_id` and `superseded_at` — derivable, not stored twice.
`needs-deleting` and `no-split-needed` are decisions about a document rather than
descriptions of it, so they become `marked_for_deletion` and `split_not_needed`.

Two consequences worth stating:

- **They stop polluting the taxonomy.** The AI is asked to choose keywords from a
  controlled vocabulary; four of those options were never about content, and a
  model picking `needs-deleting` from document *imagery* was always noise.
- **Existing files keep theirs.** Documents already tagged in v1 carry these as
  real keywords, so import reads them, sets the columns, and drops them from the
  keyword list. That is a one-way migration on read, not a rewrite of the archive.

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
| `02.4 Proposed — fewer borders` | `26:14` | Fifth iteration — Compare stripped from 20 stroked elements to 3 |
| `02.5 Proposed — contrast + borders, all surfaces` | `27:40` | Sixth iteration — WCAG fixes and the border budget applied to all three surfaces |
| `02.6 Proposed — changes as a table` | `30:14` | Seventh iteration — conflicts rendered in the dashboard's table idiom rather than as cards |
| `02.7 Proposed — one table, all changes` | `31:8` | Eighth iteration — auto-resolving fields folded into the same table; the separate list is gone |
| `02.8 Proposed — actions above and below` | `33:8` | Ninth iteration — commit and discard mirrored into the table's heading row for long lists |
| **`02.9 Proposed — all surfaces current`** | `34:8` | **Current.** All three surfaces at their latest, consistent with each other |

### `02.9` — the page to review

Iterations 02.1–02.8 each carried one or two surfaces, so the latest state was
spread across three pages. `02.9` pulls Dashboard, Detail, and Compare together
at their furthest-along versions and reconciles them.

What changed bringing Dashboard forward:

- Its `Documents` table gained the same heading-row actions and count as Compare,
  and a repeat below the table. Same reason: 1,284 documents do not fit on screen.
- The action pair that had been sitting in the stats row was **removed**. With the
  table pair added it appeared three times on one screen, which is worse than
  appearing once. It now appears exactly twice, bracketing the thing it acts on.

Two things deliberately *not* converted, since consistency is not the same as
uniformity:

- **Needs attention stays cards.** Its entries are heterogeneous — different
  causes, different remedies, different actions — and a table would flatten
  exactly the differences that tell you what to do. Tables are for comparing like
  with like.
- **The Detail panel stays a form.** In Detail you are authoring metadata; in
  Compare you are reconciling two versions of it. The `Was / Yours / In Drive`
  language belongs to the second job and would be noise in the first.

### Changes are a table

The conflict cards were a bespoke pattern for something the dashboard already
has an idiom for. `02.6` renders the changes as a table built the same way —
surface, header rule, row rules, same padding and type scale:

| Field | Was | Yours | In Drive |
|---|---|---|---|

The choice lives *in the cell*: the chosen value carries the accent fill and the
`text/on-accent` label, the other stays plain. That removes the card, the head
row, and the side-by-side tiles, and it makes the baseline (`Was`) a column
rather than a whispered annotation in the corner — which is what it should have
been, since the whole three-way merge depends on it being legible.

It also scales. Cards stack badly past three or four conflicts; rows don't.

`02.7` folds the auto-resolving fields into the same table. They were the same
data rendered twice in two different idioms — a table of some changes and a list
of the others — which made the reader learn two patterns to read one set of
facts. One table, one row per changed field, with three cell treatments doing the
work:

| Treatment | Means |
|---|---|
| Accent fill + tick | You chose this |
| Tick, no fill | Applies automatically, nothing to decide |
| Muted, "unchanged" | This side did not touch the field |

A `State` column carries `Needs decision` / `Applies`, matching the dashboard
table's own state column. The accent fill still draws the eye straight to the
rows that want something from you, so nothing is lost by putting the quiet rows
in the same place — and the section heading drops from "Needs your decision" to
"Changes", because the table is now the full picture rather than a subset.

`02.8` mirrors commit and discard into the table's heading row. Four rows fit on
screen; a document with twenty changed fields does not, and asking someone to
scroll past the whole table to reach the only two buttons that matter is the kind
of thing that only shows up once there is real data in it. The heading row also
carries a count — `4 changes · 2 need you` — so the actions are not floating
without context.

Two implementation notes this implies, neither of them free:

- The two pairs must stay identical in label and behaviour. Two buttons that say
  the same thing and do subtly different things is worse than one button.
- The footer pair should be sticky rather than merely at the end of the document,
  or it stops being reachable for exactly the long lists that motivated this.

**Defect fixed in place, not iterated:** `needs-attention` and `documents` were
not centred — their containers sat at x=0 while `header` and `stats` sat at x=80.
Those two sections are *vertical* auto-layout, where `primaryAxisAlignItems`
governs the vertical axis; horizontal centring is `counterAxisAlignItems`. The
containment helper set the wrong one. Corrected on `02.3`, `02.5`, and `02.6`
rather than given its own iteration page — iterations preserve design decisions,
and a section that failed to centre was never a decision.

### Contrast — two hub tokens fail WCAG AA

Measured, not estimated. Ratios against the two hub backgrounds, AA for normal
text being 4.5:1:

| Token | on `background/primary` | on `background/secondary` | |
|---|---|---|---|
| `text/primary` `#cff7d3` | 8.55:1 | 11.22:1 | pass |
| `text/secondary` `#78ffb7` | 8.02:1 | 10.53:1 | pass |
| `status/warning` `#f0c060` | 5.93:1 | 7.79:1 | pass |
| `status/success` `#3ecf8e` | 5.03:1 | 6.60:1 | pass |
| **`text/muted` `#4d9a60`** | **2.92:1** | **3.83:1** | **fails both** |
| `status/error` `#f87171` | 3.63:1 | 4.76:1 | fails on primary |
| `accent/primary` as text | 3.46:1 | 4.54:1 | fails on primary |

And the one that matters most, because it is on every primary action:
**`text/dark` on an `accent/primary` fill is 3.46:1.** White would be worse at
2.90:1.

Two replacements are proposed as variables on `00 Components`, described there as
proposals rather than ports so the collection does not misrepresent
`globals.css`:

| Proposed | Value | Ratios | Replaces |
|---|---|---|---|
| `text/muted-AA` | `#7ac98d` | 5.05:1 / 6.63:1 | `text/muted` for any text that must be read |
| `text/on-accent` | `#0b2f1c` | 5.04:1 on `accent/primary` | `text/dark` on accent fills |

`02.5` applies both — 64 muted text nodes swapped and 4 primary-button labels
corrected across the three surfaces.

**This is a hub-wide finding, not an experiment one.** `text/muted` and the
primary-button label combination come from the `@theme` block in
`app/globals.css` and are used across every hub surface. Fixing them here fixes
three frames; fixing them in `globals.css` fixes the hub. Raised separately
rather than folded into this change.

### Selected and unselected states

Removing borders in `02.4` left the unselected option too quiet to read as a
choice, and its text below AA. `02.5` gives both options a real surface so each
reads as pressable:

- **Selected** — solid `accent/primary` with `text/on-accent` at 5.04:1, plus a
  check and medium weight.
- **Unselected** — `background/primary` surface with `text/primary` at 8.55:1.

Neither uses an outline. The state is carried by fill and weight, which is what
the border budget was for.

### Border budget, applied universally

The same audit run across all three surfaces, not just the one under review:

| Surface | Before | After | Kept |
|---|---|---|---|
| Compare | 20 | 3 | two alert rails, footer rule |
| Dashboard | 13 | 5 | table head and row rules |
| Detail | 13 | 1 | commit-bar divider |

The rule that fell out: a separator earns its keep, an outline around something
that already has a fill does not. Anything that lost an outline and still needed
to read as a control gained a fill instead.

### Border budget

`02.3` Compare carried **20 stroked elements** and nested text 8 levels deep:
every conflict card outlined, every option inside it outlined again, a radio
outlined inside that, and the auto-resolved rows boxed and ruled. Nesting a
highlight inside a highlight inside a highlight means none of them signal
anything.

`02.4` keeps **three** borders, all structural:

| Kept | Why |
|---|---|
| `what-happened` | Left rail — this is an alert |
| `document-changed` | Left rail — this is the blocking alert |
| `footer-actions` | Top rule — separates the action bar from content |

Everything else carries its meaning through fill, weight, and colour instead:

- Conflict cards are a background, not an outline. The section heading already
  says these need a decision.
- An option is two text nodes — value and source. The selected one gets a tint, a
  check, and primary text; the unselected gets nothing. The bordered box and the
  radio both went.
- Auto-resolved rows lost their wrapping box and per-row rules; spacing groups
  them.
- Secondary buttons use a tint rather than an outline.

**The tradeoff to watch:** the unselected option is now quiet enough that it may
read as information rather than as a choice you can take. The affordance rests on
the tint, the check, and the section heading. If it tests badly, the fix is a
hover or focus treatment on the unselected option — not restoring the outline,
which is what created the problem.

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
**Current frames — review these** (all on `02.9`):

| Frame | Node id |
|---|---|
| `Proposed · Dashboard · Desktop 1440` | `34:172` |
| `Proposed · Detail · Desktop 1440` | `34:289` |
| `Proposed · Compare (conflict) · Desktop 1440` | `34:9` |
| `Proposed · Detail · Mobile 480` | `40:3` — on `02.10`, approved 2026-08-14 |

Earlier pages hold the history: `02` first iteration, `02.1` Stat component,
`02.2` document change leads, `02.3` contained width, `02.4` fewer borders,
`02.5` contrast, `02.6` table idiom, `02.7` one table, `02.8` mirrored actions,
`02.10` Detail at Mobile 480.

### Mobile 480 — what the small breakpoint costs

`02.10` answers task 7.2. Preview above, fields below, commit bar pinned; not
tabs, because tabs hide the document at exactly the moment you are deciding what
to tag from it.

Every interactive element is ≥44pt. That is not a detail — at desktop scale the
keyword chips were 23pt and their remove affordance was an `×` **inside the text
label**, so deleting a tag meant hitting a ~10pt glyph. Remove is now its own
32pt target within a 44pt chip. The header links were worse: bare 15pt text with
no padding at all.

The cost is recorded rather than hidden: touch scale grew the metadata panel, so
the preview yields height to it and lands around 185pt. Phone use is therefore
tag-**confirming** — recognising a document and accepting suggestions — rather
than tag-**deciding** from the page content. `Tap to expand` is the escape hatch.

One deviation from desktop: `Discard` is an outline button here. Desktop pairs
`text/muted-AA` with an `accent/primary` fill — `#7ac98d` on `#14ae5c` — which
looks like it escaped the `02.5` contrast sweep and is worth fixing there rather
than reproducing here.

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

**Found while building the dashboard, and worth knowing before leaning harder on
MVDS in the hub:**

- **`Section` is unusable here.** It applies `bg-background` unconditionally —
  there is no transparent option, and all four `SurfaceBg` values resolve to MVDS
  tokens. In the hub's dark mode that is near-black (`lab(2.75 0 0)`), not the
  hub's `--color-background-primary` green (`rgb(25 75 49)`), so it paints a black
  band across the top of an otherwise green page. Verified in the browser, not
  inferred. `Container` gives the same width cap and gutters without carrying a
  background, so it is what the page uses. This is issue #285 showing up in
  practice.
- **The spacing scale rejects the Figma frames.** `Section py` accepts only
  `24 | 64`; `Stack`/`Inline` gaps accept the 8-pt scale and refuse `12`. The
  proposal frames used 12, 28, and 40 throughout. MVDS caught it at compile time,
  which is the system working — but it means the Figma spacing and the design
  system's grid currently disagree, and the frames are the ones that are wrong.
- **0.3.0 is compatible with existing hub usage.** Installed locally, the full
  suite goes to 57 files / 679 tests passing — including `EtsySyncPanel` and the
  `/dev/mvds` route, both of which had been failing only because the package was
  absent from the worktree. That is the evidence task 2.4 wanted and CI could not
  supply.

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
