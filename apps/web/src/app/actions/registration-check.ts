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
            personProfile: {
                include: {
                    registrations: {
                        where: {
                            trackId: { in: trackIds },
                            status: { in: ['DRAFT', 'PENDING_PAYMENT', 'ACTIVE', 'WAITLIST'] }
                        },
                        include: {
                            track: {
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

    return userAccount?.personProfile?.registrations || []
}
