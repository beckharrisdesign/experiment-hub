# Quick Setup: Create the Seeds Table

Your Supabase connection is working! ✅

## Create the Table

1. **Open Supabase Dashboard**:
   - Go to: https://app.supabase.com/project/orlpgxqbesxvlhlkbnqy

2. **Open SQL Editor**:
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run this SQL** (copy the entire block below):

```sql
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
  sun_requirement TEXT CHECK (sun_requirement IN ('full-sun', 'partial-shade', 'full-shade')),
  planting_months TEXT,
  notes TEXT,
  photo_front TEXT,
  photo_back TEXT,
  use_first BOOLEAN DEFAULT false,
  custom_expiration_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_seeds_type ON seeds(type);
CREATE INDEX IF NOT EXISTS idx_seeds_year ON seeds(year);
CREATE INDEX IF NOT EXISTS idx_seeds_created_at ON seeds(created_at DESC);

-- Enable Row Level Security
ALTER TABLE seeds ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations
CREATE POLICY "Allow all operations" ON seeds
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

4. **Click "Run"** (or press Cmd/Ctrl + Enter)

5. **Verify**:
   - You should see "Success. No rows returned"
   - Go to "Table Editor" → you should see the `seeds` table

6. **Test again**:
   ```bash
   node scripts/test-supabase.js
   ```

After the table is created, your app will automatically save seeds to Supabase! 🎉
