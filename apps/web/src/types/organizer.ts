/**
 * Organizer-related types
 */

/**
 * Core organizer data
 */
export interface Organizer {
  id: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  contactEmail: string | null
  contactPhone: string | null
  website: string | null
  city: string | null
  orgNumber: string | null
  vatRegistered: boolean
  mvaRate: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Organizer with counts (for listings)
 */
export interface OrganizerWithCounts extends Organizer {
  _count: {
    periods: number
    Event: number
    Membership: number
  }
}

/**
 * Minimal organizer data for display
 */
export interface OrganizerCard {
  id: string
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  city: string | null
}

/**
 * Platform fee configuration
 */
export interface PlatformFeeConfig {
  organizerId: string
  feePercentage: number
  fixedFeeCents: number
  enabled: boolean
}
