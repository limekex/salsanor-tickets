import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

/**
 * Query functions for Event data fetching
 * These are pure data access functions - no business logic or auth checks
 */

/**
 * Get a single event by ID with full details
 */
export async function getEventById(id: string) {
  return await prisma.event.findUnique({
    where: { id },
    include: {
      Organizer: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      },
      Category: {
        select: {
          id: true,
          name: true,
          icon: true,
          slug: true,
        }
      },
      Tag: {
        select: {
          id: true,
          name: true,
          color: true,
        }
      },
      _count: {
        select: {
          EventRegistration: true,
          EventSession: true,
        }
      }
    }
  })
}

/**
 * Get event by slug (for public pages)
 */
export async function getEventBySlug(slug: string) {
  return await prisma.event.findFirst({
    where: { slug },
    include: {
      Organizer: {
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
        }
      },
      Category: {
        select: {
          id: true,
          name: true,
          icon: true,
          slug: true,
        }
      },
      Tag: {
        select: {
          id: true,
          name: true,
          color: true,
        }
      },
      _count: {
        select: {
          EventRegistration: true,
        }
      }
    }
  })
}

/**
 * Get all events for an organizer
 */
export async function getEventsByOrganizer(organizerId: string) {
  return await prisma.event.findMany({
    where: { organizerId },
    orderBy: { startDateTime: 'desc' },
    include: {
      Organizer: {
        select: {
          slug: true,
          name: true,
        }
      },
      _count: {
        select: {
          EventRegistration: true,
          EventSession: true,
        }
      },
      Category: {
        select: {
          id: true,
          name: true,
          icon: true,
        }
      },
      Tag: {
        select: {
          id: true,
          name: true,
          color: true,
        }
      }
    }
  })
}

/**
 * Get upcoming published events (for public listing)
 */
export async function getUpcomingEvents(options?: {
  organizerId?: string
  categoryId?: string
  limit?: number
  featured?: boolean
}) {
  const where: Prisma.EventWhereInput = {
    published: true,
    startDateTime: { gte: new Date() },
    ...(options?.organizerId && { organizerId: options.organizerId }),
    ...(options?.categoryId && { 
      Category: {
        some: { id: options.categoryId }
      }
    }),
    ...(options?.featured !== undefined && { featured: options.featured }),
  }

  return await prisma.event.findMany({
    where,
    orderBy: { startDateTime: 'asc' },
    take: options?.limit,
    include: {
      Organizer: {
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
        }
      },
      Category: {
        select: {
          id: true,
          name: true,
          icon: true,
          slug: true,
        }
      },
      Tag: {
        select: {
          id: true,
          name: true,
          color: true,
        }
      },
      _count: {
        select: {
          EventRegistration: true,
        }
      }
    }
  })
}

/**
 * Get past events (for archives)
 */
export async function getPastEvents(options?: {
  organizerId?: string
  limit?: number
}) {
  const where: Prisma.EventWhereInput = {
    published: true,
    startDateTime: { lt: new Date() },
    ...(options?.organizerId && { organizerId: options.organizerId }),
  }

  return await prisma.event.findMany({
    where,
    orderBy: { startDateTime: 'desc' },
    take: options?.limit,
    include: {
      Organizer: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      },
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
  })
}

/**
 * Get featured events (for homepage)
 */
export async function getFeaturedEvents(limit: number = 6) {
  return getUpcomingEvents({ featured: true, limit })
}

/**
 * Check if event slug is available
 */
export async function isEventSlugAvailable(slug: string, excludeId?: string) {
  const existing = await prisma.event.findFirst({
    where: { 
      slug,
      ...(excludeId && { id: { not: excludeId } })
    },
    select: { id: true }
  })
  
  return !existing
}

/**
 * Get event registration count
 */
export async function getEventRegistrationCount(eventId: string) {
  return await prisma.eventRegistration.count({
    where: { eventId }
  })
}

/**
 * Get event capacity info
 */
export async function getEventCapacity(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      capacityTotal: true,
      _count: {
        select: {
          EventRegistration: true
        }
      }
    }
  })

  if (!event) return null

  return {
    total: event.capacityTotal,
    registered: event._count.EventRegistration,
    available: event.capacityTotal - event._count.EventRegistration,
    isFull: event._count.EventRegistration >= event.capacityTotal
  }
}
