# Supabase Setup Guide

This app uses Supabase for database storage. Follow these steps to set it up:

## 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Project name: `simple-seed-organizer` (or your choice)
   - Database password: (save this securely)
   - Region: Choose closest to you
5. Click "Create new project"

## 2. Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** (under "Project URL")
   - **Publishable key** (under "API Keys" → "Publishable key" - format: `sb_publishable_...`)
     - If you only see "anon public" key, that's the legacy format and will still work

## 3. Update Environment Variables

Add these to your `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
```

**Note:** The code also supports the legacy variable name `NEXT_PUBLIC_SUPABASE_ANON_KEY` for backwards compatibility, but `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is preferred (modern approach).

Replace `your-project-url-here` and `your-publishable-key-here` with the values from step 2.

## 4. Create the Database Table

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the contents of `supabase/migrations/001_create_seeds_table.sql`
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. You should see "Success. No rows returned"

## 5. Verify Setup

1. Restart your Next.js dev server
2. Try adding a seed - it should save to Supabase
3. Check the Supabase dashboard → **Table Editor** → `seeds` to see your data

## Fallback Behavior

If Supabase credentials are not configured, the app will automatically fall back to localStorage. This allows you to develop locally without Supabase if needed.

## Troubleshooting

- **"Supabase credentials not found"** warning: Make sure your `.env.local` has the correct variable names (they must start with `NEXT_PUBLIC_`)
- **"relation 'seeds' does not exist"**: Run the SQL migration from step 4
- **RLS (Row Level Security) errors**: The migration sets up a permissive policy. If you need to restrict access later, update the policy in Supabase dashboard → **Authentication** → **Policies**
