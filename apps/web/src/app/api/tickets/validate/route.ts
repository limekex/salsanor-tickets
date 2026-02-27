
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
            UserAccountRole: {
                where: {
                    OR: [
                        { role: 'ADMIN' },
                        { role: 'ORG_ADMIN' },
                        { role: 'ORG_CHECKIN' }
                    ]
                },
                include: {
                    Organizer: true
                }
            }
        }
    })

    if (!userAccount || userAccount.UserAccountRole.length === 0) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { token, trackId, eventId } = await req.json()

    if (!token) {
        return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Must specify either trackId (for courses) or eventId (for events)
    if (!trackId && !eventId) {
        return NextResponse.json({ error: 'trackId or eventId required' }, { status: 400 })
    }

    // Check if global admin
    const isGlobalAdmin = userAccount.UserAccountRole.some(r => r.role === 'ADMIN')
    
    // Get organizer IDs for org-specific roles
    const organizerIds = userAccount.UserAccountRole
        .filter(r => r.organizerId)
        .map(r => r.organizerId!)

    // ================================================================
    // EVENT TICKET VALIDATION
    // ================================================================
    if (eventId) {
        const eventTicket = await prisma.eventTicket.findFirst({
            where: { qrTokenHash: token },
            include: {
                PersonProfile: true,
                Event: {
                    include: {
                        Organizer: true
                    }
                }
            }
        })

        if (!eventTicket) {
            return NextResponse.json({ valid: false, message: 'Invalid ticket' })
        }

        if (eventTicket.status !== 'ACTIVE') {
            return NextResponse.json({ valid: false, message: `Ticket is ${eventTicket.status === 'USED' ? 'already used' : eventTicket.status}` })
        }

        // Check organization access for non-global admins
        if (!isGlobalAdmin && !organizerIds.includes(eventTicket.Event.organizerId)) {
            return NextResponse.json({ 
                valid: false, 
                message: 'Ticket belongs to a different organization' 
            })
        }

        // Check if ticket is for the correct event
        if (eventTicket.eventId !== eventId) {
            return NextResponse.json({ 
                valid: false, 
                message: `Wrong event. This ticket is for: ${eventTicket.Event.title}` 
            })
        }

        // Check if already checked in
        if (eventTicket.checkedInAt) {
            const checkedInTime = new Intl.DateTimeFormat('en-GB', {
                dateStyle: 'short',
                timeStyle: 'short'
            }).format(eventTicket.checkedInAt)
            return NextResponse.json({ 
                valid: false, 
                message: `Already checked in: ${checkedInTime}`,
                personName: `${eventTicket.PersonProfile.firstName} ${eventTicket.PersonProfile.lastName}`,
                alreadyCheckedIn: true
            })
        }

        // Mark as checked in
        await prisma.eventTicket.update({
            where: { id: eventTicket.id },
            data: { checkedInAt: new Date() }
        })

        // Valid event ticket
        return NextResponse.json({
            valid: true,
            personName: `${eventTicket.PersonProfile.firstName} ${eventTicket.PersonProfile.lastName}`,
            eventTitle: eventTicket.Event.title,
            ticketNumber: eventTicket.ticketNumber,
            ticketId: eventTicket.id,
            type: 'event'
        })
    }

    // ================================================================
    // COURSE TICKET VALIDATION (original logic)
    // ================================================================

    // Fetch the ticket with person and registrations
    const ticket = await prisma.ticket.findFirst({
        where: { qrTokenHash: token },
        include: {
            PersonProfile: {
                include: {
                    Registration: {
                        where: { 
                            status: 'ACTIVE',
                            trackId: trackId // Only get registration for this specific track
                        },
                        include: { 
                            CourseTrack: {
                                include: {
                                    CoursePeriod: {
                                        include: {
                                            Organizer: true
                                        }
                                    }
                                }
                            } 
                        }
                    }
                }
            },
            CoursePeriod: {
                include: {
                    Organizer: true
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
    if (!isGlobalAdmin && !organizerIds.includes(ticket.CoursePeriod.organizerId)) {
        return NextResponse.json({ 
            valid: false, 
            message: 'Ticket is for a different organization' 
        })
    }

    // Check if person is registered for the scanned track
    const registration = ticket.PersonProfile.Registration.find(r => r.trackId === trackId)

    if (!registration) {
        return NextResponse.json({ 
            valid: false, 
            message: `Not registered for this track. Please check ${ticket.CoursePeriod.Organizer.name} - ${ticket.CoursePeriod.name}` 
        })
    }

    // Valid ticket for the correct track
    return NextResponse.json({
        valid: true,
        personName: `${ticket.PersonProfile.firstName} ${ticket.PersonProfile.lastName}`,
        course: `${registration.CourseTrack.title} (${registration.chosenRole})`,
        periodName: ticket.CoursePeriod.name,
        ticketId: ticket.id
    })
}
