'use server'

import { prisma } from '@/lib/db'
import { requireAdmin, requireOrganizerAccess } from '@/utils/auth-admin'
import { discountRuleSchema, orgDiscountRuleSchema } from '@/lib/schemas/discount'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getSelectedOrganizerForAdmin } from '@/utils/auth-org-admin'

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
    const orgAdminRole = userAccount.UserAccountRole.find(r => r.role === 'ORG_ADMIN' || r.role === 'ORGANIZER')
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
        config: config,
        overrideOrgRules: formData.get('overrideOrgRules') === 'on'
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
                config: result.data.config,
                overrideOrgRules: result.data.overrideOrgRules || false
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
    const orgAdminRole = userAccount.UserAccountRole.find(r => r.role === 'ORG_ADMIN' || r.role === 'ORGANIZER')
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
        config: config,
        overrideOrgRules: formData.get('overrideOrgRules') === 'on'
    }

    const result = discountRuleSchema.safeParse(raw)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    // Verify rule and period belong to user's organization
    const rule = await prisma.discountRule.findUnique({
        where: { id: ruleId },
        include: { CoursePeriod: true }
    })

    if (!rule || rule.CoursePeriod.organizerId !== orgAdminRole.organizerId) {
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
                config: result.data.config,
                overrideOrgRules: result.data.overrideOrgRules || false
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
    const organizerId = await getSelectedOrganizerForAdmin()

    // Verify rule belongs to a period in user's organization
    const rule = await prisma.discountRule.findFirst({
        where: { id: ruleId },
        include: { CoursePeriod: { select: { organizerId: true } } }
    })

    if (!rule || rule.CoursePeriod.organizerId !== organizerId) {
        return { success: false, error: 'Rule not found or access denied' }
    }

    await prisma.discountRule.delete({ where: { id: ruleId } })
    revalidatePath(`/staffadmin/discounts`)
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

// ========================
// Organization-level Discount Rules
// ========================

export async function getOrgDiscountRules(organizerId?: string) {
    const orgId = organizerId || await getSelectedOrganizerForAdmin()
    return await prisma.orgDiscountRule.findMany({
        where: { organizerId: orgId },
        orderBy: { priority: 'asc' }
    })
}

export async function getOrgDiscountRule(ruleId: string) {
    const organizerId = await getSelectedOrganizerForAdmin()
    return await prisma.orgDiscountRule.findFirst({
        where: { 
            id: ruleId,
            organizerId 
        }
    })
}

export async function createOrgDiscountRule(prevState: any, formData: FormData): Promise<{ error?: ActionError } | undefined> {
    const organizerId = await getSelectedOrganizerForAdmin()

    const configRaw = formData.get('config') as string
    let config = {}
    try {
        config = JSON.parse(configRaw)
    } catch (e) {
        return { error: { config: ['Invalid JSON configuration'] } }
    }

    const raw = {
        organizerId,
        code: formData.get('code'),
        name: formData.get('name'),
        priority: formData.get('priority'),
        enabled: formData.get('enabled') === 'on',
        ruleType: formData.get('ruleType'),
        config: config,
        appliesTo: formData.get('appliesTo') || 'BOTH'
    }

    const result = orgDiscountRuleSchema.safeParse(raw)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        await prisma.orgDiscountRule.create({
            data: {
                organizerId: result.data.organizerId,
                code: result.data.code,
                name: result.data.name,
                priority: result.data.priority,
                enabled: result.data.enabled,
                ruleType: result.data.ruleType,
                config: result.data.config,
                appliesTo: result.data.appliesTo
            }
        })
    } catch (e: any) {
        if (e.code === 'P2002') {
            return { error: { code: ['A rule with this code already exists'] } }
        }
        return { error: { _form: [e.message] } }
    }

    revalidatePath(`/staffadmin/discounts`)
    redirect(`/staffadmin/discounts`)
}

