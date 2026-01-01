'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const organizerSchema = z.object({
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
    name: z.string().min(1),
    description: z.string().optional(),
    logoUrl: z.string().url().optional().or(z.literal('')),
    website: z.string().url().optional().or(z.literal('')),
    contactEmail: z.string().email().optional().or(z.literal('')),
    city: z.string().optional(),
    country: z.string().default('Norway'),
    timezone: z.string().default('Europe/Oslo'),
})

type ActionError = {
    _form?: string[]
    [key: string]: string[] | undefined
}

export async function getPublicOrganizers() {
    return await prisma.organizer.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            logoUrl: true,
            city: true,
            country: true,
        }
    })
}

export async function getOrganizerBySlug(slug: string) {
    return await prisma.organizer.findUnique({
        where: { slug },
        include: {
            periods: {
                where: {
                    salesOpenAt: { lte: new Date() },
                    salesCloseAt: { gte: new Date() }
                },
                include: {
                    tracks: true
                },
                orderBy: { startDate: 'asc' }
            }
        }
    })
}

export async function getAllOrganizers() {
    await requireAdmin()

    return await prisma.organizer.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            country: true,
            contactEmail: true,
            stripeConnectAccountId: true,
            platformFeePercent: true,
            platformFeeFixed: true,
            _count: {
                select: { periods: true }
            }
        }
    })
}

export async function getOrganizer(id: string) {
    await requireAdmin()

    return await prisma.organizer.findUnique({
        where: { id }
    })
}

export async function createOrganizer(prevState: any, formData: FormData): Promise<{ error?: ActionError } | undefined> {
    await requireAdmin()

    const raw = {
        slug: formData.get('slug'),
        name: formData.get('name'),
        description: formData.get('description') || undefined,
        logoUrl: formData.get('logoUrl') || undefined,
        website: formData.get('website') || undefined,
        contactEmail: formData.get('contactEmail') || undefined,
        city: formData.get('city') || undefined,
        country: formData.get('country') || 'Norway',
        timezone: formData.get('timezone') || 'Europe/Oslo',
    }

    const result = organizerSchema.safeParse(raw)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        const organizer = await prisma.organizer.create({
            data: result.data
        })

        revalidatePath('/admin/organizers')
        redirect(`/admin/organizers`)
    } catch (e: any) {
        if (e.code === 'P2002') {
            return { error: { slug: ['Slug must be unique'] } }
        }
        return { error: { _form: [e.message] } }
    }
}

export async function updateOrganizer(organizerId: string, prevState: any, formData: FormData): Promise<{ error?: ActionError } | undefined> {
    await requireAdmin()

    const raw = {
        slug: formData.get('slug'),
        name: formData.get('name'),
        description: formData.get('description') || undefined,
        logoUrl: formData.get('logoUrl') || undefined,
        website: formData.get('website') || undefined,
        contactEmail: formData.get('contactEmail') || undefined,
        city: formData.get('city') || undefined,
        country: formData.get('country') || 'Norway',
        timezone: formData.get('timezone') || 'Europe/Oslo',
    }

    const result = organizerSchema.safeParse(raw)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        await prisma.organizer.update({
            where: { id: organizerId },
            data: result.data
        })

        revalidatePath(`/admin/organizers/${organizerId}/edit`)
        revalidatePath('/admin/organizers')
        redirect('/admin/organizers')
    } catch (e: any) {
        if (e.code === 'P2002') {
            return { error: { slug: ['Slug must be unique'] } }
        }
        return { error: { _form: [e.message] } }
    }
}

export async function updateOrganizerFees(data: {
    organizerId: string
    platformFeePercent: number | null
    platformFeeFixed: number | null
}) {
    await requireAdmin()

    try {
        await prisma.organizer.update({
            where: { id: data.organizerId },
            data: {
                platformFeePercent: data.platformFeePercent,
                platformFeeFixed: data.platformFeeFixed,
            }
        })

        revalidatePath(`/admin/organizers/${data.organizerId}/fees`)
        revalidatePath('/admin/organizers')
        return { success: true }
    } catch (e: any) {
        return { error: e.message }
    }
}
