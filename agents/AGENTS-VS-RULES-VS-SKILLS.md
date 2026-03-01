# Legacy Agents: Agent vs Rule vs Skill

Recommendation for each file in `agents/`. Use this to decide what to keep as @-mention agents, what to move to Cursor rules, and what to move to skills.

---

## Keep as agents (workflow + approval + artifacts)

These are **multi-step workflows** with approval checkpoints, clear inputs/outputs, and role-playing. They don’t fit “always-on” rules or single-task skills.

| File | Why agent |
|------|-----------|
| **experiment-creator.md** | Refine idea → approve → create dirs → metadata. Multiple checkpoints, produces experiment structure and JSON. |
| **market-research.md** | Research → TAM/SAM/SOM → report → scores → approval. Long workflow, produces market-research.md and score updates. |
| **prd-writer.md** | Analyze experiment → PRD → invokes design-advisor → approval → save. Produces PRD.md and doc updates. |
| **prototype-builder.md** | Analyze PRD → propose stack → approval → generate code → invokes design-advisor. Produces prototype dir and code. |
| **design-advisor.md** | Multiple modes (PRD review, prototype review, live site). Runs tests first, then heuristic eval. Produces design reviews and reports. |

**Action:** Leave these as `@agent-name` references. No change.

---

## Better as rules (guardrails / format / reference)

These are **constraints or references**, not workflows. They work better as Cursor rules (or reference docs) so they apply in the right context without a full “agent” flow.

| File | Recommendation | Where |
|------|-----------------|--------|
| **commit-message.md** | **Rule** | `.cursor/rules/commit-messages.mdc` with glob so it applies when editing commit-related content or when the user is about to commit. Content: format (type/scope/subject), examples, checklist. |
| **design-guidelines.md** | **Rule** | `.cursor/rules/design-guidelines.mdc` — design principles, tokens, patterns. Apply when working in UI/frontend or when design-advisor is invoked. Design-advisor can keep pointing to “design guidelines” and you read from this rule. |
| **scoring-criteria.md** | **Reference or rule** | Keep as reference doc that market-research uses, or add a rule with glob `**/market-research*.md` / “when conducting market research” so the criteria are in context. Optional. |

**Action:** Done. Rules added: `.cursor/rules/commit-messages.mdc` and `.cursor/rules/design-guidelines.mdc`. You can trim the “Role” preamble and keep the actionable parts. Leave the originals in `agents/` as reference or remove after migration.

---

## Optional workspace skill (this repo only)

| Concept | Recommendation | Where |
|---------|----------------|--------|
| **Design review with site check** | **Skill** | `.cursor/skills/design-review-live.mdc` or `.agents/skills/design-review-live/SKILL.md`: (1) Run `./scripts/test-site.sh <URL>` (or global site-health logic), (2) If pass, run design-advisor live site evaluation (heuristics + flows). Ties test-first to design-advisor for this repo. |

**Action:** Optional. You already have global `site-health` and design-advisor instructions; this skill just wires “test site then evaluate” for experiment-hub in one place.

---

## Summary

| Current file | Recommendation |
|--------------|----------------|
| experiment-creator.md | **Agent** — keep |
| market-research.md | **Agent** — keep |
| prd-writer.md | **Agent** — keep |
| prototype-builder.md | **Agent** — keep |
| design-advisor.md | **Agent** — keep |
| commit-message.md | **Rule** — `.cursor/rules/commit-messages.mdc` ✓ |
| design-guidelines.md | **Rule** — `.cursor/rules/design-guidelines.mdc` ✓ |
| scoring-criteria.md | **Reference** (or rule for market-research context) — keep as doc or add rule |

**Net:** Keep the five workflow docs as agents. Move commit-message and design-guidelines into project rules. Optionally add one workspace skill for “test site then design review.”
