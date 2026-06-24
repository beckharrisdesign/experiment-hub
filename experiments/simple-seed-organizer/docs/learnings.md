# Simple Seed Organizer - Learnings

*Add notes here as prototyping and testing reveal new information. Most recent at the top.*

---

## Phase 1 ad test results (2026-06-24)

Ran first paid traffic test to the landing page at simpleseedorganizer.app.

| Metric | Value |
| --- | --- |
| Impressions | 1,400 |
| Clicks | 40 |
| CTR | 2.9% |
| Signups | 2 |
| Click-to-signup | 5% |

**Read:** CTR is reasonable for cold traffic, which means the creative or targeting is pulling the right audience. The 5% click-to-signup rate is the soft spot — 19 out of 20 people who landed didn't convert. That could be landing page friction, unclear value prop above the fold, or people in the consideration phase who aren't ready to commit. Two signups is too thin to draw product conclusions, but it confirms real humans exist who want this.

**Next:** Investigate the landing page drop-off before scaling spend. Worth A/B testing the headline or CTA, or doing a quick qualitative pass on what the first screen communicates versus what the ad promised.

---

## Prototype built (Figma Make + local Next.js)

A working prototype exists in `prototype/app/` and a Figma Make version is live. Key things to test or confirm from here:

- Does the use-first list feel useful in practice, or does it need more context (e.g. which seeds are actually still viable vs. just old)?
- Is the add-seed flow fast enough on mobile, or does it feel like too many taps?
- What does the real data look like — do most users have 20+ seeds, or is the addressable base smaller than expected?
- Does anyone actually pay $15/yr when the fake-buy button is live?

## Session work completed

Added Supabase email auth with user-scoped data (RLS), improved seed packet image display with front/back fallback, and optimized initial load with a two-phase metadata-first / lazy-photo fetch pattern.
