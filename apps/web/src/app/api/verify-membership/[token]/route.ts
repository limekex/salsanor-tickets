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
        roles: {
          where: {
            OR: [
              { role: 'ADMIN' },
              { role: 'ORG_ADMIN' }
            ]
          },
          include: {
            organizer: true
          }
        }
      }
    })

    if (!userAccount || userAccount.roles.length === 0) {
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
        person: true,
        tier: true,
        organizer: true
      }
    })

    if (!membership) {
      return NextResponse.json(
        { valid: false, message: 'Membership not found' },
        { status: 404 }
      )
    }

    // Check if user has access to this organization
    const isGlobalAdmin = userAccount.roles.some(r => r.role === 'ADMIN')
    const hasOrgAccess = userAccount.roles.some(
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
      personName: `${membership.person.firstName} ${membership.person.lastName}`,
      organizerName: membership.organizer.name,
      tierName: membership.tier.name,
      memberNumber: membership.memberNumber,
      validFrom: format(membership.validFrom, 'MMM d, yyyy'),
      validTo: format(membership.validTo, 'MMM d, yyyy'),
      status: membership.status,
      photoUrl: membership.person.photoUrl
    })
  } catch (error) {
    console.error('Membership verification error:', error)
    return NextResponse.json(
      { valid: false, message: 'Verification failed' },
      { status: 500 }
    )
  }
}
