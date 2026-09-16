# Tasks: etsy-ecosystem-map

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Katy changes the map structurally and both surfaces move together: a new board version page per the living-diagram conventions, the doc updated in the same change (ecosystem-map / board-doc lockstep)
- [ ] 1.2 Katy merges a PR that adds or moves a pipeline surface and the map already names its role, home, and seams in that PR (ecosystem-map / surface changes)
- [ ] 1.3 Katy captures a surface with no API (eRank, Search Analytics, statements) and the files land flat-named in Drive with a distilled note in `docs/pulls/` that downstream documents cite (ecosystem-map / distilled model)
- [ ] 1.4 Katy runs the monthly review and every live-state row is confirmed current or corrected, with the check recorded (ecosystem-map / live state)
- [ ] 1.5 Katy's monthly review appends completeness, engagement, and revenue observations to the ledger with capture provenance — and none of them carries a target (ecosystem-map / ledger)
- [ ] 1.6 Katy (or a future session) drafting listing copy or generating listing images finds the governing chapter one link away, stating the applicable principles (shop-design-system / findable)
- [ ] 1.7 Katy questions a principle and its citation points to the artifact that justifies it; a principle with no surviving justification gets removed, not kept on inertia (shop-design-system / provenance)
- [ ] 1.8 Katy reviews a listing batch and can mark each principle met or not met, with misses visible before anything ships (shop-design-system / checkable)

## 2. Document shell (no code prototype — this change ships governed docs)

- [ ] 2.1 Scaffold the homes from design.md: `docs/shop-design-system/` with `image-principles.md` + `content-principles.md` stubs (chapter skeleton: principle → receipt format), and `docs/ETSY_SHOP_HEALTH_LEDGER.md` with its header row (month · completeness · favorites-per-view · net revenue · MoM · provenance — no targets column, by construction)

## 3. Implementation

- [ ] 3.1 Write `image-principles.md` codified **from the `Layouts` component set** (Garden Components, node 2041:55504 / set 2041:55505): each principle a met/not-met statement citing its variant or slot, then the parallel code path (`scenes.ts`, `generator.ts`, `palette.ts`), then dated session lessons (scene contrast, thumbnail siblings). MVDS base marked; Etsy extensions marked as such
- [ ] 3.2 Write `content-principles.md`: the six copy rules, house-style description skeleton, alt-text role templates — receipts to `tag-positioning-experiment.md`, the payload JSONs, and the ads-CTR evidence pulls
- [ ] 3.3 Wire "one link away": map §1 (Design system) and §5 (Authorship) link the chapters; chapters link back to the map
- [ ] 3.4 Define the monthly review ritual in the map doc: verify/correct every live-state row, append one ledger row per line citing pull notes, record the check — a numbered checklist Katy can run in one sitting
- [ ] 3.5 Capture baselines for the ledger's first row: shop-wide Tier-B completeness from the scorecard over synced data, favorites-per-view from the sync; net revenue row waits on Katy's statement pull (September already archived in `docs/pulls/`)
- [ ] 3.6 Resolve the map doc's dated filename (design.md open risk): decide rename vs "established 2026-09" semantics and record the decision in the doc header

## 4. QA

- [ ] 4.1 Manual walkthrough aligned to outcomes: run the holiday batch (the 9 drafts' copy + galleries) against both chapters, mark every principle met/not met, confirm misses surface before activation
- [ ] 4.2 Receipt audit checklist: every principle's citation resolves (file exists / Figma node reachable / pull note present); board v5 vs doc read side-by-side for lockstep; `./node_modules/.bin/openspec validate --change etsy-ecosystem-map` passes
