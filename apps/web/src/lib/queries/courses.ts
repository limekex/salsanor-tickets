import { prisma } from '@/lib/db'

/**
 * Query functions for Course data fetching
 * These are pure data access functions - no business logic or auth checks
 */

export interface CourseFilters {
  organizerId?: string
  levelLabel?: string
  weekday?: number
  timeAfter?: string // HH:MM format
  timeBefore?: string // HH:MM format
  categoryId?: string
  tagId?: string
}

/**
 * Get course period by ID
 */
export async function getCoursePeriodById(id: string) {
  return await prisma.coursePeriod.findUnique({
    where: { id },
    include: {
      Organizer: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      },
      CourseTrack: {
        orderBy: [
          { weekday: 'asc' },
          { timeStart: 'asc' }
        ],
        include: {
          _count: {
            select: {
              Registration: true,
            }
          }
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
      },
      _count: {
        select: {
          CourseTrack: true,
        }
      }
    }
  })
}

/**
 * Get course period by code (previously slug)
 */
export async function getCoursePeriodBySlug(code: string, organizerSlug: string) {
  return await prisma.coursePeriod.findFirst({
    where: {
      code,
      Organizer: {
        slug: organizerSlug
      }
    },
    include: {
      Organizer: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      },
      CourseTrack: {
        orderBy: [
          { weekday: 'asc' },
          { timeStart: 'asc' }
        ],
        include: {
          _count: {
            select: {
              Registration: true,
            }
          }
        }
      },
      Category: true,
      Tag: true,
    }
  })
}

/**
 * Get public course periods with filters
 */
export async function getPublicCoursePeriods(filters?: CourseFilters) {
  const now = new Date()

  // Build track filter conditions
  const trackWhere: any = {}
  if (filters?.levelLabel) {
    trackWhere.levelLabel = filters.levelLabel
  }
  if (filters?.weekday !== undefined && filters.weekday > 0) {
    trackWhere.weekday = filters.weekday
  }
  if (filters?.timeAfter) {
    trackWhere.timeStart = { gte: filters.timeAfter }
  }
  if (filters?.timeBefore) {
    trackWhere.timeStart = { lte: filters.timeBefore }
  }

  // Build period filter conditions
  const periodWhere: any = {
    salesOpenAt: { lte: now },
    salesCloseAt: { gte: now }
  }
  
  if (filters?.organizerId) {
    periodWhere.organizerId = filters.organizerId
  }
  
  if (filters?.categoryId) {
    periodWhere.categories = {
      some: { id: filters.categoryId }
    }
  }
  
  if (filters?.tagId) {
    periodWhere.tags = {
      some: { id: filters.tagId }
    }
  }

  const periods = await prisma.coursePeriod.findMany({
    where: periodWhere,
    include: {
      Organizer: {
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
          OrgDiscountRule: {
            where: {
              enabled: true,
              appliesTo: { in: ['PERIODS', 'BOTH'] }
            },
            select: {
              id: true,
              ruleType: true,
              config: true
            }
          }
        }
      },
      CourseTrack: {
        where: Object.keys(trackWhere).length > 0 ? trackWhere : undefined,
        orderBy: [
          { weekday: 'asc' },
          { timeStart: 'asc' }
        ],
        select: {
          id: true,
          title: true,
          weekday: true,
          timeStart: true,
          timeEnd: true,
          levelLabel: true,
          priceSingleCents: true,
          pricePairCents: true,
          memberPriceSingleCents: true,
          memberPricePairCents: true,
          capacityTotal: true
        }
      },
      DiscountRule: {
        where: { enabled: true },
        select: {
          id: true,
          ruleType: true,
          config: true
        }
      },
      PeriodBreak: {
        orderBy: { startDate: 'asc' }
      }
    },
    orderBy: { startDate: 'asc' }
  })

  // Filter out periods with no tracks after filtering
  return periods.filter(p => p.CourseTrack.length > 0)
}

/**
 * Get course periods for an organizer
 */
