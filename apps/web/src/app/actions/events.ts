'use server'

import { prisma } from '@/lib/db'
import { requireOrgAdminForOrganizer } from '@/utils/auth-org-admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const eventSchema = z.object({
    organizerId: z.string().uuid(),
    slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
    title: z.string().min(1, 'Title is required'),
    shortDescription: z.string().optional(),
    longDescription: z.string().optional(),
    eventType: z.enum(['SINGLE', 'RECURRING']),
    startDateTime: z.string().datetime(),
    endDateTime: z.string().datetime().optional(),
    timezone: z.string().default('Europe/Oslo'),
    recurrenceRule: z.string().optional(),
    recurrenceExceptions: z.string().optional(),
    recurringUntil: z.string().datetime().optional(),
    locationName: z.string().optional(),
    locationAddress: z.string().optional(),
    city: z.string().optional(),
    salesOpenAt: z.string().datetime(),
    salesCloseAt: z.string().datetime(),
    capacityTotal: z.coerce.number().int().min(1),
    requiresRole: z.boolean().default(false),
    basePriceCents: z.coerce.number().int().min(0),
    memberPriceCents: z.coerce.number().int().min(0).optional(),
    imageUrl: z.string().url().optional().or(z.literal('')),
    featured: z.boolean().default(false),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    categoryIds: z.array(z.string()).optional(),
    tagIds: z.array(z.string()).optional(),
})

export async function createEvent(formData: FormData) {
    const organizerId = formData.get('organizerId') as string
    await requireOrgAdminForOrganizer(organizerId)

    const data = {
        organizerId,
        slug: formData.get('slug'),
        title: formData.get('title'),
        shortDescription: formData.get('shortDescription') || undefined,
        longDescription: formData.get('longDescription') || undefined,
        eventType: formData.get('eventType'),
        startDateTime: formData.get('startDateTime'),
        endDateTime: formData.get('endDateTime') || undefined,
        timezone: formData.get('timezone') || 'Europe/Oslo',
        recurrenceRule: formData.get('recurrenceRule') || undefined,
        recurrenceExceptions: formData.get('recurrenceExceptions') || undefined,
        recurringUntil: formData.get('recurringUntil') || undefined,
        locationName: formData.get('locationName') || undefined,
        locationAddress: formData.get('locationAddress') || undefined,
        city: formData.get('city') || undefined,
        salesOpenAt: formData.get('salesOpenAt'),
        salesCloseAt: formData.get('salesCloseAt'),
        capacityTotal: formData.get('capacityTotal'),
        requiresRole: formData.get('requiresRole') === 'true',
        basePriceCents: formData.get('basePriceCents'),
        memberPriceCents: formData.get('memberPriceCents') || undefined,
        imageUrl: formData.get('imageUrl') || undefined,
        featured: formData.get('featured') === 'true',
        metaTitle: formData.get('metaTitle') || undefined,
        metaDescription: formData.get('metaDescription') || undefined,
        categoryIds: formData.get('categoryIds') ? JSON.parse(formData.get('categoryIds') as string) : [],
        tagIds: formData.get('tagIds') ? JSON.parse(formData.get('tagIds') as string) : [],
    }

    const result = eventSchema.safeParse(data)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        const event = await prisma.event.create({
            data: {
                ...result.data,
                imageUrl: result.data.imageUrl || null,
                memberPriceCents: result.data.memberPriceCents || null,
                Category: result.data.categoryIds && result.data.categoryIds.length > 0 
                    ? { connect: result.data.categoryIds.map(id => ({ id })) }
                    : undefined,
                Tag: result.data.tagIds && result.data.tagIds.length > 0
                    ? { connect: result.data.tagIds.map(id => ({ id })) }
                    : undefined,
            }
        })

        revalidatePath('/staffadmin/events')
        return { success: true, eventId: event.id }
    } catch (e: any) {
        if (e.code === 'P2002') {
            return { error: { slug: ['Slug must be unique for your organization'] } }
        }
        return { error: { _form: [e.message] } }
    }
}

