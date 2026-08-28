# Spec: transform-module-stack

## Outcomes

_See [proposal](../../proposal.md) — this capability owns "compose transforms by hand,
without writing code, and see the result in seconds."_

## ADDED Requirements

### Requirement: A source image is brought in once

Adjusting the stack must never re-upload the photo; the file is stored server-side and
later requests carry parameters only.

**Fails until:** After the first upload, changing any module parameter produces a new
render without the original file leaving the browser again.

The system SHALL store the uploaded source in a private bucket, and subsequent render
requests SHALL carry only the stack description and the stored source's reference.

#### Scenario: User uploads a photo once and keeps adjusting it

- **WHEN** the user uploads an image and then changes any module setting
- **THEN** the result re-renders from the stored source, with no second upload of the file

### Requirement: Modules can be toggled, reordered, and tuned

The stack is composed by hand in the browser. Each module is an independent object, not a
fixed pipeline stage.

**Fails until:** A module can be switched off and back on with its parameters intact,
dragged to a new position, and adjusted — each producing a re-render.

The system SHALL represent the stack as an ordered list of `{module, enabled, params}`,
SHALL preserve a disabled module's parameters, and SHALL re-render on any change to that
list.

#### Scenario: User toggles a module off without losing its settings

- **WHEN** the user disables a module and later re-enables it
- **THEN** the module's parameters are unchanged from before it was disabled, and the
  result reflects its removal while off

#### Scenario: User reorders modules in the stack

- **WHEN** the user moves a module to a different position in the stack
- **THEN** the result re-renders with the modules applied in the new order

#### Scenario: User adjusts a module's parameters

- **WHEN** the user changes a parameter on any module in the stack
- **THEN** the result re-renders with that module's new setting, leaving other modules
  untouched

### Requirement: Order changes the image

Order-dependence is the creative material, not an implementation detail. If reordering
produced identical output, the stack would be decoration.

The system SHALL apply enabled modules strictly in stack order, so that two stacks with
the same modules in different orders can produce different images.

#### Scenario: User sees a different image after reordering the same modules

- **WHEN** the user places blur before colour simplify, then reverses the two
- **THEN** the two results differ visibly, and each is reproducible from its own order

### Requirement: The v1 catalogue covers what both prototypes did

Nothing a user could do in either prototype is lost in the move to modules.

The catalogue SHALL provide blur, colour simplify, the three inherited presets (slate,
mono-pop, high-contrast), and header/footer banner overlays, each as an independently
toggleable module, and all pixel work SHALL run server-side.

#### Scenario: User applies a preset and a banner from the module catalogue

- **WHEN** the user adds a preset module and a banner overlay module to the stack
- **THEN** both render server-side, with the page remaining responsive throughout
