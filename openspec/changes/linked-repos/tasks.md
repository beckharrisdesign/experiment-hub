## 0. Prerequisites

- [ ] 0.1 **MVDS package availability** — ⚠️ verified 2026-07-04: not on npm (`mvds`, `@beckharrisdesign/mvds` both 404); sections 3–5 blocked until published or pinned — confirm MVDS is published and installable before starting any UI tasks (sections 3–5); if not published, stop and raise as a blocking issue; do not proceed with hand-rolled tokens or patterns
- [x] 0.2 Confirm actual Supabase table columns via `list_tables` before writing any migrations — do not assume column names from application code
- [ ] 0.3 Install MVDS in the hub app (`npm install @mvds/...` or equivalent) and verify import resolves

## 1. Database migrations

- [x] 1.1 Migration: create `linked_repos` table (`id uuid pk`, `name text`, `repo_slug text not null`, `description text`, `worktree_path text`, `created_at timestamptz`, `updated_at timestamptz`)
- [x] 1.2 Migration: add nullable `linked_repo_id uuid references linked_repos(id)` to `notes` table + check constraint `num_nonnulls(experiment_id, linked_repo_id) = 1`
- [x] 1.3 Migration: add nullable `linked_repo_id uuid references linked_repos(id)` to `experiment_pull_requests` table + same check constraint
- [x] 1.4 Migration: add `"Graduated"` to the experiment status enum; add nullable `linked_repo_id uuid references linked_repos(id)` to `experiments` table
- [x] 1.5 Add `worktrees/` to `.gitignore`

## 2. API routes

- [x] 2.1 `GET /api/linked-repos` — list all linked repos
- [x] 2.2 `POST /api/linked-repos` — create linked repo (name + repo_slug required)
- [x] 2.3 `GET /api/linked-repos/[id]` — get single linked repo
- [x] 2.4 `PATCH /api/linked-repos/[id]` — update (name, description, worktree_path)
- [x] 2.5 `DELETE /api/linked-repos/[id]` — delete linked repo (cascade notes + PRs)
- [x] 2.6 `GET /api/linked-repos/[id]/notes` + `POST` + `PATCH /[noteId]` + `DELETE /[noteId]` — notes scoped to linked repo
- [x] 2.7 `POST /api/linked-repos/[id]/sync-prs` — trigger GitHub PR sync for this repo's `owner/repo`; upsert into `experiment_pull_requests` with `linked_repo_id` set
- [x] 2.8 `POST /api/experiments/[id]/graduate` — set `status: "Graduated"` + `linked_repo_id` atomically
- [x] 2.9 Generalize PR sync service to accept `{ repoSlug, entityId, entityType: "experiment" | "linked_repo" }` — guard `entityType` so experiment PRs are never written under linked_repo path and vice versa

## 3. Dashboard

- [ ] 3.1 `LinkedRepoCard` component (MVDS) — name, repo slug, "Linked Repo" badge (MVDS chip, neutral), last PR activity if available
- [ ] 3.2 Render `LinkedRepoCard` entries on the hub dashboard alongside experiment cards
- [ ] 3.3 "Add linked repo" entry point on dashboard — modal or inline form (name + repo_slug)
- [ ] 3.4 Add "Graduated" badge to `ExperimentCard` when `status === "Graduated"`; include link to associated linked repo

## 4. Linked repo detail page (`/linked-repos/[id]`)

- [ ] 4.1 Page scaffold: header (name, repo slug, "Linked Repo" badge, "Open in hub" button), two-column body
- [ ] 4.2 PR list panel: fetch from `/api/linked-repos/[id]/sync-prs` on load; display PR title, number, state chip, age (MVDS list items)
- [ ] 4.3 Notes panel: add / edit / delete inline notes (MVDS textarea + note list)
- [ ] 4.4 "Open in hub" button: generates and copies context primer prompt to clipboard; show confirmation toast
  - Primer format: repo slug, default branch, GitHub MCP instructions for file reads and code search
- [ ] 4.5 "Graduated from [experiment name]" link when a graduated experiment points to this repo
- [ ] 4.6 Local clone section (collapsed, secondary): "Clone for local editing" action → `git clone` into `worktrees/<slug>/`, store `worktree_path`; show path + "Remove local clone" when active; label clearly as not for cloud sessions

## 5. Experiment graduation UI

- [ ] 5.1 "Graduate" action on experiment detail page — opens modal to select or register a linked repo
- [ ] 5.2 Calls `POST /api/experiments/[id]/graduate` with selected `linked_repo_id`
- [ ] 5.3 Experiment detail page shows "Graduated" status + link to linked repo detail page
- [ ] 5.4 Linked repo detail page shows "Graduated from [experiment name]" link back to experiment

## 6. Hub-as-proxy wiring

- [x] 6.1 Document in `CLAUDE.md` or a hub skill that GitHub MCP (`get_file_contents`, `search_code`) is the standard way to access linked repo code from a hub session — no clone needed
- [ ] 6.2 Context primer template (used by "Open in hub" button in 4.4) — confirm format works end-to-end in a real hub session against `beckharrisdesign/mvds`

## 7. QA

- [ ] 7.1 Register `beckharrisdesign/mvds` as the first linked repo; verify card appears on dashboard
- [ ] 7.2 Sync PRs for `beckharrisdesign/mvds`; verify PRs appear on detail page
- [ ] 7.3 Add a note to the linked repo; verify it persists and does not appear on any experiment
- [ ] 7.4 Graduate an existing experiment to `beckharrisdesign/mvds`; verify badge on experiment card + bidirectional links
- [ ] 7.5 Click "Open in hub"; verify context primer copies correctly and orients a hub session to the linked repo via GitHub MCP
- [ ] 7.6 Verify `notes` and `experiment_pull_requests` check constraints reject rows with both or neither FK set
- [ ] 7.7 Verify existing experiment notes and PRs are unaffected (experiment_id still works as before)
