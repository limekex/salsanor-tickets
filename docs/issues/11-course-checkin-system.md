# Feature: Course Check-in System

## Overview
A robust check-in system for course tracks that enforces day-based restrictions, handles break periods, and provides comprehensive attendance statistics for both organizers and participants.

## Core Requirements

### 1. Day-Based Check-in Restriction
**Requirement:** Check-in should only be available on the day a track is scheduled.

- If a track runs on Mondays, participants can only check in on Mondays
- The system should validate the current day against the track's scheduled day(s)
- Display clear messaging when attempting check-in on wrong day
- Support tracks that run on multiple days (e.g., Monday & Wednesday)

**Implementation:**
```typescript
// Track should store scheduled days
interface CourseTrack {
  id: string
  name: string
  scheduledDays: DayOfWeek[] // ['MONDAY', 'WEDNESDAY']
  startTime: string // "19:00"
  endTime: string   // "21:00"
}

// Check-in validation
function canCheckIn(track: CourseTrack, date: Date): boolean {
  const dayOfWeek = getDayOfWeek(date)
  return track.scheduledDays.includes(dayOfWeek)
}
```

### 2. Single Check-in Per Day Per Track
**Requirement:** Allow only one check-in per day per track per participant, but permit weekly check-ins throughout the period.

- Prevent duplicate check-ins on the same day
- Allow check-in each week for the duration of the course period
- Clear feedback if participant already checked in today
- Show last check-in date/time

**Validation Rules:**
- Check if participant has existing check-in for this track on current date
- Block duplicate check-ins with user-friendly message
- Option for staff to override (with reason logged)

### 3. Break Periods / Holidays
**Requirement:** Support predefined break periods when check-in is not available.

**Types of Breaks:**
- **Public holidays** (automatically imported or manually defined)
- **Organizational breaks** (summer break, Christmas break, etc.)
- **Course-specific breaks** (instructor vacation, venue unavailable)
- **Single-day closures** (specific dates)

**Implementation:**
```typescript
interface BreakPeriod {
  id: string
  organizerId: string
  periodId?: string      // null = applies to all periods
  trackId?: string       // null = applies to all tracks
  name: string           // "Christmas Break", "Public Holiday"
  startDate: Date
  endDate: Date
  reason?: string
  isRecurring: boolean   // Annual holidays
  createdBy: string
  createdAt: Date
}
```

**Features:**
- [x] CRUD for break periods at organization level
- [x] CRUD for break periods at course period level
- [x] **Track-specific breaks** (NEW: breaks can apply to individual tracks)
- [ ] ~~Import Norwegian public holidays automatically~~ (removed from scope)
- [x] Break periods displayed on course detail page
- [ ] ~~Visual calendar showing active days vs. break days~~ (removed from scope)
- [ ] Bulk add breaks from template
- [ ] Clone breaks from previous period

### 4. Attendance Storage & Statistics
**Requirement:** Store all check-ins and provide comprehensive attendance statistics.

#### Data Model
```prisma
model Attendance {
  id               String       @id @default(cuid())
  registrationId   String
  registration     Registration @relation(fields: [registrationId], references: [id])
  trackId          String
  track            CourseTrack  @relation(fields: [trackId], references: [id])
  periodId         String
  period           EventPeriod  @relation(fields: [periodId], references: [id])
  
  sessionDate      DateTime     // The date of the class
  checkInTime      DateTime     // Actual check-in timestamp
  checkedInBy      String       // Staff user ID
  checkedInByUser  UserAccount  @relation(fields: [checkedInBy], references: [id])
  
  method           CheckInMethod // QR_SCAN, MANUAL, BULK
  deviceInfo       String?       // Browser/device for audit
  location         String?       // If GPS available
  
  cancelled        Boolean      @default(false)
  cancelledAt      DateTime?
  cancelledBy      String?
  cancelReason     String?
  
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
  
  @@unique([registrationId, trackId, sessionDate]) // Prevent duplicates
  @@index([trackId, sessionDate])
  @@index([periodId, sessionDate])
}

enum CheckInMethod {
  QR_SCAN
  MANUAL
  BULK_IMPORT
  SELF_CHECKIN
}
```

#### Internal Statistics (Organizer Dashboard)
- [x] **Per Session Stats**
  - Total expected participants
  - Actual check-ins
  - Attendance rate (%)
  - No-shows list
  - Late arrivals (if tracking time windows)
  
- [x] **Per Track Stats**
  - Average attendance rate
  - Trend over time (chart)
  - Most/least attended sessions
  - Dropout indicators (missed X consecutive sessions)
  
- [x] **Per Period Stats** (`/staffadmin/attendance/period/[periodId]`)
  - Overall attendance across all tracks
  - Comparison between tracks
  - Week-by-week breakdown with visual bars
  - [ ] Heat map of attendance by day/time (not implemented)
  
- [x] **Per Participant Stats** (internal view)
  - Total sessions attended / total available
  - Attendance percentage
  - Consecutive misses
  - Check-in history with timestamps

