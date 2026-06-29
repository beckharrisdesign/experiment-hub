# Proposal: linked-repos

## Human anchor

> "As tools mature the time and cost of building and deploying the whole hub starts to become a friction point. Conversely, sometimes I have projects that I started outside of the hub that I'd like to track and keep in short term memory. I want to have a mechanism to remain aware of external projects as well as help working prototypes leave the nest safely."

## Outcomes

**Who:** Solo founder managing a growing portfolio of tools, experiments, and maturing prototypes across multiple repos.

**Job:** Stay aware of the health and recent activity of external repos (e.g. `beckharrisdesign/mvds`) without having to leave the hub or open GitHub directly.

**Done when:**
- A linked repo card appears on the hub dashboard alongside experiment cards
- Notes and PRs for the linked repo are visible in a detail view
- A working prototype can be "graduated" by pointing its repo at a linked-repo entry, signaling it has left the experiment lifecycle

**Not doing:**
- Full GitHub repo management (creating repos, writing code, pushing commits)
- Replacing the experiments workflow — linked repos are a peer concept, not an experiment type
- Syncing arbitrary repo metadata (stars, forks, CI status) — PRs and notes only for now

## Capabilities

- **linked-repo-tracking** — New `linked_repos` table; dashboard card; detail page with notes panel and PR list; GitHub PR sync extended to any `owner/repo` string; notes and `experiment_pull_requests` tables generalized to support `linked_repo_id` alongside existing `experiment_id`
- **prototype-graduation** — Mechanism to mark an experiment as "graduated" and associate it with a linked repo entry, signaling the prototype has left the nest

## Optional links

- Related issues: #229 (MVDS palette — first repo to be tracked), #183 (opsx commands fix — hub workflow improvement)
