-- ============================================
-- CREATE SEEDS TABLE - Copy this entire file
-- ============================================
-- Run this in Supabase SQL Editor:
-- 1. Go to: https://app.supabase.com/project/orlpgxqbesxvlhlkbnqy
-- 2. Click "SQL Editor" → "New query"
-- 3. Paste this entire file
-- 4. Click "Run" (Cmd/Ctrl + Enter)
-- ============================================

-- Create seeds table
CREATE TABLE IF NOT EXISTS seeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  variety TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('vegetable', 'herb', 'flower', 'fruit', 'other')),
  brand TEXT,
  source TEXT,
  year INTEGER,
  purchase_date DATE,
  quantity TEXT,
  days_to_germination TEXT,
  days_to_maturity TEXT,
  planting_depth TEXT,
  spacing TEXT,
  sun_requirement TEXT, -- Verbatim text as extracted (e.g., "Min full sun", "Full sun", etc.)
  planting_months TEXT, -- JSON array stored as text
  notes TEXT,
  photo_front TEXT, -- base64 data URL
  photo_back TEXT, -- base64 data URL
  use_first BOOLEAN DEFAULT false,
  custom_expiration_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on type for faster filtering
CREATE INDEX IF NOT EXISTS idx_seeds_type ON seeds(type);

-- Create index on year for faster filtering
CREATE INDEX IF NOT EXISTS idx_seeds_year ON seeds(year);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_seeds_created_at ON seeds(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE seeds ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (adjust based on your auth needs)
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations" ON seeds;

-- Create new policy
CREATE POLICY "Allow all operations" ON seeds
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- VERIFICATION QUERY (optional - run after)
-- ============================================
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'seeds' 
-- ORDER BY ordinal_position;
-- ============================================
