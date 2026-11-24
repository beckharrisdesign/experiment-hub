# Tasks

Ordered so the cheapest thing that could invalidate the change happens first.

## 1. Prove the premise — hard gate

Nothing below this group is worth building if it fails. It needs no cloud, no
schema, and no OAuth: the v1 prototype and one PDF are enough.

- [x] 1.1 Write a known keyword list with `pdf-lib` and inspect what is actually stored — done by decompressing the object stream, since no external reader was available on the machine
- [x] 1.2 Repeat with keywords containing a comma, a semicolon, and a space
- [x] 1.3 Record the finding — see `design.md` D0. The roadmap's diagnosis was inverted: the loss is on write, not read
- [x] 1.4 Decision: **keep `pdf-lib`**. It joins on a space and stores one flat string, but every taxonomy tag is a space-free slug, so the round trip is lossless for real data
- [ ] 1.5 Confirm once in a third-party reader that the stored string displays as written — lower priority now the failure mode is understood, and no reader is installed here
- [~] 1.6 Enforce the constraint the decision depends on: reject keywords containing whitespace, including slugs arriving from Notion — **editing path done in #608**: refused on the page and by `PATCH` with the hyphenated form suggested, and by the table's check constraint. The Notion path waits on 6.5

## 2. Resolve the open questions

Each one changes work below it, so none should be discovered mid-build.

