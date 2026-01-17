'use server'

import { prisma } from '@/lib/db'
import { requireAdmin, requireOrganizerAccess } from '@/utils/auth-admin'
import { revalidatePath } from 'next/cache'
import type { UserRole } from '@prisma/client'

export async function getUsers(organizerId?: string) {
    await requireAdmin()

    const users = await prisma.userAccount.findMany({
        include: {
            UserAccountRole: {
                where: organizerId ? { organizerId } : undefined,
                include: {
                    Organizer: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        }
                    }
                }
            },
            PersonProfile: {
                select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    // If filtering by org, only return users who have roles in that org
    if (organizerId) {
        return users.filter(user => user.UserAccountRole.length > 0)
    }

    return users
}

export async function getUserById(userId: string) {
    await requireAdmin()

    return await prisma.userAccount.findUnique({
        where: { id: userId },
        include: {
            UserAccountRole: {
                include: {
                    Organizer: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        }
                    }
                }
            },
            PersonProfile: true
        }
    })
}

export async function addUserRole(userId: string, role: string, organizerId?: string) {
    await requireAdmin()

    // Validate that organizerId is provided for org-scoped roles
    const orgScopedRoles = ['ORG_ADMIN', 'ORG_FINANCE', 'ORG_CHECKIN', 'ORGANIZER']
    if (orgScopedRoles.includes(role) && !organizerId) {
        throw new Error(`Role ${role} requires an organizerId`)
    }

    // Check if role already exists
    const existingRole = await prisma.userAccountRole.findFirst({
        where: {
            userId,
            role: role as UserRole,
            organizerId: organizerId || null
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

    revalidatePath('/admin/users')
    return { success: true }
}

export async function removeUserRole(roleId: string) {
    await requireAdmin()

    await prisma.userAccountRole.delete({
        where: { id: roleId }
    })

    revalidatePath('/admin/users')
    return { success: true }
}

export async function searchUserByEmail(email: string) {
    await requireAdmin()

    return await prisma.userAccount.findUnique({
        where: { email },
        include: {
            UserAccountRole: {
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
}

export async function getOrganizersForUserManagement() {
    await requireAdmin()

    return await prisma.organizer.findMany({
        orderBy: { name: 'asc' },
        select: {
            id: true,
            name: true,
            slug: true,
        }
    })
}

// Get users for a specific organizer (for ORG_ADMIN use)
export async function getOrganizationUsers(organizerId: string) {
    await requireOrganizerAccess(organizerId)

    const users = await prisma.userAccount.findMany({
        where: {
            UserAccountRole: {
                some: {
                    organizerId
                }
            }
        },
        include: {
            UserAccountRole: {
                where: { organizerId },
                include: {
                    Organizer: {
                        select: {
                            id: true,
                            name: true,
                        }
                    }
                }
            },
            PersonProfile: {
                select: {
                    firstName: true,
                    lastName: true,
                    phone: true,
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return users
}

export async function updateUserInfo(
    userId: string,
    data: {
        email: string
        firstName: string
        lastName: string
        phone?: string
    }
) {
    await requireAdmin()

    // Update UserAccount email
    await prisma.userAccount.update({
        where: { id: userId },
        data: { email: data.email }
    })

    // Find or create PersonProfile
    const user = await prisma.userAccount.findUnique({
        where: { id: userId },
        include: { PersonProfile: true }
    })

    if (user?.PersonProfile) {
        // Update existing profile
        await prisma.personProfile.update({
            where: { id: user.PersonProfile.id },
            data: {
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone || null,
            }
        })
    } else {
        // Create new profile
        await prisma.personProfile.create({
            data: {
                userId: userId,
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone || null,
            }
        })
    }

    revalidatePath('/admin/users')
    revalidatePath(`/admin/users/${userId}`)
}
