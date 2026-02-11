/**
 * Course-related types
 * 
 * Types for course periods, tracks, and registrations
 */

import type { Category, Tag, Organizer } from '@salsanor/database'

/**
 * Course period (tidsperiode) - 6-8 week course round
 */
export interface CoursePeriod {
  id: string
  code: string
  name: string
  city: string
  locationName: string | null
  startDate: Date
  endDate: Date
  salesOpenAt: Date
  salesCloseAt: Date
  timezone: string
  organizerId: string
  description: string | null
  featured: boolean
  imageUrl: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Course period with organizer relation
 */
export interface CoursePeriodWithOrganizer extends CoursePeriod {
  Organizer: Pick<Organizer, 'id' | 'name' | 'slug' | 'logoUrl'>
}

/**
 * Course period with tracks for listings
 */
export interface CoursePeriodWithTracks extends CoursePeriodWithOrganizer {
  CourseTrack: CourseTrackCard[]
  Category?: Category[]
  Tag?: Tag[]
}

/**
 * Role type for course registration
 */
export type CourseRole = 'LEADER' | 'FOLLOWER' | 'ANY'

/**
 * Course track (individual course within a period)
 */
export interface CourseTrack {
  id: string
  periodId: string
  title: string
  description: string | null
  weekday: number // 1-7 (Monday-Sunday)
  timeStart: string // "19:00"
  timeEnd: string // "20:30"
  levelLabel: string | null
  roleMode: CourseRole
  capacityTotal: number
  capacityLeader: number
  capacityFollower: number
  priceSingleCents: number
  pricePairCents: number | null
  memberPriceSingleCents: number | null
  memberPricePairCents: number | null
  requiresPartner: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Track with registration counts
 */
export interface CourseTrackWithCapacity extends CourseTrack {
  _count?: {
    Registration: number
  }
  registeredCount?: number
  spotsAvailable?: number
}

/**
 * Minimal track data for cards
 */
export interface CourseTrackCard {
  id: string
  title: string
  weekday: number
  timeStart: string
  timeEnd: string
  levelLabel: string | null
  capacityTotal: number
  priceSingleCents: number
  pricePairCents: number | null
}

/**
 * Track detail with period info
 */
export interface CourseTrackDetail extends CourseTrack {
  CoursePeriod: CoursePeriodWithOrganizer
  Registration: Array<{
    id: string
    status: RegistrationStatus
  }>
}

/**
 * Registration status for courses
 */
export type RegistrationStatus = 
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'WAITLIST'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'COMPLETED'

/**
 * Course registration data
 */
export interface CourseRegistration {
  id: string
  trackId: string
  orderId: string
  personId: string
  chosenRole: CourseRole
  hasPartner: boolean
  partnerEmail: string | null
  status: RegistrationStatus
  waitlistPosition: number | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Registration with track info
 */
export interface CourseRegistrationWithTrack extends CourseRegistration {
  CourseTrack: {
    id: string
    title: string
    CoursePeriod: {
      id: string
      name: string
      Organizer: Pick<Organizer, 'id' | 'name' | 'slug'>
    }
  }
}

/**
 * Weekday helper type
 */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

/**
 * Time range for filtering
 */
export interface TimeRange {
  start: string // "18:00"
  end: string   // "22:00"
}
