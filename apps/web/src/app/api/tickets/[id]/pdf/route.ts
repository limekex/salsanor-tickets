import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { generateEventTicketPDF, EventTicketData } from '@/lib/tickets/pdf-generator'
import {
    SellerInfo,
    BuyerInfo,
    TransactionInfo,
    TicketLineItem,
} from '@/lib/tickets/legal-requirements'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Fetch the ticket with all required data
        const ticket = await prisma.eventTicket.findUnique({
            where: { id: id },
            include: {
                Event: {
                    include: {
                        Organizer: true,
                    },
                },
                PersonProfile: {
                    include: {
                        UserAccount: true,
                    },
                },
                EventRegistration: {
                    include: {
                        Order: true,
                    },
                },
            },
        })

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
        }

        // Verify ownership: ticket belongs to the logged-in user
        if (ticket.PersonProfile.UserAccount?.supabaseUid !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Verify ticket is active
        if (ticket.status !== 'ACTIVE') {
            return NextResponse.json(
                { error: 'Ticket is not active' },
                { status: 400 }
            )
        }

        // Count total tickets for this event registration
        const totalTickets = await prisma.eventTicket.count({
            where: {
                eventRegistrationId: ticket.eventRegistrationId,
                status: 'ACTIVE',
            },
        })

        // Prepare seller info (organizer)
        const seller: SellerInfo = {
            name: ticket.Event.Organizer.name,
            address: ticket.Event.Organizer.address || '',
            postalCode: ticket.Event.Organizer.postalCode || '',
            city: ticket.Event.Organizer.city || '',
            country: 'Norge',
            orgNumber: ticket.Event.Organizer.orgNumber || '',
            vatNumber: ticket.Event.Organizer.vatNumber,
            email: ticket.Event.Organizer.contactEmail || '',
            phone: ticket.Event.Organizer.contactPhone || '',
            logoUrl: ticket.Event.Organizer.logoUrl,
        }

        // Prepare buyer info
        const buyer: BuyerInfo = {
            name: `${ticket.PersonProfile.firstName} ${ticket.PersonProfile.lastName}`,
            email: ticket.PersonProfile.email,
            phone: ticket.PersonProfile.phone,
        }

        // Prepare transaction info
        const transaction: TransactionInfo = {
            orderId: ticket.EventRegistration?.Order?.orderNumber || '',
            transactionDate: ticket.createdAt,
            paymentMethod: ticket.EventRegistration?.Order?.paymentMethod || 'ONLINE',
            paymentStatus: ticket.EventRegistration?.Order?.status || 'PAID',
        }

        // Prepare line item
        const unitPrice = ticket.EventRegistration?.unitPriceCents || 0
        const lineItem: TicketLineItem = {
            description: ticket.Event.title,
            quantity: 1,
            unitPriceCents: unitPrice,
            totalPriceCents: unitPrice,
            vatRate: ticket.EventRegistration?.Order?.mvaRate
                ? Number(ticket.EventRegistration.Order.mvaRate)
                : 0,
        }

        // Prepare PDF data
        const pdfData: EventTicketData = {
            ticketNumber: ticket.ticketNumber || 1,
            totalTickets,
            eventTitle: ticket.Event.title,
            eventDate: ticket.Event.startDateTime || new Date(),
            eventVenue: ticket.Event.location,
            qrToken: ticket.qrTokenHash,
            seller,
            buyer,
            transaction,
            lineItem,
            includeQrCode: true,
        }

        // Generate PDF
        const pdfBuffer = await generateEventTicketPDF(pdfData)

        // Return PDF with proper headers
        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="ticket-${ticket.ticketNumber || 1}-${ticket.Event.title.replace(/[^a-z0-9]/gi, '-')}.pdf"`,
            },
        })
    } catch (error) {
        console.error('Error generating ticket PDF:', error)
        return NextResponse.json(
            { error: 'Failed to generate ticket PDF' },
            { status: 500 }
        )
    }
}
