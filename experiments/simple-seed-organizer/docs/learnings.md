# Simple Seed Organizer - Learnings

*Add notes here as prototyping and testing reveal new information. Most recent at the top.*

---

## Prototype built (Figma Make + local Next.js)

A working prototype exists in `prototype/app/` and a Figma Make version is live. Key things to test or confirm from here:

- Does the use-first list feel useful in practice, or does it need more context (e.g. which seeds are actually still viable vs. just old)?
- Is the add-seed flow fast enough on mobile, or does it feel like too many taps?
- What does the real data look like — do most users have 20+ seeds, or is the addressable base smaller than expected?
- Does anyone actually pay $15/yr when the fake-buy button is live?

## Session work completed

Added Supabase email auth with user-scoped data (RLS), improved seed packet image display with front/back fallback, and optimized initial load with a two-phase metadata-first / lazy-photo fetch pattern.
