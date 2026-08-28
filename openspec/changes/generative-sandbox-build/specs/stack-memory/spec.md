# Spec: stack-memory

## Outcomes

_See [proposal](../../proposal.md) — this capability owns "never lose the recipe behind a
good accident."_

## ADDED Requirements

### Requirement: An output is saved with the stack that produced it

A saved image without its recipe is the failure this capability exists to prevent.

**Fails until:** Saving an output records the module order, each module's enabled state
and parameters, and the seed — not just the rendered pixels.

The system SHALL persist, alongside any saved output, the complete stack description that
produced it.

#### Scenario: User saves a result and its recipe is kept with it

- **WHEN** the user saves an output they like
- **THEN** the module order, per-module enabled state, parameters, and seed are stored
  with it

### Requirement: A saved stack can be reopened and extended

The point of remembering is to carry on from a good accident, not merely to admire it.

The system SHALL let a saved stack be reopened into the editing surface with every module,
order, and parameter restored, and SHALL allow saving the modified result as a new entry
without overwriting the original.

#### Scenario: User reopens a saved stack and builds on it

- **WHEN** the user opens a previously saved stack and changes a module
- **THEN** the stack loads exactly as saved, the change re-renders, and saving again
  creates a new entry rather than replacing the original
