import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json(
      { error: 'Token mangler' },
      { status: 400 }
    )
  }

  try {
    const invitation = await prisma.userInvitation.findUnique({
      where: { token },
      include: {
        Organizer: {
          select: {
            name: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitasjon ikke funnet', status: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Check status
    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Invitasjonen har allerede blitt akseptert', status: 'ACCEPTED' },
        { status: 400 }
      )
    }

    if (invitation.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Invitasjonen har blitt kansellert', status: 'CANCELLED' },
        { status: 400 }
      )
    }

    // Check expiration
    if (invitation.expiresAt < new Date()) {
      // Update status to expired if not already
      if (invitation.status !== 'EXPIRED') {
        await prisma.userInvitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' }
        })
      }
      return NextResponse.json(
        { error: 'Invitasjonen har utløpt', status: 'EXPIRED' },
        { status: 400 }
      )
    }

    // Return invitation details
    return NextResponse.json({
      email: invitation.email,
      role: invitation.role,
      organizationName: invitation.Organizer.name,
      expiresAt: invitation.expiresAt.toISOString()
    })
  } catch (error) {
    console.error('Error verifying invitation:', error)
    return NextResponse.json(
      { error: 'Kunne ikke verifisere invitasjonen' },
      { status: 500 }
    )
  }
}
