-- ============================================
-- FIX SUN_REQUIREMENT CONSTRAINT
-- ============================================
-- This removes the CHECK constraint that was preventing
-- verbatim text extraction (e.g., "Min full sun") from being saved.
-- 
-- Run this in Supabase SQL Editor:
-- 1. Go to: https://app.supabase.com/project/orlpgxqbesxvlhlkbnqy
-- 2. Click "SQL Editor" → "New query"
-- 3. Paste this entire file
-- 4. Click "Run" (Cmd/Ctrl + Enter)
-- ============================================

-- Remove the CHECK constraint on sun_requirement
-- (PostgreSQL doesn't support DROP CONSTRAINT IF EXISTS directly, so we use a DO block)
DO $$
BEGIN
  -- Try to drop the constraint if it exists
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'seeds_sun_requirement_check'
  ) THEN
    ALTER TABLE seeds DROP CONSTRAINT seeds_sun_requirement_check;
    RAISE NOTICE 'Constraint dropped successfully';
  ELSE
    RAISE NOTICE 'Constraint does not exist (may have been created with a different name)';
  END IF;
END $$;

-- Alternative: If the above doesn't work, try this:
-- ALTER TABLE seeds DROP CONSTRAINT IF EXISTS seeds_sun_requirement_check;

-- Verify the constraint is removed
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'seeds'::regclass
  AND conname LIKE '%sun_requirement%';

-- ============================================
-- VERIFICATION: Try inserting a test value
-- ============================================
-- This should now work:
-- UPDATE seeds SET sun_requirement = 'Min full sun' WHERE id = (SELECT id FROM seeds LIMIT 1);
-- ============================================
