## Outcomes

- **Who:** Solo founder with a growing portfolio of repos outside the experiment lifecycle.
- **Job:** See the health and recent activity of external repos from the hub dashboard without opening GitHub.
- **Done when:** A `linked_repos` row can be created; its card appears on the dashboard alongside experiment cards; a detail page shows a notes panel and a synced PR list; GitHub PR sync works for any `owner/repo` string.
- **Not doing:** CI status, stars, forks, or any repo metadata beyond PRs and notes.

## ADDED Requirements

### Requirement: linked_repos table and data model

A new first-class entity tracks external repos by their GitHub `owner/repo` identifier.

**Fails until:** A `linked_repos` row can be inserted with a name, `owner/repo` slug, and optional description, and retrieved by id.

The system SHALL add a `linked_repos` table with columns `id`, `name`, `repo_slug` (`owner/repo`), `description`, `created_at`, and `updated_at`, and SHALL expose CRUD API routes under `/api/linked-repos`.

#### Scenario: Register a linked repo

- **WHEN** a user submits a name and `owner/repo` slug via the API
- **THEN** a `linked_repos` row is created and returned with a stable id

### Requirement: Dashboard card for linked repos

Linked repos appear on the hub dashboard as distinct cards alongside experiment cards.

**Fails until:** At least one linked repo card renders on the dashboard with its name, repo slug, and a "Linked Repo" badge distinguishing it from experiment cards.

The system SHALL render a `LinkedRepoCard` component on the dashboard for each `linked_repos` row, displaying name, repo slug, and a visual badge; experiment cards SHALL remain visually unchanged.

#### Scenario: Dashboard with one linked repo registered

- **WHEN** the hub dashboard loads and one linked repo exists
- **THEN** a linked repo card appears in the list alongside any experiment cards, with a "Linked Repo" badge

### Requirement: Detail page with notes panel and PR list

Each linked repo has a detail page showing its notes and open PRs.

**Fails until:** Navigating to `/linked-repos/[id]` renders a notes panel (add/edit/delete) and a PR list sourced from the GitHub PR sync.

The system SHALL add a `/linked-repos/[id]` page with a notes panel backed by the generalized `notes` table (see notes generalization requirement) and a PR list fetched from the PR sync service.

#### Scenario: View detail page for a linked repo

- **WHEN** a user navigates to a linked repo detail page
- **THEN** they see existing notes, an input to add a note, and a list of open PRs synced from GitHub

### Requirement: Notes and PR tables generalized to support linked_repo_id

Existing `notes` and `experiment_pull_requests` tables gain a `linked_repo_id` FK so linked repos share the same storage as experiments.

**Fails until:** A note and a PR record can each be inserted with a `linked_repo_id` (and `experiment_id` null) and returned correctly scoped to that linked repo.

The system SHALL add a nullable `linked_repo_id` FK column to the `notes` and `experiment_pull_requests` tables, enforce that exactly one of `experiment_id` or `linked_repo_id` is non-null per row, and update all read queries to scope by the appropriate FK.

#### Scenario: Add a note to a linked repo

- **WHEN** a user adds a note via the linked repo detail page
- **THEN** the note is stored with `linked_repo_id` set and `experiment_id` null, and appears only on that linked repo's detail page

### Requirement: GitHub PR sync extended to any owner/repo

The existing PR sync mechanism works for any `owner/repo` string, not just experiment repos.

**Fails until:** Running the PR sync for a `linked_repos` row fetches open PRs from `owner/repo` and stores them with `linked_repo_id` set.

The system SHALL accept an `owner/repo` string as input to the PR sync service, fetch open PRs via the GitHub API, and upsert them into `experiment_pull_requests` with `linked_repo_id` set and `experiment_id` null.

#### Scenario: Sync PRs for a linked repo

- **WHEN** the PR sync runs for a linked repo with a valid `owner/repo`
- **THEN** open PRs are upserted into `experiment_pull_requests` scoped to that linked repo's id
