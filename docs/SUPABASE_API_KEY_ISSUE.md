# Supabase API Key Issue: "Legacy API keys are disabled"

## Problem

When trying to run the `create-test-users.ts` script, you get the error:
```
❌ Failed to list users: Legacy API keys are disabled
```

## Cause

Your Supabase project has been migrated/upgraded and the old API key format is no longer supported. This is a Supabase platform change.

## Solutions

### Option 1: Get New API Keys from Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **Settings → API**
3. Look for the new API keys:
   - `anon` / `public` key
   - `service_role` key (this is what the script needs)
4. Copy the new `service_role` key
5. Update `/Users/bjorn-torealmas/Documents/GIT/SalsaNor Tickets/apps/web/.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY="<new service role key>"
   ```
6. Run the script again

### Option 2: Manual Password Update via Dashboard

Since the script can't run, you can manually update passwords:

1. Go to **Authentication → Users** in Supabase Dashboard
2. For each user, click the three dots → **Reset Password**
3. This will send a password reset email (if email is configured)
4. OR you can use the SQL Editor to update passwords directly:

```sql
-- Run this in Supabase SQL Editor
-- Note: You need to hash passwords properly using pgcrypto

-- For participants (password: Test123!)
-- For staff (password: Admin123!)

-- This is NOT recommended without proper hashing
-- Better to use the Dashboard's "Reset Password" feature
```

### Option 3: Check if Users Already Exist with Correct Passwords

If you seeded the database before and the users were created, they might already have the correct passwords. Try logging in:

**Participants:**
- alice@test.com / Test123!
- bob@test.com / Test123!
- charlie@test.com / Test123!
- diana@test.com / Test123!
- eve@test.com / Test123!
- frank@test.com / Test123!

**Staff:**
- admin@salsanor.no / Admin123!
- orgadmin@salsanor.no / Admin123!
- finance@salsanor.no / Admin123!
- checkin@salsanor.no / Admin123!
- instructor@salsanor.no / Admin123!
- admin@bergensalsa.no / Admin123!

### Option 4: Use Supabase CLI

If you have the Supabase CLI installed:

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref hiwzqklwecrquxtimgos

# Use CLI to manage users
supabase db reset # This will reseed everything
```

## Recommended Action

1. **First, try logging in** with the credentials above to see if users already exist
2. If login fails, **get new API keys** from the dashboard (Option 1)
3. Update `.env.local` and run the script again

## Future Prevention

- Keep API keys up to date when Supabase notifies about migrations
- Consider using Supabase CLI for local development
- Document API key rotation process
