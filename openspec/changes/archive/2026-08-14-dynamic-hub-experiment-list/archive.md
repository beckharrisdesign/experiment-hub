# Archive — dynamic-hub-experiment-list

**Archived:** 2026-08-14 · **Created:** 2026-05-20 · **Last touched:** 2026-05-21

**Outcome: SHIPPED BY OTHER MEANS.**
Asked for the hub landing page to render the experiment list from `experiments.json` instead of hardcoded markup. Delivered, and then some: the hub now resolves experiments through Notion → Supabase → `experiments.json` as a fallback chain, so the list is dynamic from a live source rather than a checked-in file.

**Evidence:** `lib/data.ts:63` (`getExperiments`), consumed at `app/page.tsx:33`.
