# User Registration and Onboarding Flow

## Overview
The registration and onboarding system ensures that all new users complete their profile before accessing the platform.

## Registration Flow

### 1. Sign Up
**Location**: `/auth/login?tab=signup`

**Process**:
1. User enters email and password
2. Supabase Auth creates authentication account
3. Database trigger creates `UserAccount` record with `supabaseUid` and `email`
4. User is redirected to `/onboarding`

**Database Trigger** (`handle_new_user`):
```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public."UserAccount" ("supabaseUid", email)
  values (new.id, new.email);
  return new;
end;
$$;
```

### 2. Onboarding
**Location**: `/onboarding`

**Purpose**: Collect required profile information
- First Name (required)
- Last Name (required)
- Phone Number (optional)

**Process**:
1. User lands on onboarding page
2. Email is pre-filled from UserAccount
3. User enters profile information
4. `PersonProfile` record is created and linked to `UserAccount`
5. User is redirected to home page

**Access Control**:
- Only accessible to authenticated users without PersonProfile
- Users with complete profiles are automatically redirected to home
- Middleware enforces this on every navigation

## Middleware Protection

**Location**: `/src/middleware.ts`

**Behavior**:
1. **For authenticated users without PersonProfile**:
   - Automatically redirected to `/onboarding`
   - Cannot access any other page except `/auth/*`
   
2. **For authenticated users with PersonProfile**:
   - Full access to all pages
   - If they try to visit `/onboarding`, redirected to home

3. **For unauthenticated users**:
   - Normal access to public pages
   - Protected pages redirect to login

## Email Confirmation Flow

If email confirmation is enabled in Supabase:

1. User signs up
2. Receives confirmation email
3. Clicks confirmation link
4. Redirected to `/auth/callback` with code
5. Code is exchanged for session
6. **If no PersonProfile**: Redirect to `/onboarding`
7. **If PersonProfile exists**: Redirect to home or `next` param

**Callback Route**: `/auth/callback/route.ts`

## Server Actions

### `checkOnboardingStatus()`
**Purpose**: Check if current user needs onboarding

**Returns**:
```typescript
{
    needsOnboarding: boolean
    userAccount: UserAccount | null
}
```

**Logic**:
- Returns `true` if user exists but has no PersonProfile
- Creates UserAccount if missing (fallback for trigger failures)
- Returns `false` if not authenticated or profile is complete

### `completeOnboarding(formData: FormData)`
**Purpose**: Complete user profile setup

**Parameters**:
- `firstName`: string (required)
- `lastName`: string (required)
- `phone`: string (optional)

**Process**:
1. Validates authentication
2. Finds UserAccount by supabaseUid
3. Creates PersonProfile with provided data
4. Links PersonProfile to UserAccount

**Returns**:
```typescript
{ success: true } | { error: string }
```

## Database Schema

### UserAccount
```prisma
model UserAccount {
  id            String   @id @default(cuid())
  supabaseUid   String   @unique
  email         String   @unique
  createdAt     DateTime @default(now())
  roles         UserAccountRole[]
  personProfile PersonProfile?
}
```

### PersonProfile
```prisma
model PersonProfile {
  id        String   @id @default(cuid())
  userId    String   @unique
  email     String
  firstName String
  lastName  String
  phone     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      UserAccount @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## UI Components

### OnboardingForm
**Type**: Client Component
**Location**: `/app/(site)/onboarding/onboarding-form.tsx`

**Features**:
- Pre-filled email field (disabled)
- Form validation
- Loading states
- Error handling
- Automatic redirect on success

**Styling**: 
- Uses shadcn/ui components (Card, Input, Label, Button)
- Responsive design
- Centered layout with max-width

## User Experience

### New User Journey:
1. 📝 Visit `/auth/login?tab=signup`
2. ✉️ Enter email and password
3. 🔐 Account created in Supabase
4. ➡️ Automatically redirected to `/onboarding`
5. 👤 Fill in name and phone
6. ✅ Submit form
7. 🎉 Redirected to home page
8. 🚀 Full access to platform

### Returning User:
1. 🔑 Login at `/auth/login`
2. ✅ Already has PersonProfile
3. 🏠 Direct access to home
4. ✨ No onboarding needed

### User with Email Confirmation:
1. 📝 Sign up
2. 📧 Receive confirmation email
3. 🔗 Click link
4. ✅ Account confirmed
5. ➡️ Redirected to `/onboarding`
6. 👤 Complete profile
7. 🎉 Access granted

## Security

### Authentication Required
- All onboarding actions require authentication
- Supabase session validation on every request
- No anonymous access to onboarding

### Data Validation
- Server-side validation of all inputs
- Required fields enforced
- Email uniqueness guaranteed by database constraint
- Phone number optional but validated if provided

### Access Control
- Middleware enforces profile completion
- Users cannot bypass onboarding
- Direct URL access to onboarding protected
- Completed profiles cannot revisit onboarding

## Error Handling

### Possible Errors:
1. **Not authenticated**: User logged out during onboarding
2. **User account not found**: Trigger failed to create UserAccount
3. **Database error**: Network or database issues
4. **Validation error**: Missing required fields

### Error Display:
- Inline error messages in form
- Red error box with descriptive text
- Form remains editable for corrections
- No automatic retry to prevent spam

## Testing Checklist

- [ ] New user can sign up
- [ ] Trigger creates UserAccount
- [ ] User redirected to onboarding
- [ ] Onboarding form displays correctly
- [ ] Email is pre-filled
- [ ] First name validation works
- [ ] Last name validation works
- [ ] Phone is optional
- [ ] Submit creates PersonProfile
- [ ] User redirected to home after submission
- [ ] User cannot access main app without profile
- [ ] User with profile cannot access onboarding
- [ ] Email confirmation flow works
- [ ] Middleware redirects properly
- [ ] Error messages display correctly

## Future Enhancements

1. **Additional Profile Fields**:
   - Date of birth
   - Address
   - Emergency contact
   - Dance experience level

2. **Profile Pictures**:
   - Upload avatar during onboarding
   - Supabase Storage integration

3. **Terms and Conditions**:
   - Checkbox for T&C acceptance
   - Privacy policy agreement

4. **Skip Phone Number**:
   - "Skip for now" button
   - Reminder to add phone later

5. **Progress Indicator**:
   - Multi-step onboarding
   - Show completion progress

6. **Welcome Email**:
   - Send welcome email after profile completion
   - Include getting started guide

7. **Profile Edit**:
   - Allow users to edit profile later
   - Profile page with edit form

8. **Social Login**:
   - Google OAuth
   - Facebook OAuth
   - Still require profile completion

## Troubleshooting

### User stuck on onboarding:
1. Check if PersonProfile was created in database
2. Verify UserAccount exists with correct supabaseUid
3. Check browser console for errors
4. Verify middleware is running

### Trigger not creating UserAccount:
1. Run `deploy-trigger.js` script
2. Check Supabase database for trigger
3. Verify trigger function exists
4. Check database logs

### Middleware not redirecting:
1. Check middleware matcher config
2. Verify Prisma connection
3. Check server logs
4. Clear browser cache and cookies