export async function updateEvent(id: string, formData: FormData) {
    // First get the event to check ownership
    const event = await prisma.event.findUnique({
        where: { id },
        select: { organizerId: true }
    })

    if (!event) {
        return { error: { _form: ['Event not found'] } }
    }

    await requireOrgAdminForOrganizer(event.organizerId)

    const data = {
        organizerId: event.organizerId,
        slug: formData.get('slug'),
        title: formData.get('title'),
        shortDescription: formData.get('shortDescription') || undefined,
        longDescription: formData.get('longDescription') || undefined,
        eventType: formData.get('eventType'),
        startDateTime: formData.get('startDateTime'),
        endDateTime: formData.get('endDateTime') || undefined,
        timezone: formData.get('timezone') || 'Europe/Oslo',
        recurrenceRule: formData.get('recurrenceRule') || undefined,
        recurrenceExceptions: formData.get('recurrenceExceptions') || undefined,
        recurringUntil: formData.get('recurringUntil') || undefined,
        locationName: formData.get('locationName') || undefined,
        locationAddress: formData.get('locationAddress') || undefined,
        city: formData.get('city') || undefined,
        salesOpenAt: formData.get('salesOpenAt'),
        salesCloseAt: formData.get('salesCloseAt'),
        capacityTotal: formData.get('capacityTotal'),
        requiresRole: formData.get('requiresRole') === 'true',
        basePriceCents: formData.get('basePriceCents'),
        memberPriceCents: formData.get('memberPriceCents') || undefined,
        imageUrl: formData.get('imageUrl') || undefined,
        featured: formData.get('featured') === 'true',
        metaTitle: formData.get('metaTitle') || undefined,
        metaDescription: formData.get('metaDescription') || undefined,
        categoryIds: formData.get('categoryIds') ? JSON.parse(formData.get('categoryIds') as string) : [],
        tagIds: formData.get('tagIds') ? JSON.parse(formData.get('tagIds') as string) : [],
    }

    const result = eventSchema.safeParse(data)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        await prisma.event.update({
            where: { id },
            data: {
                slug: result.data.slug,
                title: result.data.title,
                shortDescription: result.data.shortDescription,
                longDescription: result.data.longDescription,
                eventType: result.data.eventType,
                startDateTime: result.data.startDateTime,
                endDateTime: result.data.endDateTime,
                timezone: result.data.timezone,
                recurrenceRule: result.data.recurrenceRule,
                recurrenceExceptions: result.data.recurrenceExceptions,
                recurringUntil: result.data.recurringUntil,
                locationName: result.data.locationName,
                locationAddress: result.data.locationAddress,
                city: result.data.city,
                salesOpenAt: result.data.salesOpenAt,
                salesCloseAt: result.data.salesCloseAt,
                capacityTotal: result.data.capacityTotal,
                requiresRole: result.data.requiresRole,
                basePriceCents: result.data.basePriceCents,
                memberPriceCents: result.data.memberPriceCents || null,
                imageUrl: result.data.imageUrl || null,
                featured: result.data.featured,
                metaTitle: result.data.metaTitle,
                metaDescription: result.data.metaDescription,
                Category: {
                    set: result.data.categoryIds ? result.data.categoryIds.map(id => ({ id })) : []
                },
                Tag: {
                    set: result.data.tagIds ? result.data.tagIds.map(id => ({ id })) : []
                },
            }
        })

        revalidatePath('/staffadmin/events')
        revalidatePath(`/staffadmin/events/${id}`)
        return { success: true }
    } catch (e: any) {
        if (e.code === 'P2002') {
            return { error: { slug: ['Slug must be unique for your organization'] } }
        }
        return { error: { _form: [e.message] } }
    }
}

