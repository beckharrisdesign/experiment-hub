-- ============================================
-- ADD USER_ID FOR AUTH - Run in Supabase SQL Editor
-- ============================================
-- 1. Go to: https://app.supabase.com/project/orlpgxqbesxvlhlkbnqy
-- 2. SQL Editor → New query
-- 3. Paste and run
-- ============================================

ALTER TABLE seeds ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_seeds_user_id ON seeds(user_id);

DROP POLICY IF EXISTS "Allow all operations" ON seeds;

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

-- Auto-set user_id on insert
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
