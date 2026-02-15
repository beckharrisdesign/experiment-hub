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

-- Enable Row Level Security (RLS) - for now, allow all operations
-- You can restrict this later based on user authentication
ALTER TABLE seeds ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations (adjust based on your auth needs)
CREATE POLICY "Allow all operations" ON seeds
  FOR ALL
  USING (true)
  WITH CHECK (true);
