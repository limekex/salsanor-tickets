'use server'

import { createClient } from '@/utils/supabase/server'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Approve a pending membership
 * Sets status to ACTIVE and sets activatedAt timestamp
 */
export async function approveMembership(membershipId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify admin access
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      UserAccountRole: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN' }
          ]
        }
      }
    }
  })

  if (!userAccount || userAccount.UserAccountRole.length === 0) {
    throw new Error('Unauthorized: Admin access required')
  }

  // Get membership and verify organization access
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { 
      Organizer: true,
      MembershipTier: true,
      PersonProfile: true
    }
  })

  if (!membership) {
    throw new Error('Membership not found')
  }

  // Verify admin has access to this organization
  const hasAccess = userAccount.UserAccountRole.some(
    r => r.role === 'ADMIN' || r.organizerId === membership.organizerId
  )

  if (!hasAccess) {
    throw new Error('Unauthorized: No access to this organization')
  }

  // Update membership status
  await prisma.membership.update({
    where: { id: membershipId },
    data: {
      status: 'ACTIVE'
    }
  })

  // Send membership approved email
  // Find UserAccount for this PersonProfile
  const personUserAccount = await prisma.userAccount.findFirst({
    where: { 
      PersonProfile: {
        id: membership.personId
      }
    }
  })

  console.log('[Approve Membership] Starting email send process:', {
    membershipId,
    organizerId: membership.organizerId,
    personId: membership.personId,
    foundUserAccount: !!personUserAccount,
    personEmail: personUserAccount?.email,
    personName: `${membership.PersonProfile.firstName} ${membership.PersonProfile.lastName}`,
    tierName: membership.MembershipTier.name,
    memberNumber: membership.memberNumber
  })

  try {
    const { emailService } = await import('@/lib/email/email-service')
    
    console.log('[Approve Membership] Person account loaded:', {
      hasAccount: !!personUserAccount,
      hasEmail: !!personUserAccount?.email,
      email: personUserAccount?.email
    })
    
    if (personUserAccount?.email) {
      console.log('[Approve Membership] Calling emailService.sendTransactional...')
      
      await emailService.sendTransactional({
        organizerId: membership.organizerId,
        templateSlug: 'membership-approved',
        recipientEmail: personUserAccount.email,
        recipientName: `${membership.PersonProfile.firstName} ${membership.PersonProfile.lastName}`.trim() || undefined,
        variables: {
          recipientName: membership.PersonProfile.firstName || 'Member',
          organizationName: membership.Organizer.name,
          tierName: membership.MembershipTier.name,
          memberNumber: membership.memberNumber || 'N/A',
        },
        language: 'en',
      })
      
      console.log('[Approve Membership] ✅ Email sent successfully')
    } else {
      console.log('[Approve Membership] ⚠️ No email address found for person')
    }
  } catch (emailError) {
    // Log but don't fail the approval if email fails
    console.error('[Approve Membership] ❌ Failed to send membership approval email:', emailError)
  }

  revalidatePath('/staffadmin/memberships')
  revalidatePath('/profile')
  
  return { success: true }
}

/**
 * Reject a pending membership
 * Sets status to INACTIVE
 */
export async function rejectMembership(membershipId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify admin access
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      UserAccountRole: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN' }
          ]
        }
      }
    }
  })

  if (!userAccount || userAccount.UserAccountRole.length === 0) {
    throw new Error('Unauthorized: Admin access required')
  }

  // Get membership and verify organization access
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { Organizer: true }
  })

  if (!membership) {
    throw new Error('Membership not found')
  }

  // Verify admin has access to this organization
  const hasAccess = userAccount.UserAccountRole.some(
    r => r.role === 'ADMIN' || r.organizerId === membership.organizerId
  )

  if (!hasAccess) {
    throw new Error('Unauthorized: No access to this organization')
  }

  // Update membership status
  await prisma.membership.update({
    where: { id: membershipId },
    data: {
      status: 'CANCELLED'
    }
  })

  revalidatePath('/staffadmin/memberships')
  revalidatePath('/profile')
  
  return { success: true }
}

/**
 * Delete a membership (only EXPIRED or CANCELLED)
 * Permanently removes the membership record
 */
export async function deleteMembership(membershipId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify admin access
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      UserAccountRole: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN' }
          ]
        }
      }
    }
  })

  if (!userAccount || userAccount.UserAccountRole.length === 0) {
    throw new Error('Unauthorized: Admin access required')
  }

  // Get membership and verify organization access
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    include: { Organizer: true }
  })

  if (!membership) {
    throw new Error('Membership not found')
  }

  // Only allow deletion of EXPIRED or CANCELLED memberships
  if (membership.status !== 'EXPIRED' && membership.status !== 'CANCELLED') {
    throw new Error('Only EXPIRED or CANCELLED memberships can be deleted')
  }

  // Verify admin has access to this organization
  const hasAccess = userAccount.UserAccountRole.some(
    r => r.role === 'ADMIN' || r.organizerId === membership.organizerId
  )

  if (!hasAccess) {
    throw new Error('Unauthorized: No access to this organization')
  }

  // Delete the membership
  await prisma.membership.delete({
    where: { id: membershipId }
  })

  revalidatePath('/staffadmin/memberships')
  revalidatePath('/profile')
  
  return { success: true }
}

/**
 * Update membership status manually (for testing/admin purposes)
 */
export async function updateMembershipStatus(
  membershipId: string, 
  newStatus: 'ACTIVE' | 'PENDING_PAYMENT' | 'EXPIRED' | 'CANCELLED'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Not authenticated')
  }

  // Verify admin access
  const userAccount = await prisma.userAccount.findUnique({
    where: { supabaseUid: user.id },
    include: {
      UserAccountRole: {
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'ORG_ADMIN' }
          ]
        }
      }
    }
  })

  if (!userAccount || userAccount.UserAccountRole.length === 0) {
    throw new Error('Unauthorized: Admin access required')
  }

  // Get membership and verify organization access
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId }
  })

  if (!membership) {
    throw new Error('Membership not found')
  }

  // Verify admin has access to this organization
  const hasAccess = userAccount.UserAccountRole.some(
    r => r.role === 'ADMIN' || r.organizerId === membership.organizerId
  )

  if (!hasAccess) {
    throw new Error('Unauthorized: No access to this organization')
  }

  // Update membership status
  await prisma.membership.update({
    where: { id: membershipId },
    data: { status: newStatus }
  })

  revalidatePath('/staffadmin/memberships')
  revalidatePath('/profile')
  
  return { success: true }
}