export async function getCoursePeriodsByOrganizer(organizerId: string) {
  return await prisma.coursePeriod.findMany({
    where: { organizerId },
    orderBy: { startDate: 'desc' },
    include: {
      Organizer: {
        select: {
          id: true,
          name: true,
          slug: true,
        }
      },
      CourseTrack: {
        orderBy: [
          { weekday: 'asc' },
          { timeStart: 'asc' }
        ]
      },
      _count: {
        select: {
          CourseTrack: true,
        }
      }
    }
  })
}

/**
 * Get course track by ID
 */
export async function getCourseTrackById(trackId: string) {
  return await prisma.courseTrack.findUnique({
    where: { id: trackId },
    include: {
      CoursePeriod: {
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
      _count: {
        select: {
          Registration: true,
        }
      }
    }
  })
}

/**
 * Get a course track by ID or slug (with periodId for slug lookup)
 */
export async function getCourseTrackByIdOrSlug(identifier: string, periodIdentifier?: string) {
  // First try by direct ID
  const trackById = await prisma.courseTrack.findUnique({
    where: { id: identifier },
    include: {
      CoursePeriod: {
        include: {
          Organizer: {
            select: {
              id: true,
              name: true,
              slug: true,
              OrgDiscountRule: {
                where: {
                  enabled: true,
                  appliesTo: { in: ['PERIODS', 'BOTH'] }
                },
                orderBy: { priority: 'asc' },
                select: {
                  id: true,
                  ruleType: true,
                  name: true,
                  config: true
                }
              }
            }
          },
          PeriodBreak: {
            orderBy: { startDate: 'asc' }
          },
          DiscountRule: {
            where: { enabled: true },
            orderBy: { priority: 'asc' }
          }
        }
      },
      _count: {
        select: {
          Registration: {
            where: {
              status: { in: ['ACTIVE', 'PENDING_PAYMENT', 'WAITLIST'] }
            }
          }
        }
      }
    }
  })

  if (trackById) return trackById

  // If not found by ID and periodIdentifier provided, try by slug
  if (periodIdentifier) {
    // First try periodIdentifier as period ID
    let track = await prisma.courseTrack.findFirst({
      where: { 
        slug: identifier,
        periodId: periodIdentifier
      },
      include: {
        CoursePeriod: {
          include: {
            Organizer: {
              select: {
                id: true,
                name: true,
                slug: true,
                OrgDiscountRule: {
                  where: {
                    enabled: true,
                    appliesTo: { in: ['PERIODS', 'BOTH'] }
                  },
                  orderBy: { priority: 'asc' },
                  select: {
                    id: true,
                    ruleType: true,
                    name: true,
                    config: true
                  }
                }
              }
            },
            PeriodBreak: {
              orderBy: { startDate: 'asc' }
            },
            DiscountRule: {
              where: { enabled: true },
              orderBy: { priority: 'asc' }
            }
          }
        },
        _count: {
          select: {
            Registration: {
              where: {
                status: { in: ['ACTIVE', 'PENDING_PAYMENT', 'WAITLIST'] }
              }
            }
          }
        }
      }
    })

    if (track) return track

    // Try periodIdentifier as period code (for pretty URLs)
    track = await prisma.courseTrack.findFirst({
      where: { 
        slug: identifier,
        CoursePeriod: {
          code: periodIdentifier
        }
      },
      include: {
        CoursePeriod: {
          include: {
            Organizer: {
              select: {
                id: true,
                name: true,
                slug: true,
                OrgDiscountRule: {
                  where: {
                    enabled: true,
                    appliesTo: { in: ['PERIODS', 'BOTH'] }
                  },
                  orderBy: { priority: 'asc' },
                  select: {
                    id: true,
                    ruleType: true,
                    name: true,
                    config: true
                  }
                }
              }
            },
            PeriodBreak: {
              orderBy: { startDate: 'asc' }
            },
            DiscountRule: {
              where: { enabled: true },
              orderBy: { priority: 'asc' }
            }
          }
        },
        _count: {
          select: {
            Registration: {
              where: {
                status: { in: ['ACTIVE', 'PENDING_PAYMENT', 'WAITLIST'] }
              }
            }
          }
        }
      }
    })

    if (track) return track
  }

  return null
}

/**
 * Get available course levels (distinct levelLabel values)
 */
export async function getAvailableCourseLevels() {
  const tracks = await prisma.courseTrack.findMany({
    where: {
      CoursePeriod: {
        salesOpenAt: { lte: new Date() },
        salesCloseAt: { gte: new Date() }
      }
    },
    distinct: ['levelLabel'],
    select: {
      levelLabel: true
    },
    orderBy: {
      levelLabel: 'asc'
    }
  })

  return tracks.map(t => t.levelLabel).filter((label): label is string => label !== null)
}

/**
 * Get course track capacity info
 */
export async function getCourseTrackCapacity(trackId: string) {
  const track = await prisma.courseTrack.findUnique({
    where: { id: trackId },
    select: {
      capacityTotal: true,
      _count: {
        select: {
          Registration: true
        }
      }
    }
  })

  if (!track) return null

  return {
    total: track.capacityTotal,
    registered: track._count.Registration,
    available: track.capacityTotal - track._count.Registration,
    isFull: track._count.Registration >= track.capacityTotal
  }
}

/**
 * Get capacity info for PRIVATE template tracks (slot-based).
 * For PRIVATE template, capacity = number of slots × number of weeks.
 */
export async function getPrivateTemplateCapacity(trackId: string) {
  const track = await prisma.courseTrack.findUnique({
    where: { id: trackId },
    select: {
      templateType: true,
      weekday: true,
      slotCount: true,
      CoursePeriod: {
        select: {
          startDate: true,
          endDate: true
        }
      }
    }
  })

  if (!track || track.templateType !== 'PRIVATE' || !track.slotCount) {
    return null
  }

  // Calculate number of weeks in period
  const weeks = calculateWeeksInPeriod(
    track.CoursePeriod.startDate,
    track.CoursePeriod.endDate,
    track.weekday
  )

  // Total possible slot-sessions (each slot × each week)
  const totalSlotSessions = track.slotCount * weeks

  // Get all confirmed registrations with booked slots
  const registrations = await prisma.registration.findMany({
    where: {
      trackId,
      status: { in: ['ACTIVE', 'PENDING_PAYMENT'] },
      bookedSlots: { isEmpty: false }
    },
    select: {
      bookedSlots: true,
      bookedWeeks: true
    }
  })

  // Count total booked slot-sessions
  let bookedSlotSessions = 0
  for (const reg of registrations) {
    const slots = reg.bookedSlots.length
    // If bookedWeeks is empty, assume all weeks (legacy or full booking)
    const weeksBooked = reg.bookedWeeks.length > 0 ? reg.bookedWeeks.length : weeks
    bookedSlotSessions += slots * weeksBooked
  }

  return {
    total: totalSlotSessions,
    booked: bookedSlotSessions,
    available: totalSlotSessions - bookedSlotSessions,
    isFull: bookedSlotSessions >= totalSlotSessions,
    weeks,
    slotsPerWeek: track.slotCount
  }
}

/**
 * Helper: Calculate number of weeks in a period for a given weekday
 */
function calculateWeeksInPeriod(
  periodStart: Date,
  periodEnd: Date,
  trackWeekday: number
): number {
  let count = 0
  const currentDate = new Date(periodStart)
  
  // Find first occurrence of track's weekday
  const dayOfWeek = currentDate.getDay()
  const daysUntilTarget = (trackWeekday - dayOfWeek + 7) % 7
  currentDate.setDate(currentDate.getDate() + daysUntilTarget)
  
  while (currentDate <= periodEnd) {
    count++
    currentDate.setDate(currentDate.getDate() + 7)
  }
  
  return count
}

/**
 * Check if course period code is available for organizer
 */
export async function isCoursePeriodSlugAvailable(code: string, organizerId: string, excludeId?: string) {
  const existing = await prisma.coursePeriod.findFirst({
    where: { 
      code,
      organizerId,
      ...(excludeId && { id: { not: excludeId } })
    },
    select: { id: true }
  })
  
  return !existing
}
