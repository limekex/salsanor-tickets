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
    contactEmail: z.union([z.literal(''), z.string().email()]).optional(),
    city: z.string().optional(),
    country: z.string().default('Norway'),
    timezone: z.string().default('Europe/Oslo'),
    // Legal/Business Info
    organizationNumber: z.string().regex(/^\d{9}$/, 'Must be 9 digits'),
    legalName: z.string().min(1, 'Legal name is required'),
    legalAddress: z.string().min(1, 'Legal address is required'),
    legalEmail: z.string().email('Valid email is required'),
    companyType: z.string().min(1, 'Company type is required'),
    vatRegistered: z.boolean().default(false),
    bankAccount: z.string().min(1, 'Bank account is required'),
    orderPrefix: z.string().min(3, 'Must be 3-5 characters').max(5, 'Must be 3-5 characters').regex(/^[A-Z0-9]+$/, 'Must be uppercase letters and numbers only'),
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
    const organizer = await prisma.organizer.findUnique({
        where: { slug },
        include: {
            CoursePeriod: {
                where: {
                    salesOpenAt: { lte: new Date() },
                    salesCloseAt: { gte: new Date() }
                },
                include: {
                    CourseTrack: true
                },
                orderBy: { startDate: 'asc' },
                take: 3
            },
            Event: {
                where: {
                    startDateTime: { gte: new Date() },
                    status: 'PUBLISHED'
                },
                orderBy: { startDateTime: 'asc' },
                take: 3
            }
        }
    })
    
    if (!organizer) return null
    
    // Serialize Decimal fields for client components
    return {
        ...organizer,
        mvaRate: organizer.mvaRate ? organizer.mvaRate.toNumber() : null,
        stripeFeePercentage: organizer.stripeFeePercentage ? organizer.stripeFeePercentage.toNumber() : null,
    }
}

export async function getOrganizerEvents(slug: string) {
    const organizer = await prisma.organizer.findUnique({
        where: { slug },
        include: {
            Event: {
                where: {
                    startDateTime: { gte: new Date() },
                    status: 'PUBLISHED'
                },
                orderBy: { startDateTime: 'asc' }
            }
        }
    })
    
    if (!organizer) return null
    return organizer
}

export async function getOrganizerCourses(slug: string) {
    const organizer = await prisma.organizer.findUnique({
        where: { slug },
        include: {
            CoursePeriod: {
                where: {
                    salesOpenAt: { lte: new Date() },
                    salesCloseAt: { gte: new Date() }
                },
                include: {
                    CourseTrack: true
                },
                orderBy: { startDate: 'asc' }
            }
        }
    })
    
    if (!organizer) return null
    
    return {
        ...organizer,
        mvaRate: organizer.mvaRate ? organizer.mvaRate.toNumber() : null,
        stripeFeePercentage: organizer.stripeFeePercentage ? organizer.stripeFeePercentage.toNumber() : null,
    }
}

export async function getAllOrganizers() {
    await requireAdmin()

    const organizers = await prisma.organizer.findMany({
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
                select: { CoursePeriod: true }
            }
        }
    })
    
    // Serialize Decimal fields
    return organizers.map(org => ({
        ...org,
        platformFeePercent: org.platformFeePercent ? org.platformFeePercent.toNumber() : null,
        platformFeeFixed: org.platformFeeFixed ? org.platformFeeFixed.toNumber() : null
    }))
}

