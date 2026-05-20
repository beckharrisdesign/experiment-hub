# hub-experiment-openspec-bridge (delta)

## Outcomes

See [hub-bhd-phase-tabs](../hub-bhd-phase-tabs/spec.md) — this delta updates bridge behavior from a combined Lifecycle tab to per-phase tabs and empty-tab hiding.

## MODIFIED Requirements

### Requirement: Per-phase tabs on experiment detail

The experiment detail page SHALL include one tab per linked OpenSpec phase artifact that exists and is non-empty (`explore.md`, `propose.md`, `apply.md`, `archive.md`), labeled Explore, Propose, Apply, and Archive, instead of a single Lifecycle tab that stacks all phases.

**Fails until:** Explore-only linked change shows Explore tab only, not Lifecycle.

#### Scenario: Explore-only experiment

- **WHEN** only `explore.md` exists for the linked change
- **THEN** the Explore tab SHALL render that markdown and the current phase indicator SHALL show Explore

#### Scenario: No linked change

- **WHEN** no change directory resolves
- **THEN** no BHD phase tabs SHALL appear; legacy PRD and Business Case tabs SHALL follow hide-if-empty rules in `hub-bhd-phase-tabs`

## REMOVED Requirements

### Requirement: Lifecycle tab on experiment detail

**Reason:** Replaced by per-phase tabs aligned to `bhd-experiment` schema artifacts.

**Migration:** Remove combined Lifecycle tab UI; use phase tabs from `openSpecLifecycle.artifacts` per `hub-bhd-phase-tabs`.
