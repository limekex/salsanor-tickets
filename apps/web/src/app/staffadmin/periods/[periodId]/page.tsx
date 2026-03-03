import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { StaffPeriodForm } from '../staff-period-form'
import { BreakManager } from '../break-manager'
import type { Organizer } from '@prisma/client'

// Helper to serialize Decimal fields to plain numbers for client components
function serializeOrganizer(org: Organizer) {
    return {
        ...org,
        mvaRate: org.mvaRate ? Number(org.mvaRate) : null,
        stripeFeePercentage: org.stripeFeePercentage ? Number(org.stripeFeePercentage) : null,
        platformFeePercent: org.platformFeePercent ? Number(org.platformFeePercent) : null,
    }
}

export default async function EditStaffPeriodPage({ 
    params 
}: { 
    params: Promise<{ periodId: string }> 
}) {
    const { periodId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get user's organizations where they have ORG_ADMIN role
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN'
                },
                include: {
                    Organizer: true
                }
            }
        }
    })

    const adminOrgIds = userAccount?.UserAccountRole.map(r => r.organizerId).filter(Boolean) as string[] || []
    const organizers = userAccount?.UserAccountRole.map(r => r.Organizer).filter(Boolean) || []

    if (adminOrgIds.length === 0) {
        redirect('/dashboard')
    }

    // Fetch the period with categories, tags, and breaks
    const period = await prisma.coursePeriod.findUnique({
        where: { id: periodId },
        include: {
            Category: true,
            Tag: true,
            PeriodBreak: {
                orderBy: { startDate: 'asc' }
            }
        }
    })

    if (!period) {
        notFound()
    }

    // Verify user has access to this period's organizer
    if (!adminOrgIds.includes(period.organizerId)) {
        throw new Error('Unauthorized: You do not have access to this period')
    }

    // Fetch categories (global) and tags (for user's orgs)
    const [categories, tags] = await Promise.all([
        prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.tag.findMany({ 
            where: { organizerId: { in: adminOrgIds } },
            orderBy: { name: 'asc' }
        })
    ])

    // Serialize organizers to convert Decimal to plain numbers
    const serializedOrganizers = organizers.map(org => org ? serializeOrganizer(org) : null).filter(Boolean)

    return (
        <div className="max-w-3xl mx-auto space-y-rn-6 px-rn-4 sm:px-0">
            <div className="flex items-center justify-between">
                <h2 className="rn-h2">Edit Course Period</h2>
            </div>
            <StaffPeriodForm 
                key={period.id}
                period={period as any}
                organizerIds={adminOrgIds}
                organizers={serializedOrganizers as any}
                categories={categories}
                tags={tags}
            />
            <BreakManager 
                periodId={period.id} 
                breaks={period.PeriodBreak}
                periodStartDate={period.startDate}
                periodEndDate={period.endDate}
            />
        </div>
    )
}
