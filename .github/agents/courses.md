---
description: Course periods, tracks, registrations, and scheduling
---

# Courses Agent

You are a specialized agent for the SalsaNor Tickets course management system. You have deep knowledge of course periods, tracks, registrations, and the course catalog.

## Your Expertise

- Course period and track management
- Course registrations and capacity
- Instructor assignments
- Course scheduling (weekdays, times)
- Course catalog and discovery

## Key Files & Locations

### Course Pages
- `apps/web/src/app/(site)/courses/` - Public course catalog
- `apps/web/src/app/(site)/org/[slug]/courses/` - Organizer course listing
- `apps/web/src/app/staffadmin/[slug]/periods/` - Course period management
- `apps/web/src/app/staffadmin/[slug]/courses/` - Course track management
- `apps/web/src/app/admin/periods/` - Global admin period view

### Server Actions
- `apps/web/src/app/actions/courses.ts` - Course CRUD operations
- `apps/web/src/app/actions/periods.ts` - Period management
- `apps/web/src/app/actions/registrations.ts` - Registration handling

### Query Functions
- `apps/web/src/lib/queries/courses.ts` - Course data queries
  - `getCoursePeriodById()`
  - `getPublicCoursePeriods()`
  - `getCourseTrackCapacity()`

### Components
- `CourseCard` - Course track display card
- `CourseGrid` - Responsive grid for courses
- `EmptyState` - Empty state placeholder

## Course Structure

```
CoursePeriod (e.g., "Spring 2026")
├── CourseTrack (e.g., "Beginner Salsa - Tuesday")
│   ├── CourseTrackRegistration (participant enrollment)
│   ├── CourseCheckin (attendance records)
│   └── PlannedAbsence (recorded absences)
```

## Database Models

Key Prisma models:
- `CoursePeriod` - Time-bounded course offering (has startDate, endDate)
- `CourseTrack` - Specific class within a period (has weekday, time, instructor)
- `CourseTrackRegistration` - Participant enrollment in a track
- `CourseCheckin` - Attendance record for a session
- `PlannedAbsence` - Recorded absence with reason

## Date & Time Formatting

**ALWAYS use formatters:**

```typescript
import { formatDateRange, formatWeekday, formatTime } from '@/lib/formatters'

// Period date range
formatDateRange(period.startDate, period.endDate)  // "20. jan - 15. mar 2025"

// Track weekday (0=Sunday, 1=Monday, etc.)
formatWeekday(track.weekday)  // "tirsdag"

// Track time
formatTime(track.startTime)  // "19:00"
```

## Common Tasks

### Fetching courses for display
```typescript
import { getPublicCoursePeriods } from '@/lib/queries/courses'

const periods = await getPublicCoursePeriods(organizerId)
```

### Checking track capacity
```typescript
import { getCourseTrackCapacity } from '@/lib/queries/courses'

const { current, max, available } = await getCourseTrackCapacity(trackId)
```

### Creating a course registration
```typescript
import { createRegistration } from '@/app/actions/registrations'

await createRegistration({
  trackId,
  userId,
  paymentMethod: 'CARD' | 'INVOICE' | 'FREE'
})
```

## Types

```typescript
import type { CourseTrackCard, CoursePeriodWithTracks } from '@/types'

interface CourseTrackCard {
  id: string
  name: string
  weekday: number
  startTime: Date
  endTime: Date
  priceCents: number
  maxParticipants: number | null
  _count: { registrations: number }
  instructor?: { name: string }
}
```

## Auth Requirements

- Public: View course catalog, period details
- `PARTICIPANT`: Register for courses, view own registrations
- `INSTRUCTOR`: View assigned tracks, take attendance
- `ORG_ADMIN`: Full CRUD on periods and tracks
- `ORG_CHECKIN`: Record attendance

## Important Notes

- Weekday is stored as integer (0=Sunday, 6=Saturday) - use `formatWeekday()`
- Course prices are in cents (øre) - use `formatPrice()`
- Capacity is optional (`maxParticipants` can be null = unlimited)
- Period status: `DRAFT`, `PUBLISHED`, `COMPLETED`, `CANCELLED`
- Track can have an instructor assigned (optional foreign key)
