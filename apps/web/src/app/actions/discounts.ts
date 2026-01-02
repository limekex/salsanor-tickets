'use server'

import { prisma } from '@/lib/db'
import { requireAdmin, requireOrganizerAccess } from '@/utils/auth-admin'
import { discountRuleSchema } from '@/lib/schemas/discount'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// Basic helper type for server action results
type ActionError = {
    _form?: string[]
    [key: string]: string[] | undefined
}

export async function createDiscountRule(prevState: any, formData: FormData): Promise<{ error?: ActionError } | undefined> {
    await requireAdmin()

    // 1. Manually build the object because config is JSON
    // We expect the form to send simple fields, but config might need special handling
    // or we can expect the client to send a structured JSON string for 'config'

    const configRaw = formData.get('config') as string
    let config = {}
    try {
        config = JSON.parse(configRaw)
    } catch (e) {
        return { error: { config: ['Invalid JSON configuration'] } }
    }

    const raw = {
        periodId: formData.get('periodId'),
        code: formData.get('code'),
        name: formData.get('name'),
        priority: formData.get('priority'),
        enabled: formData.get('enabled') === 'on',
        ruleType: formData.get('ruleType'),
        config: config
    }

    const result = discountRuleSchema.safeParse(raw)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        await prisma.discountRule.create({
            data: {
                periodId: result.data.periodId,
                code: result.data.code,
                name: result.data.name,
                priority: result.data.priority,
                enabled: result.data.enabled,
                ruleType: result.data.ruleType,
                config: result.data.config
            }
        })
    } catch (e: any) {
        return { error: { _form: [e.message] } }
    }

    const periodId = result.data.periodId
    revalidatePath(`/admin/periods/${periodId}/rules`)
    redirect(`/admin/periods/${periodId}/rules`)
}

export async function getDiscountRules(periodId: string) {
    await requireAdmin()
    return await prisma.discountRule.findMany({
        where: { periodId },
        orderBy: { priority: 'asc' }
    })
}

// Organization-scoped discount rule actions for staffadmin
export async function createDiscountRuleForOrganizer(prevState: any, formData: FormData): Promise<{ error?: ActionError } | undefined> {
    const { userAccount } = await requireOrganizerAccess()

    // Get user's organizerId from their ORG_ADMIN role
    const orgAdminRole = userAccount.roles.find(r => r.role === 'ORG_ADMIN' || r.role === 'ORGANIZER')
    if (!orgAdminRole?.organizerId) {
        return { error: { _form: ['No organizer access found'] } }
    }

    const configRaw = formData.get('config') as string
    let config = {}
    try {
        config = JSON.parse(configRaw)
    } catch (e) {
        return { error: { config: ['Invalid JSON configuration'] } }
    }

    const raw = {
        periodId: formData.get('periodId'),
        code: formData.get('code'),
        name: formData.get('name'),
        priority: formData.get('priority'),
        enabled: formData.get('enabled') === 'on',
        ruleType: formData.get('ruleType'),
        config: config
    }

    const result = discountRuleSchema.safeParse(raw)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    // Verify period belongs to user's organization
    const period = await prisma.coursePeriod.findFirst({
        where: {
            id: result.data.periodId,
            organizerId: orgAdminRole.organizerId
        }
    })

    if (!period) {
        return { error: { _form: ['Period not found or access denied'] } }
    }

    try {
        await prisma.discountRule.create({
            data: {
                periodId: result.data.periodId,
                code: result.data.code,
                name: result.data.name,
                priority: result.data.priority,
                enabled: result.data.enabled,
                ruleType: result.data.ruleType,
                config: result.data.config
            }
        })
    } catch (e: any) {
        return { error: { _form: [e.message] } }
    }

    revalidatePath(`/staffadmin/discounts`)
    redirect(`/staffadmin/discounts`)
}

