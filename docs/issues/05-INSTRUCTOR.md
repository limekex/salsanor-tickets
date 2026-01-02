# Role Implementation: INSTRUCTOR

## Role Overview
**Label:** Instructor  
**Description:** Teaching and course management access  
**Scope:** Organization-level with track assignment

## Current Access Permissions
- View assigned courses
- View participant lists
- Mark attendance
- View course schedules
- Contact participants

## Implementation Checklist

### Core Functionality
- [x] Role exists in database schema (`UserRole.INSTRUCTOR`)
- [x] Dashboard displays role with permissions
- [ ] Instructor portal route implemented
- [ ] Track assignment system
- [ ] Link to instructor portal from dashboard

### Course Assignment
- [ ] View courses/tracks assigned to instructor
- [ ] Database relation: Instructor → CourseTrack
- [ ] Support for multiple track assignments
- [ ] View upcoming sessions
- [ ] View past sessions
- [ ] Calendar view of teaching schedule

### Participant Management
- [ ] View participant list for assigned tracks
- [ ] Filter participants by track
- [ ] Filter by attendance status
- [ ] Search participants by name/email
- [ ] View participant details
  - [ ] Name and contact info
  - [ ] Partner role (leader/follower)
  - [ ] Attendance history
  - [ ] Notes/comments
- [ ] Export participant list

### Attendance Tracking
- [ ] Mark attendance for sessions
- [ ] Select session date
- [ ] Bulk attendance marking
- [ ] Mark present/absent/excused
- [ ] View attendance percentage per participant
- [ ] Generate attendance reports
- [ ] Late arrival tracking

### Schedule Management
- [ ] View teaching schedule
- [ ] Calendar integration
- [ ] Session reminders
- [ ] View session details
  - [ ] Time and location
  - [ ] Expected participants
  - [ ] Track level
- [ ] Export schedule (iCal)

### Communication
- [ ] Send messages to track participants
- [ ] Email all participants
- [ ] Email selected participants
- [ ] Message templates (welcome, reminder, etc.)
- [ ] View message history
- [ ] In-app notifications

### Course Materials
- [ ] Upload course materials (optional)
- [ ] Share links with participants
- [ ] Syllabus management
- [ ] Playlist/music sharing

## Required Routes
- [ ] `/instructor` - Main instructor dashboard
- [ ] `/instructor/courses` - My courses overview
- [ ] `/instructor/courses/[trackId]` - Course details
- [ ] `/instructor/courses/[trackId]/participants` - Participant list
- [ ] `/instructor/courses/[trackId]/attendance` - Attendance tracking
- [ ] `/instructor/schedule` - Teaching schedule
- [ ] `/instructor/messages` - Communication center

## Required Server Actions
- [ ] `instructor.ts` - Instructor operations
  - [ ] `getAssignedTracks` - Get instructor's tracks
  - [ ] `getTrackParticipants` - Participants for track
  - [ ] `markAttendance` - Record attendance
  - [ ] `getAttendanceHistory` - View attendance
  - [ ] `sendMessageToParticipants` - Email participants
  - [ ] `exportParticipantList` - Export data
  - [ ] `getTeachingSchedule` - Get schedule

## Required Components
- [ ] `InstructorDashboard` - Main overview
- [ ] `TrackCard` - Display assigned tracks
- [ ] `ParticipantTable` - Participant list
- [ ] `AttendanceSheet` - Mark attendance
- [ ] `ScheduleCalendar` - Teaching calendar
- [ ] `MessageDialog` - Send messages
- [ ] `ParticipantDetails` - Individual details

## Database Changes Needed
- [ ] Add instructor relation to CourseTrack
  ```prisma
  model CourseTrack {
    // ... existing fields
    instructorIds    String[]  // Array of UserAccount IDs
    instructors      UserAccount[] @relation("TrackInstructors")
  }
  
  model UserAccount {
    // ... existing fields
    instructingTracks CourseTrack[] @relation("TrackInstructors")
  }
  ```
- [ ] Add attendance tracking (if not covered by ORG_CHECKIN)
- [ ] Add notes field to Registration
  ```prisma
  model Registration {
    // ... existing fields
    instructorNotes  String?  // Private notes from instructor
  }
  ```

## Access Control
- [ ] Validate INSTRUCTOR role for organization
- [ ] Can only view tracks they are assigned to
- [ ] Can only see participants in their tracks
- [ ] Cannot see payment details
- [ ] Cannot modify registrations
- [ ] Cannot see financial information
- [ ] Can only send messages to their track participants

## Priority
**MEDIUM-HIGH** - Important for instructor workflow, needed before courses start

## Dependencies
- Prisma schema with INSTRUCTOR role ✅
- Dashboard role display ✅
- Registration system complete
- Track assignment system
- Communication/email system

## Integration Requirements
- [ ] Email service for participant communication
- [ ] Calendar format export (iCal)
- [ ] Attendance system (may overlap with ORG_CHECKIN)

## User Experience Considerations
- [ ] Mobile-friendly (instructors may access on phone)
- [ ] Quick attendance marking (during/after class)
- [ ] Easy participant lookup
- [ ] Print-friendly participant lists
- [ ] Offline attendance marking capability

## Notes
- Instructors need quick access during class time
- Should be able to add notes about individual participants
- Consider leader/follower balance visibility
- May need substitute instructor functionality
- Consider co-teaching scenarios (multiple instructors per track)
- Privacy: instructors should only see their own track participants
- Attendance marking should be different from door check-in (ORG_CHECKIN handles arrival, INSTRUCTOR handles class attendance)