- [x] 2.1 Drive OAuth scope decided — **superseded 2026-08-18.** `drive.file` was chosen for being non-sensitive; it cannot list a folder's contents, so the scope is now full `drive` on an **External** consent screen in **Testing**, where a listed test user can consent to a restricted scope without verification. Costs accepted: refresh tokens expire every seven days, and publishing later requires verification plus CASA. See `design.md` D9a
- [x] 2.1a **Spike — run 2026-08-18, and it FAILED.** A `drive.file` Picker folder grant covers the folder and nothing inside it, so the question of whether it extends to files added *later* never arises: it does not reach the files there at the time. Probed against the live grant — all accessible items: **1**, the folder itself; PDFs: **0**. Drive answers an uncovered listing with an empty list rather than a 403, so the import returned `success: true, imported: 0` and was indistinguishable from an empty folder. Resolved by D9a (full `drive`), not by a workaround
- [x] 2.1b Register the scope and re-consent. **Console done 2026-08-18:** `.../auth/drive` now listed under *Your restricted scopes* on the Data Access page ("See, edit, create, and delete all of your Google Drive files"), `drive.file` removed, consent screen External/Testing with the founder as sole test user. No verification prompt appeared. **Re-consent done 2026-11-20** on production (deploy of `06a8be71`, which carries #389): the stored grant was replaced, and its scope now includes `.../auth/drive` alongside the old `drive.file`, which `include_granted_scopes` carried forward
- [x] 2.1c Re-run the folder import after re-consent and confirm documents actually land — **done 2026-11-20.** Same folder as the failed 2026-08-18 run: `pdf_documents` went from **0 to 45** rows, all 45 distinct Drive files, all PDFs, every row carrying `file_snapshot` and `drive_head_revision_id`. None pending, none committed — references only, as designed
- [x] 2.2 Splitter **moves to v2** — schema now, interface after the write path. See `design.md` D10
- [x] 2.3 Workflow flags become **columns** — `from-split`/`already-split` derive from lineage; `needs-deleting`/`no-split-needed` become `marked_for_deletion`/`split_not_needed`. See `design.md` D11
- [x] 2.4 Confirm Actions is running again and CI verifies the MVDS 0.3 bump — **done 2026-08-14 on PR #371**, which carries `@beckharrisdesign/mvds ^0.3.0` and went green: Feature tests, Deploy hub, and the seed organizer's tests, lint and build all SUCCESS. Actions is running; the outstanding CI run named here has now happened

## 3. Data layer

- [x] 3.1 Migration: `pdf_documents`, `pdf_document_history`, `pdf_drive_grant` — including `file_snapshot jsonb`, the merge baseline Compare depends on
- [x] 3.2 Index `pdf_document_history (document_id, changed_at)`
- [x] 3.3 Triggers maintaining `has_pending_edits` — on history insert, and on `committed_at` update. **Replaced 2026-11-20** by one row trigger computing pending as "differs from the file's baseline" (migration 024, D2 amendment)
- [x] 3.4 Ship the one-statement rebuild as a maintenance task, not just a snippet in `design.md`
- [x] 3.5 Enable RLS on all three tables with no permissive policies
- [ ] 3.6 Verify from a client-key context that all three tables are unreachable — service-role reads confirmed working; the publishable-key denial is the half still untested

## 4. Identity and access

- [x] 4.1 Google OAuth client and consent screen created; credentials in local env, and the handshake reaches Google with exactly the registered scopes
- [x] 4.1a Consent screen scopes registered and **confirmed non-sensitive in the Console** — all four under "Your non-sensitive scopes", so D9's premise holds
- [x] 4.2 Redirect-URI strategy settled: production + localhost only. Preview hostnames are hash-based and Google needs exact URIs, so authenticated routes are not available on previews — acceptable for a single-user instance
- [x] 4.3 Signed, stateless session cookie — verifiable at the edge with no database call
- [x] 4.4 Middleware gate covering every PDF route, refusing before any storage, database, or third-party call
- [x] 4.5 Allowlist keyed on the `sub` claim, with `email_verified` checked
- [x] 4.5a Callback logs the rejected `sub` server-side, so the allowlist bootstraps without a first-run bypass (restored — a renumbering pass had dropped this line)
- [x] 4.6 Verify a non-allowlisted Google account is refused — unit-covered; re-verify end to end once the handshake exists
- [ ] 4.7 Verify revoking the app in Google settings ends both sign-in and Drive access
- [x] 4.8 Verify an unauthenticated request cannot distinguish a document that exists from one that does not — confirmed against a running server: `/api/pdf-documents` 401s, the page redirects to sign-in, and the open handshake path is not gated

## 5. Drive connection

- [x] 5.1 OAuth handshake storing the refresh token server-side — verified against the running server: four registered scopes, offline access, forced consent, 64-char state with an httpOnly cookie
- [x] 5.2 Automatic access-token refresh, with no user prompt — 60s expiry skew. Not yet exercised against a real expiry
- [x] 5.3 Re-authorization prompt on a revoked grant — `DriveReauthorizationRequired` separates revoked from never-connected from missing document
- [x] 5.4 Folder grant via the Google Picker — folders, never individual files — into reference rows, copying no bytes. **Tested against a real folder 2026-08-18:** the Picker works and the grant stores, but under `drive.file` it conveyed no files. Re-verify end to end once the scope change is live
- [ ] ~~5.5 Detect documents in a granted folder that the grant does not cover, and surface them as a Needs attention instance with a re-grant action~~ — **dropped by D9a.** Full `drive` cannot have a covered/uncovered split within a folder, so the gap this detects no longer exists. The broken-reference case in 5.6 is separate and still stands
- [~] 5.6 Broken reference surfaces as such while metadata and history survive — **partly, 2026-11-20:** Drive's 404 becomes `DriveFileMissing`, the content route answers 410 rather than 404, and the detail page says the file is no longer in Drive while still showing the stored fields. Not yet seen against a file actually moved out of the folder
- [x] 5.7 Show the chosen folder and let it be changed — added 2026-11-20 at Katy's request: the folder picked once was never stored, shown, or changeable. Migration 026 stores it on the Drive connection and on each document; the dashboard shows it with **Change folder** and lists only that folder's documents. Fixes a re-import bug found on the way: the import overwrote `file_snapshot` and the revision, erasing a captured baseline and dropping pending edits. #611. The first live folder choice failed: the API role preloads `safeupdate`, which rejects an UPDATE with no WHERE, and the import's update of the one-row grant had none (fixed by migration 028, #613, with a migration check in the tests). **Verified live 2026-11-20:** choosing the folder "PDF Tests" recorded it, added its 25 PDFs, and the dashboard and detail page now show only those; the original 45 keep their rows and history

## 6. Read path

- [x] 6.1 `GET /api/pdf-documents` — list from the database, fetching no bytes. **Verified against the live schema:** 200 `{documents:[],total:0}`
- [x] 6.2 `GET /api/pdf-documents/id/[id]` — metadata and pending state. **Verified:** malformed and nonexistent uuids both 404 identically, no 22P02 leaking as a 500
- [x] 6.3 `GET .../history` — full field-level history, newest first, uncapped. **Verified** against the live schema
- [x] 6.4 `GET .../content` — proxy bytes through the session, minting no Drive URL — **done 2026-11-20.** `downloadDriveFile` streams `alt=media`; the response is `private, no-store`, and `/api/pdf-documents/*` carries `frame-ancestors 'self'` (no `X-Frame-Options`) so the detail page can frame it while the rest of the hub stays `'none'`. Unit-covered; not yet exercised against live Drive
- [x] 6.5 Port `taxonomy-loader.js` and `entities-notion.js`, keeping the field allowlist intact — **done 2026-11-23** as `lib/pdf-taxonomy.ts` and `lib/pdf-entities.ts`; the vocabulary moved to `config/pdf-metadata-viewer/`. Two changes: no disk snapshot (cache-or-error, as design.md allows), and the four decision tags are no longer offered. Feeds `POST …/suggestions` and the detail page's Suggest metadata, which fills the fields as one staged edit (Katy's call)
- [x] 6.6 Run `test-entity-projection.js` against the ported module — ported as `tests/lib/pdf-entities.test.ts`; every v1 assertion kept

