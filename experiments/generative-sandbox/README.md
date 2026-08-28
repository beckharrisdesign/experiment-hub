# Generative Sandbox

Stack transform modules, reorder them, tune their parameters. All pixel work runs
server-side (sharp), so the browser never blocks on a large photo.

**This experiment has no standalone prototype server.** It is a route in the hub
app, deployed with the hub:

| | |
|---|---|
| Route | `/generative-sandbox` |
| Page + components | `app/generative-sandbox/` |
| API | `app/api/generative-sandbox/{source,render}` |
| Library | `lib/generative-sandbox/` |
| Tests | `tests/generative-sandbox-render.test.ts` |

```bash
npm run dev      # hub dev server; the sandbox is at /generative-sandbox
npm test         # includes the sandbox render suite
```

Change records: `openspec/changes/generative-sandbox/` (utility lifecycle) and
`openspec/changes/generative-sandbox-build/` (this code).
Figma: <https://www.figma.com/design/WYoo1eYmfh72vtIulHnNPV> — `02 Proposed`.

Supabase credentials are optional locally: without `SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` the source image is written to a temp directory
instead of a private bucket. That fallback is a convenience, **not** production
parity.

## QA checklist

- [ ] Add a photo → a result renders
- [ ] Drag a parameter → label tracks continuously, render fires on release
- [ ] Toggle a module off → it leaves the result, its parameters stay put
- [ ] Reorder blur and colour simplify → the image visibly changes
- [ ] Drag/zoom the viewport; Reset refits
- [ ] Drag a slider repeatedly while busy → UI stays responsive, last value wins
