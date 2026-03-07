'use server'

import { prisma } from '@/lib/db'
import { requireOrgAdminForOrganizer } from '@/utils/auth-org-admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const periodBreakSchema = z.object({
    startDate: z.string().min(1, 'Start date required'),
    endDate: z.string().min(1, 'End date required'),
    description: z.string().optional(),
    trackId: z.string().optional(),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'Start date must be on or before end date',
    path: ['endDate'],
})

export async function createPeriodBreak(periodId: string, prevState: any, formData: FormData) {
    try {
        const period = await prisma.coursePeriod.findUnique({ where: { id: periodId } })
        if (!period) return { error: 'Period not found' }

        await requireOrgAdminForOrganizer(period.organizerId)

        const raw = {
            startDate: formData.get('startDate') as string,
            endDate: formData.get('endDate') as string,
            description: (formData.get('description') as string) || undefined,
            trackId: (formData.get('trackId') as string) || undefined,
        }

        const result = periodBreakSchema.safeParse(raw)
        if (!result.success) {
            return { error: result.error.flatten().fieldErrors }
        }

        await prisma.periodBreak.create({
            data: {
                periodId,
                trackId: result.data.trackId || null,
                startDate: new Date(result.data.startDate),
                endDate: new Date(result.data.endDate),
                description: result.data.description || null,
            },
        })

        revalidatePath(`/staffadmin/periods/${periodId}`)
        return { success: true }
    } catch (e: any) {
        return { error: { _form: [e.message || 'Failed to create break'] } }
    }
}

export async function deletePeriodBreak(breakId: string, periodId: string) {
    try {
        const period = await prisma.coursePeriod.findUnique({ where: { id: periodId } })
        if (!period) return { error: 'Period not found' }

        await requireOrgAdminForOrganizer(period.organizerId)

        await prisma.periodBreak.delete({ where: { id: breakId } })

        revalidatePath(`/staffadmin/periods/${periodId}`)
        return { success: true }
    } catch (e: any) {
        return { error: e.message || 'Failed to delete break' }
    }
}
