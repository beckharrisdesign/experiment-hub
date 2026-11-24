# Task-effort audit — project context

This preserves where the tool came from, what it deliberately does **not** claim, the sources behind it, and where it could go next. Read this before extending v1, so the larger intent isn't lost in implementation detail.

---

## 1. Origin: from "quantified empathy" to one measurable dimension

The project started as an exploration of **"quantified empathy"** in the SaaS market:

> How do companies understand an individual customer's struggle, identify how widespread it is, and connect it to business outcomes?

**Commercial reference points:**
- **Quantum Metric** — frames this as *quantified empathy*
- **Contentsquare** — sells friction / frustration analytics

Both connect experience signals with broader behavioral and business data. They're treated here as examples of market positioning, not as validation of any method.

The underlying interest is broader than conversion optimization:

> **Can we make the human cost of using software visible, track it over time, and feed that evidence into better design decisions?**

### Six proposed dimensions

This is a *proposed organizing framework* — **not** an established or validated industry model.

| Dimension | Question |
|---|---|
| **Effort** | How much work does a task require? |
| **Uncertainty** | Do people understand the current state, consequences, and next step? |
| **Recovery** | How much work do errors create, and can people recover? |
| **Dependency** | Can people finish independently, or do they need help? |
| **Confidence** | Do people believe they completed the task correctly? |
| **Distribution** | Which roles, experience levels, and workflows carry the burden? |

### Why effort first

Observable interface demands can be recorded repeatedly, *without* installing an analytics platform or recruiting research participants.

### From cognitive walkthrough to deterministic regression audit

- **Starting point:** a cognitive walkthrough — inspecting a defined task step by step, asking whether someone can identify the action and understand progress
- **v1 was deliberately narrowed** to *deterministic execution of reviewed task paths*

So:

> **v1 is a task-effort regression audit — not automated user research and not a complete cognitive walkthrough.**

**Core question:** *Has this defined task become more burdensome, less burdensome, or broken since the approved baseline?*

**A useful result looks like:** *"The task still completes, but now requires three additional actions and duplicate entry. Here is the evidence."*

### The longer ambition (design orchestration)

```
current experience → evidence-backed findings → design proposal
   → implementation → repeat evaluation → human validation
```

The aim is **not** to automate empathy. It's to make *evidence about human effort* a recurring input to design decisions.

---

## 2. Methodological boundaries

v1 measures **interface-imposed work along a reviewed reference path.** It does **not** establish:

- Actual human emotion or frustration
- Human task time (browser duration is diagnostic only)
- Whether a new user can *discover* the reference path
- Whether the reference path is the *shortest* path
- Real-user completion rates
- Population prevalence of a problem
- Revenue, retention, or business impact
- Causality between an interface change and an outcome

### Always kept distinct in outputs

| Kind | Where it shows up |
|---|---|
| **Observed facts** | Ledger entries, `observation` findings, verification results |
| **Explicit task annotations** | `annotation` findings (repeated entry, context switches), counted only from reviewer-authored annotations |
| **Suspected consequences needing review** | `reviewRequired` + `reviewNote` on findings; `hypothesis` kind reserved for these |
| **Unknowns** | `verification: unknown`, `rootCause: "not established"`, "not comparable" reasons |

### Interpretation rules

- **A failed browser script ≠ a product usability failure**
- **A successful browser script ≠ proof of good UX**
- **More actions = a review signal, not a regression.** Extra steps can serve legitimate purposes (e.g. a confirmation dialog preventing a costly mistake).
- **No composite "empathy score" or "effort score."** Metrics are reported side by side, never combined.

### Known structural limitation

Because the runner follows a reviewed path and never repairs it, **many product changes will break the path instead of changing a count.** That's expected and visible (the run stops for review). The fixture demonstrates both cases:
- **`v2-confirm`** — a supported conditional interaction that *is* counted
- **`v3-renamed`** — an unexpected path change that correctly *stops*

---

## 3. Design decisions in v1 (and why)

| Decision | Reason |
|---|---|
| **Declarative JSON task paths, not scripts** | Hashable (baseline compatibility), reviewable, and limits what a task can do (safety) |
| **Default "not comparable" on any definition change** | A count difference caused by editing the script must never read as a product regression. Editorial fields are excluded so typo fixes don't break baselines. |
| **Separate scenarios for normal vs. recovery** | Recovery counts never mix with normal-path counts |
| **Annotation-only repeated entry / context switches** | The runner can't reliably infer *"this was already supplied"* or *"this is a different context."* Pretending otherwise would fabricate findings. |
| **Read-only by default + runtime request guard** | Config claims aren't enough. The browser's actual write requests are checked and blocked. |
| **Independent verification required** | A toast at the end of a path is not proof. The fixture's `v4-no-persist` shows why. |
| **Append-only index, explicit approval with history** | Provenance: you can always see which run was the baseline when, and what it replaced |
| **No runtime LLM** | Repeatability and auditability. Claude helps author and maintain paths, outside the run. |

