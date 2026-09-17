---
name: linked-repo-session
description: Orient a hub agent session to a linked repo. Use when the user pastes an "Open in hub" primer, names a linked repo (e.g. beckharrisdesign/mvds), or asks to read, search, or review code in a repo tracked on the hub dashboard.
---

# Working on a linked repo from the hub

Linked repos (`linked_repos` table, dashboard cards, `/linked-repos/[id]`)
are external repos tracked by the hub. The hub session is the agent
context — its skills, rules, and commands apply natively. **Do not clone
by default.**

## Default access path: GitHub MCP

- **Read a file:** `get_file_contents` with the repo's `owner/repo` slug
- **Search code:** `search_code` scoped to the repo
- **PRs:** list/read via GitHub MCP PR tools; the synced list is also on
  the linked repo detail page

If the repo is not in the session's GitHub scope, ask the user to add it
(`add_repo`) rather than working around the restriction.

## Context primer format

The "Open in hub" button on a linked repo detail page copies this primer;
when a user pastes one, treat it as the session's working context:

```
## Hub session: <owner>/<repo>

Repo: <owner>/<repo>
Branch: <default branch>
Hub skills and rules apply in this session.

To read a file: use GitHub MCP get_file_contents
To search code: use GitHub MCP search_code
To view PRs: see the linked repo detail page at /linked-repos/<id>
```

## Local clone (opt-in, persistent local sessions only)

`worktrees/<repo-slug>/` (gitignored) is for persistent local
environments that need to *run* the code. Never rely on it in cloud or
ephemeral sessions — clones do not persist there. The detail page's
"Clone for local editing" action owns `linked_repos.worktree_path`;
keep it accurate if you create or remove a clone.
