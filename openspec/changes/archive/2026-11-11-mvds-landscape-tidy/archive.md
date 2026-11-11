# Archive — mvds-landscape-tidy

**Archived:** 2026-11-11 · **Created:** 2026-10-05 · **Tasks:** 22/22
**Outcome:** SHIPPED

The Hub moved to MVDS 0.4.0 with no visual change, kept its own heading face, added the two missing experiments to the registry seed, and corrected the MVDS contribution record. Katy walked all seven MVDS pages on 2026-11-11 (on 0.5.0 by then) and reported that all of them looked right. `/estate-sale-planner`, the eighth MVDS page, arrived after this change; Katy walked it the same day for `estate-sale-planner-build`, and the promoted spec includes it.

**Evidence:** PR #529 (CI and Deploy hub green); `app/globals.css` heading override and `.font-heading` utility; `data/experiments.json` (21 rows, no `keyword-explorer`); `docs/PACKAGE_CONTRIBUTION_CANDIDATES.md`; `openspec/specs/hub-mvds-integration/`, written without a pinned version so it covers later moves.
**Left open:** `Slider` is still an open MVDS candidate, owned by the MVDS session. `bhd-headless-notion` is still unfixed (see `proposal.md` handoffs).
