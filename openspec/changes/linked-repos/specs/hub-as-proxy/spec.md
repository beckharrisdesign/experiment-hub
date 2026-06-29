## Outcomes

- **Who:** Solo founder who wants to run hub agent workflows (skills, rules, commands) against a linked repo's code without switching repos or losing hub context.
- **Job:** Read, search, and operate on a linked repo's code from inside the hub session — hub skills, rules, and commands apply natively because the hub is already the context.
- **Done when:** A hub session can read files, search code, and view PRs in any linked repo via GitHub MCP; the linked repo detail page surfaces an "Open in hub" entry point that primes the agent with the right repo context; an optional local worktree clone is available for persistent local sessions that need to run the code.
- **Not doing:** Automatic cloning on session start; assuming clone persistence across cloud sessions; exporting hub config to linked repos.

## ADDED Requirements

### Requirement: GitHub MCP used as the default file-access layer

Linked repo code is accessed via GitHub MCP tools (file reads, code search, PR operations) — no clone required.

**Fails until:** A hub agent session can read a file and search code in a linked repo's `owner/repo` using GitHub MCP without any local clone present.

The system SHALL document and rely on GitHub MCP (`get_file_contents`, `search_code`) as the primary mechanism for accessing linked repo code from within the hub session; no clone or worktree SHALL be required for this default path; hub skills, rules, and commands apply natively because the hub is already the agent context.

#### Scenario: Read a file from a linked repo in a hub session

- **WHEN** a user asks the hub agent to read a file from a linked repo
- **THEN** the agent fetches it via GitHub MCP with no local clone present, and hub skills and rules apply to the response

### Requirement: Linked repo detail page surfaces an "Open in hub" context primer

The detail page provides a one-click way to start a hub agent session scoped to the linked repo.

**Fails until:** The linked repo detail page shows an "Open in hub" button that copies or opens a prompt primed with the repo's `owner/repo`, default branch, and a pointer to key entry files — ready to paste into a hub agent session.

The system SHALL add an "Open in hub" action to the linked repo detail page that generates a context-primer prompt containing the repo slug, default branch, and (if stored) notable entry points; this primer is the handoff between the hub UI and the hub agent session.

#### Scenario: Starting a hub session on a linked repo

- **WHEN** a user clicks "Open in hub" on a linked repo detail page
- **THEN** they get a ready-to-use context primer that orients the hub agent to that repo without requiring a clone

### Requirement: Optional local worktree for persistent local sessions

A local clone at `worktrees/<repo-slug>/` is available as an opt-in for persistent local environments where running the code matters.

**Fails until:** A user can trigger a "Clone for local editing" action that creates `worktrees/<repo-slug>/` and stores the path on the `linked_repos` row; `worktrees/` is in `.gitignore`; the detail page shows clone status and a remove action.

The system SHALL support an optional "Clone for local editing" action that runs `git clone` into `worktrees/<repo-slug>/`, stores `worktree_path` on the `linked_repos` row, and adds `worktrees/` to `.gitignore`; the detail page SHALL show whether a local clone is present and offer a "Remove local clone" action; this path is explicitly NOT used in cloud/ephemeral sessions where clones do not persist.

#### Scenario: Clone a linked repo for local editing

- **WHEN** a user on a persistent local session triggers "Clone for local editing"
- **THEN** `worktrees/<repo-slug>/` is created, `linked_repos.worktree_path` is updated, and the detail page reflects the active clone with a remove option