export async function updateOrgDiscountRule(prevState: any, formData: FormData): Promise<{ error?: ActionError } | undefined> {
    const organizerId = await getSelectedOrganizerForAdmin()

    const ruleId = formData.get('ruleId') as string
    if (!ruleId) {
        return { error: { _form: ['Rule ID is required'] } }
    }

    // Verify rule belongs to user's organization
    const existingRule = await prisma.orgDiscountRule.findFirst({
        where: { id: ruleId, organizerId }
    })

    if (!existingRule) {
        return { error: { _form: ['Rule not found or access denied'] } }
    }

    const configRaw = formData.get('config') as string
    let config = {}
    try {
        config = JSON.parse(configRaw)
    } catch (e) {
        return { error: { config: ['Invalid JSON configuration'] } }
    }

    const raw = {
        organizerId,
        code: formData.get('code'),
        name: formData.get('name'),
        priority: formData.get('priority'),
        enabled: formData.get('enabled') === 'on',
        ruleType: formData.get('ruleType'),
        config: config,
        appliesTo: formData.get('appliesTo') || 'BOTH'
    }

    const result = orgDiscountRuleSchema.safeParse(raw)

    if (!result.success) {
        return { error: result.error.flatten().fieldErrors }
    }

    try {
        await prisma.orgDiscountRule.update({
            where: { id: ruleId },
            data: {
                code: result.data.code,
                name: result.data.name,
                priority: result.data.priority,
                enabled: result.data.enabled,
                ruleType: result.data.ruleType,
                config: result.data.config,
                appliesTo: result.data.appliesTo
            }
        })
    } catch (e: any) {
        if (e.code === 'P2002') {
            return { error: { code: ['A rule with this code already exists'] } }
        }
        return { error: { _form: [e.message] } }
    }

    revalidatePath(`/staffadmin/discounts`)
    redirect(`/staffadmin/discounts`)
}

export async function deleteOrgDiscountRule(ruleId: string) {
    const organizerId = await getSelectedOrganizerForAdmin()

    // Verify rule belongs to user's organization
    const rule = await prisma.orgDiscountRule.findFirst({
        where: { id: ruleId, organizerId }
    })

    if (!rule) {
        return { success: false, error: 'Rule not found or access denied' }
    }

    await prisma.orgDiscountRule.delete({ where: { id: ruleId } })
    revalidatePath(`/staffadmin/discounts`)
    return { success: true }
}

export async function toggleOrgRuleEnabled(ruleId: string, enabled: boolean) {
    const organizerId = await getSelectedOrganizerForAdmin()

    // Verify rule belongs to user's organization
    const rule = await prisma.orgDiscountRule.findFirst({
        where: { id: ruleId, organizerId }
    })

    if (!rule) {
        return { success: false, error: 'Rule not found or access denied' }
    }

    await prisma.orgDiscountRule.update({
        where: { id: ruleId },
        data: { enabled }
    })
    revalidatePath(`/staffadmin/discounts`)
    return { success: true }
}

/**
 * Get effective discount rules for a period by merging org-level and period-level rules.
 * Period rules with overrideOrgRules=true replace org-level rules of the same type.
 * @param periodId The period ID to get rules for
 */
export async function getEffectiveDiscountRules(periodId: string) {
    // Get the period to find organizerId
    const period = await prisma.coursePeriod.findUnique({
        where: { id: periodId },
        select: { organizerId: true }
    })

    if (!period) {
        return []
    }

    // Get both org-level and period-level rules
    // Only include org rules that apply to PERIODS or BOTH
    const [orgRules, periodRules] = await Promise.all([
        prisma.orgDiscountRule.findMany({
            where: { 
                organizerId: period.organizerId, 
                enabled: true,
                appliesTo: { in: ['PERIODS', 'BOTH'] }
            },
            orderBy: { priority: 'asc' }
        }),
        prisma.discountRule.findMany({
            where: { periodId, enabled: true },
            orderBy: { priority: 'asc' }
        })
    ])

    // Find which rule types have period-level overrides
    const overriddenTypes = new Set(
        periodRules
            .filter(r => r.overrideOrgRules)
            .map(r => r.ruleType)
    )

    // Filter out org rules that are overridden by period rules
    const effectiveOrgRules = orgRules.filter(r => !overriddenTypes.has(r.ruleType))

    // Merge rules and sort by priority
    // Mark org rules with a source flag for UI display
    const mergedRules = [
        ...effectiveOrgRules.map(r => ({ ...r, source: 'organization' as const, overrideOrgRules: false })),
        ...periodRules.map(r => ({ ...r, source: 'period' as const }))
    ].sort((a, b) => a.priority - b.priority)

    return mergedRules
}

/**
 * Get effective discount rules for an event.
 * Returns organization-level rules that apply to EVENTS or BOTH.
 */
export async function getEffectiveDiscountRulesForEvent(organizerId: string) {
    const orgRules = await prisma.orgDiscountRule.findMany({
        where: { 
            organizerId, 
            enabled: true,
            appliesTo: { in: ['EVENTS', 'BOTH'] }
        },
        orderBy: { priority: 'asc' }
    })

    // Mark with source flag
    return orgRules.map(r => ({ ...r, source: 'organization' as const, overrideOrgRules: false }))
}
