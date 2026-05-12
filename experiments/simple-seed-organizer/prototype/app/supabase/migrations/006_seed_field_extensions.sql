-- Add flexible seed packet field storage while preserving existing seed columns.
-- Rollback: hide the new UI paths and leave these nullable/defaulted columns
-- untouched; older app versions continue to read the original flat columns.

ALTER TABLE seeds ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE seeds ADD COLUMN IF NOT EXISTS planting_instructions TEXT;
ALTER TABLE seeds ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE seeds ADD COLUMN IF NOT EXISTS instruction_annotations JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE seeds ADD COLUMN IF NOT EXISTS raw_packet_text JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_seeds_custom_fields_gin
  ON seeds USING GIN (custom_fields);

CREATE INDEX IF NOT EXISTS idx_seeds_instruction_annotations_gin
  ON seeds USING GIN (instruction_annotations);

CREATE INDEX IF NOT EXISTS idx_seeds_raw_packet_text_gin
  ON seeds USING GIN (raw_packet_text);

-- Per-user reusable custom field definitions. The first UI pass stores values
-- directly on seed rows, but this table is the durable home for account-level
-- definitions when users want the same custom field across many packets.
CREATE TABLE IF NOT EXISTS seed_custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value_type TEXT NOT NULL CHECK (
    value_type IN (
      'short_text',
      'long_text',
      'integer',
      'date',
      'boolean',
      'single_select',
      'multi_select',
      'month_list',
      'photo_reference',
      'instruction_text'
    )
  ),
  display_group TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seed_custom_field_definitions_user
  ON seed_custom_field_definitions(user_id, display_order);

ALTER TABLE seed_custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom field definitions"
  ON seed_custom_field_definitions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom field definitions"
  ON seed_custom_field_definitions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom field definitions"
  ON seed_custom_field_definitions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom field definitions"
  ON seed_custom_field_definitions
  FOR DELETE
  USING (auth.uid() = user_id);
