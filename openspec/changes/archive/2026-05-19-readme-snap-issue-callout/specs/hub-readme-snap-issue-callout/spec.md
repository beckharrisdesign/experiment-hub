## Outcomes

(See [proposal.md](../../proposal.md) — Who / Job / Done when / Not doing.)

## ADDED Requirements

### Requirement: Readers find Snap Issue in the hub root README with a clear path and install handoff

The root `README.md` SHALL include a scannable callout for **Snap Issue** that names the tool, gives a one-line purpose, states the repo-relative folder `experiments/snap-issue/extension/`, includes a short **Load unpacked** (or equivalent) cue for Chrome, and links to `experiments/snap-issue/extension/README.md` for full install and configuration steps.

**Fails until:** A reader who only opens the hub README can copy the folder path and knows to open the linked extension README for setup.

#### Scenario: Callout includes folder path and link to extension README

- **WHEN** a reader opens the hub root `README.md` and finds the Snap Issue callout
- **THEN** the callout SHALL include the literal path `experiments/snap-issue/extension/` and a markdown link to `experiments/snap-issue/extension/README.md`

#### Scenario: Callout includes a Chrome load-unpacked hint

- **WHEN** the same reader reads the Snap Issue callout
- **THEN** the callout SHALL mention loading the extension unpacked in Chrome (e.g. `chrome://extensions` + Developer mode + Load unpacked) in at most **two short sentences** alongside the link to the extension README

### Requirement: The hub README defers long extension documentation to the extension README

The hub `README.md` SHALL NOT duplicate the extension’s full permission matrix, OpenSpec change history, or multi-step GitHub PAT setup; those details SHALL live only in `experiments/snap-issue/extension/README.md` (or other extension-local docs), with the hub callout linking out.

**Fails until:** The Snap Issue section in the hub README is visibly shorter than a full install guide and relies on the extension README for depth.

#### Scenario: No long permission or PAT guide in the hub README

- **WHEN** a maintainer reviews the Snap Issue portion of the hub root `README.md`
- **THEN** they SHALL NOT find a copied multi-row permission table or lengthy PAT instructions that already exist in the extension README; the hub section SHALL primarily summarize and link
