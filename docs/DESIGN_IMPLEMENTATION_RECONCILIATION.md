# Design ↔ implementation reconciliation — Etsy Listing Kit

Compares the built funnel against Figma `02.3 Proposed` ([file](https://www.figma.com/design/5oeip2GtLOFpGWpmhyd0fK)). Status vocabulary per the OpenSpec brief.

| Surface | Figma frame | Implementation | Status | Notes |
| --- | --- | --- | --- | --- |
| Landing + upload | `Landing+Upload` (Desktop/Mobile) | `app/etsy-listing-kit/page.tsx` | IMPLEMENTED_AS_DESIGNED | Terracotta/ochre/cream, eyebrow, drag/drop/paste, warm copy — matches; verified desktop + mobile 375px |
| Preview + paywall | `Preview+Paywall` | same page (inline preview section) | IMPLEMENTATION_DIFFERS | Design showed a dedicated screen; built as an **inline section on the landing page** after upload. Same content (6-grid + $3 panel + ochre tag). Lower friction; intentional |
| Processing | `Processing` | result page "putting your set together…" state | IMPLEMENTED_AS_DESIGNED | Post-payment reassurance; polls to fulfilled |
| Result + download | `Result+Download` | `result/page.tsx` | IMPLEMENTATION_DIFFERS | Adds a **"Download all (.zip)"** button above the per-image grid (design showed a delivered strip). Superset of the design |
| Payment cancelled | `State · Payment cancelled` | landing `?canceled=1` banner | IMPLEMENTED_AS_DESIGNED | Ochre banner, "no charge" copy |
| Processing failed | `State · Processing failed` | result "you're covered" state | IMPLEMENTATION_DIFFERS | Design said auto-retry→refund; built as **immediate auto-refund** on failure (simpler, honest for a $3 item) |
| Owner view | (not in Figma) | `/admin/etsy-listing-kit` | AWAITING_REVIEW | Utilitarian table, not designed in Figma — flagged for a design pass if it becomes customer-facing (it won't; owner-only) |

## Intentional deviations (accepted)

- **Inline preview** instead of a separate route — fewer navigations, keeps the upload context. Reversible.
- **Immediate auto-refund** instead of retry-then-refund — for a $3 experiment, refunding on first failure is the honest, simplest customer experience.
- **Zip + per-image** downloads — the design implied a zip; implementation offers both.

## Not blocking production

None of the deviations are BLOCKS_PRODUCTION. Mobile frames (`02.3` Mobile 480) are matched by responsive CSS (verified). If a full-fidelity mockup upgrade lands (photo-real vs procedural, REVIEW_QUEUE #11), regenerate the preview/result grids — no structural change.