---

## 4. Sources

> **Status, recorded honestly:** these links were **supplied with the project brief**. An attempt to open all eight from the build session on 2026-11-24 failed: the session's network allowlist blocked the hosts (DNS lookup refused). **None of them were reviewed while building v1.** The notes below explain *why each was cited*, based on the brief. They are not summaries of page content.

- **Vendor material** describes positioning and capabilities, not independent validation
- **Project choices:** the six-dimension framework and the v1 counting scheme are project choices, *not* validated standards

### Market framing

| Source | Why it matters here |
|---|---|
| **Quantum Metric — "Humanize your data with quantified empathy"**<br>https://www.quantummetric.com/blog/humanize-your-data-with-quantified-empathy | Origin of the *quantified empathy* framing that started this exploration |
| **Quantum Metric — Web Analytics**<br>https://www.quantummetric.com/digital-analytics/web-analytics | Example of how a vendor ties experience signals to broader behavioral/business data, the "connect to outcomes" half of the question v1 deliberately doesn't attempt |
| **Contentsquare — Frustration Score**<br>https://contentsquare.com/platform/capabilities/frustration-score/ | Example of a commercial *composite* friction metric. Useful as a contrast: v1 explicitly avoids composite scores. |
| **Contentsquare — Conversation Intelligence**<br>https://contentsquare.com/platform/conversation-intelligence/ | Example of extending experience analytics to conversational signals; relevant to future "production evidence" directions |

### Research methods

| Source | Why it matters here |
|---|---|
| **Nielsen Norman Group — "Evaluate Interface Learnability with Cognitive Walkthroughs"**<br>https://www.nngroup.com/articles/cognitive-walkthroughs/ | The methodological starting point. v1 narrowed away from it, and it's the basis for the future discoverability layer (§5 C). |
| **Nielsen Norman Group — "Task Analysis: Support Users in Achieving Their Goals"**<br>https://www.nngroup.com/articles/task-analysis/ | Grounds the idea of a defined task with a user-stated goal, which is how task configs are written (`goal`, `userRole`, `familiarity`) |
| **MeasuringU — "A Guide to Task-Based UX Metrics"**<br>https://measuringu.com/task-based-metrics/ | Reference for task-level metrics (completion, time, effort). Clarifies which of these v1 can and *cannot* stand in for. |
| **MeasuringU — "There are 70+ UX Metrics, Start with These 4"**<br>https://measuringu.com/get-comfortable-with-four-ux-metrics/ | Reminder to start small and pair synthetic measures with human ones; informs the human-validation direction (§5 D) |

**To actually review them later:** open them from a normal browser, or allow these hosts in the session's network settings: `www.quantummetric.com`, `contentsquare.com`, `www.nngroup.com`, `measuringu.com`. Then update this section with what each page says.

---

## 5. Future evolutions — preserved, NOT implemented

Ordered roughly by readiness. **Don't build abstractions for these in v1.** The structured `run.json` / `actions.json` / baseline records are meant to be consumable by any of them later.

### A. Operational monitoring
- Scheduled runs
- Release-triggered audits
- Notifications
- Lightweight history views
- *Only after manual runs are stable.*

### B. Broader coverage
- More tasks
- Roles and permissions
- Different viewports
- More controlled recovery scenarios
- Keep contexts **distinct**, rather than averaging away differences

### C. Discoverability inspection
- A separate cognitive-walkthrough layer evaluating:
  - Action visibility
  - Language
  - Feedback
  - Next-step clarity
- Keep inspection *judgments* distinct from deterministic *observations*
- Never present them as actual user behavior

### D. Human validation
- Real participants perform the same tasks
- Measure:
  - Actual completion
  - Time
  - Perceived ease
  - Confidence
- Compare with the audit
- Keep human results **separate** from synthetic execution

### E. Additional experience dimensions

| Dimension | What to measure |
|---|---|
| **Uncertainty** | Comprehension of status, consequences, next steps |
| **Recovery** | Successful recovery, recovery time, lost work |
| **Dependency** | Independent completion vs. self-service vs. human assistance |
| **Confidence** | Reported confidence vs. actual correctness |
| **Distribution** | Differences across roles, experience levels, workflows |

### F. Production evidence
- Real-user task events
- Repeated attempts
- Support contacts
- Abandonment
- Use these to estimate **prevalence**, not to infer emotion automatically

### G. Design-loop integration
- Feed findings into discovery and design proposals
- Compare current vs. proposed task demands
- Re-audit after implementation
- Preserve links: finding → proposal → verified result
- Suggest backlog items, but **require approval before any external write**

### H. Business-impact analysis
- Estimate affected users
- Relate friction to support cost, retention, or revenue
- Distinguish **association** from **causal** evidence

### I. Archetypal-agent exploration
- Explore different knowledge or access constraints
- Treat results as **hypothesis generation**
- Never substitute synthetic agents for real-user evidence
