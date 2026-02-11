'use server'

import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { emailService } from '@/lib/email/email-service'
import type { UserRole } from '@prisma/client'
import { randomUUID } from 'crypto'

interface InviteResult {
    success?: boolean
    error?: { _form?: string[]; email?: string[] }
    inviteId?: string
}

/**
 * Send invitation to a new user to join an organization with a specific role
 */
export async function inviteUserToOrganization(
    email: string,
    role: string,
    organizerId: string
): Promise<InviteResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return { error: { email: ['Invalid email address'] } }
    }

    // Verify current user has ORG_ADMIN role for this organizer
    const currentUserAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: organizerId
                }
            },
            PersonProfile: true
        }
    })

    if (!currentUserAccount?.UserAccountRole.length) {
        return { error: { _form: ['Unauthorized: You do not have access to invite users to this organization'] } }
    }

    // Only allow org-scoped roles (not global ADMIN)
    const allowedRoles = ['ORG_ADMIN', 'ORG_FINANCE', 'ORG_CHECKIN', 'INSTRUCTOR', 'STAFF', 'PARTICIPANT']
    if (!allowedRoles.includes(role)) {
        return { error: { _form: ['You can only invite users to organization-scoped roles'] } }
    }

    // Get organizer details
    const organizer = await prisma.organizer.findUnique({
        where: { id: organizerId },
        select: { id: true, name: true, slug: true }
    })

    if (!organizer) {
        return { error: { _form: ['Organization not found'] } }
    }

    // Check if user already exists
    const existingUser = await prisma.userAccount.findUnique({
        where: { email: email.toLowerCase() },
        include: {
            UserAccountRole: {
                where: { organizerId }
            }
        }
    })

    if (existingUser) {
        // Check if they already have this role
        const hasRole = existingUser.UserAccountRole.some(r => r.role === role)
        if (hasRole) {
            return { error: { _form: ['User already has this role in your organization'] } }
        }

        // User exists - add the role directly instead of inviting
        await prisma.userAccountRole.create({
            data: {
                userId: existingUser.id,
                role: role as UserRole,
                organizerId
            }
        })

        // Send notification email
        try {
            await emailService.sendTransactional({
                organizerId,
                templateSlug: 'role-assigned',
                recipientEmail: existingUser.email,
                recipientName: existingUser.email,
                variables: {
                    role: getRoleLabel(role),
                    organizationName: organizer.name,
                    inviterName: currentUserAccount.PersonProfile 
                        ? `${currentUserAccount.PersonProfile.firstName} ${currentUserAccount.PersonProfile.lastName}`
                        : currentUserAccount.email,
                    dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
                }
            })
        } catch (e) {
            console.error('Failed to send role assignment email:', e)
            // Don't fail - role is assigned, email is secondary
        }

        revalidatePath('/staffadmin/users')
        return { success: true }
    }

    // User doesn't exist - create invitation
    const inviteToken = randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Create or update invitation record
    const invite = await prisma.userInvitation.upsert({
        where: {
            email_organizerId: {
                email: email.toLowerCase(),
                organizerId
            }
        },
        update: {
            role: role as UserRole,
            token: inviteToken,
            expiresAt,
            invitedById: currentUserAccount.id,
            status: 'PENDING'
        },
        create: {
            email: email.toLowerCase(),
            role: role as UserRole,
            organizerId,
            token: inviteToken,
            expiresAt,
            invitedById: currentUserAccount.id,
            status: 'PENDING'
        }
    })

    // Send invitation email
    try {
        await emailService.sendTransactional({
            organizerId,
            templateSlug: 'user-invitation',
            recipientEmail: email,
            variables: {
                role: getRoleLabel(role),
                organizationName: organizer.name,
                inviterName: currentUserAccount.PersonProfile 
                    ? `${currentUserAccount.PersonProfile.firstName} ${currentUserAccount.PersonProfile.lastName}`
                    : currentUserAccount.email,
                inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${inviteToken}`,
                expiresAt: expiresAt.toLocaleDateString('no-NO', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                })
            }
        })
    } catch (e) {
        console.error('Failed to send invitation email:', e)
        // Mark invitation as having email issues
        await prisma.userInvitation.update({
            where: { id: invite.id },
            data: { emailSent: false }
        })
        return { error: { _form: ['Invitation created but failed to send email. Try resending.'] } }
    }

    // Mark email as sent
    await prisma.userInvitation.update({
        where: { id: invite.id },
        data: { emailSent: true, emailSentAt: new Date() }
    })

    revalidatePath('/staffadmin/users')
    return { success: true, inviteId: invite.id }
}

/**
 * Get pending invitations for an organization
 */
export async function getOrganizationInvitations(organizerId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    // Verify user has ORG_ADMIN role
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId
                }
            }
        }
    })

    if (!userAccount?.UserAccountRole.length) {
        throw new Error('Unauthorized')
    }

    return await prisma.userInvitation.findMany({
        where: { 
            organizerId,
            status: 'PENDING',
            expiresAt: { gt: new Date() }
        },
        include: {
            InvitedBy: {
                include: { PersonProfile: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })
}

/**
 * Resend an invitation email
 */
export async function resendInvitation(inviteId: string): Promise<InviteResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const invite = await prisma.userInvitation.findUnique({
        where: { id: inviteId },
        include: {
            Organizer: { select: { id: true, name: true } },
            InvitedBy: { include: { PersonProfile: true } }
        }
    })

    if (!invite) {
        return { error: { _form: ['Invitation not found'] } }
    }

    // Verify user has ORG_ADMIN role for this organizer
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: invite.organizerId
                }
            }
        }
    })

    if (!userAccount?.UserAccountRole.length) {
        return { error: { _form: ['Unauthorized'] } }
    }

    // Generate new token and extend expiry
    const newToken = randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    await prisma.userInvitation.update({
        where: { id: inviteId },
        data: {
            token: newToken,
            expiresAt,
            status: 'PENDING'
        }
    })

    // Send email
    try {
        const inviterName = invite.InvitedBy?.PersonProfile 
            ? `${invite.InvitedBy.PersonProfile.firstName} ${invite.InvitedBy.PersonProfile.lastName}`
            : invite.InvitedBy?.email || 'Someone'

        await emailService.sendTransactional({
            organizerId: invite.organizerId,
            templateSlug: 'user-invitation',
            recipientEmail: invite.email,
            variables: {
                role: getRoleLabel(invite.role),
                organizationName: invite.Organizer.name,
                inviterName,
                inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/auth/accept-invite?token=${newToken}`,
                expiresAt: expiresAt.toLocaleDateString('no-NO', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                })
            }
        })

        await prisma.userInvitation.update({
            where: { id: inviteId },
            data: { emailSent: true, emailSentAt: new Date() }
        })

        return { success: true }
    } catch (e) {
        console.error('Failed to resend invitation:', e)
        return { error: { _form: ['Failed to send email'] } }
    }
}

