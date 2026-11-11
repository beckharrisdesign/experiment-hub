# Archive — estate-sale-planner-build

**Archived:** 2026-11-11 · **Created:** 2026-10-13 · **Tasks:** 41/41
**Outcome:** SHIPPED

The phone walkthrough (photograph, flag, sort into Keep / Sell / Donate, correct, re-read, print the Sell list) is live in the hub. Katy walked it on a phone and signed off on 2026-11-11.

**Evidence:** `app/estate-sale-planner/`, `lib/estate-sale-planner/`; 402 tests in `tests/estate-sale-planner/` pass; first build `01c18d8`, then PRs #556–#572; `walkthrough-triage` promoted to `openspec/specs/walkthrough-triage/` and corrected to the app as built.
**Left open:** `donation-pickup-exit` and `sell-sheet` were not promoted. Their code is still there but nothing in the UI links to it (`api/exit`, checkout, webhook, `sheet/[id]`) until the CTA design pass (review queue #58). Their specs stay in this archive and should be revived from it, not taken as current behaviour.
