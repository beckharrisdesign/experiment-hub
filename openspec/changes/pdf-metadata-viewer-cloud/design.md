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

### D5 — Auth reuses the hub's existing gate

`middleware.ts` already gates `/admin` on an `ADMIN_SECRET` cookie, with
`lib/admin-auth.ts` behind it. Extending the matcher to the PDF routes reuses a
path already in production and satisfies "refused before any storage, database,
or third-party call" — middleware runs ahead of route handlers.

**This is the weakest link in the design and should be named as such.** A single
static shared secret, no rotation, no per-device revocation, guarding a family's
medical records on a public URL. It is proportionate to one user who controls the
secret, and it is the first thing to replace — before a second person has access,
not after.

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

`prototype/lib/taxonomy-loader.js` and `entities-notion.js` port across
essentially unchanged — they already read config and Notion, not the filesystem.
The snapshot fallback loses its disk; on serverless it degrades to
cache-or-error, which is acceptable when the operator can retry.

## Visual design / Figma

| Item | Value |
|---|---|
| Primary file | **https://www.figma.com/design/NGybYS2piBw5Q8T4c35Z2M** — `pdf-metadata-viewer-cloud` |
| Published libraries | None imported yet. MVDS (`@beckharrisdesign/mvds`) component import outstanding |
| Local variables | `hub tokens` — 24 colour variables ported 1:1 from the `@theme` block in `app/globals.css`, scoped per role |
| Code Connect deltas | `N/A` — no component mappings change; the UI is composed from existing hub components |

**Pages** (file convention, restated per `rules/figma.mdc`): numbered pages, each
proposal iteration a *new* page — never edited or appended in place.

| Page | Node id | State |
|---|---|---|
| `00 Components` | `0:1` | `hub tokens` collection + bound swatch board at `5:27` |
| `01 Current state` | `1:2` | Built — reconstructed from `index.html` / `styles.css` |
| `02 Proposed` | `1:3` | **Empty — the open work.** Later iterations become `02.1 Proposed — <what changed>`, `02.2`, … |

**Frames in scope:**

| Frame | Node id | Status |
|---|---|---|
| `Current · File list · Desktop 1440` | `3:2` | Done |
| `Current · Detail · Desktop 1440` | `3:95` | Done |
| `Proposed · Detail · Desktop 1440` | — | **Required before implementation** |
| `Proposed · Detail · Mobile 480` | — | Required if the hosted tool is used on a phone |

The detail frame is the whole visual question. v1 has no save control at all —
each field commits itself. v2 needs to express staged-vs-committed, a commit
action, what pending looks like at rest, and what a conflict looks like. That is
visual composition, so it is gated on a rendered `02 Proposed` page and an
explicit go, not on this document.

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

1. Migration for the three tables, RLS on, no policies.
2. Drive OAuth handshake; confirm a token refresh survives expiry.
3. Import a folder — reference rows only, no bytes copied.
4. Read path: list and detail served from the database.
5. **Keyword round-trip proof against an external reader.** Gate: stop here if it
   fails.
6. Figma `02 Proposed`, then the write path — stage, commit, conflict.
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
