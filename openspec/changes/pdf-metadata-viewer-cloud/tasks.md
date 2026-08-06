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
- [ ] 1.6 Enforce the constraint the decision depends on: reject keywords containing whitespace, including slugs arriving from Notion

## 2. Resolve the open questions

Each one changes work below it, so none should be discovered mid-build.

- [x] 2.1 Drive OAuth scope decided: **`drive.file`, granted by folder** — non-sensitive, so no CASA assessment and no seven-day refresh-token expiry. See `design.md` D9
- [ ] 2.1a **Spike before any Drive code:** confirm whether a Picker folder grant covers files added to that folder later. Decisive for the workflow, and not safe to assume
- [x] 2.2 Splitter **moves to v2** — schema now, interface after the write path. See `design.md` D10
- [x] 2.3 Workflow flags become **columns** — `from-split`/`already-split` derive from lineage; `needs-deleting`/`no-split-needed` become `marked_for_deletion`/`split_not_needed`. See `design.md` D11
- [ ] 2.4 Confirm Actions is running again and CI verifies the MVDS 0.3 bump — currently unverified, no runs are being created

## 3. Data layer

- [x] 3.1 Migration: `pdf_documents`, `pdf_document_history`, `pdf_drive_grant` — including `file_snapshot jsonb`, the merge baseline Compare depends on
- [x] 3.2 Index `pdf_document_history (document_id, changed_at)`
- [x] 3.3 Triggers maintaining `has_pending_edits` — on history insert, and on `committed_at` update
- [x] 3.4 Ship the one-statement rebuild as a maintenance task, not just a snippet in `design.md`
- [x] 3.5 Enable RLS on all three tables with no permissive policies
- [ ] 3.6 Verify from a client-key context that all three tables are unreachable

## 4. Identity and access

- [ ] 4.1 Create the Google OAuth client and consent screen — `openid email profile` plus `drive.file`, no restricted scope
- [ ] 4.2 Settle the redirect-URI strategy for Vercel preview deployments
- [x] 4.3 Signed, stateless session cookie — verifiable at the edge with no database call
- [x] 4.4 Middleware gate covering every PDF route, refusing before any storage, database, or third-party call
- [x] 4.5 Allowlist keyed on the `sub` claim, with `email_verified` checked
- [x] 4.6 Verify a non-allowlisted Google account is refused — unit-covered; re-verify end to end once the handshake exists
- [ ] 4.7 Verify revoking the app in Google settings ends both sign-in and Drive access
- [ ] 4.8 Verify an unauthenticated request cannot distinguish a document that exists from one that does not

## 5. Drive connection

- [ ] 5.1 OAuth handshake storing the refresh token server-side
- [ ] 5.2 Automatic access-token refresh, with no user prompt
- [ ] 5.3 Re-authorization prompt on a revoked grant — distinct from a missing document
- [ ] 5.4 Folder grant via the Google Picker — folders, never individual files — into reference rows, copying no bytes
- [ ] 5.5 Detect documents in a granted folder that the grant does not cover, and surface them as a Needs attention instance with a re-grant action
- [ ] 5.6 Broken reference surfaces as such while metadata and history survive

## 6. Read path

- [ ] 6.1 `GET /api/pdf-documents` — list from the database, fetching no bytes
- [ ] 6.2 `GET /api/pdf-documents/id/[id]` — metadata and pending state
- [ ] 6.3 `GET .../history` — full field-level history, newest first, uncapped
- [ ] 6.4 `GET .../content` — proxy bytes through the session, minting no Drive URL
- [ ] 6.5 Port `taxonomy-loader.js` and `entities-notion.js`, keeping the field allowlist intact
- [ ] 6.6 Run `test-entity-projection.js` against the ported module

## 7. Design gate — before any write path

- [x] 7.1 Build `Proposed · Compare (conflict)` on `02 Proposed` — three-way merge against the read-time baseline
- [ ] 7.2 Build `Proposed · Detail · Mobile 480` if the tool will be used on a phone
- [x] 7.3 Explicit go on the rendered pages before implementing the write path — approved 2026-08-06 on `02.9`, "close enough for MVP"

## 7b. Splitter — after the write path

- [ ] 7b.1 Design the splitter on a numbered Figma page: thumbnail grid, break markers, output preview
- [ ] 7b.2 Split creates outputs in Drive with lineage rows, and marks the original superseded
- [ ] 7b.3 Outputs inherit metadata; the original keeps its history
- [ ] 7b.4 On import, read v1's `from-split` / `already-split` / `needs-deleting` / `no-split-needed` keywords into columns and drop them from the keyword list

## 8. Write path

- [ ] 8.1 `PATCH .../id/[id]` — stage edits, writing history rows, touching no PDF
- [ ] 8.2 `POST .../commit` — revision check, read-modify-write, same `drive_file_id`
- [ ] 8.3 Conflict path: surface rather than overwrite, and leave staged edits intact
- [ ] 8.4 Three-way classification per field against `file_snapshot` — only both-changed-differently asks for a decision
- [ ] 8.5 Content-change detection surfaced separately from field conflicts
- [ ] 8.6 Failure paths: storage error and permission error both preserve staged edits
- [ ] 8.7 Bulk commit as N independent cycles, with per-document success and failure
- [ ] 8.8 Every bulk-commit failure lands as an instance in Needs attention
- [ ] 8.9 Verify keywords committed through the full path still read back externally (1.1 repeated end to end)

## 9. Interface

- [ ] 9.1 Add `input` and `table` via `npx shadcn@latest add`, landing inside MVDS tokens
- [ ] 9.2 Author `Stat` in MVDS — `<Stat label value tone />`, tone in default/warning/success/danger/muted. No shadcn equivalent exists; the Figma variant set at `19:17` is the reference
- [ ] 9.3 Dashboard: stats, Needs attention list, bulk commit action, state column
- [ ] 9.4 Detail: `Field` with `help` carrying the in-the-file value and `error` carrying a conflict
- [ ] 9.5 Pending state visible at rest, not only during editing
- [ ] 9.6 Import MVDS components into `00 Components` so Figma and code share a source

## 10. Cut over

- [ ] 10.1 Round-trip one real document end to end — import, edit, commit, verify externally
- [ ] 10.2 Rewrite `README.md`, `docs/PRD.md`, and `prototype/.env.example`, which still say local-only and never-deployed
- [ ] 10.3 Update `data/experiments.json` — `lastModified`, and whether `public` and `type` still hold
- [ ] 10.4 Retire the local Express prototype only after 10.1 passes
- [ ] 10.5 Record in `docs/intent.md` what the hosted instance changed about the daily workflow
