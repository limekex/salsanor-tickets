import { prisma } from '@/lib/db'

/**
 * Query functions for Organizer data fetching
 * These are pure data access functions - no business logic or auth checks
 */

/**
 * Get organizer by ID
 */
export async function getOrganizerById(id: string) {
  return await prisma.organizer.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          Event: true,
          CoursePeriod: true,
          UserAccountRole: true,
        }
      }
    }
  })
}

/**
 * Get organizer by slug
 */
export async function getOrganizerBySlug(slug: string) {
  return await prisma.organizer.findUnique({
    where: { slug },
    include: {
      _count: {
        select: {
          Event: true,
          CoursePeriod: true,
        }
      }
    }
  })
}

/**
 * Get organizer with full content (for public page)
 */
export async function getOrganizerWithContent(slug: string) {
  return await prisma.organizer.findUnique({
    where: { slug },
    include: {
      Event: {
        where: {
          published: true,
          startDateTime: { gte: new Date() }
        },
        orderBy: { startDateTime: 'asc' },
        take: 6,
        include: {
          Category: {
            select: {
              id: true,
              name: true,
              icon: true,
            }
          },
          _count: {
            select: {
              EventRegistration: true,
            }
          }
        }
      },
      CoursePeriod: {
        where: {
          salesOpenAt: { lte: new Date() },
          salesCloseAt: { gte: new Date() },
        },
        orderBy: { startDate: 'asc' },
        take: 6,
      },
      _count: {
        select: {
          Event: true,
          CoursePeriod: true,
        }
      }
    }
  })
}

/**
 * Get all active organizers (for public listing)
 */
export async function getActiveOrganizers() {
  return await prisma.organizer.findMany({
    where: {
      OR: [
        {
          Event: {
            some: {
              published: true,
              startDateTime: { gte: new Date() }
            }
          }
        },
        {
          CoursePeriod: {
            some: {
              salesOpenAt: { lte: new Date() },
              salesCloseAt: { gte: new Date() },
            }
          }
        }
      ]
    },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: {
          Event: {
            where: {
              published: true,
              startDateTime: { gte: new Date() }
            }
          },
          CoursePeriod: {
            where: {
              salesOpenAt: { lte: new Date() },
              salesCloseAt: { gte: new Date() },
            }
          }
        }
      }
    }
  })
}

/**
 * Get organizers where user has a role
 */
export async function getUserOrganizers(userId: string) {
  return await prisma.organizer.findMany({
    where: {
      UserAccountRole: {
        some: {
          userId: userId
        }
      }
    },
    orderBy: { name: 'asc' },
    include: {
      UserAccountRole: {
        where: {
          userId: userId
        },
        select: {
          role: true,
        }
      },
      _count: {
        select: {
          Event: true,
          CoursePeriod: true,
        }
      }
    }
  })
}

/**
 * Check if organizer slug is available
 */
export async function isOrganizerSlugAvailable(slug: string, excludeId?: string) {
  const existing = await prisma.organizer.findFirst({
    where: { 
      slug,
      ...(excludeId && { id: { not: excludeId } })
    },
    select: { id: true }
  })
  
  return !existing
}

/**
 * Get organizer statistics
 */
export async function getOrganizerStats(organizerId: string) {
  const [
    totalEvents,
    upcomingEvents,
    totalRegistrations,
    activeCourses,
  ] = await Promise.all([
    prisma.event.count({
      where: { organizerId }
    }),
    prisma.event.count({
      where: {
        organizerId,
        published: true,
        startDateTime: { gte: new Date() }
      }
    }),
    prisma.eventRegistration.count({
      where: {
        Event: { organizerId }
      }
    }),
    prisma.coursePeriod.count({
      where: {
        organizerId,
        salesOpenAt: { lte: new Date() },
        salesCloseAt: { gte: new Date() },
      }
    })
  ])

  return {
    totalEvents,
    upcomingEvents,
    totalRegistrations,
    activeCourses,
  }
}
