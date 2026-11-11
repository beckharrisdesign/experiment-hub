# Archive — estate-sale-planner-sold-comps

**Archived:** 2026-11-11 · **Created:** 2026-10-27 · **Tasks:** 73/80 ticked; 4 struck through by the no-confirmed-state decision (1.16–1.18, 3.14), 3 partial (1.21, 3.25, 4.3)
**Outcome:** SHIPPED

Item correction on the source photo (box, split, merge, lot, draw-in, message, undo) and the Check sold prices button, which offers possible matches and lets a person pick the sale that sets the price (D23–D25), are live, with every model call and lookup costed. Katy walked it on a phone and signed off on 2026-11-11.

**Evidence:** PRs #574, #575, #579, #580, #581; migrations `019_esp_comps_costs.sql`, `020_esp_comps_reads.sql`, `022_esp_comps_checks.sql`; `comps-*.test.ts`, `correction.test.ts`, `possible-matches.test.ts`; `openspec/specs/item-correction/`, `openspec/specs/sold-comps-lookup/`, and the threshold added to `openspec/specs/esp-app-header/`.
**Left open:** 1.21 (a lot's search worded as a set) hasn't been confirmed with a keyed call. 3.25: the `COMPS_API_KEY` reference line in `.env.local` and the `sync-secrets.sh --apply` push to Vercel were never recorded as done. 4.3 has built captures but no side-by-side against Figma round 20. Outcomes 1.3, 1.5 and 1.15 rest on a code read, not a test. Review queue #64 and #65 were replaced by D25.
