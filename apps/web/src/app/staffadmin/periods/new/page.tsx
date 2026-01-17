import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { StaffPeriodForm } from '../staff-period-form'

export default async function NewStaffPeriodPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get user's organizations where they have ORG_ADMIN role
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            roles: {
                where: {
                    role: 'ORG_ADMIN'
                },
                include: {
                    organizer: true
                }
            }
        }
    })

    const adminOrgIds = userAccount?.UserAccountRole.map(r => r.organizerId).filter(Boolean) as string[] || []
    const organizers = userAccount?.UserAccountRole.map(r => r.Organizer).filter(Boolean) || []

    if (adminOrgIds.length === 0) {
        redirect('/dashboard')
    }

    // Fetch categories (global) and tags (for user's orgs)
    const [categories, tags] = await Promise.all([
        prisma.category.findMany({ orderBy: { sortOrder: 'asc' } }),
        prisma.tag.findMany({ 
            where: { organizerId: { in: adminOrgIds } },
            orderBy: { name: 'asc' }
        })
    ])

    // Serialize Decimal fields for client component
    const serializedOrganizers = organizers.map(org => ({
        ...org,
        mvaRate: Number(org.mvaRate),
        stripeFeePercentage: Number(org.stripeFeePercentage),
        fiscalYearStart: org.fiscalYearStart?.toISOString() ?? null,
    }))

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">New Course Period</h2>
            </div>
            <StaffPeriodForm 
                organizerIds={adminOrgIds}
                organizers={serializedOrganizers as any}
                categories={categories}
                tags={tags}
            />
        </div>
    )
}
