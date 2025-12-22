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

    const adminOrgIds = userAccount?.roles.map(r => r.organizerId).filter(Boolean) || []
    const organizers = userAccount?.roles.map(r => r.organizer).filter(Boolean) || []

    if (adminOrgIds.length === 0) {
        redirect('/dashboard')
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">New Course Period</h2>
            </div>
            <StaffPeriodForm 
                organizerIds={adminOrgIds}
                organizers={organizers}
            />
        </div>
    )
}