export async function publishEvent(id: string) {
    const event = await prisma.event.findUnique({
        where: { id },
        select: { organizerId: true, published: true }
    })

    if (!event) {
        return { error: 'Event not found' }
    }

    await requireOrgAdminForOrganizer(event.organizerId)

    try {
        await prisma.event.update({
            where: { id },
            data: { 
                published: !event.published,
                status: !event.published ? 'PUBLISHED' : 'DRAFT'
            }
        })

        revalidatePath('/staffadmin/events')
        revalidatePath(`/staffadmin/events/${id}`)
        return { success: true, published: !event.published }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function deleteEvent(id: string) {
    const event = await prisma.event.findUnique({
        where: { id },
        select: { organizerId: true }
    })

    if (!event) {
        return { error: 'Event not found' }
    }

    await requireOrgAdminForOrganizer(event.organizerId)

    try {
        await prisma.event.delete({
            where: { id }
        })

        revalidatePath('/staffadmin/events')
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}

export async function registerForEvent(eventId: string) {
    const { createClient } = await import('@/utils/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'You must be logged in to register' }
    }

    // Get user's person profile
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: { 
            PersonProfile: {
                include: {
                    Membership: {
                        where: {
                            validTo: { gt: new Date() }
                        },
                        take: 1
                    }
                }
            }
        }
    })

    if (!userAccount?.PersonProfile) {
        return { 
            success: false, 
            error: 'Please complete your profile before registering',
            redirectToOnboarding: true 
        }
    }

    const personId = userAccount.PersonProfile.id

    // Get event with organizer info
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
            Organizer: true,
        }
    })

    if (!event) {
        return { success: false, error: 'Event not found' }
    }

    if (!event.published) {
        return { success: false, error: 'This event is not available for registration' }
    }

    // Count active registrations
    const activeRegistrationCount = await prisma.eventRegistration.count({
        where: { 
            eventId, 
            status: { in: ['PENDING_PAYMENT', 'ACTIVE'] } 
        }
    })

    // Check capacity
    if (activeRegistrationCount >= event.capacityTotal) {
        return { success: false, error: 'This event is full' }
    }

    // Check sales window
    const now = new Date()
    if (event.salesOpenAt && new Date(event.salesOpenAt) > now) {
        return { success: false, error: 'Registration is not open yet' }
    }
    if (event.salesCloseAt && new Date(event.salesCloseAt) < now) {
        return { success: false, error: 'Registration has closed' }
    }

    // Check for existing registration
    const existingRegistration = await prisma.eventRegistration.findUnique({
        where: {
            eventId_personId: {
                eventId,
                personId
            }
        }
    })

    if (existingRegistration) {
        return { success: false, error: 'You are already registered for this event' }
    }

    // Calculate price (member vs non-member)
    const isMember = userAccount.PersonProfile.Membership.length > 0
    const priceCents = (isMember && event.memberPriceCents && event.memberPriceCents > 0) 
        ? event.memberPriceCents 
        : event.basePriceCents

    try {
        // Create order
        // Price is entered as final price (VAT-inclusive)
        // MVA is only extracted for documentation when organizer is VAT-registered
        const mvaRate = event.Organizer.mvaReportingRequired 
            ? Number(event.Organizer.mvaRate) 
            : 0
        // Extract MVA from inclusive price: MVA = total - (total / (1 + rate))
        const mvaCents = mvaRate > 0 
            ? Math.round(priceCents - (priceCents / (1 + mvaRate / 100)))
            : 0
        // Total is the same as price (already VAT-inclusive)
        const totalCents = priceCents

        const order = await prisma.order.create({
            data: {
                organizerId: event.organizerId,
                purchaserPersonId: personId,
                orderType: 'EVENT',
                status: 'DRAFT',
                subtotalCents: priceCents,
                discountCents: 0,
                subtotalAfterDiscountCents: priceCents,
                mvaRate,
                mvaCents,
                totalCents,
                pricingSnapshot: JSON.stringify({
                    eventId: event.id,
                    eventTitle: event.title,
                    priceCents,
                    isMember,
                    mva: { rate: mvaRate, cents: mvaCents }
                })
            }
        })

        // Create registration
        await prisma.eventRegistration.create({
            data: {
                eventId,
                personId,
                orderId: order.id,
                status: 'PENDING_PAYMENT'
            }
        })

        return { 
            success: true, 
            orderId: order.id,
            message: 'Registration created successfully'
        }
    } catch (error: any) {
        console.error('Event registration error:', error)
        return { success: false, error: 'Failed to create registration' }
    }
}

export async function getOrgEvents(organizerId: string) {
    await requireOrgAdminForOrganizer(organizerId)

    return await prisma.event.findMany({
        where: { organizerId },
        orderBy: { startDateTime: 'desc' },
        include: {
            Organizer: {
                select: {
                    slug: true
                }
            },
            _count: {
                select: {
                    EventRegistration: true,
                    EventSession: true
                }
            },
            Category: {
                select: {
                    id: true,
                    name: true,
                    icon: true
                }
            },
            Tag: {
                select: {
                    id: true,
                    name: true,
                    color: true
                }
            }
        }
    })
}
