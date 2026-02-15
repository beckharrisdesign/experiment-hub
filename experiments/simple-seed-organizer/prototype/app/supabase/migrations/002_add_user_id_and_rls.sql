-- Add user_id to seeds table for multi-tenant auth
-- Run this in Supabase SQL Editor after 001_create_seeds_table.sql

-- Add user_id column (nullable for existing rows; new rows will require it)
ALTER TABLE seeds ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_seeds_user_id ON seeds(user_id);

-- Drop the permissive policy
DROP POLICY IF EXISTS "Allow all operations" ON seeds;

-- RLS: Users can only access their own seeds
CREATE POLICY "Users can view own seeds" ON seeds
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seeds" ON seeds
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own seeds" ON seeds
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own seeds" ON seeds
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger: auto-set user_id on insert if not provided
CREATE OR REPLACE FUNCTION set_user_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_seeds_user_id ON seeds;
CREATE TRIGGER set_seeds_user_id
  BEFORE INSERT ON seeds
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_on_insert();
