# PDF Metadata Viewer — hosted single-tenant instance

## Why

The tool works but only exists on one machine, pointed at one folder, which
means the household archive is only tendable from that desk. Moving it to the
hub's existing Vercel pipeline makes it reachable, and doing that for one user
first defers multi-tenancy, subprocessor agreements, and Google's restricted-scope
security assessment until there's evidence the hosted workflow is even pleasant
to use.

## Experiment links / human anchor

[`experiments/pdf-metadata-viewer/docs/intent.md`](../../../experiments/pdf-metadata-viewer/docs/intent.md)
— founder decision, sequencing, and shape, quoted verbatim from the 2026-08-05
session. Key line:

> Shifting this codebase into experiments is me deciding to think about it as a
> cloud based tool not a local one.

## Evidence (experiment)

- [`docs/PRD.md`](../../../experiments/pdf-metadata-viewer/docs/PRD.md) — problem framing and success metrics for the local tool
- [`docs/FEATURE_STATUS.md`](../../../experiments/pdf-metadata-viewer/docs/FEATURE_STATUS.md) — what is actually built, verified against source 2026-08-05
- [`docs/roadmap.md`](../../../experiments/pdf-metadata-viewer/docs/roadmap.md) — deferred backlog, including the keyword read-back bug
- Eval corpus — local only, at `~/Documents/code/pdf-metadata-viewer-eval/`; cannot be committed and cannot serve as product fixtures

No `market-research.md` or `business-case.md`. This is a personal experiment;
productization is explicitly a later phase.

## Proceed attestation

**N/A** — non-commercial personal experiment. Registered `type: "personal"` in
`data/experiments.json`, and the `ExperimentKind` contract carries no scores for
non-commercial types, so there is no rubric verdict to attest to. Not hub churn:
the founder anchor above is the sponsor signal.

## Visual board (FigJam / light Figma)

**https://www.figma.com/design/NGybYS2piBw5Q8T4c35Z2M** — `pdf-metadata-viewer-cloud`

Pages per the `rules/figma.mdc` convention:

| Page | Node id | State |
|---|---|---|
| `00 Components` | `0:1` | Empty — DS components and hub tokens import at design time |
| `01 Current state` | `1:2` | **Built** — two frames, see below |
| `02 Proposed` | `1:3` | Empty — first iteration lands at `design.md`; later ones become `02.1`, `02.2`, … as new pages |

`01 Current state` frames:

| Frame | Node id | Shows |
|---|---|---|
| `Current · File list · Desktop 1440` | `3:2` | Stats strip and the seven-column table — the view that reads and parses every PDF to fill its columns |
| `Current · Detail · Desktop 1440` | `3:95` | Preview pane plus the fixed 400px metadata panel, where each field saves on its own and rewrites the whole PDF |

Reconstructed from `prototype/public/index.html` and `styles.css` rather than
screenshotting the running app, because the app renders real household documents
and this file is shared. Sample content is synthetic.

The detail frame is the one the change rewrites: moving from per-field autosave
to an explicit commit is visual composition, so `02 Proposed` needs a rendered
page and an explicit go before any code.

## What Changes

- **BREAKING** — metadata edits stop writing to the PDF on every field change.
  A database becomes the working store; the PDF is written on an explicit commit.
  This is the central tension of the change (see Impact).
- Documents are read from Google Drive over OAuth instead of a local `PDFS_DIR`.
  Drive keeps the bytes; the database stores references, not copies.
- Metadata, edit history, and per-document activity move from
  `activity-log.json` on disk to Supabase tables with real history rows.
- Edits batch per document instead of firing one full-file rewrite per field.
- `prototype/server.js` (Express, `app.listen`) is replaced by Next API routes
  in the hub app, deploying through the existing Vercel pipeline.
- Every route gains an auth gate. Nothing is reachable unauthenticated.
- **Not changing**: the Notion Entities integration keeps its internal
  integration token. OAuth there buys only multi-tenancy and is out of scope.
- **Not changing**: the module-global entity cache in `entities-notion.js`.
  Correct for single-tenant; revisit only when a second account exists.

## Capabilities

### New Capabilities

- `document-metadata-store`: Database-backed metadata and edit history for a
  document, with batch commit semantics, so editing does not require a full-file
  round trip and history survives independently of the file.
- `drive-document-source`: OAuth handshake to Google Drive, storage of file
  references rather than bytes, and the read/write-back path for PDF metadata.
- `hosted-instance-access`: Authentication gate and configuration for the
  single-tenant hosted deployment, including where secrets live.

### Modified Capabilities

None. No existing spec in `openspec/specs/` covers this experiment.

## Impact

**The premise tension — needs resolving in `design.md`.** The PRD's first goal is
*"Make embedded metadata the only source of truth. Everything the tool writes
travels with the file. Delete the tool and the archive still works."* A database
working store inverts that. The likely resolution is that the database is the
editing surface and the PDF is written on deliberate commit — preserving the
durable-artifact thesis while removing the per-keystroke round trip — but that
must be decided explicitly, not drifted into.

**Launch blocker inherited.** `pdf-lib` does not reliably read back keywords it
wrote. As a personal local tool that was an annoyance; with a database as the
working store and Drive as the destination, a bad write is silent corruption in
the household archive. Roadmap already ranks it critical.

**Drive write-back cost.** `pdf-lib` needs whole-file bytes to modify metadata,
so each commit is a download-modify-upload against Drive, and Drive versions
each upload. Batch-per-document keeps this tolerable; per-field would not.

**Affected code**: `prototype/server.js` (all routes), `prototype/public/app.js`
(save model), `prototype/lib/taxonomy-loader.js` and `entities-notion.js` (reused
as-is), `lib/supabase.ts` (new tables), `middleware.ts` (route gating),
`@experiment-hub/notion-auth` (pattern sibling for Drive tokens).

**Registry**: `data/experiments.json` currently records `type: "personal"`,
`public: false`. Both stay true for this change and are revisited only at
productization.

**Stale assertions**: [PR #358](https://github.com/beckharrisdesign/experiment-hub/pull/358)
states in `README.md` and `.env.example` that the tool is never deployed. Those
were accurate when written and become wrong when this lands; they are rewritten
by this change, not patched ahead of it.

**Rollout**: the local Express prototype keeps working throughout. It is retired
only once the hosted instance has round-tripped a real document end to end.
