
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

    // ================================================================
    // DAY-BASED CHECK-IN RESTRICTION
    // DB weekday: 1=Monday, 2=Tuesday, ..., 6=Saturday, 7=Sunday (ISO)
    // JS Date.getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
    // ================================================================
    const now = new Date()
    const jsDayOfWeek = now.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
    const isoDayOfWeek = jsDayOfWeek === 0 ? 7 : jsDayOfWeek // 1=Mon..7=Sun
    const track = registration.CourseTrack

    if (track.weekday !== isoDayOfWeek) {
        const weekdays = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        const scheduledDay = weekdays[track.weekday] ?? `day ${track.weekday}`
        return NextResponse.json({
            valid: false,
            message: `Check-in is only available on ${scheduledDay}s. This track runs on ${scheduledDay}s.`,
            wrongDay: true
        })
    }

    // ================================================================
    // SINGLE CHECK-IN PER DAY ENFORCEMENT
    // ================================================================
    // Compute the session date as start of today in UTC
    const sessionDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

    const existingAttendance = await prisma.attendance.findUnique({
        where: {
            registrationId_trackId_sessionDate: {
                registrationId: registration.id,
                trackId: trackId,
                sessionDate: sessionDate
            }
        }
    })

    if (existingAttendance && !existingAttendance.cancelled) {
        const checkedInTime = new Intl.DateTimeFormat('en-GB', {
            dateStyle: 'short',
            timeStyle: 'short'
        }).format(existingAttendance.checkInTime)
        return NextResponse.json({
            valid: false,
            message: `Already checked in today at ${checkedInTime}`,
            personName: `${ticket.PersonProfile.firstName} ${ticket.PersonProfile.lastName}`,
            alreadyCheckedIn: true
        })
    }

    // ================================================================
    // RECORD ATTENDANCE
    // ================================================================
    await prisma.attendance.create({
        data: {
            registrationId: registration.id,
            trackId: trackId,
            periodId: registration.periodId,
            sessionDate: sessionDate,
            checkInTime: now,
            checkedInBy: userAccount.id,
            method: 'QR_SCAN'
        }
    })

    // Valid ticket for the correct track
    return NextResponse.json({
        valid: true,
        personName: `${ticket.PersonProfile.firstName} ${ticket.PersonProfile.lastName}`,
        course: `${registration.CourseTrack.title} (${registration.chosenRole})`,
        periodName: ticket.CoursePeriod.name,
        ticketId: ticket.id
    })
}
