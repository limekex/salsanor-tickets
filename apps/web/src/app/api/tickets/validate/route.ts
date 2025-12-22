
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
    // Authenticate user and check roles
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userAccount = await prisma.userAccount.findUnique({
        where: { supabaseUid: user.id },
        include: {
            roles: {
                where: {
                    OR: [
                        { role: 'ADMIN' },
                        { role: 'ORG_ADMIN' },
                        { role: 'ORG_CHECKIN' }
                    ]
                },
                include: {
                    organizer: true
                }
            }
        }
    })

    if (!userAccount || userAccount.roles.length === 0) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { token, trackId } = await req.json()

    if (!token || !trackId) {
        return NextResponse.json({ error: 'Token and trackId required' }, { status: 400 })
    }

    // Check if global admin
    const isGlobalAdmin = userAccount.roles.some(r => r.role === 'ADMIN')
    
    // Get organizer IDs for org-specific roles
    const organizerIds = userAccount.roles
        .filter(r => r.organizerId)
        .map(r => r.organizerId!)

    // Fetch the ticket with person and registrations
    const ticket = await prisma.ticket.findFirst({
        where: { qrTokenHash: token },
        include: {
            person: {
                include: {
                    registrations: {
                        where: { 
                            status: 'ACTIVE',
                            trackId: trackId // Only get registration for this specific track
                        },
                        include: { 
                            track: {
                                include: {
                                    period: {
                                        include: {
                                            organizer: true
                                        }
                                    }
                                }
                            } 
                        }
                    }
                }
            },
            period: {
                include: {
                    organizer: true
                }
            }
        }
    })

    if (!ticket) {
        return NextResponse.json({ valid: false, message: 'Invalid Ticket' })
    }

    if (ticket.status !== 'ACTIVE') {
        return NextResponse.json({ valid: false, message: `Ticket is ${ticket.status}` })
    }

    // Check organization access for non-global admins
    if (!isGlobalAdmin && !organizerIds.includes(ticket.period.organizerId)) {
        return NextResponse.json({ 
            valid: false, 
            message: 'Ticket is for a different organization' 
        })
    }

    // Check if person is registered for the scanned track
    const registration = ticket.person.registrations.find(r => r.trackId === trackId)

    if (!registration) {
        return NextResponse.json({ 
            valid: false, 
            message: `Not registered for this track. Please check ${ticket.period.organizer.name} - ${ticket.period.name}` 
        })
    }

    // Valid ticket for the correct track
    return NextResponse.json({
        valid: true,
        personName: `${ticket.person.firstName} ${ticket.person.lastName}`,
        course: `${registration.track.title} (${registration.chosenRole})`,
        periodName: ticket.period.name,
        ticketId: ticket.id
    })
}
