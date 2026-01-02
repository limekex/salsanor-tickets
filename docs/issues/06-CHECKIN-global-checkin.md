# Role Implementation: CHECKIN (Global Check-in)

## Role Overview
**Label:** Global Check-in  
**Description:** Check-in access across all organizations  
**Scope:** Global (all organizations)

## Current Access Permissions
- Check-in at any organization
- Scan QR codes globally
- View all participant lists
- Cross-organization attendance

## Implementation Checklist

### Core Functionality
- [x] Role exists in database schema (`UserRole.CHECKIN`)
- [x] Dashboard displays role with permissions
- [ ] Global check-in portal implemented
- [ ] Organization selector
- [ ] Multi-organization session view

### Global Check-in Capabilities
- [ ] Select any organization to check-in for
- [ ] Quick organization switching
- [ ] View all organizations in system
- [ ] Recently accessed organizations
- [ ] Favorite/pin organizations

### QR Code Scanning (Cross-Organization)
- [ ] Scan any ticket QR code
- [ ] Automatic organization detection from QR code
- [ ] Validate tickets for any organization
- [ ] Handle cross-organization scenarios
- [ ] Scan tickets for multiple events simultaneously

### Multi-Organization View
- [ ] View sessions across all organizations
- [ ] Filter by organization
- [ ] Filter by date
- [ ] View today's sessions globally
- [ ] Quick session switching

### Participant Management (Global)
- [ ] Search participants across all organizations
- [ ] View participant details (any org)
- [ ] See registration details
- [ ] View attendance history (cross-org)
- [ ] Export participant data by organization

### Attendance Logging (Global)
- [ ] Mark attendance for any organization
- [ ] Support multiple concurrent events
- [ ] Cross-organization attendance tracking
- [ ] Undo check-in for any organization
- [ ] Bulk operations across organizations

### Reporting (Global)
- [ ] Attendance statistics per organization
- [ ] Global attendance overview
- [ ] Compare attendance across organizations
- [ ] Export global reports
- [ ] Organization-specific exports

## Required Routes
- [ ] `/checkin/global` - Global check-in hub
- [ ] `/checkin/global/organizations` - Organization selector
- [ ] `/checkin/global/scan` - Universal scanner
- [ ] `/checkin/global/sessions` - All sessions view
- [ ] `/checkin/global/reports` - Global reports

## Required Server Actions
- [ ] `global-checkin.ts` - Global check-in operations
  - [ ] `validateTicketGlobal` - Verify any ticket
  - [ ] `logAttendanceGlobal` - Check-in for any org
  - [ ] `getAllOrganizations` - List all orgs
  - [ ] `getGlobalSessions` - All sessions today
  - [ ] `searchParticipantGlobal` - Cross-org search
  - [ ] `getGlobalAttendanceStats` - Global stats
  - [ ] `exportAttendanceByOrg` - Export per org

## Required Components
- [ ] `GlobalCheckInDashboard` - Multi-org overview
- [ ] `OrganizationSelector` - Choose organization
- [ ] `GlobalQRScanner` - Universal scanner
- [ ] `GlobalSessionList` - All sessions
- [ ] `GlobalParticipantSearch` - Cross-org search
- [ ] `OrganizationSwitcher` - Quick switching
- [ ] `GlobalAttendanceStats` - Statistics dashboard

## Access Control
- [ ] Validate CHECKIN global role
- [ ] Can access any organization's check-in
- [ ] Can view minimal participant data globally
- [ ] Cannot modify registrations
- [ ] Cannot see financial information
- [ ] Cannot see full user profiles
- [ ] Read-only access to organization settings

## Use Cases
1. **Event Organizer**: Works with multiple salsa organizations, needs to check-in at different venues
2. **Freelance Check-in Staff**: Hired by multiple organizations for events
3. **Regional Coordinator**: Oversees check-in across multiple dance schools
4. **Backup Staff**: Can help any organization that needs check-in support

## Priority
**LOW** - Nice to have for organizations that share staff, not critical for MVP

## Dependencies
- Prisma schema with CHECKIN role ✅
- Dashboard role display ✅
- ORG_CHECKIN implementation (reuse components)
- QR code validation system
- Multi-organization data access patterns

## Relationship to ORG_CHECKIN
- CHECKIN is essentially ORG_CHECKIN but for all organizations
- Should reuse most ORG_CHECKIN components
- Main difference: organization selection/switching
- May want to create shared check-in components used by both

## Technical Considerations
- [ ] Efficient organization switching (no page reload)
- [ ] Cache recently accessed organizations
- [ ] Optimize for large number of organizations
- [ ] Consider organization search/filter
- [ ] Handle timezone differences for global events

## Notes
- This role is for advanced users who work across organizations
- Consider whether this role should also grant ORG_CHECKIN automatically
- May want to limit which organizations a CHECKIN user can access (whitelist)
- Could be useful for SalsaNor staff who support multiple schools
- Lower priority than org-specific roles
- Consider if this should be separate from ADMIN (admins already have global access)
