'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { courseTrackSchema } from '@/lib/schemas/track'
import { slugify } from '@/lib/formatters'

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
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: period.organizerId
                }
            }
        }
    })

    if (!userAccount?.UserAccountRole.length) {
        return { error: { _form: ['Unauthorized: You do not have access to this period'] } }
    }

    const raw = {
        periodId,
        title: formData.get('title'),
        description: formData.get('description') || undefined,
        imageUrl: formData.get('imageUrl') || undefined,
        levelLabel: formData.get('levelLabel') || undefined,
        weekday: formData.get('weekday'),
        timeStart: formData.get('timeStart'),
        timeEnd: formData.get('timeEnd'),
        locationName: formData.get('locationName') || undefined,
        locationAddress: formData.get('locationAddress') || undefined,
        latitude: formData.get('latitude') || undefined,
        longitude: formData.get('longitude') || undefined,
        capacityTotal: formData.get('capacityTotal'),
        capacityLeaders: formData.get('capacityLeaders') || undefined,
        capacityFollowers: formData.get('capacityFollowers') || undefined,
        rolePolicy: formData.get('rolePolicy'),
        waitlistEnabled: formData.get('waitlistEnabled') === 'on',
        allowSelfCheckIn: formData.get('allowSelfCheckIn') === 'on',
        checkInWindowBefore: formData.get('checkInWindowBefore') || undefined,
        checkInWindowAfter: formData.get('checkInWindowAfter') || undefined,
        priceSingleCents: formData.get('priceSingleCents'),
        pricePairCents: formData.get('pricePairCents') || undefined,
        memberPriceSingleCents: formData.get('memberPriceSingleCents') || undefined,
        memberPricePairCents: formData.get('memberPricePairCents') || undefined,
    }

    const result = courseTrackSchema.safeParse(raw)

    if (!result.success) {
        const flattened = result.error.flatten()
        return { 
            error: {
                ...flattened.fieldErrors,
                ...(flattened.formErrors.length > 0 ? { _form: flattened.formErrors } : {})
            }
        }
    }

    try {
        const {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            periodId: _periodId,
            ...trackData
        } = result.data

        // Auto-generate slug from title if not provided
        const slug = trackData.slug || slugify(trackData.title)

        await prisma.courseTrack.create({
            data: {
                CoursePeriod: { connect: { id: periodId } },
                ...trackData,
                slug
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
            CoursePeriod: {
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
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: track.CoursePeriod.organizerId
                }
            }
        }
    })

    if (!userAccount?.UserAccountRole.length) {
        return { error: { _form: ['Unauthorized: You do not have access to this track'] } }
    }

    const raw = {
        periodId: formData.get('periodId'),
        title: formData.get('title'),
        description: formData.get('description') || undefined,
        imageUrl: formData.get('imageUrl') || undefined,
        levelLabel: formData.get('levelLabel') || undefined,
        weekday: formData.get('weekday'),
        timeStart: formData.get('timeStart'),
        timeEnd: formData.get('timeEnd'),
        locationName: formData.get('locationName') || undefined,
        locationAddress: formData.get('locationAddress') || undefined,
        latitude: formData.get('latitude') || undefined,
        longitude: formData.get('longitude') || undefined,
        capacityTotal: formData.get('capacityTotal'),
        capacityLeaders: formData.get('capacityLeaders') || undefined,
        capacityFollowers: formData.get('capacityFollowers') || undefined,
        rolePolicy: formData.get('rolePolicy'),
        waitlistEnabled: formData.get('waitlistEnabled') === 'on',
        allowSelfCheckIn: formData.get('allowSelfCheckIn') === 'on',
        checkInWindowBefore: formData.get('checkInWindowBefore') || undefined,
        checkInWindowAfter: formData.get('checkInWindowAfter') || undefined,
        priceSingleCents: formData.get('priceSingleCents'),
        pricePairCents: formData.get('pricePairCents') || undefined,
        memberPriceSingleCents: formData.get('memberPriceSingleCents') || undefined,
        memberPricePairCents: formData.get('memberPricePairCents') || undefined,
    }

    const result = courseTrackSchema.safeParse(raw)

    if (!result.success) {
        const flattened = result.error.flatten()
        return { 
            error: {
                ...flattened.fieldErrors,
                ...(flattened.formErrors.length > 0 ? { _form: flattened.formErrors } : {})
            }
        }
    }

    try {
        const {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            periodId: _periodId,
            ...trackData
        } = result.data

        // Auto-generate slug from title if not set and track doesn't have one
        const existingTrack = await prisma.courseTrack.findUnique({
            where: { id: trackId },
            select: { slug: true }
        })
        
        const slug = trackData.slug || existingTrack?.slug || slugify(trackData.title)

        await prisma.courseTrack.update({
            where: { id: trackId },
            data: { ...trackData, slug }
        })
    } catch (e: any) {
        return { error: { _form: [e.message] } }
    }

    revalidatePath(`/staffadmin/periods/${track.periodId}/tracks`)
    redirect(`/staffadmin/periods/${track.periodId}/tracks`)
}
