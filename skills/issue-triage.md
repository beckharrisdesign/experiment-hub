---
name: issue-triage
description: >-
  Triage open GitHub issues on this repo — apply the P0–P4 priority rubric, lightly
  retitle when an issue's actual intent has shifted (e.g. a "[Bug]" that's really an
  improvement), and identify clusters worth combining under a single tracker. Use
  when the user wants to organize their backlog, prioritize what to work on, clean
  up `snap-issue` captures, or refresh the inventory after a stretch of new reports.
  Trigger phrases: "triage my issues", "review the issues on my repo", "prioritize
  the backlog", "label these issues", "cluster related issues", "organize issues",
  "help me clean up my backlog".
---

# Issue Triage

Triages open GitHub issues on this repo with a project-tuned priority rubric, light title editing, and cluster identification — then applies the changes after a single sign-off from the user.

## When to use

- User asks to triage, prioritize, label, organize, or clean up issues.
- After a batch of `snap-issue` captures have come in (these arrive with a generic `[Bug]` prefix even when they're really improvements or content tasks).
- Periodically as a backlog refresh — every few weeks, or before a planning session.

Do **not** invoke this skill for single-issue questions ("what should I do about #175?") — that's a normal conversation, not a triage pass.

## The P0–P4 rubric

Tuned for this project (solo-founder, pre-revenue, gardening app). Adjust definitions if the project context changes.

| Priority | Definition | Example |
|---|---|---|
| **P0** | Blocker — crashes, data loss, broken core flow, security. Users actively give up. | Sign-in totally broken; database wipe; auth bypass |
| **P1** | Important — meaningful friction in a core flow, real data quirks, regressed features, launch-readiness gaps | Saved field silently doesn't persist; missing legal pages on a public URL; a core feature lost in a regression |
| **P2** | Significant — UX/visual issues with workarounds, accessibility concerns, primary-surface polish | Form field too small for typical input; low-contrast toggle on a conversion-critical page; missing empty state |
| **P3** | Polish — visual nits, UX refinements, secondary surfaces | Rename a label; remove a duplicate button; logo size on a marketing page |
| **P4** | Nice-to-have — small tweaks, ideas worth tracking but not prioritized | "Consider this" notes that don't have a clear next action |

**Labels** are `p0`, `p1`, `p2`, `p3`, `p4` (created in this repo with red→orange→amber→green→blue colors). If a label is missing, recreate via:

```bash
gh label create p0 --color B60205 --description "Blocker — crashes, data loss, broken core flow, security"
gh label create p1 --color D93F0B --description "Important — core-flow friction, regressions, launch-readiness gaps"
gh label create p2 --color FBCA04 --description "Significant — UX/visual issues with workarounds, a11y, primary surfaces"
gh label create p3 --color 0E8A16 --description "Polish — visual nits, UX refinements, secondary surfaces"
gh label create p4 --color 1D76DB --description "Nice-to-have — small tweaks, ideas worth tracking"
```

## Workflow

### 1. Read the inventory

```bash
gh issue list --state open --limit 50 --json number,title,labels,createdAt,body,author --jq '.[] | {n: .number, t: .title, labels: [.labels[].name], created: .createdAt, bodyHead: (.body[:300])}'
```

For any issue where the title was truncated by GitHub's display or where the body is needed to make a triage call (especially `snap-issue` captures with a `## Note` section), read the full body:

```bash
gh issue view <N> --json title,body --jq '"TITLE: \(.title)\n\(.body)"'
```

### 2. Categorize each issue

For every open issue, decide:

- **Priority (P0–P4):** Apply the rubric above. When borderline, prefer the lower priority (P3 over P2) unless the issue clearly disrupts a core flow.
- **Type label:** `bug`, `enhancement`, `documentation`, `ux`, or a combination. Many `snap-issue` captures arrive labeled or prefixed `[Bug]` but are really improvements — flag and recategorize.
- **Title edit:** Apply *light* edits where the original title is vague, truncated, or mislabels intent. **Preserve the user's core intent verbatim** — don't reinterpret, only sharpen.
  - Vague → specific: "this icon is super small" → "App logo icon in header is too small relative to wordmark" (only if a screenshot or context makes the target unambiguous; otherwise leave alone and flag for the user).
  - Wrong prefix: `[Bug] Drop this button` → `[Improvement] Drop this button` (it's a removal request, not a defect).
  - Truncated: ` [Bug] When one of this toggle is selected, the unselected one is really hard…` → `[Bug] Unselected pricing toggle option has insufficient contrast`.

### 3. Identify clusters

Look for groups of 2+ issues that:

- **Touch the same view / surface** (e.g. multiple snap captures from `/seeds/<id>/edit`)
- **Describe the same user journey** (e.g. "how does a new user add their first seed?" spanning the add menu, empty state, onboarding routing)
- **Would ship in the same PR anyway** (e.g. two P3 fixes on the marketing landing page)

A real cluster has a coherent **definition of done** that's bigger than any single issue. Loose thematic overlap ("all UX") isn't a cluster — the test is whether you'd want to do them as **one design pass**.

Cross-priority clusters are fine; the highest-priority sub-issue sets the cluster's priority (e.g. P1 regression + P3 cleanup → tracker is P1). Note the P1 explicitly as the "forcing function" in the tracker body.

### 4. Present rubric + proposed changes to the user, get one sign-off

Show a table with columns: `#`, `new title`, `priority`, `type labels`, `cluster (if any)`. Use `AskUserQuestion` for the apply-or-adjust decision rather than walking issue-by-issue. Two questions max:

1. **Apply this triage?** Options: Yes / Labels only / Let me adjust first.
2. **(If retitles)** **How to handle `[Bug]` prefixes when recategorizing?** Options: Change to match new type / Keep prefix, just add labels.

Flag the most consequential judgment calls inline (which P1s are borderline, which titles you intentionally left untouched and why).

### 5. Apply

Loop the edits — one issue per `gh issue edit` call. Don't try to batch into a single API call; the readable shell-loop is fine and lets the user follow along.

```bash
gh issue edit <N> --title "..." --add-label <labels>
```

For clusters, create the tracker first, then comment on each child with a cross-link:

```bash
# Create tracker (capture URL → number for cross-linking)
TRACKER_URL=$(gh issue create \
  --title "[Improvement] <cluster name> (tracking)" \
  --label enhancement,ux,<priority> \
  --body "$(cat <<'EOF'
Tracking issue for <one-line context>.

## Sub-issues
- [ ] #N — <child title>
- [ ] #N — <child title>

## Suggested approach
<2–4 numbered steps for the coordinated pass>

## Definition of done
When the sub-issues above can all be closed.
EOF
)")
TRACKER_NUM=$(echo "$TRACKER_URL" | grep -oE '[0-9]+$')

# Comment on each child
for n in <child numbers>; do
  gh issue comment $n --body "Rolled into tracking issue #$TRACKER_NUM (<cluster name>) — will be addressed as part of <approach>. This issue remains open and will close when the tracker closes."
done
```

**Important — leave children open.** GitHub auto-renders `- [ ] #N` task lists with each child's live state, so the tracker's checkboxes tick as children close. Closing children up-front loses the "still to do" signal.

## Output to the user

After applying, show:

- **Summary by priority bucket** (P0 count, P1 with titles, P2 count, P3 count, P4 count).
- **New tracker issues** created, with sub-issue counts.
- **One or two follow-up flags** — titles you intentionally left ambiguous (because the issue's screenshot was needed for context), issues where the priority call was close, or clusters you considered but didn't create.

Don't enumerate every change in detail — the user already saw the proposed table. The post-apply summary should be skimmable.

## Anti-patterns to avoid

- **Don't add `[Bug]` → `[Improvement]` rewrites for issues where the user explicitly described something as broken.** Trust their framing unless the body proves otherwise. Light editing means sharpening intent, not overriding it.
- **Don't cluster everything.** A 5-item tracker for unrelated P3 polish is just an unhelpful table of contents. The bar is "would I want this as one design pass?"
- **Don't auto-close children when creating a tracker.** Even if they all roll up, closing them prematurely loses visibility into what's left to do.
- **Don't invent priorities you haven't defined.** This rubric is P0–P4. Don't introduce P1.5 or "stretch" labels just because something feels in-between.
- **Don't skip the user sign-off.** Triage is opinionated work; the user has context you don't (which bug is hitting them daily, which "P3" is actually blocking a customer demo). One AskUserQuestion confirmation step is the minimum.

## How to adapt the rubric over time

The P0–P4 definitions above are tuned to *this* project's current stage (solo-founder, pre-revenue, single-app focus). They should evolve as the project does:

- **At launch:** P1 grows to include any data-trust issue, however small. P0 stays for outages.
- **Post-launch with paying users:** P0 grows to include any payment-related bug or auth issue affecting >1 user. P1 grows to include support burden.
- **Multiple products:** Add a `surface` label dimension (`hub`, `sso`, `landing`, etc.) so triage can filter by app.

Edit this file's rubric section when those transitions happen — don't carry stale definitions forward.
