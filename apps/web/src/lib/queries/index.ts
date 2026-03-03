/**
 * Central export for all query functions
 * 
 * Query functions are pure data access - no business logic or auth checks
 * Use these in server actions after performing necessary validation
 */

// Event queries
export {
  getEventById,
  getEventBySlug,
  getEventsByOrganizer,
  getUpcomingEvents,
  getPastEvents,
  getFeaturedEvents,
  isEventSlugAvailable,
  getEventRegistrationCount,
  getEventCapacity,
} from './events'

// Organizer queries
export {
  getOrganizerById,
  getOrganizerBySlug,
  getOrganizerWithContent,
  getActiveOrganizers,
  getUserOrganizers,
  isOrganizerSlugAvailable,
  getOrganizerStats,
} from './organizers'

// User queries
export {
  getUserAccountById,
  getUserAccountByAuthId,
  getUserAccountByEmail,
  getUserRoles,
  getUserOrganizerRoles,
  hasOrganizerAccess,
  hasGlobalRole,
  hasOrganizerRole,
  getUserPersonProfile,
  getUserEventRegistrations,
  getUserCourseRegistrations,
  isEmailRegistered,
} from './users'

// Course queries
export {
  getCoursePeriodById,
  getCoursePeriodBySlug,
  getPublicCoursePeriods,
  getCoursePeriodsByOrganizer,
  getCourseTrackById,
  getCourseTrackByIdOrSlug,
  getAvailableCourseLevels,
  getCourseTrackCapacity,
  isCoursePeriodSlugAvailable,
} from './courses'

export type { CourseFilters } from './courses'
