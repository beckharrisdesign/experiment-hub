## Outcomes

- **Who:** Solo founder who wants to run hub agent workflows (skills, rules, commands) against a linked repo's code without switching repos or losing hub context.
- **Job:** Open a linked repo's code as a worktree inside the hub session so all hub agent infrastructure applies natively.
- **Done when:** A linked repo can be checked out as a git worktree under `worktrees/<repo-slug>/`; the hub session can read and operate on that code; the worktree path is registered against the linked repo record.
- **Not doing:** Exporting hub config to linked repos; pushing worktree changes automatically; managing multiple concurrent worktrees per repo.

## ADDED Requirements

### Requirement: Linked repo checked out as a git worktree

A linked repo's code is accessible inside the hub session via a named worktree.

**Fails until:** Running the checkout action for a linked repo creates `worktrees/<repo-slug>/` containing the repo's default branch code, and the path is stored on the `linked_repos` row.

The system SHALL support a "checkout worktree" action for a linked repo that clones or adds the repo as a git worktree at `worktrees/<repo-slug>/` and stores the `worktree_path` on the `linked_repos` row; `worktrees/` SHALL be listed in `.gitignore`.

#### Scenario: Check out a linked repo as a worktree

- **WHEN** a user triggers "open in hub" for a linked repo
- **THEN** `worktrees/<repo-slug>/` is created containing the repo's code, and `linked_repos.worktree_path` is updated to that path

### Requirement: Worktree path surfaced in the hub UI

The linked repo detail page shows whether a worktree is active and provides the open/remove actions.

**Fails until:** The linked repo detail page shows "Worktree active at worktrees/<slug>" when checked out, and a "Remove worktree" action when one exists.

The system SHALL display worktree status on the linked repo detail page — inactive state with an "Open in hub" button when no worktree exists, and active state with the local path and a "Remove worktree" button when one does.

#### Scenario: Detail page with an active worktree

- **WHEN** a linked repo has a worktree checked out
- **THEN** the detail page shows the worktree path and a "Remove worktree" button instead of the "Open in hub" button

### Requirement: worktrees/ excluded from hub git tracking

Worktree directories are not committed to the hub repo.

**Fails until:** After checking out a linked repo worktree, `git status` in the hub repo shows no untracked files under `worktrees/`.

The system SHALL add `worktrees/` to the hub's `.gitignore` so checked-out linked repo code is never staged or committed as part of the hub.

#### Scenario: Check out a worktree and inspect hub git status

- **WHEN** a linked repo worktree is created at `worktrees/mvds/`
- **THEN** `git status` in the hub repo shows no changes in `worktrees/`
