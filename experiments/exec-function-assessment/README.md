# Executive Function Assessment Suite

Three standard-protocol assessments, self-administered, scored automatically,
and trended over time. One arrives by email each morning.

Lives in the hub at `/exec-function-assessment`. There is no separate prototype
directory — the app is Next.js routes plus pure scoring modules in `lib/`.

| Piece | Path |
| --- | --- |
| Protocol logic (pure, tested) | `lib/exec-function/` |
| Task and history UI | `app/exec-function-assessment/` |
| API routes | `app/api/exec-function/` |
| Session table | `supabase/migrations/012_exec_function_sessions.sql` |
| Daily email cron | `.github/workflows/exec-function-daily.yml` |
| Tests | `tests/exec-function/` |

## The three modules

### 1. Corsi block-tapping — visuospatial working memory

Per Kessels et al. (2000). Nine blocks in a fixed irregular arrangement; the
sequence flashes at ~1 block/second; span starts at 2; **two trials at every
span**; one correct of two advances the span; both wrong terminates the run.
Forward and backward run as separate conditions and trend as separate series.

Two scores are stored per session:

- **Block Span** — the longest sequence reproduced correctly at least once.
- **Total Score** — Block Span × number of correct sequences. More sensitive to
  small changes, which is why Kessels prefers it.

Both trials at a span are always administered, even after the first is correct.
Stopping early would inflate Block Span against the norms and would make Total
Score depend on *when* a success happened rather than how many there were.

### 2. Adaptive n-back — working memory under load

Visuospatial, eight positions (a 3×3 grid without its centre). 500 ms stimulus +
2500 ms ISI = 3 s per trial. Blocks of 20 + N trials with exactly 6 targets.
Between blocks: **≥ 85% → N+1**, **≤ the decrease threshold → N−1**, otherwise
hold. The decrease threshold is selectable across the 50–75% range the
literature uses (default 75%).

The first N trials of each block are excluded from scoring — nothing exists N
back for them, so they can be neither hit nor false alarm.

**One deliberate departure from the research protocol:** six blocks (~7 min)
rather than the 20–25 minute clinical administration. The adaptive rule itself
is unchanged; only the number of blocks it runs for.

### 3. Everyday check-in — self-report

**Not a validated clinical instrument, and labelled as such wherever a score
appears.** It borrows the *structure* of the BRIEF-A — a 3-point Never /
Sometimes / Often scale, nine subscales, two indices, an overall composite — and
none of its content. BRIEF-A is copyrighted and commercially licensed by PAR;
its items are not reproduced here in whole or in part. All 45 items (5 per
subscale) were written originally for this tool.

Subscales roll into Behavioral Regulation (Inhibit, Shift, Emotional Control,
Self-Monitor) and Metacognition (Initiate, Working Memory, Plan/Organize, Task
Monitor, Organization of Materials); together they form the composite (45–135).
Every item is keyed in the same direction, so a rising line always means more
reported difficulty.

Scheduled weekly rather than daily: the items ask about ongoing patterns, so
administering it every day would resample the same period and read as flat by
construction.

## Known limits

- **Self-administered without an examiner.** The Corsi and n-back protocols are
  followed, but normative data was collected with an examiner present. Scores
  here are comparable to your own history, not to published norms.
- **The Corsi layout is a digitization.** The arrangement is fixed and irregular
  — which is the protocol-relevant property — but is not a claim to the physical
  board's exact millimetre offsets.
- **Browser timer throttling.** A backgrounded tab throttles `setTimeout` to
  ~1 s, which would corrupt a 500–600 ms stimulus. Sessions detect this and are
  stored with `timingReliable: false`, and the result screen says so.

## Daily nudge

`.github/workflows/exec-function-daily.yml` POSTs to
`/api/exec-function/daily-email` once a day. The route works out today's
assignment from the calendar date, looks up the streak and the last score on
that task, and sends one email via Resend.

The rotation is a pure function of the date (`lib/exec-function/schedule.ts`), so
the email and the page it links to agree without a handshake, and re-opening the
link later the same day lands on the same task.

Seven-day cycle: Corsi forward, n-back, Corsi backward, n-back, Corsi forward,
Corsi backward, check-in.

## Storage

Server-side (Supabase), because the daily link gets opened on whichever device is
nearest and a per-device store would split one history into several. There are no
accounts — a single shared secret (`EFA_ACCESS_KEY`) rides in the link once, the
page keeps it, and every API call presents it.

Every operation falls back to `localStorage` when Supabase or the key is absent,
so the tool runs with no infrastructure at all. **The fallback is never silent** —
the UI says which store answered, so a session that only reached one laptop is
visible as such.

## Setup

```bash
# 1. Create the table
psql "$SUPABASE_DB_URL" -f supabase/migrations/012_exec_function_sessions.sql
```

Then set these (see `.env.example` for the full registry):

| Key | Where | What |
| --- | --- | --- |
| `EFA_ACCESS_KEY` | Vercel + GitHub secret | Long random string; gates the API and rides in the daily link |
| `EFA_NOTIFY_EMAIL` | Vercel | Address the nudge goes to |
| `EFA_SITE_URL` | Vercel + GitHub variable | Production origin, for the link in the email |
| `EFA_TIMEZONE` | Vercel | IANA zone the schedule's calendar day is computed in |
| `EFA_EMAIL_FROM` | Vercel | From-address; falls back to Resend's onboarding sender |
| `RESEND_API_KEY` | Vercel | Already present for Etsy Listing Kit |

Set the cron in the workflow to the UTC equivalent of the local time you want the
email to land, and set `EFA_TIMEZONE` to match.

## Not in v1

Spatial / force-directed-graph reformatting of any task (that is the deliberate
v2 iteration), dual n-back, AI interpretation or coaching text anywhere, user
accounts, and any cross-module composite score — the three instruments measure
different constructs on incomparable scales.
