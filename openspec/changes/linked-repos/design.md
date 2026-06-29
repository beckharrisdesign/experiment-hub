## Context

The hub currently tracks experiments as its only first-class entity. External repos — graduated prototypes, standalone tools, collaborator projects — exist outside the hub with no visibility or agent support. This change adds `linked_repos` as a peer entity (not an experiment type), extends the GitHub PR sync to work for any `owner/repo`, generalizes the notes and PR tables with a second FK path, and establishes the hub as a proxy context for working on linked repos via GitHub MCP.

This change is also the first hub feature built under **MVDS** as the governing design system. All new UI components (cards, detail pages, badges, actions) MUST use MVDS tokens, components, and patterns. Grandfathered experiments and their prototype UIs are not required to migrate now; a future evaluation or migration skill will surface candidates for uplift.

## Goals / Non-Goals

**Goals:**

- `linked_repos` table and CRUD API as a first-class hub entity
- Dashboard card for linked repos, visually distinct from experiment cards, using MVDS components
- Detail page with notes panel and synced PR list
- GitHub PR sync generalized to any `owner/repo` string
- Notes and `experiment_pull_requests` tables gain `linked_repo_id` FK alongside `experiment_id`
- Experiment graduation: `Graduated` status + `linked_repo_id` FK, bidirectional UI links
- Hub-as-proxy: GitHub MCP as default file-access path; "Open in hub" context primer on detail page; optional local clone for persistent local sessions

**Non-Goals:**

- Migrating existing experiment UIs to MVDS (deferred to future migration skill)
- Full GitHub repo management (creating repos, pushing commits)
- CI status, stars, forks — PRs and notes only
- Exporting hub agent config to linked repos

## User flow / IA

**Adding a linked repo:**
Dashboard → "Add linked repo" → name + `owner/repo` slug → saved → card appears on dashboard

**Linked repo detail page** (`/linked-repos/[id]`):
- Header: name, repo slug, "Linked Repo" badge, "Open in hub" button
- PR list: synced open PRs from GitHub (auto-refreshed on page load)
- Notes panel: add / edit / delete inline notes
- Local clone section (collapsed by default): "Clone for local editing" action; shows path and "Remove" when active
- If graduated-from experiment exists: "Graduated from [experiment name]" link

**Graduating an experiment:**
Experiment detail → "Graduate" action → select or create linked repo → experiment card shows "Graduated" badge + linked repo link; linked repo detail shows "Graduated from [experiment]"

**Starting a hub agent session on a linked repo:**
Detail page → "Open in hub" → copies a context primer prompt (repo slug, default branch, key entry points) → paste into hub agent session → hub skills/rules apply natively

## Visual design

| Item | Value |
| ---- | ----- |
| Design system | **MVDS** — all new components use MVDS tokens, typography, spacing, and component primitives |
| Grandfathered UI | Existing experiment cards and prototypes are exempt; no backfill required |
| Future work | Evaluation/migration skill to surface experiments ready for MVDS uplift |
| Breakpoints | S · 480px / L · 1024px per `rules/design-guidelines.mdc` |
| Status | Design spec — MVDS package must be published before UI tasks begin; absence is a blocking gap, not a workaround |

**LinkedRepoCard** (dashboard):
- Same card shell as ExperimentCard; MVDS surface + border tokens
- "Linked Repo" badge (MVDS chip, neutral variant) distinguishes it from experiment cards
- Shows: name, repo slug (`owner/repo`), last PR activity if available
- "Graduated" source badge on experiment cards that have graduated

**Linked repo detail page:**
- Standard hub detail layout (header + two-column body)
- PR list: compact list rows (MVDS list item), PR title + number + state chip + age
- Notes panel: MVDS textarea + inline note list with edit/delete affordances
- "Open in hub" button: MVDS primary action; copies primer to clipboard with confirmation toast

## Decisions

### linked_repos table shape

```ts
interface LinkedRepo {
  id: string;            // uuid
  name: string;          // display name
  repo_slug: string;     // "owner/repo"
  description?: string;
  worktree_path?: string; // set only when local clone exists
  created_at: string;
  updated_at: string;
}
```

### Notes and PR table generalization

Both `notes` and `experiment_pull_requests` add a nullable `linked_repo_id` FK. A check constraint ensures exactly one of `experiment_id` or `linked_repo_id` is non-null per row. All existing queries are unaffected — they already filter by `experiment_id`.

```sql
ALTER TABLE notes ADD COLUMN linked_repo_id uuid REFERENCES linked_repos(id);
ALTER TABLE notes ADD CONSTRAINT notes_one_owner
  CHECK (num_nonnulls(experiment_id, linked_repo_id) = 1);
-- same pattern for experiment_pull_requests
```

### PR sync generalization

The existing PR sync service accepts `{ ownerId, repoSlug, entityId, entityType }` where `entityType` is `"experiment"` or `"linked_repo"`. The upsert path branches on `entityType` to set the correct FK. No change to the sync schedule or GitHub API calls.

### Graduation model

`experiments` gains `status: "Graduated"` in the enum and a nullable `linked_repo_id` FK. Graduation is a single mutation: set both fields atomically. No experiment data is deleted or archived; the experiment remains visible with a "Graduated" badge.

### Hub-as-proxy: GitHub MCP is the default

No clone is created automatically. The "Open in hub" button generates a context primer:

```
## Hub session: beckharrisdesign/mvds

Repo: beckharrisdesign/mvds  
Branch: main  
Hub skills and rules apply in this session.

To read a file: use GitHub MCP get_file_contents  
To search code: use GitHub MCP search_code  
To view PRs: see the linked repo detail page at /linked-repos/[id]
```

The optional local clone ("Clone for local editing") is surfaced as a secondary action, clearly labeled as not for cloud sessions.

### MVDS as the governing design system for new hub UI

All UI introduced in this change and in future hub features uses MVDS. The decision is forward-looking only — existing experiment prototype UIs (simple-seed-organizer, best-day-ever, etc.) are grandfathered. A future **evaluation skill** will inspect experiment UIs against MVDS conformance and surface candidates for migration; a future **migration skill** will assist in uplift.

## Risks / Trade-offs

- **Schema drift** — confirm actual `notes` and `experiment_pull_requests` columns via `list_tables` before adding FKs; don't assume column names from application code.
- **PR sync scope** — the generalized sync must not re-fetch experiment PRs under the linked-repo path; the `entityType` guard is critical to prevent double-sync.
- **MVDS availability** — if the MVDS package is not yet published at implementation time, this is a **blocking dependency**, not a workaround situation. Do not fall back to hand-rolling tokens or patterns. Surface the gap, resolve it (publish MVDS or pin a pre-release), and only then proceed with UI tasks.
- **Graduation is one-way (for now)** — no "un-graduate" action in this change; if needed, it's a follow-on.
