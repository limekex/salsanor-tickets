# Test User Credentials

Test users are separated into two groups: regular participants and staff/admin users.

## Passwords

- **Participants**: `Test123!`
- **Staff/Admin**: `Admin123!`

## 👥 Participant Test Users

| Email | Password | Name | Status/Usage |
|-------|----------|------|-------------|
| alice@test.com | Test123! | Alice Anderson | ✅ 1 ACTIVE (Salsa Level 1) |
| bob@test.com | Test123! | Bob Builder | ✅ 2 ACTIVE (Salsa + Kizomba, multi-course discount) |
| charlie@test.com | Test123! | Charlie Chaplin | ✅ 1 ACTIVE (Bachata VIP - full capacity) |
| diana@test.com | Test123! | Diana Dancer | ✅ 1 ACTIVE (Bachata VIP - full capacity) |
| eve@test.com | Test123! | Eve Evans | ⏳ 1 WAITLIST (Bachata VIP - capacity full) |
| frank@test.com | Test123! | Frank Franklin | 📝 1 DRAFT (Kizomba - unpaid order) |

## 🔐 Staff & Admin Test Users

| Email | Password | Name | Role | Organization | Status |
|-------|----------|------|------|-------------|--------|
| admin@salsanor.no | Admin123! | Super Admin | **ADMIN** | Global (all orgs) | ⚠️ Needs Auth |
| orgadmin@salsanor.no | ? | Org Admin | **ORG_ADMIN** | SalsaNor Oslo | ✅ In Auth |
| finance@salsanor.no | ? | Finance Manager | **ORG_FINANCE** | SalsaNor Oslo | ✅ In Auth |
| checkin@salsanor.no | ? | Checkin Staff | **ORG_CHECKIN** | SalsaNor Oslo | ✅ In Auth |
| instructor@salsanor.no | ? | Dance Instructor | **INSTRUCTOR** | SalsaNor Oslo | ✅ In Auth |
| admin@bergensalsa.no | ? | Bergen Admin | **ORG_ADMIN** | Bergen Salsa Club | ✅ In Auth |

**Note:** Users marked with ✅ already exist in Supabase Auth. Users marked with ⚠️ exist only in PostgreSQL database and need to be created in Supabase Auth manually. Users with "?" password already have passwords set - you need to either know them or reset them via Dashboard.

### Role Descriptions

- **ADMIN**: Global administrator with access to all organizations and all features
- **ORG_ADMIN**: Organization administrator with full access to their organization
- **ORG_FINANCE**: Finance manager with access to payments, orders, and financial reports
- **ORG_CHECKIN**: Check-in staff with access to event check-in and attendance
- **INSTRUCTOR**: Instructor with access to course information and participant lists

## Current Situation (February 2026)

**Problem:** The automated script cannot update Supabase Auth due to "Legacy API keys are disabled" error, even though we're using JWT tokens.

**Status:** 
- ✅ All 12 test users exist in PostgreSQL database
- ✅ 5 of 6 staff users exist in Supabase Auth
- ⚠️ 0 of 6 participant users exist in Supabase Auth
- ⚠️ 1 staff user (admin@salsanor.no) missing in Supabase Auth

**Solution:** Create the 7 missing users manually via Supabase Dashboard (see instructions below).

## Creating Users in Supabase

The Prisma seed creates user records in the PostgreSQL database, but Supabase Auth manages the actual authentication. You need to create these users in both places:

### Option 1: Use the script (Recommended)

**Create new users:**
```bash
cd packages/database
pnpm tsx scripts/create-test-users.ts
```

**Update passwords for existing users:**
```bash
cd packages/database
pnpm tsx scripts/create-test-users.ts --update-passwords
```

This script will:
- Check if users already exist
- Create missing users with the correct email and password
- Mark emails as confirmed automatically
- Show warnings if UUIDs don't match
- Update passwords for existing users (with `--update-passwords` flag)

### Option 2: Manual creation via Supabase Dashboard

**Users still needing to be created (7 total):**

**Staff** (password: `Admin123!`):
- admin@salsanor.no

**Participants** (password: `Test123!`):
- alice@test.com
- bob@test.com
- charlie@test.com
- diana@test.com
- eve@test.com
- frank@test.com

**Instructions:**
1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/hiwzqklwecrquxtimgos
2. Navigate to **Authentication → Users**
3. Click **Add user**
4. Enter email and password (Test123! or Admin123!)
5. Check "Auto Confirm User"
6. Repeat for each user above

### Option 3: SQL (if you have direct database access)

```sql
-- This only works if you have direct access to Supabase's auth schema
-- Usually not recommended as Supabase manages this internally
```

## After Creation

Once the Supabase Auth users are created, they should automatically sync with the `UserAccount` table via the database trigger that was set up during Supabase initialization.

If sync issues occur, check:
1. The trigger exists: `handle_new_user_signup()`
2. The trigger is enabled on `auth.users`
3. The `supabaseUid` in `UserAccount` matches the Supabase Auth user ID

## Resetting Passwords

### ✅ NEW: Via Password Reset Flow (Recommended)

Since we now have a proper password reset page:

1. Go to **Authentication → Users** in Supabase Dashboard
2. Find the user
3. Click the three dots (⋮) → **"Send Password Reset"**
4. Click the link in the email (or get it from Supabase logs)
5. You'll be redirected to `/auth/update-password` page
6. Enter and confirm your new password
7. Done!

**Note:** Make sure the redirect URL is configured in Supabase (see [PASSWORD_RESET_FIX.md](PASSWORD_RESET_FIX.md) for setup instructions).

### Via Script (If API keys work):
```bash
cd packages/database
npx tsx scripts/create-test-users.ts --update-passwords
```

⚠️ Currently not working due to "Legacy API keys disabled" error.
   
**Note:** The dashboard doesn't have a direct "Set Password" option, which is why the script method is easier.

### Via API (for specific users):
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

await supabase.auth.admin.updateUserById(userId, {
  password: 'NewPassword123!'
})
```