export async function updateDiscountRuleForOrganizer(prevState: any, formData: FormData): Promise<{ error?: ActionError } | undefined> {
    const { userAccount } = await requireOrganizerAccess()

    // Get user's organizerId from their ORG_ADMIN role
    const orgAdminRole = userAccount.roles.find(r => r.role === 'ORG_ADMIN' || r.role === 'ORGANIZER')
    if (!orgAdminRole?.organizerId) {
        return { error: { _form: ['No organizer access found'] } }
    }

    const ruleId = formData.get('ruleId') as string
    if (!ruleId) {
        return { error: { _form: ['Rule ID is required'] } }
    }

    const configRaw = formData.get('config') as string
    let config = {}
    try {
        config = JSON.parse(configRaw)
    } catch (e) {
        return { error: { config: ['Invalid JSON configuration'] } }
    }

    const raw = {
        periodId: formData.get('periodId'),
        code: formData.get('code'),
        name: formData.get('name'),
        priority: formData.get('priority'),
        enabled: formData.get('enabled') === 'on',
        ruleType: formData.get('ruleType'),
        config: config
    }

    const result = discountRuleSchema.safeParse(raw)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    // Verify rule and period belong to user's organization
    const rule = await prisma.discountRule.findUnique({
        where: { id: ruleId },
        include: { period: true }
    })

    if (!rule || rule.period.organizerId !== orgAdminRole.organizerId) {
        return { error: { _form: ['Rule not found or access denied'] } }
    }

    try {
        await prisma.discountRule.update({
            where: { id: ruleId },
            data: {
                code: result.data.code,
                name: result.data.name,
                priority: result.data.priority,
                enabled: result.data.enabled,
                ruleType: result.data.ruleType,
                config: result.data.config
            }
        })
    } catch (e: any) {
        return { error: { _form: [e.message] } }
    }

    revalidatePath(`/staffadmin/discounts`)
    redirect(`/staffadmin/discounts`)
}

export async function toggleRuleEnabled(ruleId: string, enabled: boolean) {
    await requireAdmin()
    await prisma.discountRule.update({
        where: { id: ruleId },
        data: { enabled }
    })
    // We can't easily revalidate path without knowing periodId, 
    // so we might need to return it or just let the client refresh
    return { success: true }
}

export async function deleteRule(ruleId: string) {
    await requireAdmin()
    await prisma.discountRule.delete({ where: { id: ruleId } })
    return { success: true }
}

export async function getDiscountRule(ruleId: string) {
    await requireAdmin()
    return await prisma.discountRule.findUnique({
        where: { id: ruleId }
    })
}

export async function updateDiscountRule(prevState: any, formData: FormData): Promise<{ error?: ActionError } | undefined> {
    await requireAdmin()

    const ruleId = formData.get('ruleId') as string
    if (!ruleId) {
        return { error: { _form: ['Rule ID is required'] } }
    }

    const configRaw = formData.get('config') as string
    let config = {}
    try {
        config = JSON.parse(configRaw)
    } catch (e) {
        return { error: { config: ['Invalid JSON configuration'] } }
    }

    const raw = {
        periodId: formData.get('periodId'),
        code: formData.get('code'),
        name: formData.get('name'),
        priority: formData.get('priority'),
        enabled: formData.get('enabled') === 'on',
        ruleType: formData.get('ruleType'),
        config: config
    }

    const result = discountRuleSchema.safeParse(raw)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        await prisma.discountRule.update({
            where: { id: ruleId },
            data: {
                code: result.data.code,
                name: result.data.name,
                priority: result.data.priority,
                enabled: result.data.enabled,
                ruleType: result.data.ruleType,
                config: result.data.config
            }
        })
    } catch (e: any) {
        return { error: { _form: [e.message] } }
    }

    const periodId = result.data.periodId
    revalidatePath(`/admin/periods/${periodId}/rules`)
    redirect(`/admin/periods/${periodId}/rules`)
}
