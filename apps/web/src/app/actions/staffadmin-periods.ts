'use server'

import { prisma } from '@/lib/db'
import { requireOrgAdmin, requireOrgAdminForOrganizer } from '@/utils/auth-org-admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { coursePeriodSchema } from '@/lib/schemas/period'

type ActionError = {
    _form?: string[]
    [key: string]: string[] | undefined
}

export async function createStaffCoursePeriod(prevState: any, formData: FormData) {
    try {
        const userAccount = await requireOrgAdmin()

        const raw = {
            organizerId: formData.get('organizerId') as string,
            code: formData.get('code') as string,
            name: formData.get('name') as string,
            city: formData.get('city') as string,
            locationName: formData.get('locationName') as string | null,
            startDate: formData.get('startDate') as string,
            endDate: formData.get('endDate') as string,
            salesOpenAt: formData.get('salesOpenAt') as string,
            salesCloseAt: formData.get('salesCloseAt') as string,
        }

        const categoryIds = JSON.parse(formData.get('categoryIds') as string || '[]') as string[]
        const tagIds = JSON.parse(formData.get('tagIds') as string || '[]') as string[]

        console.log('Raw form data:', raw)

        const result = coursePeriodSchema.safeParse(raw)

        if (!result.success) {
            console.error('Validation failed:', result.error.flatten())
            return { error: result.error.flatten().fieldErrors }
        }

        // Verify user has access to this organization
        const hasAccess = userAccount.UserAccountRole.some(role => role.organizerId === result.data.organizerId)
        if (!hasAccess) {
            return { error: { _form: ['You do not have permission to create periods for this organization'] } }
        }

        const period = await prisma.coursePeriod.create({
            data: {
                organizerId: result.data.organizerId,
                code: result.data.code,
                name: result.data.name,
                city: result.data.city,
                locationName: result.data.locationName || null,
                startDate: typeof result.data.startDate === 'string' ? new Date(result.data.startDate) : result.data.startDate,
                endDate: typeof result.data.endDate === 'string' ? new Date(result.data.endDate) : result.data.endDate,
                salesOpenAt: typeof result.data.salesOpenAt === 'string' ? new Date(result.data.salesOpenAt) : result.data.salesOpenAt,
                salesCloseAt: typeof result.data.salesCloseAt === 'string' ? new Date(result.data.salesCloseAt) : result.data.salesCloseAt,
                Category: {
                    connect: categoryIds.map(id => ({ id }))
                },
                Tag: {
                    connect: tagIds.map(id => ({ id }))
                }
            }
        })
        
        revalidatePath('/staffadmin/periods')
        return { success: true, periodId: period.id }
    } catch (e: any) {
        console.error('Action error:', e)
        if (e.code === 'P2002') {
            console.log('Returning P2002 error')
            return { error: { code: ['A period with this code already exists. Please use a different code.'] } }
        }
        console.log('Returning general error:', e.message)
        return { error: { _form: [e.message || 'An error occurred while creating the period'] } }
    }
}

export async function updateStaffCoursePeriod(periodId: string, prevState: any, formData: FormData): Promise<{ error?: ActionError; success?: boolean; periodId?: string }> {
    try {
        await requireOrgAdmin()

        const raw = {
            organizerId: formData.get('organizerId'),
            code: formData.get('code'),
            name: formData.get('name'),
            city: formData.get('city'),
            locationName: formData.get('locationName') || undefined,
            startDate: formData.get('startDate'),
            endDate: formData.get('endDate'),
            salesOpenAt: formData.get('salesOpenAt'),
            salesCloseAt: formData.get('salesCloseAt'),
        }

        const categoryIds = JSON.parse(formData.get('categoryIds') as string || '[]') as string[]
        const tagIds = JSON.parse(formData.get('tagIds') as string || '[]') as string[]

        const result = coursePeriodSchema.safeParse(raw)

        if (!result.success) {
            return { error: result.error.flatten().fieldErrors }
        }

        // Verify user has access to this organization
        await requireOrgAdminForOrganizer(result.data.organizerId)

        await prisma.coursePeriod.update({
            where: { id: periodId },
            data: {
                organizerId: result.data.organizerId,
                code: result.data.code,
                name: result.data.name,
                city: result.data.city,
                locationName: result.data.locationName,
                startDate: result.data.startDate,
                endDate: result.data.endDate,
                salesOpenAt: result.data.salesOpenAt,
                salesCloseAt: result.data.salesCloseAt,
                Category: {
                    set: categoryIds.map(id => ({ id }))
                },
                Tag: {
                    set: tagIds.map(id => ({ id }))
                }
            }
        })
        
        revalidatePath(`/staffadmin/periods/${periodId}`)
        revalidatePath('/staffadmin/periods')
        return { success: true, periodId }
    } catch (e: any) {
        return { error: { _form: [e.message || 'An error occurred'] } }
    }
}

export async function getStaffCoursePeriods() {
    const userAccount = await requireOrgAdmin()
    const orgIds = userAccount.UserAccountRole
        .map(r => r.organizerId)
        .filter((id): id is string => id !== null)
    
    return await prisma.coursePeriod.findMany({
        where: {
            organizerId: {
                in: orgIds
            }
        },
        include: {
            Organizer: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                }
            }
        },
        orderBy: { startDate: 'desc' }
    })
}