#### Participant Statistics (Participant Portal)
- [x] **My Attendance Dashboard**
  - Current attendance rate with visual indicator
  - Sessions attended this period
  - Remaining sessions in period
  - Next scheduled session
  - Check-in history list
  
- [ ] **Attendance Badge/Progress**
  - Visual progress bar
  - Achievement badges (e.g., "Perfect Attendance", "80%+ Attendance")
  - Streak counter (consecutive check-ins)
  
- [ ] **Calendar View**
  - Monthly view showing attended/missed/upcoming
  - Color-coded: green (attended), red (missed), gray (break), blue (upcoming)

## Additional Recommendations

### 5. Time Window for Check-in ✅ IMPLEMENTED
Consider adding configurable time windows:
- [x] **Early check-in:** Allow check-in X minutes before class starts
- [x] **Late check-in:** Allow check-in up to X minutes after class starts
- [x] **Auto-close:** Automatically close check-in after class ends
- Default: 30 min before to 30 min after start time

```typescript
interface CheckInWindow {
  trackId: string
  minutesBefore: number  // Default: 30
  minutesAfter: number   // Default: 30
  allowLateMarkup: boolean // Mark as "late" if after start
}
```

### 6. Self Check-in Option ✅ IMPLEMENTED
For trusted participants or specific scenarios:
- [x] Enable/disable per track or period
- [x] Geofencing (check-in only when at venue) - with configurable radius
- [x] QR code displayed at venue for self-scan
- [x] Phone number lookup for participants without QR codes
- [x] Auto-reset after check-in result (5 second countdown)
- [x] Dashboard self check-in widget (`/my` page with `allowDashboardCheckIn`)

### 7. Absence Management ✅ MOSTLY COMPLETE
- [x] Pre-registered absences (participant notifies in advance)
- [x] Absence reasons (illness, travel, etc.)
- [ ] Absence notifications to instructors

```prisma
model PlannedAbsence {
  id              String      @id @default(cuid())
  registrationId  String
  registration    Registration @relation(fields: [registrationId], references: [id])
  sessionDate     Date
  reason          String?
  notifiedAt      DateTime    @default(now())
}
```

**Implemented:**
- `PlannedAbsenceDialog` component for participants to register absences
- `createPlannedAbsence`, `deletePlannedAbsence`, `getPlannedAbsencesForRegistration` server actions
- Absences displayed in attendance stats and participant portal

### 8. Notifications & Reminders
- [x] Session reminder before class (configurable hours before) - **via Scheduled Tasks**
- [x] Missed session notification - **fully implemented in cron handler**
- [x] Low attendance warning (< X% attendance) - **via Scheduled Tasks**
- [x] Break period reminders (no class next week) - **via Scheduled Tasks**

**Implemented:**
- Full scheduled task administration system at `/staffadmin/tasks`
- Global cron management at `/admin/tasks` (platform admin)
- Email templates: `session-reminder`, `break-reminder`, `attendance-low-warning`, `missed-session`
- API endpoints: `/api/cron/run-all` (global), `/api/cron/run-task` (per-task)
- See [SCHEDULED_TASKS_SETUP.md](../SCHEDULED_TASKS_SETUP.md) for cron configuration
- See [SCHEDULED_TASKS_STAFFADMIN.md](../SCHEDULED_TASKS_STAFFADMIN.md) for UI guide

### 9. Instructor View
- [ ] Real-time attendance display for current session
- [ ] Quick view of expected participants
- [ ] Mark attendance from instructor app
- [ ] Notes per session (what was taught, special events)

### 10. Reports & Exports
- [x] Attendance report per period (CSV export)
- [x] Participant attendance certificates (PDF download)
- [ ] Tax documentation (for subsidized courses)
- [ ] API for external integrations

### 11. Historical Data & Analytics
- [ ] Compare attendance across periods
- [ ] Seasonal patterns (summer vs. winter)
- [ ] Day-of-week patterns
- [ ] Correlation with weather (Norwegian winters!)
- [ ] Retention analytics (registration vs. actual attendance)

### 12. Edge Cases to Handle
- [ ] Participant switches tracks mid-period
- [ ] Make-up sessions on different days
- [ ] Double sessions (special workshops)
- [ ] Trial/drop-in participants
- [ ] Instructor substitution logging
- [ ] Venue changes

## Database Schema Additions

### New Models Required
```prisma
model BreakPeriod {
  id            String       @id @default(cuid())
  organizerId   String
  organizer     Organizer    @relation(fields: [organizerId], references: [id])
  periodId      String?
  period        EventPeriod? @relation(fields: [periodId], references: [id])
  trackId       String?
  track         CourseTrack? @relation(fields: [trackId], references: [id])
  
  name          String
  description   String?
  startDate     DateTime
  endDate       DateTime
  breakType     BreakType
  isRecurring   Boolean      @default(false)
  
  createdBy     String
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  @@index([organizerId, startDate, endDate])
  @@index([periodId])
}

enum BreakType {
  PUBLIC_HOLIDAY
  ORGANIZATIONAL
  INSTRUCTOR_ABSENCE
  VENUE_UNAVAILABLE
  OTHER
}

model SessionNote {
  id            String      @id @default(cuid())
  trackId       String
  track         CourseTrack @relation(fields: [trackId], references: [id])
  sessionDate   DateTime
  note          String
  createdBy     String
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}
```

