# Role Implementation: ADMIN (Global Admin)

## Role Overview
**Label:** Global Admin  
**Description:** Full system access across all organizations  
**Scope:** Global (all organizations)

## Current Access Permissions
- Manage all organizations
- Manage all users and roles
- Access all periods and courses
- View all financial data
- System configuration

## Implementation Checklist

### Product Management
- [x] **Course Periods & Tracks** - Multi-track course periods (6-8 weeks)
  - ✅ CoursePeriod model with tracks
  - ✅ Registration with role constraints (leader/follower/pair)
  - ✅ Capacity management and waitlists
  - ✅ Pricing engine with explainable discounts
- [x] **Membership System** - Standalone membership product
  - ✅ Database schema: Membership model with organizer relation
  - ✅ Support for annual renewals (autoRenew flag)
  - ✅ Status tracking (ACTIVE, EXPIRED, CANCELLED, PENDING_PAYMENT)
  - ✅ Order integration for purchases
  - ⬜ Admin UI for membership management
  - ⬜ CSV import functionality
  - ⬜ Auto-renewal processing (January 1st)
  - ⬜ Member discount integration in pricing engine
- [x] **Events System** - Standalone event products
  - ✅ Database schema: Event, EventRegistration, EventTicket models
  - ✅ Single and recurring event types
  - ✅ Event-specific capacity and pricing
  - ✅ Member pricing support
  - ✅ Order integration
  - ⬜ Admin UI for event management
  - ⬜ Public event browsing
  - ⬜ Event registration flow

### Core Functionality
- [x] Role exists in database schema (`UserRole.ADMIN`)
- [x] Dashboard displays role with permissions
- [x] Admin panel at `/admin` route implemented
- [x] Can view all organizations in system
- [x] Can switch between organizations (cookie-based context)

### User Management
- [x] View all users across all organizations
- [x] Assign any role to any user
- [x] Remove roles from users
- [x] Search users globally (via filter)
- [x] View user's complete role history

### Organization Management
- [x] Create new organizations
- [x] Edit organization details (name, slug, contact info)
- [x] View all organization settings
- [ ] Archive/deactivate organizations
- [x] View organization statistics

### Period & Course Management
- [x] View all periods across all organizations
- [x] Create/edit/delete periods for any organization
- [x] View all courses/tracks across all organizations
- [x] Create/edit/delete tracks for any organization
- [x] View all registrations globally

### Financial Management
- [x] View global financial reports
- [x] View revenue by organization
- [x] View revenue by period
- [x] Export financial data (CSV/Excel) with MVA breakdown
- [x] View payment provider statistics
- [x] View discount usage across organizations
- [x] Norwegian compliance: MVA tracking and reporting

### System Configuration
- [x] Add Global Options for Stripe Connect (commission %, kr etc...), and per organizer settings for Stripe Connect / webhooks
  - ✅ Database: PaymentConfig with `useStripeConnect`, `platformAccountId`, `platformFeePercent`, `platformFeeFixed`
  - ✅ Per-organizer: Embedded onboarding/management at `/staffadmin/settings/payments`
  - ✅ Webhook: `/api/webhooks/stripe` handles `account.updated` events
  - ✅ Live sync: Real-time status updates from Stripe API
  - ✅ Migration: `20251216170409_add_stripe_connect_to_payment_config`
  - ✅ Database fields: `stripeChargesEnabled`, `stripePayoutsEnabled` auto-synced
- [ ] Configure global settings (general system settings)
- [x] Configure payment providers (Stripe Connect implemented, Vipps pending)
- [ ] Configure email templates (drag and drop systems)
- [ ] View system logs
- [ ] Manage API keys

### Check-in Capabilities
- [ ] Access check-in portal for any organization
- [ ] View attendance reports globally
- [ ] Export attendance data

## Required Routes
- `/admin` - Main admin dashboard
- `/admin/organizations` - Organization management
- `/admin/users` - Global user management
- `/admin/periods` - All periods across organizations
- `/admin/tracks` - All tracks across organizations
- `/admin/registrations` - All registrations
- `/admin/finance` - Global financial reports
- `/admin/settings` - System configuration

## Required Server Actions
- `admin/organizations.ts` - Create, update, delete organizations
- `admin/users.ts` - Global user management
- `admin/periods.ts` - Cross-organization period management
- `admin/tracks.ts` - Cross-organization track management
- `admin/finance.ts` - Financial reporting
- `admin/settings.ts` - System configuration

## Required Components
- `GlobalAdminNav` - Navigation for global admin
- `OrganizationList` - List all organizations
- `GlobalUserSearch` - Search users across organizations
- `GlobalFinancialReport` - Financial dashboard
- `SystemSettings` - Configuration interface

## Access Control
- Check for `UserRole.ADMIN` in roles array
- No organization scoping required (global access)
- Can impersonate organization context for testing

## Priority
**HIGH** - Core administrative functionality needed for system management

## Dependencies
- Prisma schema with ADMIN role ✅
- Dashboard role display ✅
- Navigation structure (AdminNav exists ✅)
- Server action structure

## Notes
- ADMIN has unrestricted access to all features
- Should implement audit logging for admin actions
- Consider implementing 2FA for admin accounts
- Cookie-based organization context allows admins to "work as" specific organization