export async function getOrganizer(id: string) {
    await requireAdmin()

    const organizer = await prisma.organizer.findUnique({
        where: { id }
    })
    
    if (!organizer) return null
    
    // Serialize Decimal fields for client components
    return {
        ...organizer,
        mvaRate: organizer.mvaRate ? organizer.mvaRate.toNumber() : null,
        stripeFeePercentage: organizer.stripeFeePercentage ? organizer.stripeFeePercentage.toNumber() : null,
        platformFeePercent: organizer.platformFeePercent ? organizer.platformFeePercent.toNumber() : null,
        platformFeeFixed: organizer.platformFeeFixed ? organizer.platformFeeFixed.toNumber() : null,
    }
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
        organizationNumber: formData.get('organizationNumber') || undefined,
        legalName: formData.get('legalName') || undefined,
        legalAddress: formData.get('legalAddress') || undefined,
        legalEmail: formData.get('legalEmail') || undefined,
        companyType: formData.get('companyType') || undefined,
        vatRegistered: formData.get('vatRegistered') === 'true',
        bankAccount: formData.get('bankAccount') || undefined,
        orderPrefix: formData.get('orderPrefix') || 'ORD',
    }

    const result = organizerSchema.safeParse(raw)

    if (!result.success) {
        console.error('Zod validation failed in createOrganizer:', result.error)
        const flattened = result.error.flatten()
        const fieldErrors = flattened.fieldErrors || {}
        const formErrors = flattened.formErrors || []
        
        // Build error object with field errors and form errors
        const errorObj: Record<string, string[]> = {}
        
        // Add field-specific errors
        Object.entries(fieldErrors).forEach(([key, value]) => {
            if (value && Array.isArray(value) && value.length > 0) {
                errorObj[key] = value as string[]
            }
        })
        
        // Always include _form with either real errors or default message
        errorObj._form = formErrors.length > 0 
            ? formErrors 
            : ['Validation failed. Please check your input.']
        
        console.log('createOrganizer - Returning error object:', JSON.stringify(errorObj))
        console.log('createOrganizer - Error object keys:', Object.keys(errorObj))
        const returnValue = { error: errorObj }
        console.log('createOrganizer - Full return value:', JSON.stringify(returnValue))
        return returnValue
    }

    // Check if orderPrefix is unique
    if (result.data.orderPrefix && result.data.orderPrefix !== '') {
        const existingOrg = await prisma.organizer.findFirst({
            where: { orderPrefix: result.data.orderPrefix }
        })
        if (existingOrg) {
            return { error: { orderPrefix: ['Order prefix must be unique'] } }
        }
    }

    try {
        const organizer = await prisma.organizer.create({
            data: result.data
        })

        revalidatePath('/admin/organizers')
        // Return success (no redirect, let client handle dialog)
        return
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
        organizationNumber: formData.get('organizationNumber'),
        legalName: formData.get('legalName'),
        legalAddress: formData.get('legalAddress'),
        legalEmail: formData.get('legalEmail'),
        companyType: formData.get('companyType'),
        vatRegistered: formData.get('vatRegistered') === 'true',
        bankAccount: formData.get('bankAccount'),
        orderPrefix: formData.get('orderPrefix') || 'ORD',
    }

    const result = organizerSchema.safeParse(raw)

    if (!result.success) {
        console.error('Zod validation failed in updateOrganizer:', result.error)
        const flattened = result.error.flatten()
        const fieldErrors = flattened.fieldErrors || {}
        const formErrors = flattened.formErrors || []
        
        // Build error object with field errors and form errors
        const errorObj: Record<string, string[]> = {}
        
        // Add field-specific errors
        Object.entries(fieldErrors).forEach(([key, value]) => {
            if (value && Array.isArray(value) && value.length > 0) {
                errorObj[key] = value as string[]
            }
        })
        
        // Always include _form with either real errors or default message
        errorObj._form = formErrors.length > 0 
            ? formErrors 
            : ['Validation failed. Please check your input.']
        
        console.log('updateOrganizer - Returning error object:', JSON.stringify(errorObj))
        console.log('updateOrganizer - Error object keys:', Object.keys(errorObj))
        const returnValue = { error: errorObj }
        console.log('updateOrganizer - Full return value:', JSON.stringify(returnValue))
        return returnValue
    }

    // Check if orderPrefix is unique (excluding current organizer)
    if (result.data.orderPrefix && result.data.orderPrefix !== '') {
        const existingOrg = await prisma.organizer.findFirst({
            where: { 
                orderPrefix: result.data.orderPrefix,
                id: { not: organizerId }
            }
        })
        if (existingOrg) {
            return { error: { orderPrefix: ['Order prefix must be unique'] } }
        }
    }

    try {
        await prisma.organizer.update({
            where: { id: organizerId },
            data: result.data
        })

        revalidatePath(`/admin/organizers/${organizerId}/edit`)
        revalidatePath('/admin/organizers')
        // Return success (no redirect, let client handle navigation)
        return { success: true }
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
