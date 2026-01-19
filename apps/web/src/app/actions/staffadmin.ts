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
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: organizerId
                }
            }
        }
    })

    if (!userAccount?.UserAccountRole.length) {
        throw new Error('Unauthorized: You do not have access to edit this organization')
    }

    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const website = formData.get('website') as string
    const contactEmail = formData.get('contactEmail') as string
    const city = formData.get('city') as string
    const organizationNumber = formData.get('organizationNumber') as string
    const legalName = formData.get('legalName') as string
    const legalAddress = formData.get('legalAddress') as string
    const legalEmail = formData.get('legalEmail') as string
    const companyType = formData.get('companyType') as string
    const vatRegistered = formData.get('vatRegistered') === 'true'
    const mvaRate = formData.get('mvaRate') ? Number(formData.get('mvaRate')) : 0
    const bankAccount = formData.get('bankAccount') as string
    const orderPrefix = formData.get('orderPrefix') as string

    if (!name || name.trim().length === 0) {
        return { error: { name: ['Name is required'] } }
    }

    // Validate organization number if provided
    if (organizationNumber && !/^\d{9}$/.test(organizationNumber)) {
        return { error: { organizationNumber: ['Must be 9 digits'] } }
    }

    // Validate order prefix if provided
    if (orderPrefix && (orderPrefix.length < 3 || orderPrefix.length > 5 || !/^[A-Z0-9]+$/.test(orderPrefix))) {
        return { error: { orderPrefix: ['Must be 3-5 characters (A-Z, 0-9 only)'] } }
    }

    // Check if orderPrefix is unique (excluding current organizer)
    if (orderPrefix && orderPrefix.trim() !== '') {
        const existingOrg = await prisma.organizer.findFirst({
            where: { 
                orderPrefix: orderPrefix.trim(),
                id: { not: organizerId }
            }
        })
        if (existingOrg) {
            return { error: { orderPrefix: ['Order prefix must be unique'] } }
        }
    }

    // Validate legal email if provided
    if (legalEmail && legalEmail.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(legalEmail)) {
            return { error: { legalEmail: ['Invalid email format'] } }
        }
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
                organizationNumber: organizationNumber?.trim() || null,
                legalName: legalName?.trim() || null,
                legalAddress: legalAddress?.trim() || null,
                legalEmail: legalEmail?.trim() || null,
                companyType: companyType?.trim() || null,
                vatRegistered,
                mvaRate,
                bankAccount: bankAccount?.trim() || null,
                orderPrefix: orderPrefix?.trim() || 'ORD',
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
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: organizerId
                }
            }
        }
    })

    if (!userAccount?.UserAccountRole.length) {
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
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: role.organizerId
                }
            }
        }
    })

    if (!userAccount?.UserAccountRole.length) {
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
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: organizerId
                }
            }
        }
    })

    if (!userAccount?.UserAccountRole.length) {
        throw new Error('Unauthorized')
    }

    const foundUser = await prisma.userAccount.findUnique({
        where: { email },
        include: {
            UserAccountRole: {
                where: {
                    organizerId: organizerId
                },
                include: {
                    Organizer: {
                        select: {
                            id: true,
                            name: true,
                        }
                    }
                }
            },
            PersonProfile: true
        }
    })

    if (!foundUser) return null

    // Transform to expected client format
    return {
        id: foundUser.id,
        email: foundUser.email,
        personProfile: foundUser.PersonProfile ? {
            firstName: foundUser.PersonProfile.firstName,
            lastName: foundUser.PersonProfile.lastName,
        } : null,
        roles: foundUser.UserAccountRole.map(r => ({
            id: r.id,
            role: r.role,
            organizer: r.Organizer ? { name: r.Organizer.name } : null
        }))
    }
}
