'use server'

import { cookies } from 'next/headers'
import { requireOrgAdmin } from './auth-org-admin'

const STAFF_ADMIN_ORG_COOKIE = 'staff_admin_selected_org'

export async function getStaffAdminSelectedOrg(): Promise<string | null> {
    const cookieStore = await cookies()
    return cookieStore.get(STAFF_ADMIN_ORG_COOKIE)?.value || null
}

export async function setStaffAdminSelectedOrg(organizerId: string) {
    await requireOrgAdmin() // Only org admins/finance can switch org context
    const cookieStore = await cookies()
    cookieStore.set(STAFF_ADMIN_ORG_COOKIE, organizerId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
    })
}

export async function clearStaffAdminSelectedOrg() {
    const cookieStore = await cookies()
    cookieStore.delete(STAFF_ADMIN_ORG_COOKIE)
}
