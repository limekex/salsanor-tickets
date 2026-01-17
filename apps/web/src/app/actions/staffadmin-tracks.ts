'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { courseTrackSchema } from '@/lib/schemas/track'

export async function createCourseTrackStaff(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const periodId = formData.get('periodId') as string

    // Verify user has ORG_ADMIN access to this period's organizer
    const period = await prisma.coursePeriod.findUnique({
        where: { id: periodId },
        select: { organizerId: true }
    })

    if (!period) {
        return { error: { _form: ['Period not found'] } }
    }

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            roles: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: period.organizerId
                }
            }
        }
    })

    if (!userAccount?.roles.length) {
        return { error: { _form: ['Unauthorized: You do not have access to this period'] } }
    }

    const raw = {
        periodId,
        title: formData.get('title'),
        levelLabel: formData.get('levelLabel') || undefined,
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
        memberPriceSingleCents: formData.get('memberPriceSingleCents') || undefined,
        memberPricePairCents: formData.get('memberPricePairCents') || undefined,
    }

    const result = courseTrackSchema.safeParse(raw)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        const {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            periodId: _periodId,
            ...trackData
        } = result.data

        await prisma.courseTrack.create({
            data: {
                period: { connect: { id: periodId } },
                ...trackData
            }
        })
    } catch (e: any) {
        return { error: { _form: [e.message] } }
    }

    revalidatePath(`/staffadmin/periods/${periodId}/tracks`)
    redirect(`/staffadmin/periods/${periodId}/tracks`)
}

export async function updateCourseTrackStaff(trackId: string, prevState: any, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Verify user has ORG_ADMIN access to this track's organizer
    const track = await prisma.courseTrack.findUnique({
        where: { id: trackId },
        include: {
            period: {
                select: { organizerId: true }
            }
        }
    })

    if (!track) {
        return { error: { _form: ['Track not found'] } }
    }

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            roles: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: track.period.organizerId
                }
            }
        }
    })

    if (!userAccount?.roles.length) {
        return { error: { _form: ['Unauthorized: You do not have access to this track'] } }
    }

    const raw = {
        periodId: formData.get('periodId'),
        title: formData.get('title'),
        levelLabel: formData.get('levelLabel') || undefined,
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
        memberPriceSingleCents: formData.get('memberPriceSingleCents') || undefined,
        memberPricePairCents: formData.get('memberPricePairCents') || undefined,
    }

    const result = courseTrackSchema.safeParse(raw)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        const {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            periodId: _periodId,
            ...trackData
        } = result.data

        await prisma.courseTrack.update({
            where: { id: trackId },
            data: trackData
        })
    } catch (e: any) {
        return { error: { _form: [e.message] } }
    }

    revalidatePath(`/staffadmin/periods/${track.periodId}/tracks`)
    redirect(`/staffadmin/periods/${track.periodId}/tracks`)
}
