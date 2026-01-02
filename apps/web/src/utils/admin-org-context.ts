'use server'

import { cookies } from 'next/headers'
import { requireAdmin } from './auth-admin'

const ADMIN_ORG_COOKIE = 'admin_selected_org'

export async function getAdminSelectedOrg(): Promise<string | null> {
    const cookieStore = await cookies()
    return cookieStore.get(ADMIN_ORG_COOKIE)?.value || null
}

export async function setAdminSelectedOrg(organizerId: string) {
    await requireAdmin() // Only admins can switch org context
    const cookieStore = await cookies()
    cookieStore.set(ADMIN_ORG_COOKIE, organizerId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
    })
}

export async function clearAdminSelectedOrg() {
    const cookieStore = await cookies()
    cookieStore.delete(ADMIN_ORG_COOKIE)
}
