# Role Implementation: STAFF

## Role Overview
**Label:** Staff  
**Description:** General staff access within organization  
**Scope:** Organization-level (specific organizer)

## Current Access Permissions
- View organization courses
- View basic reports
- Support registration desk
- Answer participant questions

## Implementation Checklist

### Core Functionality
- [x] Role exists in database schema (`UserRole.STAFF`)
- [x] Dashboard displays role with permissions
- [ ] Staff portal route implemented
- [ ] Organization context scoping
- [ ] Link to staff portal from dashboard

### Course Viewing
- [ ] View all courses/tracks for organization
- [ ] View course schedules
- [ ] View track details (time, location, level, capacity)
- [ ] Filter by period
- [ ] Filter by weekday
- [ ] Search courses
- [ ] View enrollment numbers

### Registration Support
- [ ] Look up registrations by name/email
- [ ] View registration status
- [ ] View payment status (basic info only)
- [ ] Answer common questions
- [ ] Redirect to appropriate staff for complex issues
- [ ] Help with registration process

### Basic Reports (Read-Only)
- [ ] View enrollment statistics
- [ ] View capacity/availability
- [ ] View waitlist status
- [ ] Track popularity
- [ ] Basic attendance overview
- [ ] Cannot see financial details

### Participant Support
- [ ] Search for participants
- [ ] View basic participant info
  - [ ] Name and contact
  - [ ] Enrolled tracks
  - [ ] Registration status
- [ ] Cannot modify participant data
- [ ] Cannot see payment details
- [ ] Help answer questions

### Information Access
- [ ] View organization information
- [ ] View upcoming events/periods
- [ ] View FAQs (if system has them)
- [ ] View staff resources
- [ ] View contact information for other roles

## Required Routes
- [ ] `/staff` - Staff portal home
- [ ] `/staff/courses` - Course list
- [ ] `/staff/courses/[trackId]` - Course details
- [ ] `/staff/lookup` - Participant lookup
- [ ] `/staff/reports` - Basic reports
- [ ] `/staff/help` - Staff resources

## Required Server Actions
- [ ] `staff.ts` - Staff operations
  - [ ] `getOrganizationCourses` - List courses
  - [ ] `getCourseDetails` - Track details
  - [ ] `lookupParticipant` - Search participant
  - [ ] `getBasicStats` - Enrollment stats
  - [ ] `getAvailability` - Capacity info
  - [ ] `getOrganizationInfo` - Org details

## Required Components
- [ ] `StaffDashboard` - Main staff portal
- [ ] `CourseList` - Course listing
- [ ] `CourseDetailsCard` - Course information
- [ ] `ParticipantLookup` - Search interface
- [ ] `BasicStats` - Simple statistics
- [ ] `AvailabilityDisplay` - Capacity status

## Access Control
- [ ] Validate STAFF role for specific organizerId
- [ ] Read-only access to most data
- [ ] Cannot see financial information
- [ ] Cannot see full participant details
- [ ] Cannot modify any data
- [ ] Cannot access admin functions
- [ ] Minimal personal data access (GDPR)

## Use Cases
1. **Front Desk**: Answer questions about courses and schedules
2. **Registration Support**: Help people during registration events
3. **General Support**: Direct people to right person for specific issues
4. **Event Support**: Answer questions at social events
5. **Phone Support**: Basic information when people call

## Priority
**LOW** - Nice to have for support staff, not critical for core operations

## Dependencies
- Prisma schema with STAFF role ✅
- Dashboard role display ✅
- Course/track system functional
- Registration system functional
- Search functionality

## Relationship to Other Roles
- Less access than ORG_ADMIN, ORG_FINANCE, ORG_CHECKIN
- More access than regular PARTICIPANT
- Cannot perform any modifications
- Primarily for information lookup and basic support

## User Experience Considerations
- [ ] Fast search/lookup (staff need quick answers)
- [ ] Mobile-friendly (may use at registration desk on tablet)
- [ ] Simple, uncluttered interface
- [ ] Clear "I don't have access to that" messages
- [ ] Easy escalation path (contact info for other roles)

## Privacy & Security
- [ ] Minimum necessary data access (GDPR)
- [ ] No financial information
- [ ] No sensitive participant data
- [ ] Audit log for lookups (optional)
- [ ] Cannot export data
- [ ] Cannot send messages to participants

## Notes
- This is a "least privilege" role for general helpers
- Should have clear help documentation
- Consider a knowledge base/FAQ system
- May want chat/escalation to ORG_ADMIN or other roles
- Could be used for volunteers at events
- Should be quick to grant/revoke (easy onboarding)
- Consider if this role needs any write access (probably not)
- Main purpose: information lookup without granting admin access
