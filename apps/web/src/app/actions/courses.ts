'use server'

import { prisma } from '@/lib/db'

export interface CourseFilters {
    organizerId?: string
    levelLabel?: string
    weekday?: number
    timeAfter?: string // HH:MM format
    timeBefore?: string // HH:MM format
}

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

    const periods = await prisma.coursePeriod.findMany({
        where: {
            ...(filters?.organizerId && { organizerId: filters.organizerId }),
            salesOpenAt: { lte: now },
            salesCloseAt: { gte: now }
        },
        include: {
            organizer: {
                select: {
                    id: true,
                    slug: true,
                    name: true,
                    logoUrl: true,
                }
            },
            tracks: {
                where: Object.keys(trackWhere).length > 0 ? trackWhere : undefined,
                orderBy: [
                    { weekday: 'asc' },
                    { timeStart: 'asc' }
                ]
            }
        },
        orderBy: { startDate: 'asc' }
    })

    // Filter out periods with no tracks after filtering
    return periods.filter(p => p.tracks.length > 0)
}

export async function getCourseTrack(trackId: string) {
    return await prisma.courseTrack.findUnique({
        where: { id: trackId },
        include: {
            period: true
        }
    })
}

export async function getAvailableCourseLevels() {
    const tracks = await prisma.courseTrack.findMany({
        where: {
            period: {
                salesOpenAt: { lte: new Date() },
                salesCloseAt: { gte: new Date() }
            }
        },
        select: {
            levelLabel: true
        },
        distinct: ['levelLabel']
    })
    
    return tracks
        .map(t => t.levelLabel)
        .filter((level): level is string => level !== null && level !== '' && level.trim() !== '')
        .sort()
}
