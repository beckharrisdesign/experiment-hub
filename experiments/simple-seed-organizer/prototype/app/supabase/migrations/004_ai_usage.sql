-- AI completion usage tracking (per user, per month)
-- Each image read by the model counts as 1 completion.
-- read-ai: front only = 1, front+back = 2. read-ai-single: 1 per call. Re-extraction counts again.
--
-- After running: if you get PGRST202 (function not found), refresh schema cache in Supabase SQL Editor:
--   NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,  -- 'YYYY-MM' e.g. '2025-01'
  completions INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, period)
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_period ON ai_usage(user_id, period);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai_usage" ON ai_usage
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ai_usage" ON ai_usage
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ai_usage" ON ai_usage
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to increment AI completions (avoids race conditions)
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id UUID, p_period TEXT, p_count INTEGER DEFAULT 1)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  INSERT INTO ai_usage (user_id, period, completions, updated_at)
  VALUES (p_user_id, p_period, p_count, NOW())
  ON CONFLICT (user_id, period)
  DO UPDATE SET
    completions = ai_usage.completions + p_count,
    updated_at = NOW()
  RETURNING completions INTO new_total;
  RETURN new_total;
END;
$$;
