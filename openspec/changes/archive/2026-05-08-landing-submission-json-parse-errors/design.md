## Context

Landing pages call the hub anonymously from static hosts. Errors must be deterministic: **`400`** for bad client payloads, **`500`** only after validation passes but persistence fails.

## Approach

- Wrap `request.json()` in `try/catch`. On `SyntaxError` (and any thrown parse error Next.js forwards), respond with **`400`** and **`{ error: "<short message>" }`** — aligned with `.cursor/rules/nextjs-api-routes.mdc` for validation failures.
- Do not call `insertSubmission` after a parse failure.
- Keep **`500`** body shape `{ error: "Failed to submit response", details }` unchanged for downstream failures after valid JSON.

## Testing

- Add a Vitest using `NextRequest` with malformed JSON (`Content-Type: application/json`).
- Prefer matching existing route test patterns (mock Supabase unchanged for this assertion).

### Visual design / Figma

This change is **API-only**.

| Item | Value |
| --- | --- |
| **Primary Figma file** | *(none)* |
| **Libraries in use** | *(none)* |
| **Screens / nodes in scope** | *(none)* |
| **Code Connect** | No component mapping updates required. |

When a change **does** affect UI: add the file URL (`figma.com/design/...`), list published DS libraries relied on (e.g. hub local library or community kits), scoped components/frames, and note how tokens map — see [**`docs/FIGMA_SETUP.md`**](../../../../docs/FIGMA_SETUP.md) and [`.cursor/rules/figma.mdc`](../../../../.cursor/rules/figma.mdc). Prefer normalizing third-party kit output into **`tailwind.config.ts`** tokens rather than literals.
