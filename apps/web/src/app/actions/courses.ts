'use server'

import { prisma } from '@/lib/db'

export async function getPublicCoursePeriods(organizerId?: string) {
    const now = new Date()

    // Fetch periods that are either active or upcoming
    // We might want to see closed ones too potentially, but let's focus on purchasable ones or recent ones.
    // Actually, let's just fetch all future or currently open ones.

    return await prisma.coursePeriod.findMany({
        where: {
            ...(organizerId && { organizerId }),
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
                orderBy: [
                    { weekday: 'asc' },
                    { timeStart: 'asc' }
                ]
            }
        },
        orderBy: { startDate: 'asc' }
    })
}

export async function getCourseTrack(trackId: string) {
    return await prisma.courseTrack.findUnique({
        where: { id: trackId },
        include: {
            period: true
        }
    })
}
