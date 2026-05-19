-- Per-seed field visibility (canonical keys) and user-authored notes separate from packet `notes`.
-- Instruction-level comments continue to use `instruction_annotations` (JSONB array).

ALTER TABLE seeds ADD COLUMN IF NOT EXISTS hidden_fields TEXT[] NOT NULL DEFAULT '{}'::text[];
ALTER TABLE seeds ADD COLUMN IF NOT EXISTS my_notes TEXT;

COMMENT ON COLUMN seeds.hidden_fields IS 'Canonical Seed field keys hidden for this packet row (e.g. spacing, daysToMaturity).';
COMMENT ON COLUMN seeds.my_notes IS 'User-authored observations; distinct from packet-sourced `notes`.';
