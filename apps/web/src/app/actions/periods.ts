'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { getAdminSelectedOrg } from '@/utils/admin-org-context'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { coursePeriodSchema } from '@/lib/schemas/period'

type ActionError = {
    _form?: string[]
    [key: string]: string[] | undefined
}

export async function createCoursePeriod(prevState: any, formData: FormData) {
    await requireAdmin()

    const raw = {
        organizerId: formData.get('organizerId'),
        code: formData.get('code'),
        name: formData.get('name'),
        city: formData.get('city'),
        locationName: formData.get('locationName'),
        startDate: formData.get('startDate') ? new Date(formData.get('startDate') as string) : undefined,
        endDate: formData.get('endDate') ? new Date(formData.get('endDate') as string) : undefined,
        salesOpenAt: formData.get('salesOpenAt') ? new Date(formData.get('salesOpenAt') as string) : undefined,
        salesCloseAt: formData.get('salesCloseAt') ? new Date(formData.get('salesCloseAt') as string) : undefined,
    }

    const result = coursePeriodSchema.safeParse(raw)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        await prisma.coursePeriod.create({
            data: {
                organizerId: result.data.organizerId,
                code: result.data.code,
                name: result.data.name,
                city: result.data.city,
                locationName: result.data.locationName || null,
                startDate: result.data.startDate,
                endDate: result.data.endDate,
                salesOpenAt: result.data.salesOpenAt,
                salesCloseAt: result.data.salesCloseAt,
            }
        })
    } catch (e: any) {
        if (e.code === 'P2002') {
            return { error: { code: ['Code must be unique'] } }
        }
        return { error: { _form: [e.message] } }
    }

    revalidatePath('/admin/periods')
    redirect('/admin/periods')
}

export async function updateCoursePeriod(periodId: string, prevState: any, formData: FormData): Promise<{ error?: ActionError } | undefined> {
    await requireAdmin()

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

    const result = coursePeriodSchema.safeParse(raw)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
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
            }
        })
    } catch (e: any) {
        return { error: { _form: [e.message] } }
    }

    revalidatePath(`/admin/periods/${periodId}`)
    revalidatePath('/admin/periods')
    redirect(`/admin/periods/${periodId}`)
}

export async function getCoursePeriods() {
    await requireAdmin()
    const selectedOrgId = await getAdminSelectedOrg()
    
    return await prisma.coursePeriod.findMany({
        where: selectedOrgId ? { organizerId: selectedOrgId } : undefined,
        include: {
            organizer: {
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
