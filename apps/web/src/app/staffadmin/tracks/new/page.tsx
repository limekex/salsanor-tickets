import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { StaffTrackForm } from '../staff-track-form'

type SearchParams = Promise<{ periodId?: string }>

export default async function NewStaffTrackPage({
    searchParams,
}: {
    searchParams: SearchParams
}) {
    const { periodId } = await searchParams

    if (!periodId) {
        return <div>Error: No period specified</div>
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Verify user has ORG_ADMIN access to this period
    const period = await prisma.coursePeriod.findUnique({
        where: { id: periodId },
        select: { organizerId: true }
    })

    if (!period) {
        return <div>Period not found</div>
    }

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: period.organizerId
                }
            }
        }
    })

    if (!userAccount?.UserAccountRole.length) {
        throw new Error('Unauthorized: You do not have access to create tracks for this period')
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">New Course Track</h2>
            </div>
            <StaffTrackForm periodId={periodId} />
        </div>
    )
}
