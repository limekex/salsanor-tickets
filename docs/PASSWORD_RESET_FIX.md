# Password Reset Fix Guide

## Problem
Password reset emails from Supabase redirect to the homepage with an error:
```
http://localhost:3000/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
```

## Solution
Created a dedicated password reset page and updated the auth flow.

## Files Created/Modified

1. **Created:** `/apps/web/src/app/(site)/auth/update-password/page.tsx`
   - New page for users to set their new password after clicking reset link
   - Validates password strength and confirmation
   - Auto-redirects to home after successful update

2. **Modified:** `/apps/web/src/app/(site)/auth/callback/route.ts`
   - Added detection for `type=recovery` parameter
   - Redirects password reset flows to `/auth/update-password`

## Required Supabase Configuration

You need to configure the redirect URL in Supabase Dashboard:

### Step 1: Update Redirect URLs

1. Go to your Supabase project: https://supabase.com/dashboard/project/hiwzqklwecrquxtimgos
2. Navigate to **Authentication → URL Configuration**
3. Add the following to **Redirect URLs**:

   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/update-password
   https://your-production-domain.com/auth/callback
   https://your-production-domain.com/auth/update-password
   ```

4. Click **Save**

### Step 2: Update Email Templates (Optional but Recommended)

1. Go to **Authentication → Email Templates**
2. Select **Reset Password / Magic Link**
3. Update the confirmation link to use the callback route:

   **Current:**
   ```
   {{ .ConfirmationURL }}
   ```

   **Change to:**
   ```
   {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password
   ```

   Or keep it as is if Supabase handles it automatically.

## How It Works Now

1. User clicks "Send Password Reset" in Supabase Dashboard
2. Supabase sends email with reset link: `https://xxx.supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=http://localhost:3000/auth/callback`
3. Supabase verifies token and redirects to `/auth/callback?code=xxx&type=recovery`
4. Callback route detects `type=recovery` and redirects to `/auth/update-password`
5. User enters new password on `/auth/update-password` page
6. Password is updated via `supabase.auth.updateUser({ password })`
7. User is redirected to homepage

## Testing

1. Go to Supabase Dashboard → Authentication → Users
2. Find a test user (e.g., `alice@test.com`)
3. Click three dots → "Send Password Reset"
4. Check the email inbox for the reset link
5. Click the link - should now redirect to `/auth/update-password` page
6. Enter and confirm new password
7. Should see success message and redirect to home

## Alternative: Manual Password Reset via Dashboard

Since we still have the "Legacy API keys disabled" issue, you can also:

1. Go to Authentication → Users
2. Click the user
3. Use SQL Editor to update password directly (advanced)
4. Or use the Supabase CLI:
   ```bash
   supabase auth users update <user-id> --password "NewPassword123!"
   ```

## For Development Testing

If you don't have email configured in development, you can:

1. Check Supabase logs for the reset link
2. Or use the Console/Terminal output (if logging is enabled)
3. Manually construct the callback URL:
   ```
   http://localhost:3000/auth/callback?code=<exchange-code>&type=recovery
   ```

## Production Checklist

Before deploying to production:

- [ ] Add production domain to Supabase Redirect URLs
- [ ] Update email template if needed
- [ ] Test password reset flow on staging
- [ ] Ensure email service is configured (SMTP or Supabase built-in)
- [ ] Test with real email addresses
