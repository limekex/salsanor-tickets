'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getStaffAdminSelectedOrg } from './staff-admin-org-context'

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

/**
 * Gets the currently selected organization ID for the user in staff admin context.
 * Uses the org from cookie if available, otherwise returns first available org.
 * Validates that the user has ORG_ADMIN access to the selected org.
 */
export async function getSelectedOrganizerForAdmin() {
    const userAccount = await requireOrgAdmin()
    
    // Get selected org from cookie
    let selectedOrgId = await getStaffAdminSelectedOrg()
    
    // Get list of orgs user has ORG_ADMIN access to
    const availableOrgIds = userAccount.UserAccountRole.map(role => role.organizerId)
    
    // Validate selected org is in user's orgs
    if (selectedOrgId && !availableOrgIds.includes(selectedOrgId)) {
        selectedOrgId = null
    }
    
    // If no valid selection, use first available org
    if (!selectedOrgId && availableOrgIds.length > 0) {
        selectedOrgId = availableOrgIds[0]
    }
    
    if (!selectedOrgId) {
        throw new Error('No organization access found')
    }
    
    return selectedOrgId
}
