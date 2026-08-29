# Design — change-history-manifest

## Outcomes

(See [proposal.md](proposal.md) — Who / Job / Done when / Not doing.)

## User flow / IA

Unchanged. `/changes` and `/changes/[id]` render exactly what they render today; only where their history comes from moves. The single visible addition is one line naming the source, so an empty history can be told apart from an unreadable one.

## Visual design / Figma

| Item | Value |
| ---- | ----- |
| Figma | **N/A — no UI change.** No frame, component, layout or copy block changes. The page's markup is untouched apart from one line stating its history source, which reuses the existing muted mono treatment already used for the pull-request line beneath the timeline. Drawing an as-is/proposed pair would produce two identical frames. |
| Verification instead | The `Fails until` lines on the spec are observable against the live site: `/changes/tell-the-story` reports `0 pull requests` today and eleven when this is done. That is a better check than a frame comparison. |

## Where it runs

`vercel build` runs **inside GitHub Actions** (`deploy-hub.yml`), and only the built output is uploaded with `vercel deploy --prebuilt`. So the build happens somewhere the checkout depth is ours to set — which decides most of this design.

```
deploy-hub.yml
  checkout (fetch-depth: 0)   ← full history, as CI already does
  generate manifest            ← reads git, writes data/change-history.json
  vercel build                 ← traces the manifest into the route bundle
  vercel deploy --prebuilt     ← no git needed at runtime, and none available
```

## Decisions

1. **Generate at deploy time, do not commit the manifest.** A committed manifest would need a bot push on every merge, and bot-authored commits in this repo hold workflows for manual approval — a deploy that waits on a human is worse than the bug. Generating in the deploy job also means the manifest can never be older than the deployment reading it.

2. **The manifest is untracked** (`data/change-history.json`, gitignored). It is derived data. A tracked copy invites someone to edit it, and a hand-edited manifest would make the drift band lie — which is the one thing this page exists not to do.

3. **Force it into the bundle with `outputFileTracingIncludes`**, the pattern `next.config.js` already uses for libvips and the Etsy fonts. Tracing cannot follow a path built at runtime, and this file is read by path.

4. **Live git wins wherever a non-shallow checkout exists.** Local work should show without regenerating anything. The manifest is the fallback, not the default — which also means the local experience keeps exercising the git readers rather than letting them rot.

5. **Generation failure fails the deploy.** A shallow clone, a missing git, an unreadable change — any of them abort with a message naming the cause. Shipping a page whose history silently reads empty is precisely the defect being fixed, and a red deploy is a cheaper way to learn about it than a live page that looks finished.

6. **The page names its source.** One muted line: read from the repository, or read from a manifest and when it was generated. Without it, "no history" and "no history *available*" render identically — and that ambiguity is what let this ship unnoticed.

7. **The manifest is sorted and carries no generation timestamp inside its records.** Regenerating at the same commit must produce an identical file, so a diff means the history actually changed. A timestamp would make every regeneration look like a change.

## The pattern this belongs to

Three failures, one cause, each a layer further out:

| | Where | How it presented |
| --- | --- | --- |
| 1 | `git log` piped through `head` | Confidently wrong answers, no error (`reference_rtk_truncates_before_pipes`) |
| 2 | CI's shallow checkout | Four assertions failing without naming the cause; fixed with `fetch-depth: 0` |
| 3 | The deployed runtime | A page that looks finished and says nothing |

Every one degraded quietly rather than failing. That is why decision 5 makes generation loud and decision 6 makes the source visible: the recurring defect here is not "git is missing", it is **an environment assumption that nothing checks**. The fix worth keeping is the check, not the manifest.

## Risks / Trade-offs

- **The deploy job's guard skips everything when Vercel secrets are absent.** In that case no manifest is generated, and the page falls back to the current behaviour rather than breaking. Acceptable, and visible because of decision 6.
- **Tests run without a manifest.** They use live git, which CI has in full since `fetch-depth: 0`. The manifest path needs its own coverage with a fixture rather than relying on a generated file being present.
- **The manifest is a second implementation of the same reading.** Two code paths for one answer is a drift risk of exactly the kind this page reports on. Mitigated by generating the manifest *through* the existing readers rather than reimplementing them, so there is one parser and two sources.
- **A change committed after the deploy is invisible in production until the next one.** True, and correct — production shows what it was built from. The source line says when the manifest was generated so a reader can tell.
