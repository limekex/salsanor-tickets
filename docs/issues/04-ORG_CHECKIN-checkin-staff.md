# Role Implementation: ORG_CHECKIN (Check-in Staff)

## Role Overview
**Label:** Check-in Staff  
**Description:** Check-in and attendance management  
**Scope:** Organization-level (specific organizer)

## Current Access Permissions
- Scan QR codes at door
- Verify participant eligibility
- Log attendance per session
- View participant lists
- Check-in reports

## Implementation Checklist

### Core Functionality
- [x] Role exists in database schema (`UserRole.ORG_CHECKIN`)
- [x] Dashboard displays role with permissions
- [x] Check-in portal route exists (`/checkin`)
- [ ] Organization-specific check-in portal (`/checkin/[slug]`)
- [ ] Mobile-optimized check-in interface
- [ ] Link to check-in portal from dashboard

### QR Code Scanning
- [ ] QR code scanner component (camera access)
- [ ] Scan ticket QR codes
- [ ] Validate QR code format
- [ ] Verify ticket authenticity
- [ ] Real-time ticket validation
- [ ] Handle duplicate scans
- [ ] Offline scanning capability (PWA)

### Participant Verification
- [ ] Look up participant by QR code
- [ ] Look up participant by name
- [ ] Look up participant by email
- [ ] Display participant details
  - [ ] Name
  - [ ] Registration details
  - [ ] Track/course enrolled
  - [ ] Payment status
  - [ ] Attendance history
- [ ] Verify eligibility for current session
- [ ] Show warnings (unpaid, wrong track, etc.)

### Attendance Logging
- [ ] Mark attendance for session
- [ ] Select which session/class to check-in for
- [ ] Record timestamp of check-in
- [ ] Support multiple check-ins per period
- [ ] Undo check-in (if mistake)
- [ ] Bulk check-in (import list)
- [ ] Manual check-in (without QR code)

### Participant Lists
- [ ] View participants for current session
- [ ] View all participants for period
- [ ] Filter by track/course
- [ ] Filter by payment status
- [ ] Search participants
- [ ] See who's checked in (real-time)
- [ ] See who's expected but not arrived
- [ ] Export participant list

### Check-in Reports
- [ ] Attendance statistics per session
- [ ] Attendance trends over time
- [ ] No-show rates
- [ ] Peak attendance times
- [ ] Track-specific attendance
- [ ] Export attendance reports

### Session Management
- [ ] View today's sessions
- [ ] View upcoming sessions
- [ ] Select active session for check-in
- [ ] Session capacity monitoring
- [ ] Notify when session full

## Required Routes
- [x] `/checkin` - Check-in portal entry
- [ ] `/checkin/[slug]` - Organization check-in
- [ ] `/checkin/[slug]/scan` - QR scanner
- [ ] `/checkin/[slug]/manual` - Manual check-in
- [ ] `/checkin/[slug]/sessions` - Session selector
- [ ] `/checkin/[slug]/participants` - Participant list
- [ ] `/checkin/[slug]/reports` - Attendance reports

## Required Server Actions
- [ ] `checkin.ts` - Check-in operations
  - [ ] `validateTicket` - Verify QR code/ticket
  - [ ] `logAttendance` - Record check-in
  - [ ] `undoCheckIn` - Reverse check-in
  - [ ] `getSessionParticipants` - List for session
  - [ ] `searchParticipant` - Find by name/email
  - [ ] `getAttendanceStats` - Stats for session
  - [ ] `getTodaysSessions` - Sessions for today
  - [ ] `exportAttendance` - Export report

## Required Components
- [ ] `QRScanner` - Camera-based scanner
- [ ] `CheckInLayout` - Mobile-optimized layout
- [ ] `ParticipantCard` - Display participant info
- [ ] `SessionSelector` - Choose active session
- [ ] `ParticipantList` - List with check-in status
- [ ] `CheckInButton` - Confirm attendance
- [ ] `AttendanceStats` - Real-time statistics
- [ ] `ManualCheckInDialog` - Manual entry form

## Access Control
- [ ] Validate ORG_CHECKIN role for specific organizerId
- [ ] Can only check-in for their organization
- [ ] Can only view minimal participant data (name, registration)
- [ ] Cannot see full payment details
- [ ] Cannot modify registrations
- [ ] Cannot see financial information

## Technical Requirements
- [ ] QR code library (e.g., `react-qr-scanner`, `html5-qrcode`)
- [ ] Camera permissions handling
- [ ] PWA configuration for offline use
- [ ] Service worker for offline scanning
- [ ] Mobile-responsive design
- [ ] Touch-optimized controls
- [ ] Fast load times (< 2s)

## Integration Requirements
- [ ] Generate QR codes on tickets
  - [ ] Unique identifier per registration
  - [ ] Encrypted/signed data
  - [ ] Include period/track info
- [ ] Real-time sync for attendance
- [ ] WebSocket for live updates (optional)

## Priority
**HIGH** - Critical for event operations, needed before first course starts

## Dependencies
- Prisma schema with ORG_CHECKIN role ✅
- Dashboard role display ✅
- Registration system with ticket generation
- QR code generation on tickets
- Attendance tracking model in database

## Database Changes Needed
- [ ] Add `Attendance` model
  ```prisma
  model Attendance {
    id               String   @id @default(cuid())
    registrationId   String
    registration     Registration @relation(fields: [registrationId], references: [id])
    sessionDate      DateTime
    checkInTime      DateTime
    checkedInBy      String  // UserAccount ID
    trackId          String?
    track            CourseTrack? @relation(fields: [trackId], references: [id])
    createdAt        DateTime @default(now())
  }
  ```

## Notes
- Mobile-first design essential (used at door on phones/tablets)
- Consider offline mode for poor connectivity venues
- QR codes should be tamper-proof (signed)
- Fast scanning is critical (< 1 second per person)
- Should work in low-light conditions
- Consider sound/vibration feedback for successful scan
- Support for multiple check-in stations simultaneously
- Handle edge cases: no phone, damaged QR code, name not found
