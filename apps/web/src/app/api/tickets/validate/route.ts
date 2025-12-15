
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'

export async function POST(req: Request) {
    // Basic admin check - scanner app should be protected?
    // For now, let's assume the API route is protected or the page calling it is.
    // The spec said "Crew". We reused Admin check for simplicity or need a Crew role.
    // Let's use requireAdmin for MVP.
    // If we want a separate Crew role, we'd need to add it.
    try {
        await requireAdmin()
    } catch {
        // If strict admin required.
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await req.json()

    if (!token) {
        return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    const ticket = await prisma.ticket.findFirst({
        where: { qrTokenHash: token },
        include: {
            person: {
                include: {
                    registrations: {
                        where: { status: 'ACTIVE' },
                        include: { track: true }
                    }
                }
            },
            period: true
        }
    })

    if (!ticket) {
        return NextResponse.json({ valid: false, message: 'Invalid Ticket' })
    }

    if (ticket.status !== 'ACTIVE') {
        return NextResponse.json({ valid: false, message: `Ticket is ${ticket.status}` })
    }

    // Check period (if we passed a target period, we could validate against it)

    // Filter registrations to match the ticket's period
    const relevantRegistrations = ticket.person.registrations.filter(r => r.periodId === ticket.periodId)

    const courses = relevantRegistrations.map(r => `${r.track.title} (${r.chosenRole})`).join(', ')

    return NextResponse.json({
        valid: true,
        personName: `${ticket.person.firstName} ${ticket.person.lastName}`,
        courses: courses || 'No active courses for this period',
        periodName: ticket.period.name,
        ticketId: ticket.id
    })
}
