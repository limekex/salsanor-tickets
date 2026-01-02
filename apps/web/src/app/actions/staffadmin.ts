'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { UserRole } from '@prisma/client'

export async function updateOrganizerSettings(organizerId: string, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Verify user has ORG_ADMIN role for this organizer
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            roles: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: organizerId
                }
            }
        }
    })

    if (!userAccount?.roles.length) {
        throw new Error('Unauthorized: You do not have access to edit this organization')
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const website = formData.get('website') as string
    const contactEmail = formData.get('contactEmail') as string
    const city = formData.get('city') as string

    if (!name || name.trim().length === 0) {
        return { error: { name: ['Name is required'] } }
    }

    try {
        await prisma.organizer.update({
            where: { id: organizerId },
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                website: website?.trim() || null,
                contactEmail: contactEmail?.trim() || null,
                city: city?.trim() || null,
            }
        })

        revalidatePath('/staffadmin/settings')
        revalidatePath('/staffadmin')
        
        return { success: true }
    } catch (error: any) {
        console.error('Failed to update organizer:', error)
        return { error: { _form: ['Failed to update organization settings'] } }
    }
}

export async function addUserRoleStaff(userId: string, role: string, organizerId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Verify user has ORG_ADMIN role for this organizer
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            roles: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: organizerId
                }
            }
        }
    })

    if (!userAccount?.roles.length) {
        throw new Error('Unauthorized: You do not have access to manage roles for this organization')
    }

    // Only allow org-scoped roles (not global ADMIN)
    const allowedRoles = ['ORG_ADMIN', 'ORG_FINANCE', 'ORG_CHECKIN', 'INSTRUCTOR', 'STAFF', 'PARTICIPANT']
    if (!allowedRoles.includes(role)) {
        throw new Error('You can only assign organization-scoped roles')
    }

    // Check if role already exists
    const existingRole = await prisma.userAccountRole.findFirst({
        where: {
            userId,
            role: role as UserRole,
            organizerId
        }
    })

    if (existingRole) {
        throw new Error('User already has this role')
    }

    await prisma.userAccountRole.create({
        data: {
            userId,
            role: role as UserRole,
            organizerId
        }
    })

    revalidatePath('/staffadmin/users')
    return { success: true }
}

export async function removeUserRoleStaff(roleId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Get the role to verify access
    const role = await prisma.userAccountRole.findUnique({
        where: { id: roleId },
        select: { organizerId: true, role: true }
    })

    if (!role || !role.organizerId) {
        throw new Error('Role not found or is a global role')
    }

    // Verify user has ORG_ADMIN role for this organizer
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            roles: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: role.organizerId
                }
            }
        }
    })

    if (!userAccount?.roles.length) {
        throw new Error('Unauthorized: You do not have access to manage roles for this organization')
    }

    await prisma.userAccountRole.delete({
        where: { id: roleId }
    })

    revalidatePath('/staffadmin/users')
    return { success: true }
}

export async function searchUserByEmailStaff(email: string, organizerId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Verify user has ORG_ADMIN role for this organizer
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            roles: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: organizerId
                }
            }
        }
    })

    if (!userAccount?.roles.length) {
        throw new Error('Unauthorized')
    }

    return await prisma.userAccount.findUnique({
        where: { email },
        include: {
            roles: {
                where: {
                    organizerId: organizerId
                },
                include: {
                    organizer: {
                        select: {
                            id: true,
                            name: true,
                        }
                    }
                }
            },
            personProfile: true
        }
    })
}
