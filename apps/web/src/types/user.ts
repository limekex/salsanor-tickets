/**
 * User and profile-related types
 */

/**
 * User role enum
 */
export type UserRole = 
  | 'ADMIN'
  | 'ORG_ADMIN'
  | 'ORG_FINANCE'
  | 'ORG_CHECKIN'
  | 'INSTRUCTOR'
  | 'STAFF'
  | 'PARTICIPANT'

/**
 * User account data
 */
export interface UserAccount {
  id: string
  email: string
  createdAt: Date
  updatedAt: Date
}

/**
 * User role assignment
 */
export interface UserRoleAssignment {
  userId: string
  role: UserRole
  organizerId: string | null
  assignedAt: Date
}

/**
 * User account with roles
 */
export interface UserAccountWithRoles extends UserAccount {
  roles: UserRoleAssignment[]
}

/**
 * Person profile (participant data)
 */
export interface PersonProfile {
  id: string
  userId: string
  firstName: string
  lastName: string
  phone: string | null
  dateOfBirth: Date | null
  photoUrl: string | null
  emergencyContact: string | null
  memberNumber: string | null
  organizerId: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Full profile data
 */
export interface UserProfile {
  account: UserAccount
  profile: PersonProfile | null
  roles: UserRoleAssignment[]
}

/**
 * Membership data
 */
export interface Membership {
  id: string
  userId: string
  organizerId: string
  tierId: string
  memberNumber: string
  validFrom: Date
  validUntil: Date
  status: MembershipStatus
  verified: boolean
  verifiedAt: Date | null
  verifiedBy: string | null
  photoUrl: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Membership status
 */
export type MembershipStatus = 
  | 'ACTIVE'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'PENDING_VERIFICATION'

/**
 * Membership with tier info
 */
export interface MembershipWithTier extends Membership {
  MembershipTier: {
    id: string
    name: string
    priority: number
  }
}
