# Archive — esp-header-affordance

**Archived:** 2026-10-28 · **Created:** 2026-10-28 · **Tasks:** 17/17
**Outcome:** SHIPPED

The planner's header is now a Back button to the parent screen, the page title and a placeholder Menu (option A), merged in #568 and walked through on Katy's phone.

**Evidence:** `app/estate-sale-planner/TopBar.tsx`, `app/estate-sale-planner/MenuPlaceholder.tsx`, `tests/estate-sale-planner/top-bar.test.tsx`, `tests/estate-sale-planner/menu-placeholder.test.tsx`; PR beckharrisdesign/experiment-hub#568; spec promoted to `openspec/specs/esp-app-header/spec.md`.
**Left open:** the Menu panel is empty by design until account and persona work lands; `esp_menu_open` measures whether anyone taps it. MVDS still has no Dialog (hand-off candidate).