### CourseTrack Extensions
```prisma
model CourseTrack {
  // ... existing fields
  
  scheduledDays     DayOfWeek[]  // Days this track runs
  startTime         String       // "19:00"
  endTime           String       // "21:00"
  checkInWindowBefore Int        @default(30) // minutes
  checkInWindowAfter  Int        @default(30) // minutes
  allowSelfCheckIn    Boolean    @default(false)
  
  // Relations
  attendances       Attendance[]
  breakPeriods      BreakPeriod[]
  sessionNotes      SessionNote[]
}

enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}
```

## UI Components Needed

### Organizer Side
- [ ] `BreakPeriodManager` - CRUD for breaks with calendar view
- [ ] `AttendanceOverview` - Dashboard widget with key stats
- [ ] `AttendanceTable` - Detailed attendance grid (participants × sessions)
- [ ] `SessionCheckInPanel` - Real-time check-in for active session
- [ ] `AttendanceChart` - Trend visualization
- [ ] `NoShowList` - Participants who missed session
- [ ] `AttendanceExport` - Report generation dialog

### Participant Side
- [ ] `MyAttendanceCard` - Quick stats widget
- [ ] `AttendanceCalendar` - Visual monthly view
- [ ] `AttendanceHistory` - List of all check-ins
- [ ] `UpcomingSessions` - Next sessions with break indicators
- [ ] `AttendanceBadge` - Achievement/streak display

## API Endpoints / Server Actions

```typescript
// Check-in operations
checkIn(registrationId: string, trackId: string): Promise<Attendance>
undoCheckIn(attendanceId: string, reason: string): Promise<void>
bulkCheckIn(trackId: string, sessionDate: Date, registrationIds: string[]): Promise<Attendance[]>

// Validation
canCheckInToday(registrationId: string, trackId: string): Promise<CheckInValidation>
getCheckInWindow(trackId: string, date: Date): Promise<{ start: Date, end: Date, isOpen: boolean }>

// Break periods
createBreakPeriod(data: CreateBreakPeriodInput): Promise<BreakPeriod>
getBreakPeriods(organizerId: string, periodId?: string): Promise<BreakPeriod[]>
importPublicHolidays(organizerId: string, year: number, country: 'NO'): Promise<BreakPeriod[]>

// Statistics
getTrackAttendanceStats(trackId: string): Promise<TrackStats>
getPeriodAttendanceStats(periodId: string): Promise<PeriodStats>
getParticipantAttendance(registrationId: string): Promise<ParticipantStats>

// Reports
generateAttendanceReport(periodId: string, format: 'pdf' | 'xlsx'): Promise<Blob>
generateParticipantCertificate(registrationId: string): Promise<Blob>
```

## Implementation Priority

### Phase 1 - Core (Must Have) ✅ COMPLETE
1. ✅ Day-based check-in validation
2. ✅ Single check-in per day enforcement
3. ✅ Basic attendance storage
4. ✅ Simple attendance list view

### Phase 2 - Break Management ✅ COMPLETE
1. ✅ Break period CRUD
2. ~~Norwegian holiday import~~ (removed from scope)
3. ✅ Break periods displayed on course page
4. ✅ Break period validation in check-in
5. ✅ Track-specific breaks support

### Phase 3 - Statistics ✅ MOSTLY COMPLETE
1. ✅ Organizer attendance dashboard
2. ✅ Participant attendance view
3. ✅ Basic reports and exports (CSV + certificates)

### Phase 4 - Advanced Features ✅ MOSTLY COMPLETE
1. ✅ Self check-in (QR + phone lookup)
2. ✅ Time windows (configurable per track)
3. ✅ Notifications (full scheduled task system with session reminders, break reminders, low attendance warnings)
4. ❌ Advanced analytics
5. ✅ Attendance certificates
6. ✅ Absence management (PlannedAbsence model, dialog, server actions)
7. ✅ Scheduled task admin (`/staffadmin/tasks`, `/admin/tasks`)
8. ✅ Cron infrastructure (`/api/cron/run-all`, `/api/cron/run-task`)

### Remaining Work (Suggested Next Tasks)
1. **Per-period stats dashboard** - Overall attendance across all tracks in a period
2. **Attendance calendar view** - Monthly color-coded view for participants
3. **Advanced analytics** - Seasonal patterns, retention analytics
4. **Cron deployment** - Configure Vercel cron jobs (see SCHEDULED_TASKS_SETUP.md)

## Related Issues
- [04-ORG_CHECKIN-checkin-staff.md](04-ORG_CHECKIN-checkin-staff.md) - Check-in staff role
- [08-PARTICIPANT.md](08-PARTICIPANT.md) - Participant portal

## Notes
- Norwegian public holidays can be fetched from API or stored locally
- Consider GDPR implications for location-based check-in
- Attendance data should be exportable for accounting/subsidy purposes
- Mobile-first design for check-in interface
- Consider offline support for venues with poor connectivity