## 7. Design gate — before any write path

- [x] 7.1 Build `Proposed · Compare (conflict)` on `02 Proposed` — three-way merge against the read-time baseline
- [x] 7.2 Build `Proposed · Detail · Mobile 480` — the conditional resolved: Katy confirmed likely phone use on 2026-08-14. Built and **approved 2026-08-14** on page `02.10 Proposed — Detail on a phone`, frame `40:3`. Preview above, fields below, commit bar pinned. All 16 interactive elements ≥44pt, checked programmatically rather than by eye; the keyword remove control is a distinct 32pt target instead of a glyph inside the label. Cost recorded with the approval: the preview yields height to the panel (~185pt), making phone use tag-confirming rather than tag-deciding
- [x] 7.3 Explicit go on the rendered pages before implementing the write path — approved 2026-08-06 on `02.9`, "close enough for MVP"

## 7b. Splitter — after the write path

- [x] 7b.1 Design the splitter on a numbered Figma page: thumbnail grid, break markers, output preview — **done 2026-11-23**: `02.11 Proposed — Splitter` (frames 69:9 breaks chosen, 69:132 no breaks yet), approved by Katy
- [x] 7b.2 Split creates outputs in Drive with lineage rows, and marks the original superseded — `lib/pdf-split.ts` + migration 030 `pdf_record_split`. Parts are new files beside the original named as v1 did (`-001`, `-002`); all are uploaded before anything is recorded, and a failure partway trashes the ones made. The original's file is left untouched (no `already-split` / `needs-deleting` rewrite)
- [x] 7b.3 Outputs inherit metadata; the original keeps its history — parts carry the original's title, subject, author and keywords as shown (staged values included), written into their bytes so they start clean; each part's history opens with a `split` row naming the original
- [ ] 7b.4 On import, read v1's `from-split` / `already-split` / `needs-deleting` / `no-split-needed` keywords into columns and drop them from the keyword list

## 7c. Image preview

design.md said the detail preview already drew page images with pdf.js (§ content route, § Risks). It never did: the detail page frames the content route in an `<iframe>`, so the browser's own PDF viewer draws it, with its toolbar and page sidebar. Only the splitter (7b) draws page images. Added 2026-11-23, after the load-time work (#628–#630).

