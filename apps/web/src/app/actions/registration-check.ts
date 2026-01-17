'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'

export async function checkDuplicateRegistrations(trackIds: string[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            PersonProfile: {
                include: {
                    Registration: {
                        where: {
                            trackId: { in: trackIds },
                            // Only check for real registrations that block new signups
                            // DRAFT registrations are automatically cleaned up during checkout
                            status: { in: ['PENDING_PAYMENT', 'ACTIVE', 'WAITLIST'] }
                        },
                        include: {
                            CourseTrack: {
                                select: {
                                    id: true,
                                    title: true
                                }
                            }
                        }
                    }
                }
            }
        }
    })

    return userAccount?.PersonProfile?.Registration || []
}
