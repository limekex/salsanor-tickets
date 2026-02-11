import { prisma } from '@/lib/db'
import type { UserRole } from '@prisma/client'

/**
 * Query functions for User data fetching
 * These are pure data access functions - no business logic or auth checks
 */

/**
 * Get user account by ID with full details
 */
export async function getUserAccountById(id: string) {
  return await prisma.userAccount.findUnique({
    where: { id },
    include: {
      UserAccountRole: {
        include: {
          Organizer: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          }
        }
      },
      PersonProfile: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          city: true,
          postalCode: true,
          streetAddress: true,
        }
      }
    }
  })
}

/**
 * Get user account by auth ID (supabaseUid)
 */
export async function getUserAccountByAuthId(authId: string) {
  return await prisma.userAccount.findFirst({
    where: { supabaseUid: authId },
    include: {
      UserAccountRole: {
        include: {
          Organizer: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          }
        }
      },
      PersonProfile: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          city: true,
          postalCode: true,
          streetAddress: true,
        }
      }
    }
  })
}

/**
 * Get user account by email
 */
export async function getUserAccountByEmail(email: string) {
  return await prisma.userAccount.findFirst({
    where: { email },
    include: {
      PersonProfile: {
        select: {
          firstName: true,
          lastName: true,
        }
      }
    }
  })
}

/**
 * Get user roles
 */
export async function getUserRoles(userId: string) {
  return await prisma.userAccountRole.findMany({
    where: { userId: userId },
    include: {
      Organizer: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      }
    }
  })
}

/**
 * Get user roles for specific organizer
 */
export async function getUserOrganizerRoles(userId: string, organizerId: string) {
  return await prisma.userAccountRole.findMany({
    where: {
      userId: userId,
      organizerId: organizerId,
    },
    select: {
      role: true,
    }
  })
}

/**
 * Check if user has any role in organizer
 */
export async function hasOrganizerAccess(userId: string, organizerId: string): Promise<boolean> {
  const count = await prisma.userAccountRole.count({
    where: {
      userId: userId,
      organizerId: organizerId,
    }
  })
  
  return count > 0
}

/**
 * Check if user has specific role globally
 */
export async function hasGlobalRole(userId: string, role: UserRole): Promise<boolean> {
  const count = await prisma.userAccountRole.count({
    where: {
      userId: userId,
      organizerId: null,
      role: role,
    }
  })
  
  return count > 0
}

/**
 * Check if user has specific role in organizer
 */
export async function hasOrganizerRole(userId: string, organizerId: string, role: UserRole): Promise<boolean> {
  const count = await prisma.userAccountRole.count({
    where: {
      userId: userId,
      organizerId: organizerId,
      role: role,
    }
  })
  
  return count > 0
}

/**
 * Get user's person profile
 */
export async function getUserPersonProfile(userId: string) {
  return await prisma.personProfile.findFirst({
    where: { userId: userId }
  })
}

/**
 * Get user's event registrations
 */
export async function getUserEventRegistrations(personId: string, options?: {
  upcoming?: boolean
  limit?: number
}) {
  return await prisma.eventRegistration.findMany({
    where: {
      personId: personId,
      ...(options?.upcoming && {
        Event: {
          startDateTime: { gte: new Date() }
        }
      })
    },
    orderBy: {
      Event: {
        startDateTime: options?.upcoming ? 'asc' : 'desc'
      }
    },
    take: options?.limit,
    include: {
      Event: {
        include: {
          Organizer: {
            select: {
              name: true,
              slug: true,
            }
          },
          Category: {
            select: {
              name: true,
              icon: true,
            }
          }
        }
      }
    }
  })
}

/**
 * Get user's course registrations
 */
export async function getUserCourseRegistrations(personId: string, options?: {
  active?: boolean
  limit?: number
}) {
  return await prisma.registration.findMany({
    where: {
      personId: personId,
      ...(options?.active && {
        CourseTrack: {
          CoursePeriod: {
            endDate: { gte: new Date() }
          }
        }
      })
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: options?.limit,
    include: {
      CourseTrack: {
        include: {
          CoursePeriod: {
            include: {
              Organizer: {
                select: {
                  name: true,
                  slug: true,
                }
              }
            }
          }
        }
      }
    }
  })
}

/**
 * Check if email is already registered
 */
export async function isEmailRegistered(email: string): Promise<boolean> {
  const count = await prisma.userAccount.count({
    where: { email }
  })
  
  return count > 0
}