- [x] 7c.1 Design the image preview on a numbered Figma page (`02.12`), desktop and phone, from the approved detail frames (`02.9` 34:289, `02.10` 40:3) — **drawn 2026-11-23**: `02.12 Proposed — Image preview` (73:8), frames 73:44 (pages drawn), 73:104 (loading), 73:164 (phone), with a behaviour note. The approved frames already named their preview layer "pdf.js canvas — page 1 of 2"
- [x] 7c.2 Explicit go on the rendered frames — **"Looks right, build it", 2026-11-23**
- [x] 7c.3 Build it: pages drawn as images, first page first; "Open full size" keeps the browser's viewer in a new tab — **done, verified live 2026-11-24** (#631–#638). Built first with the splitter's pdf.js loader (#631), then, after measuring, the pages are drawn **on the server** (`GET …/pages/[n]`, `lib/pdf-render.ts`, nothing stored) with pdf.js in the browser kept as the fallback. Why: Drive hands the function a 9.35 MB scan in under 0.5 s once it starts, but the function sends to the browser at about 0.85 MB/s (#635's timings), so byte ranges (#632) and parallel fetching (#633, reverted #634) couldn't help. On that 16-page scan, page 1 went 14.5 s → 2.5–4.0 s, and 539 KB of images replace 9.6 MB of PDF. The phone preview keeps the live 420px height rather than frame 40:3's 181pt. CI moved to Node 24, as Vercel runs it (#636). Left: Drive's own start-up (1–3.5 s per request) now dominates page 1; the splitter still draws in the browser

## 7d. Folder sync

New files reached the list only when the folder was chosen again, and their own values only when opened: 65 of 83 live rows listed no page count. Katy asked for the folder's new files and their metadata to come in on their own, on a schedule (2026-11-24). design.md D12.

- [x] 7d.1 Spec and design: D12; scenarios in all three specs, including the one narrow exception to the session gate
- [x] 7d.2 The sync: import the folder, then read files with nothing stored for Drive's current revision, never-read first, three at a time, stopping after 40 s (`lib/pdf-sync.ts`, `POST /api/pdf-drive/sync`)
- [x] 7d.3 The list shows a never-edited file's own values from the saved read (`listedValues`); edited files unchanged
- [x] 7d.4 Hourly schedule (`.github/workflows/pdf-folder-sync.yml`), let in by a key derived from the service-role key, on that route and by POST only (`verifySyncKey`, middleware)
- [x] 7d.5 Verify live: run the workflow by hand until the backlog drains and the list shows page counts; add a test PDF to the folder and see it arrive on the next run — **verified 2026-11-24** (#640). First run: 40 files in PDF Tests, 17 read, 0 failed, 0 left; the list went to a page count on all 38 rows (it had shown one for a minority). A made-up `Sync-test-3-pages.pdf` added to the folder arrived on the next run (`added: 1, read: 1`) listed with its title, keywords, and 3 pages, never opened. The 45 rows with no folder recorded (imports before 026) stay unread; the list doesn't show them

## 8. Write path

- [x] 8.0 Capture the baseline on the first staged edit — read the file once, store `file_snapshot.embedded` and `drive_head_revision_id` together, fill the field columns; never re-capture while edits are pending. See `design.md` D8, "captured on first edit". **Done in #608, verified live 2026-11-20:** the first edit stored the file's five fields and its revision, and filled the title column from the file
- [x] 8.1 `PATCH .../id/[id]` — stage edits, writing history rows, touching no PDF — **#608, verified live 2026-11-20:** a Subject and a keyword staged, one history row each, nothing written to Drive
- [x] 8.1a Undoing an edit by hand clears pending — migration 024, #609; **verified live 2026-11-20:** an Author typed and cleared again showed pending, then not, on both the detail page and the dashboard
- [x] 8.2 `POST .../commit` — revision check, read-modify-write, same `drive_file_id` — resumable upload (Drive caps simple uploads at 5 MB); recorded from the bytes uploaded, read back, by `pdf_record_commit` (migration 025). Encrypted PDFs are refused: pdf-lib saves them unreadable. Unit-covered and tested against the hub database in a rolled-back transaction. **#610, verified live 2026-11-20** on one real file: `qa-test` committed, read back from Drive, then removed with a second commit. Each commit re-serialises the whole PDF through pdf-lib, so the file's size changed (697 KB → 681 KB) though it renders the same
- [~] 8.3 Conflict path: surface rather than overwrite, and leave staged edits intact — **surfaces and keeps edits**: the revision is checked before and after the download, and a mismatch writes nothing and says so on the page. Resolving it waits on 8.4; until then the only way forward from a conflict is Discard
- [x] 8.4 Three-way classification per field against `file_snapshot` — only both-changed-differently asks for a decision — Compare page at `.../id/[id]/compare` from frame `34:9`, reached from a commit's conflict message. Was / Yours / In Drive table; only conflicts take a choice. **Commit with these choices** re-baselines to Drive's version and stages the settled values in one transaction (`pdf_rebaseline`, migration 027), then commits; **Discard my edits** takes Drive's version. The server re-reads Drive and re-classifies, refusing choices made against a version that has since moved. Unit-covered and tested against the hub database in a rolled-back transaction; **not yet exercised against a real conflict**
- [~] 8.5 Content-change detection surfaced separately from field conflicts — **page count done with 8.4**: a changed page count leads the Compare page and must be confirmed as the same document (or discarded) before committing. A same-length re-scan is not yet detected
- [x] 8.6 Failure paths: storage error and permission error both preserve staged edits — nothing in the database changes unless the upload succeeded; a read-only file (Drive 403) is reported as refused rather than as a lapsed sign-in. One unclean case is named rather than hidden: written to Drive but not recorded (`CommitNotRecorded`)
- [x] 8.7 Bulk commit as N independent cycles, with per-document success and failure — the dashboard's **Commit N documents to Drive** (frame `34:172`) confirms, then calls the per-document commit route once per pending document, in order, with live progress; failures are listed with their reason and next step (Compare, Sign in again) and stay pending. **Review pending** filters the table. Results last until the page is left; keeping them is 8.8. Unit-covered; **not yet run live**
- [x] 8.8 Every bulk-commit failure lands as an instance in Needs attention — one instance per document on the row itself (migration 029), recorded by any failing commit (single, bulk, or after Compare) and cleared by a successful commit, a discard, or a resolved conflict. Dashboard cards per frame `34:172` with **Compare**, **Retry**, or **Locate** (a Drive search for the filename); bulk commit leaves out conflicts and missing files and says so. A lapsed Drive grant is not filed per document. Not built: *Dismiss all resolved* — instances clear themselves on resolution, so nothing resolved is left to dismiss. Unit-covered; **not yet seen live**
- [ ] 8.9 Verify keywords committed through the full path still read back externally (1.1 repeated end to end)

## 9. Interface

- [ ] 9.1 Add `input` and `table` via `npx shadcn@latest add`, landing inside MVDS tokens
- [ ] 9.2 Author `Stat` in MVDS — `<Stat label value tone />`, tone in default/warning/success/danger/muted. No shadcn equivalent exists; the Figma variant set at `19:17` is the reference
- [x] 9.3 Dashboard: stats, state column, table actions. Needs attention list and live bulk commit wait on the Drive client
- [ ] 9.4 Detail: `Field` with `help` carrying the in-the-file value and `error` carrying a conflict — **view-only first, 2026-11-20:** the detail page ships read-only off frames `34:289` and `40:3`, without Suggest, inputs, or the commit bar; each field falls back to the file's own value (read with `pdf-lib`) and shows "In the file" only where a stored value differs. The editable version replaces it with the write path
- [ ] 9.5 Pending state visible at rest, not only during editing
- [ ] 9.6 Import MVDS components into `00 Components` so Figma and code share a source

## 10. Cut over

- [ ] 10.1 Round-trip one real document end to end — import, edit, commit, verify externally
- [ ] 10.2 Rewrite `README.md`, `docs/PRD.md`, and `prototype/.env.example`, which still say local-only and never-deployed
- [ ] 10.3 Update `data/experiments.json` — `lastModified`, and whether `public` and `type` still hold
- [ ] 10.4 Retire the local Express prototype only after 10.1 passes
- [ ] 10.5 Record in `docs/intent.md` what the hosted instance changed about the daily workflow
