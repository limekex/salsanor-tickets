'use server'

import { createClient } from './supabase/server'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'

/**
 * Require user to be a global ADMIN
 */
export async function requireAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: true
        }
    })

    const isAdmin = userAccount?.UserAccountRole.some(r => r.role === 'ADMIN')

    if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required')
    }

    return userAccount
}

/**
 * Require user to be ADMIN or ORG_ADMIN for a specific organizer
 */
export async function requireOrganizerAccess(organizerId?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: true
        }
    })

    if (!userAccount) {
        throw new Error('User account not found')
    }

    // Global ADMIN can access everything
    const isGlobalAdmin = userAccount.UserAccountRole.some(r => r.role === 'ADMIN')
    if (isGlobalAdmin) {
        return { userAccount, isGlobalAdmin: true, isOrgAdmin: false }
    }

    // If organizerId is provided, check if user is ORG_ADMIN for that organizer
    if (organizerId) {
        const isOrgAdmin = userAccount.UserAccountRole.some(
            r => (r.role === 'ORG_ADMIN' || r.role === 'ORGANIZER') && r.organizerId === organizerId
        )

        if (!isOrgAdmin) {
            throw new Error('Unauthorized: Organizer admin access required')
        }

        return { userAccount, isGlobalAdmin: false, isOrgAdmin: true }
    }

    // No organizerId provided, but user must have at least one ORG_ADMIN role
    const hasOrgAdminRole = userAccount.UserAccountRole.some(r => r.role === 'ORG_ADMIN' || r.role === 'ORGANIZER')
    if (!hasOrgAdminRole) {
        throw new Error('Unauthorized: Organizer admin access required')
    }

    return { userAccount, isGlobalAdmin: false, isOrgAdmin: true }
}

/**
 * Get user's organizer IDs (for ORG_ADMIN roles)
 */
export async function getUserOrganizerIds() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return []
    }

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    role: { in: ['ORG_ADMIN', 'ORGANIZER'] }
                }
            }
        }
    })

    return userAccount?.UserAccountRole
        .filter(r => r.organizerId)
        .map(r => r.organizerId!) || []
}

/**
 * Check if user has a specific role (optionally for a specific organizer)
 */
export async function hasRole(role: string, organizerId?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return false
    }

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: true
        }
    })

    if (!userAccount) {
        return false
    }

    // Global ADMIN has all permissions
    if (userAccount.UserAccountRole.some(r => r.role === 'ADMIN')) {
        return true
    }

    // Check for specific role
    if (organizerId) {
        return userAccount.UserAccountRole.some(r => r.role === role && r.organizerId === organizerId)
    }

    return userAccount.UserAccountRole.some(r => r.role === role)
}
