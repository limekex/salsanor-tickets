import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { format } from 'date-fns'
import { createClient } from '@/utils/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // Verify user has ORG_ADMIN or ADMIN access
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { valid: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const userAccount = await prisma.userAccount.findUnique({
      where: { supabaseUid: user.id },
      include: {
        UserAccountRole: {
          where: {
            OR: [
              { role: 'ADMIN' },
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
      return NextResponse.json(
        { valid: false, message: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { valid: false, message: 'Token required' },
        { status: 400 }
      )
    }

    const membership = await prisma.membership.findUnique({
      where: { verificationToken: token },
      include: {
        PersonProfile: true,
        MembershipTier: true,
        Organizer: true
      }
    })

    if (!membership) {
      return NextResponse.json(
        { valid: false, message: 'Membership not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this organization
    const isGlobalAdmin = userAccount.UserAccountRole.some(r => r.role === 'ADMIN')
    const hasOrgAccess = userAccount.UserAccountRole.some(
      r => r.organizerId === membership.organizerId
    )

    if (!isGlobalAdmin && !hasOrgAccess) {
      return NextResponse.json(
        { valid: false, message: 'No access to this organization' },
        { status: 403 }
      )
    }

    const isActive = membership.status === 'ACTIVE' && new Date(membership.validTo) >= new Date()
    const isExpired = new Date(membership.validTo) < new Date()

    if (!isActive) {
      return NextResponse.json({
        valid: false,
        message: isExpired ? 'Membership expired' : 'Membership not active'
      })
    }

    return NextResponse.json({
      valid: true,
      personName: `${membership.PersonProfile.firstName} ${membership.PersonProfile.lastName}`,
      organizerName: membership.Organizer.name,
      tierName: membership.MembershipTier.name,
      memberNumber: membership.memberNumber,
      validFrom: format(membership.validFrom, 'MMM d, yyyy'),
      validTo: format(membership.validTo, 'MMM d, yyyy'),
      status: membership.status,
      photoUrl: membership.PersonProfile.photoUrl
    })
  } catch (error) {
    console.error('Membership verification error:', error)
    return NextResponse.json(
      { valid: false, message: 'Verification failed' },
      { status: 500 }
    )
  }
}
