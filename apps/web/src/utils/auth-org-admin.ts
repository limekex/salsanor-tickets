'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

/**
 * Requires user to have ORG_ADMIN role for at least one organization
 * Returns the user account with their org admin roles
 */
export async function requireOrgAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

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

    if (!userAccount || userAccount.UserAccountRole.length === 0) {
        throw new Error('Unauthorized: Organization admin access required')
    }

    return userAccount
}

/**
 * Requires user to have ORG_ADMIN role for specific organization
 * Returns the user account if authorized
 */
export async function requireOrgAdminForOrganizer(organizerId: string) {
    const userAccount = await requireOrgAdmin()
    
    const hasAccess = userAccount.UserAccountRole.some(role => role.organizerId === organizerId)
    
    if (!hasAccess) {
        throw new Error('Unauthorized: You do not have admin access to this organization')
    }

    return userAccount
}
