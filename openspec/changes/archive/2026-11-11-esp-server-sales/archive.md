# Archive — esp-server-sales

**Archived:** 2026-11-11 · **Created:** 2026-11-03 · **Tasks:** 27/27
**Outcome:** SHIPPED

Sales, every change to them and their photos save to the server without a Save button. They come back after Safari wipes the site's data, and only the phone that made them can read them. Katy walked it on a phone and signed off on 2026-11-11.

**Evidence:** PR #576; migration `021_esp_server_sales.sql`; the private `esp-photos` bucket; `sales-routes.test.ts`, `sync.test.ts`, `device.test.ts`; `openspec/specs/esp-server-sales/`.
**Left open:** outcome 1.5 (a failed photo upload retries later) is covered by tests and was never forced live. The device cookie is a stopgap until sign-in (review queue #50, #78).
