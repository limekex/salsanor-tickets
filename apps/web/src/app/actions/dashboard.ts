'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'

export async function getUserRoles() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        return { roles: [], organizers: [] }
    }

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                include: {
                    Organizer: true
                }
            }
        }
    })

    if (!userAccount) {
        return { roles: [], organizers: [] }
    }

    // Group roles by organizer
    const organizerRoles = new Map<string, { 
        organizer: any, 
        roles: string[] 
    }>()

    const globalRoles: string[] = []

    userAccount.UserAccountRole.forEach(role => {
        if (role.organizerId && role.Organizer) {
            const existing = organizerRoles.get(role.organizerId)
            if (existing) {
                existing.roles.push(role.role)
            } else {
                organizerRoles.set(role.organizerId, {
                    organizer: role.Organizer,
                    roles: [role.role]
                })
            }
        } else {
            globalRoles.push(role.role)
        }
    })

    return {
        globalRoles,
        organizers: Array.from(organizerRoles.values())
    }
}
