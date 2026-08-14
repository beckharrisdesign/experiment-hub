# Archive — md-docs-cleanup

**Archived:** 2026-08-14 · **Created:** 2026-05-21 · **Last touched:** 2026-05-21

**Outcome: ABANDONED (never executed) — but the need is real and still open.**
A 12KB proposal for a documentation cleanup pass. No specs, no tasks, no execution. Archived because a proposal that sat untouched for three months is not a queue item, not because the work stopped mattering.

**Left open — verified still broken as of 2026-08-14:**
- `README.md` documents an `agents/` directory that no longer exists (it is `skills/`), and links `agents/README.md` and `docs/SITEMAP_SCREENSHOT_WORKFLOW.md` — both missing.
- `AGENT_ARCHITECTURE.md` (untouched since 2025-12) opens by directing readers to that missing `agents/README.md`.
- `.claude/hooks/post-compact.sh` injects "Follow Voice & Tone standards in agents/design-guidelines.md" into context after every compaction — a dead path.
- `COMMIT_SUMMARY.md` is a 2026-02 Simple Seed Organizer billing changelog sitting in the hub repo root.

Re-file as a small, task-bearing change when it is worth an afternoon.
