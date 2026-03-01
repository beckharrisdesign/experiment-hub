# Global rules for Cursor (paste into Settings → General → Rules for AI)

Quick reference: UX/DX balance · Test first, code later · Reusable systems · Log capture · Figma flow · Solo/vibe coding

## UX and DX: Balance, Don't Choose
- **Rule**: User experience and developer experience are not competitors. Always balance both needs instead of picking one over the other.
- **How**: Prefer simple, efficient, empathetic, modular patterns on the frontend and the backend. Good patterns serve users and maintainers.

## Testing: Test First, Code Later
- **Rule**: Test first, code later. Run the test first. If it fails, then write code to make it pass. Never write code first and hope it works.
- **Strong bias toward tests that agents can run** — Prefer tests that an agent can execute (scripts, curl, fetch, browser actions) over manual-only checks
- **Agent-runnable** — When adding tests, ask: can an agent run this and interpret the result? If not, make it so

## Log Capture
- All Next.js dev servers should output logs to `.next/turbopack.log` or a project-specific log file
- Logs should be accessible via MCP filesystem resources

## Analysis and Recommendations
- **Think in reusable systems and components** — Prefer chat, shared docs, or existing project structure over writing a ton of one-off markdown files for everything.
- **Use chat or reusable docs** for quick comparisons, recommendations, exploratory analysis, one-off explanations.
- **Use documentation files** when information must be referenced later, is project documentation, or is a living document.
- **Avoid** creating new one-off .md files for every analysis; extend existing docs or use chat instead

## Figma (when using Figma MCP)
- **Flow first** — When implementing from Figma: run `get_design_context` then `get_screenshot` before writing code. Do not skip to implementation.
- **Map to our system** — Treat Figma MCP output as design reference, not final code. Use this project's design tokens, components, and typography. Validate for 1:1 visual parity with the Figma screenshot.
- **Reuse, don't duplicate** — Use existing design-system components. Do not add new icon packages if assets come from Figma. No hardcoded colors or spacing; use tokens.

## Solo founder / vibe coding
- **Protect critical areas** — Do not modify pricing logic, auth flows, API contracts, or legal/core copy without explicit review. Call out protected areas in rules or docs.
- **Small, testable steps** — Break work into milestones you can run and verify. Plan before coding; cut scope so context stays manageable.
- **Small loops** — Prefer many small prompt → run → refine cycles over one large prompt. Start fresh chats for new features to avoid context bloat.
- **Review AI output** — If you wouldn't merge it from a junior dev without reading it, don't accept it from the LLM. Run tests and basic security checks on generated code.
- **Security is on you** — Never commit secrets; review auth and user-input handling; run security scans on generated code when it matters.
- **Go manual when it matters** — Use vibe coding for prototyping and boilerplate; use normal review and rigor for security-critical or performance-critical code.
