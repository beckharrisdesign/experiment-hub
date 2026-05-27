-- Add user_profiles table for per-account preferences (zip code, growing zone, etc.)
-- Run this in Supabase SQL Editor after 007_seed_hidden_and_personal_notes.sql
--
-- Replaces the localStorage-backed profile in lib/storage.ts (see openspec/changes/sso-zip-code-persistence/).
-- One row per user, created lazily on first save via upsert.

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  zip_code TEXT,
  growing_zone TEXT,
  previous_zone TEXT,
  location TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for the primary read pattern (lookup by user_id is the PK, so already indexed)
-- No additional indexes needed.

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: users can only see/insert/update their own row. No delete policy — cascade handles account deletion.
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger: keep updated_at fresh on every update
CREATE OR REPLACE FUNCTION set_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_user_profiles_updated_at();
