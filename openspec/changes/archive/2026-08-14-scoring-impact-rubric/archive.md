# Archive — scoring-impact-rubric

**Archived:** 2026-08-14 · **Created:** 2026-08-14 · **Tasks:** 21/21
**Outcome:** SHIPPED

v3 impact rubric (Personal/Social/Business, 1–5, total 3–15) shipped end-to-end in one day: rules store rewritten, Notion contract live (`Score:PI/SI/BI` columns, `Why:` child pages, `Impact Score` formula), tabbed in-place hub display with per-dimension legends, landing sub-score columns, `/scoring` `/heuristics` `/harness` doc pages removed; six active experiments scored the same day (Katy already editing stubs). Superseded the same-day M/P/S v2 (PR #372) before it touched any data.

**Evidence:** PR #376 merged 2026-08-14 (`4380791`, +#377 plumbing cleanup); Labs data source `399b908d-7b37-80cb-beb5-000b54ca2967` carries the v3 columns and formula; live detail pages render `IMPACT SCORE n/15` blocks from Notion content; Figma file `mFBh28MD8YGwGZemogqwfw` (approved at 02.7/02.8).

**Left open:** URL columns surfacing `Why:` pages in the field list (Katy: "not yet"); Notion rows for unregistered repo experiments (etsy-listing-kit, seed-finder, garden-guide-generator, photo-memories, the-illuminator, …); Supabase fallback stays v1-only; SSO `Score:B` drift (Notion 4 vs business-case 2); dead file-check helper sweep (task chip pending).
