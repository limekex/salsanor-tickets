'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

/**
 * Requires user to have ORG_FINANCE or ORG_ADMIN role for at least one organization
 * Returns the user account with their org finance/admin roles
 */
export async function requireOrgFinance() {
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
                    OR: [
                        { role: 'ORG_FINANCE' },
                        { role: 'ORG_ADMIN' }
                    ]
                },
                include: {
                    Organizer: true
                }
            }
        }
    })

    if (!userAccount || userAccount.UserAccountRole.length === 0) {
        throw new Error('Unauthorized: Finance access required')
    }

    return userAccount
}

/**
 * Requires user to have ORG_FINANCE or ORG_ADMIN role for specific organization
 */
export async function requireOrgFinanceForOrganizer(organizerId: string) {
    const userAccount = await requireOrgFinance()
    
    const hasAccess = userAccount.UserAccountRole.some(role => role.organizerId === organizerId)
    
    if (!hasAccess) {
        throw new Error('Unauthorized: You do not have finance access to this organization')
    }

    return userAccount
}
