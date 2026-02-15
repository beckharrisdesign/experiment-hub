# Supabase Auth Setup

Auth is now integrated. Follow these steps to complete setup.

## 1. Run the migration

Add `user_id` to the seeds table and enable RLS:

1. Go to [Supabase SQL Editor](https://app.supabase.com/project/orlpgxqbesxvlhlkbnqy/sql)
2. Open `scripts/add-user-id-migration.sql` and copy its contents
3. Paste into a new query and run

## 2. (Optional) Disable email confirmation for testing

By default Supabase may require users to confirm their email before signing in.

To disable for easier local testing:

1. Go to **Authentication** → **Providers** → **Email**
2. Turn off **Confirm email**
3. Save

You can re-enable this for production.

## 3. Test the flow

1. Restart the dev server: `npm run dev`
2. Open http://localhost:3009
3. You should see the **Sign in** screen
4. Click **Sign up** to create an account
5. Sign in with your new account
6. Add seeds – they will be scoped to your user

## What's implemented

- **Sign up** – Email + password
- **Sign in** – Email + password
- **Sign out** – Via profile menu in header
- **RLS** – Each user only sees their own seeds
- **Auto user_id** – New seeds are automatically linked to the signed-in user
