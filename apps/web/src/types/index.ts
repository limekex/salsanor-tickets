/**
 * Centralized type exports
 * 
 * Import types from this file for consistency across the app
 * 
 * @example
 * import type { EventCardData, CourseTrackWithCapacity } from '@/types'
 */

// Event types
export type {
  EventType,
  EventBase,
  EventWithOrganizer,
  EventWithMeta,
  EventDetail,
  EventCardData,
  EventRegistrationStatus,
  EventRegistration,
} from './event'

// Course types
export type {
  CoursePeriod,
  CoursePeriodWithOrganizer,
  CoursePeriodWithTracks,
  CourseRole,
  CourseTrack,
  CourseTrackWithCapacity,
  CourseTrackCard,
  CourseTrackDetail,
  RegistrationStatus,
  CourseRegistration,
  CourseRegistrationWithTrack,
  Weekday,
  TimeRange,
} from './course'

// Organizer types
export type {
  Organizer,
  OrganizerWithCounts,
  OrganizerCard,
  PlatformFeeConfig,
} from './organizer'

// User types
export type {
  UserRole,
  UserAccount,
  UserRoleAssignment,
  UserAccountWithRoles,
  PersonProfile,
  UserProfile,
  Membership,
  MembershipStatus,
  MembershipWithTier,
} from './user'

// Order types
export type {
  OrderStatus,
  PaymentStatus,
  PaymentProvider,
  Order,
  OrderWithItems,
  Payment,
  OrderWithPayments,
  CartItemType,
  CourseCartItem,
  EventCartItem,
  MembershipCartItem,
  CartItem,
  PricingBreakdown,
} from './order'
