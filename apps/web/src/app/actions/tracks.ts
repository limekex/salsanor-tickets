'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { courseTrackSchema } from '@/lib/schemas/track'

export async function createCourseTrack(prevState: any, formData: FormData) {
    await requireAdmin()

    const raw = {
        periodId: formData.get('periodId'),
        title: formData.get('title'),
        levelLabel: formData.get('levelLabel'),
        weekday: formData.get('weekday'),
        timeStart: formData.get('timeStart'),
        timeEnd: formData.get('timeEnd'),
        capacityTotal: formData.get('capacityTotal'),
        capacityLeaders: formData.get('capacityLeaders') || undefined,
        capacityFollowers: formData.get('capacityFollowers') || undefined,
        rolePolicy: formData.get('rolePolicy'),
        waitlistEnabled: formData.get('waitlistEnabled') === 'on',
        priceSingleCents: formData.get('priceSingleCents'),
        pricePairCents: formData.get('pricePairCents') || undefined,
    }

    const result = courseTrackSchema.safeParse(raw)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        const {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            periodId,
            ...trackData
        } = result.data

        await prisma.courseTrack.create({
            data: {
                period: { connect: { id: result.data.periodId } },
                ...trackData
            }
        })
    } catch (e: any) {
        return { error: { _form: [e.message] } }
    }

    revalidatePath(`/admin/periods/${result.data.periodId}`)
    redirect(`/admin/periods/${result.data.periodId}`)
}

export async function getTracksByPeriod(periodId: string) {
    await requireAdmin()
    return await prisma.courseTrack.findMany({
        where: { periodId },
        orderBy: { weekday: 'asc' } // sort by day then time?
    })
}

export async function getAllTracks() {
    await requireAdmin()
    return await prisma.courseTrack.findMany({
        include: {
            period: {
                include: {
                    organizer: {
                        select: {
                            id: true,
                            name: true,
                            slug: true
                        }
                    }
                }
            },
            _count: {
                select: {
                    registrations: true
                }
            }
        },
        orderBy: [
            { period: { organizer: { name: 'asc' } } },
            { period: { startDate: 'desc' } },
            { weekday: 'asc' }
        ]
    })
}
