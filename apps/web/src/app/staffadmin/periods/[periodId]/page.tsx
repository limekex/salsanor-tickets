import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { StaffPeriodForm } from '../staff-period-form'

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

    const adminOrgIds = userAccount?.roles.map(r => r.organizerId).filter(Boolean) || []
    const organizers = userAccount?.roles.map(r => r.organizer).filter(Boolean) || []

    if (adminOrgIds.length === 0) {
        redirect('/dashboard')
    }

    // Fetch the period
    const period = await prisma.coursePeriod.findUnique({
        where: { id: periodId }
    })

    if (!period) {
        notFound()
    }

    // Verify user has access to this period's organizer
    if (!adminOrgIds.includes(period.organizerId)) {
        throw new Error('Unauthorized: You do not have access to this period')
    }

    return (
        <div className="max-w-3xl mx-auto space-y-rn-6 px-rn-4 sm:px-0">
            <div className="flex items-center justify-between">
                <h2 className="rn-h2">Edit Course Period</h2>
            </div>
            <StaffPeriodForm 
                period={period}
                organizerIds={adminOrgIds}
                organizers={organizers}
            />
        </div>
    )
}
