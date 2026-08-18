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

- [x] 2.1 Drive OAuth scope decided — **superseded 2026-08-18.** `drive.file` was chosen for being non-sensitive; it cannot list a folder's contents, so the scope is now full `drive` on an **External** consent screen in **Testing**, where a listed test user can consent to a restricted scope without verification. Costs accepted: refresh tokens expire every seven days, and publishing later requires verification plus CASA. See `design.md` D9a
- [x] 2.1a **Spike — run 2026-08-18, and it FAILED.** A `drive.file` Picker folder grant covers the folder and nothing inside it, so the question of whether it extends to files added *later* never arises: it does not reach the files there at the time. Probed against the live grant — all accessible items: **1**, the folder itself; PDFs: **0**. Drive answers an uncovered listing with an empty list rather than a 403, so the import returned `success: true, imported: 0` and was indistinguishable from an empty folder. Resolved by D9a (full `drive`), not by a workaround
- [ ] 2.1b Re-consent after the scope change and confirm the stored grant carries full `drive` — the existing row predates it, and `include_granted_scopes` will not retroactively widen it
- [x] 2.2 Splitter **moves to v2** — schema now, interface after the write path. See `design.md` D10
- [x] 2.3 Workflow flags become **columns** — `from-split`/`already-split` derive from lineage; `needs-deleting`/`no-split-needed` become `marked_for_deletion`/`split_not_needed`. See `design.md` D11
- [x] 2.4 Confirm Actions is running again and CI verifies the MVDS 0.3 bump — **done 2026-08-14 on PR #371**, which carries `@beckharrisdesign/mvds ^0.3.0` and went green: Feature tests, Deploy hub, and the seed organizer's tests, lint and build all SUCCESS. Actions is running; the outstanding CI run named here has now happened

## 3. Data layer

- [x] 3.1 Migration: `pdf_documents`, `pdf_document_history`, `pdf_drive_grant` — including `file_snapshot jsonb`, the merge baseline Compare depends on
- [x] 3.2 Index `pdf_document_history (document_id, changed_at)`
- [x] 3.3 Triggers maintaining `has_pending_edits` — on history insert, and on `committed_at` update
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
- [ ] 5.6 Broken reference surfaces as such while metadata and history survive

## 6. Read path

- [x] 6.1 `GET /api/pdf-documents` — list from the database, fetching no bytes. **Verified against the live schema:** 200 `{documents:[],total:0}`
- [x] 6.2 `GET /api/pdf-documents/id/[id]` — metadata and pending state. **Verified:** malformed and nonexistent uuids both 404 identically, no 22P02 leaking as a 500
- [x] 6.3 `GET .../history` — full field-level history, newest first, uncapped. **Verified** against the live schema
- [ ] 6.4 `GET .../content` — proxy bytes through the session, minting no Drive URL — blocked on the Drive client (group 5)
- [ ] 6.5 Port `taxonomy-loader.js` and `entities-notion.js`, keeping the field allowlist intact
- [ ] 6.6 Run `test-entity-projection.js` against the ported module

## 7. Design gate — before any write path

- [x] 7.1 Build `Proposed · Compare (conflict)` on `02 Proposed` — three-way merge against the read-time baseline
- [x] 7.2 Build `Proposed · Detail · Mobile 480` — the conditional resolved: Katy confirmed likely phone use on 2026-08-14. Built and **approved 2026-08-14** on page `02.10 Proposed — Detail on a phone`, frame `40:3`. Preview above, fields below, commit bar pinned. All 16 interactive elements ≥44pt, checked programmatically rather than by eye; the keyword remove control is a distinct 32pt target instead of a glyph inside the label. Cost recorded with the approval: the preview yields height to the panel (~185pt), making phone use tag-confirming rather than tag-deciding
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
- [x] 9.3 Dashboard: stats, state column, table actions. Needs attention list and live bulk commit wait on the Drive client
- [ ] 9.4 Detail: `Field` with `help` carrying the in-the-file value and `error` carrying a conflict
- [ ] 9.5 Pending state visible at rest, not only during editing
- [ ] 9.6 Import MVDS components into `00 Components` so Figma and code share a source

## 10. Cut over

- [ ] 10.1 Round-trip one real document end to end — import, edit, commit, verify externally
- [ ] 10.2 Rewrite `README.md`, `docs/PRD.md`, and `prototype/.env.example`, which still say local-only and never-deployed
- [ ] 10.3 Update `data/experiments.json` — `lastModified`, and whether `public` and `type` still hold
- [ ] 10.4 Retire the local Express prototype only after 10.1 passes
- [ ] 10.5 Record in `docs/intent.md` what the hosted instance changed about the daily workflow
