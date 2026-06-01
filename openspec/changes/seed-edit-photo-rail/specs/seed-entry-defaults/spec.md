## Outcomes

- **Who:** Solo founder + gardeners starting a brand-new packet, who want to save with minimal typing.
- **Job:** Pre-fill common packet fields with sensible, editable defaults so the shortest path to a saved seed is short — without ever silently overwriting what the user or extraction provided.
- **Done when:** A new-packet form arrives with common fields (e.g. type, current year) pre-filled as editable suggestions; defaults never replace a value supplied by the user or by extraction.
- **Not doing:** New field types or a custom-field redesign; changing extraction logic; defaults on the edit view of an existing seed (this is new-packet entry only).

## ADDED Requirements

### Requirement: Good defaults for a new packet

A new packet arrives with common fields pre-filled as editable suggestions, so the user can confirm-and-save instead of typing every field.

**Fails until:** Starting a new packet shows common fields (e.g. type, current year) already populated with editable defaults, and a value the user or extraction supplied is never replaced by a default.

The new-packet entry SHALL seed common fields with editable default values, applied only where the field is otherwise empty so user input and extraction results are never overwritten.

#### Scenario: Start a new packet with sensible editable defaults that never overwrite input

- **WHEN** a user starts a new packet (no extraction values present) and then again when extraction has supplied some fields
- **THEN** empty common fields show editable defaults, every default remains editable, and any field already filled by the user or extraction keeps its value unchanged
