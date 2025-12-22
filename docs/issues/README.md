# Role Implementation Issues - Overview

This directory contains detailed implementation issues for each role in the SalsaNor Tickets system.

## Role Hierarchy

```
ADMIN (Global)
├── All organizations
├── All users
└── System configuration

Organization-Scoped Roles:
├── ORG_ADMIN
│   ├── Organization management
│   ├── User & role management
│   ├── Period & track management
│   └── Full organization control
├── ORG_FINANCE
│   ├── Financial reports
│   ├── Payment monitoring
│   └── Invoice management
├── ORG_CHECKIN
│   ├── QR scanning
│   ├── Attendance logging
│   └── Check-in reports
├── INSTRUCTOR
│   ├── Assigned tracks
│   ├── Participant lists
│   └── Attendance marking
└── STAFF
    ├── Course viewing
    ├── Basic reports
    └── Information lookup

CHECKIN (Global)
└── Check-in across all organizations

PARTICIPANT
└── Personal data & tickets
```

## Implementation Priority

### HIGH Priority
1. **ADMIN** - Core system administration
2. **ORG_ADMIN** - Organization autonomy (mostly complete ✅)
3. **PARTICIPANT** - Core user experience (partially complete)
4. **ORG_CHECKIN** - Critical for event operations

### MEDIUM Priority
5. **INSTRUCTOR** - Important for course operations
6. **ORG_FINANCE** - Financial transparency and reporting

### LOW Priority
7. **STAFF** - Nice to have for support
8. **CHECKIN** - Advanced multi-org feature

## Current Implementation Status

### ✅ Fully Implemented
- **ORG_ADMIN**: Period, track, user, and settings management
  - Staff admin panel at `/staffadmin`
  - CRUD for periods and tracks
  - Role assignment/removal
  - Organization settings editing

### 🟡 Partially Implemented
- **PARTICIPANT**: Profile and registration viewing
  - Profile page exists
  - Can view registrations
  - Ticket QR codes available
  - Missing: profile editing, cancellation, attendance history

### ⬜ Not Implemented
- **ADMIN**: Global administration
- **ORG_FINANCE**: Financial reporting
- **ORG_CHECKIN**: Check-in system
- **INSTRUCTOR**: Teaching portal
- **STAFF**: Support portal
- **CHECKIN**: Global check-in

## Files in This Directory

1. `01-ADMIN-global-admin.md` - Global administrator implementation
2. `02-ORG_ADMIN-organization-admin.md` - Organization admin (mostly complete)
3. `03-ORG_FINANCE-finance-manager.md` - Financial reporting role
4. `04-ORG_CHECKIN-checkin-staff.md` - Check-in system
5. `05-INSTRUCTOR.md` - Instructor portal
6. `06-CHECKIN-global-checkin.md` - Global check-in role
7. `07-STAFF-general-staff.md` - General staff portal
8. `08-PARTICIPANT.md` - Participant experience

## How to Use These Issues

Each file contains:
- **Role Overview**: Description and scope
- **Current Access Permissions**: What the role should do
- **Implementation Checklist**: Detailed task list
- **Required Routes**: URL structure needed
- **Required Server Actions**: Backend functions
- **Required Components**: UI components
- **Access Control**: Security requirements
- **Priority**: Implementation urgency
- **Dependencies**: What's needed first
- **Notes**: Additional context

## Next Steps

1. Review each issue file
2. Create GitHub issues from these documents
3. Prioritize based on HIGH/MEDIUM/LOW markers
4. Implement in order of priority
5. Update checklist items as completed
6. Cross-reference with dashboard role definitions

## Related Files

- `/apps/web/src/app/(site)/dashboard/page.tsx` - Role definitions and permissions
- `/packages/database/prisma/schema.prisma` - UserRole enum
- `/apps/web/src/app/(site)/(staffadmin)/` - ORG_ADMIN implementation
- `/apps/web/src/app/actions/staffadmin*.ts` - Organization-scoped actions

## Notes

- All roles except ADMIN and CHECKIN are organization-scoped
- PARTICIPANT role may be assigned automatically on first registration
- ORG_ADMIN should be able to operate without needing ADMIN intervention
- Each role has specific access control requirements
- Consider GDPR and privacy for all participant data access
- Mobile experience critical for PARTICIPANT, ORG_CHECKIN, and INSTRUCTOR
