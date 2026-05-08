## 1. Tests

1. Add a failing Vitest in `tests/api/landing-submission.test.ts`: POST malformed JSON expects **400** and `error`, and `insertSubmission` not called.
2. Run `npm test` and confirm failure before implementing.

## 2. Implementation

1. Wrap `await request.json()` in `route.ts` try/catch; on parse failure return `withCors(NextResponse.json({ error: "..." }, { status: 400 }))`.
2. Run `npm test` — full suite passes.

## 3. Specifications

1. ~~After review, sync canonical spec~~ **Done** — [`openspec/specs/experiment-submissions/spec.md`](../../../specs/experiment-submissions/spec.md) scenario **Invalid JSON body** updated to HTTP **400** + clear `error` in the same branch as the route change.

## 4. Cleanup

1. **Done** — Change archived to `openspec/changes/archive/2026-05-08-landing-submission-json-parse-errors/` with this PR.
