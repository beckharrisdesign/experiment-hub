# Apply — {{experiment_name}}

<!--
  Pull retrieved context from BHD Surfaces, Product Design Patterns,
  Pattern Candidates. Apply is NOT monolithic — it contains a sequence
  of named Build Units, each with its own state.
-->

## BHD Surfaces used

<!-- Which existing surfaces are in scope for this experiment. -->

## Product Design Patterns applied

<!-- Which patterns from the Product Design Patterns store. -->

## Build Units

<!--
  Typical sequence:
    1. Landing Page (validates demand)
    2. Prototype (validates the product works)
    3. Production (validates retention and monetization)

  Each unit has its own state, purpose, and just-in-time checks.
-->

### Build Unit 1: <name>

- **State:** planned / in progress / live / archived
- **Purpose:** validation / production / both

<!--
  State transitions:
    planned → in progress: human marks
    in progress → live: hybrid — framework auto-detects observable signals
      (URL responding, deployment timestamp, ad campaign started,
      real user activity), then prompts human to confirm.
    On live confirmation, just-in-time checks fire:
      - If purpose includes validation → Validation Plan must exist
      - If purpose includes production → Measurement Brief intent +
        instrumentation must exist
      Prompts but does not block.
    live → archived: human marks
-->

#### External Positioning variants

<!--
  Testable taglines, headlines, ad copy derived from Internal Positioning.
  Each variant tracked with its results.
-->

| Variant | Surface | Result |
|---|---|---|
|  |  |  |

#### Measurement instrumentation

<!--
  How success and kill metrics from the Measurement Brief are actually
  being captured for this unit.
-->

#### Learnings log

<!-- Append-only, timestamped, most recent first. -->

- **YYYY-MM-DD:** <observation>

#### Pattern notes

<!--
  Lightweight scratchpad noting things that look like reusable patterns.
  Feeds the Pattern Candidates store. When a candidate is seen in 3+
  experiments, the framework prompts for promotion to the appropriate
  Pattern store (Business / Service / Product Design).
-->

---

### Build Unit 2: <name>

<!-- Repeat the same structure for each Build Unit. -->
