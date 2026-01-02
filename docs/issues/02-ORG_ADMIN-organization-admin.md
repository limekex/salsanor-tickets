# Role Implementation: ORG_ADMIN (Organization Admin)

## Role Overview
**Label:** Organization Admin  
**Description:** Full administrative access within organization  
**Scope:** Organization-level (specific organizer)

## Current Access Permissions
- Manage organization users
- Create and manage periods
- Create and manage courses
- View registrations and reports
- Organization settings

## Implementation Checklist

### Core Functionality
- [x] Role exists in database schema (`UserRole.ORG_ADMIN`)
- [x] Dashboard displays role with permissions
- [x] Staff admin panel at `/staffadmin` route implemented
- [x] Layout with StaffAdminNav
- [x] Organization context scoping in all actions

### User Management
- [x] View users within organization
- [x] Assign organization roles (ORG_ADMIN, ORG_FINANCE, ORG_CHECKIN, INSTRUCTOR, STAFF)
- [x] Remove roles from users
- [x] Search users by email (`searchUserByEmailStaff`)
- [x] View user details page (`/staffadmin/users/[userId]`)
- [ ] Invite new users to organization
- [ ] Send role assignment emails

### Organization Management
- [x] Edit organization details (name, description, website, contactEmail, city)
- [x] View organization slug (read-only)
- [x] Settings form at `/staffadmin/settings`
- [ ] Upload organization logo
- [ ] Configure organization theme/branding
- [ ] Set default period settings

### Period Management
- [x] List all periods for organization (`/staffadmin/periods`)
- [x] Create new periods (`/staffadmin/periods/new`)
- [x] Edit period details (`/staffadmin/periods/[periodId]`)
- [x] View period tracks (`/staffadmin/periods/[periodId]/tracks`)
- [ ] Archive/deactivate periods
- [ ] Duplicate periods
- [ ] Export period data

### Track/Course Management
- [x] List tracks for period (`/staffadmin/periods/[periodId]/tracks`)
- [x] Create new tracks (`/staffadmin/tracks/new`)
- [x] Edit track details (`/staffadmin/tracks/[trackId]`)
- [x] StaffTrackForm component with full field support
- [x] Server actions (`staffadmin-tracks.ts`)
- [ ] Archive/deactivate tracks
- [ ] Duplicate tracks
- [ ] Bulk track operations

### Registration Management
- [ ] View all registrations for organization
- [ ] Filter registrations by period/track
- [ ] View registration details
- [ ] Export registration data (CSV/Excel)
- [ ] Approve/reject registrations
- [ ] Move registrations between tracks
- [ ] Manage waitlist

### Financial Reporting (Organization-scoped)
- [ ] View revenue reports for organization
- [ ] View revenue by period
- [ ] View revenue by track
- [ ] View payment status summary
- [ ] Export financial data
- [ ] View discount usage

### Check-in Management
- [ ] View attendance reports for organization
- [ ] Assign check-in staff
- [ ] Configure check-in settings

## Required Routes
- [x] `/staffadmin` - Main staff admin dashboard
- [x] `/staffadmin/periods` - Period list
- [x] `/staffadmin/periods/new` - Create period
- [x] `/staffadmin/periods/[periodId]` - Edit period
- [x] `/staffadmin/periods/[periodId]/tracks` - Track list
- [x] `/staffadmin/tracks/new` - Create track
- [x] `/staffadmin/tracks/[trackId]` - Edit track
- [x] `/staffadmin/users` - User list
- [x] `/staffadmin/users/[userId]` - User details
- [x] `/staffadmin/settings` - Organization settings
- [ ] `/staffadmin/registrations` - Registration list
- [ ] `/staffadmin/registrations/[regId]` - Registration details
- [ ] `/staffadmin/reports` - Reports dashboard
- [ ] `/staffadmin/reports/finance` - Financial reports
- [ ] `/staffadmin/reports/attendance` - Attendance reports

## Required Server Actions
- [x] `staffadmin.ts` - Core org management actions
  - [x] `updateOrganizerSettings` ✅
  - [x] `addUserRoleStaff` ✅
  - [x] `removeUserRoleStaff` ✅
  - [x] `searchUserByEmailStaff` ✅
- [x] `staffadmin-tracks.ts` - Track CRUD
  - [x] `createCourseTrackStaff` ✅
  - [x] `updateCourseTrackStaff` ✅
- [ ] `staffadmin-periods.ts` - Period management
- [ ] `staffadmin-registrations.ts` - Registration management
- [ ] `staffadmin-reports.ts` - Report generation
- [ ] `staffadmin-invites.ts` - User invitation system

## Required Components
- [x] `StaffAdminNav` - Navigation for org admin ✅
- [x] `StaffTrackForm` - Track create/edit form ✅
- [x] `StaffPeriodForm` - Period create/edit form ✅
- [x] `OrgSettingsForm` - Organization settings ✅
- [x] `StaffAddUserRoleDialog` - Role assignment ✅
- [x] `StaffRemoveRoleButton` - Role removal ✅
- [ ] `RegistrationTable` - Registration list
- [ ] `FinancialReport` - Financial dashboard
- [ ] `AttendanceReport` - Attendance dashboard
- [ ] `UserInviteDialog` - Invite users

## Access Control
- [x] Validate ORG_ADMIN role for specific organizerId
- [x] All server actions check user has ORG_ADMIN for target organization
- [x] Cannot access other organizations' data
- [x] Cannot assign global ADMIN role

## Priority
**HIGH** - Core organization management functionality, mostly complete

## Current Status
✅ **Phase 1 Complete**: Basic CRUD for periods, tracks, users, and settings  
🟡 **Phase 2 In Progress**: Registration management and reporting  
⬜ **Phase 3 Pending**: Advanced features (invites, bulk operations, branding)

## Dependencies
- Prisma schema with ORG_ADMIN role ✅
- Dashboard role display ✅
- StaffAdminNav component ✅
- Server actions with org scoping ✅

## Notes
- ORG_ADMIN has full autonomy within their organization
- Cannot access global admin features (`/admin`)
- Can assign roles except global ADMIN
- All forms validate ORG_ADMIN access before operations
- Organization context is determined by user's roles, not cookies
