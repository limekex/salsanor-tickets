import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect, notFound } from 'next/navigation'
import { StaffTrackForm } from '../staff-track-form'

export default async function EditStaffTrackPage({ 
    params 
}: { 
    params: Promise<{ trackId: string }> 
}) {
    const { trackId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Fetch the track
    const track = await prisma.courseTrack.findUnique({
        where: { id: trackId },
        include: {
            CoursePeriod: {
                select: { organizerId: true }
            }
        }
    })

    if (!track) {
        notFound()
    }

    // Verify user has ORG_ADMIN access
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: track.CoursePeriod.organizerId
                }
            }
        }
    })

    if (!userAccount?.UserAccountRole.length) {
        throw new Error('Unauthorized: You do not have access to edit this track')
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Edit Course Track</h2>
            </div>
            <StaffTrackForm periodId={track.periodId} track={track} />
        </div>
    )
}