/**
 * Cancel/revoke an invitation
 */
export async function cancelInvitation(inviteId: string): Promise<InviteResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const invite = await prisma.userInvitation.findUnique({
        where: { id: inviteId }
    })

    if (!invite) {
        return { error: { _form: ['Invitation not found'] } }
    }

    // Verify user has ORG_ADMIN role
    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            UserAccountRole: {
                where: {
                    role: 'ORG_ADMIN',
                    organizerId: invite.organizerId
                }
            }
        }
    })

    if (!userAccount?.UserAccountRole.length) {
        return { error: { _form: ['Unauthorized'] } }
    }

    await prisma.userInvitation.update({
        where: { id: inviteId },
        data: { status: 'CANCELLED' }
    })

    revalidatePath('/staffadmin/users')
    return { success: true }
}

/**
 * Accept an invitation (called when user signs up/logs in with invite token)
 */
export async function acceptInvitation(token: string): Promise<InviteResult> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/auth/login')
    }

    const invite = await prisma.userInvitation.findUnique({
        where: { token },
        include: {
            Organizer: { select: { name: true } }
        }
    })

    if (!invite) {
        return { error: { _form: ['Invalid or expired invitation'] } }
    }

    if (invite.status !== 'PENDING') {
        return { error: { _form: ['This invitation has already been used or cancelled'] } }
    }

    if (invite.expiresAt < new Date()) {
        return { error: { _form: ['This invitation has expired'] } }
    }

    // Find or create user account
    let userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id }
    })

    if (!userAccount) {
        // Create user account if it doesn't exist
        userAccount = await prisma.userAccount.create({
            data: {
                supabaseUid: user.id,
                email: user.email?.toLowerCase() || invite.email.toLowerCase()
            }
        })
    }

    // Optionally verify email matches (can be relaxed if needed)
    // For now, we allow any logged-in user to accept their invitation
    if (userAccount.email.toLowerCase() !== invite.email.toLowerCase()) {
        // Allow accepting if logged in with different email, but log it
        console.log(`User ${userAccount.email} accepting invite for ${invite.email}`)
    }

    // Check if user already has this role
    const existingRole = await prisma.userAccountRole.findFirst({
        where: {
            userId: userAccount.id,
            role: invite.role,
            organizerId: invite.organizerId
        }
    })

    if (!existingRole) {
        // Create the role
        await prisma.userAccountRole.create({
            data: {
                userId: userAccount.id,
                role: invite.role,
                organizerId: invite.organizerId
            }
        })
    }

    // Mark invitation as accepted
    await prisma.userInvitation.update({
        where: { id: invite.id },
        data: { 
            status: 'ACCEPTED',
            acceptedAt: new Date()
        }
    })

    return { success: true }
}

// Helper function to get human-readable role labels
function getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
        'ORG_ADMIN': 'Organisasjonsadministrator',
        'ORG_FINANCE': 'Økonomiansvarlig',
        'ORG_CHECKIN': 'Innsjekkingsansvarlig',
        'INSTRUCTOR': 'Instruktør',
        'STAFF': 'Ansatt',
        'PARTICIPANT': 'Deltaker'
    }
    return labels[role] || role
}
