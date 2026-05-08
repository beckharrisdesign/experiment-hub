## Why

Waitlist landings send JSON to a single public hub endpoint (`POST /api/landing-submission`). When proxies, manual tests, or bad clients POST invalid JSON, the handler currently bubbles a parse failure into the generic `500 Failed to submit response`, which hides a client mistake and wastes debugging time versus a clear **`400`** validation-style response.

## What Changes

- Validate JSON parsing explicitly in `/api/landing-submission`; return **`400`** with `{ error: string }` when the body is not valid JSON.
- Add a unit test that locks in the contract for landing scripts and API consumers.
- Update the living requirement in `openspec/specs/experiment-submissions/spec.md` to match the new behavior when the change is archived / merged.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `experiment-submissions`: Adjust the **Malformed JSON request body** requirement so invalid JSON is **400** with a clear error (not a generic 500).

## Impact

- Code: [`app/api/landing-submission/route.ts`](../../../app/api/landing-submission/route.ts).
- Tests: [`tests/api/landing-submission.test.ts`](../../../tests/api/landing-submission.test.ts).
- Spec delta: merged into canonical spec at archive time alongside this branch.
