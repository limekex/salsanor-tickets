/**
 * Event-related types
 * 
 * These types are derived from Prisma models but represent
 * the shape of data used in components and pages.
 */

import type { Category, Tag, Organizer } from '@salsanor/database'

/**
 * Event type from database
 */
export type EventType = 'SINGLE' | 'RECURRING'

/**
 * Core event data without relations
 */
export interface EventBase {
  id: string
  organizerId: string
  slug: string
  title: string
  shortDescription: string | null
  longDescription: string | null
  eventType: EventType
  startDateTime: Date
  endDateTime: Date | null
  timezone: string
  recurrenceRule: string | null
  recurrenceExceptions: string | null
  recurringUntil: Date | null
  locationName: string | null
  locationAddress: string | null
  city: string | null
  salesOpenAt: Date | null
  salesCloseAt: Date | null
  capacityTotal: number
  basePriceCents: number
  memberPriceCents: number | null
  imageUrl: string | null
  featured: boolean
  published: boolean
  metaTitle: string | null
  metaDescription: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Event with organizer relation
 */
export interface EventWithOrganizer extends EventBase {
  Organizer: Pick<Organizer, 'id' | 'name' | 'slug' | 'logoUrl'>
}

/**
 * Event with categories and tags
 */
export interface EventWithMeta extends EventBase {
  Category: Category[]
  Tag: Tag[]
}

/**
 * Full event data with all common relations
 */
export interface EventDetail extends EventBase {
  Organizer: Pick<Organizer, 'id' | 'name' | 'slug' | 'logoUrl' | 'contactEmail'>
  Category: Category[]
  Tag: Tag[]
  EventRegistration: Array<{
    id: string
    quantity: number
    status: string
  }>
}

/**
 * Event card display data (minimal for listings)
 */
export interface EventCardData {
  id: string
  slug: string
  title: string
  shortDescription: string | null
  startDateTime: Date
  endDateTime: Date | null
  locationName: string | null
  city: string | null
  basePriceCents: number
  memberPriceCents: number | null
  capacityTotal: number
  imageUrl: string | null
  featured: boolean
  Category: Pick<Category, 'id' | 'name' | 'slug' | 'icon'>[]
  Tag: Pick<Tag, 'id' | 'name' | 'color'>[]
  Organizer: Pick<Organizer, 'id' | 'name' | 'slug' | 'logoUrl'>
  // For capacity calculations
  EventRegistration: Array<{
    quantity: number
  }>
}

/**
 * Event registration status
 */
export type EventRegistrationStatus = 
  | 'PENDING'
  | 'ACTIVE'
  | 'CANCELLED'
  | 'REFUNDED'

/**
 * Event registration data
 */
export interface EventRegistration {
  id: string
  eventId: string
  orderId: string
  personId: string
  quantity: number
  status: EventRegistrationStatus
  createdAt: Date
  updatedAt: Date
}
