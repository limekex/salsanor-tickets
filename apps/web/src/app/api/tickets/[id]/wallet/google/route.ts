import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/lucia';
import { prisma } from '@salsanor/database';
import { generateGoogleTicketPassUrl } from '@/lib/wallet/google/ticket-pass-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const session = await auth.handleRequest(request).validate();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = params.id;

    // Fetch the ticket with event and person details
    const ticket = await prisma.eventTicket.findUnique({
      where: { id: ticketId },
      include: {
        Event: {
          include: {
            Organizer: true,
          },
        },
        PersonProfile: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Verify ticket ownership
    if (ticket.personId !== session.user.personProfileId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify ticket is active
    if (ticket.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Ticket is not active' },
        { status: 400 }
      );
    }

    // Generate Google Wallet save URL
    const saveUrl = generateGoogleTicketPassUrl({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber || `TICKET-${ticket.id.substring(0, 8)}`,
      eventTitle: ticket.Event?.title || 'Event',
      eventDate: ticket.Event?.startDate || new Date(),
      eventLocation: ticket.Event?.location || 'Location TBA',
      organizerName: ticket.Event?.Organizer?.name || 'Organizer',
      attendeeName: `${ticket.PersonProfile?.firstName || ''} ${ticket.PersonProfile?.lastName || ''}`.trim() || 'Guest',
      qrCode: ticket.qrCode || ticket.id,
      eventImageUrl: ticket.Event?.bannerImageUrl || undefined,
    });

    // Return the save URL
    return NextResponse.json({ saveUrl });
  } catch (error) {
    console.error('Error generating Google Wallet pass:', error);
    return NextResponse.json(
      { error: 'Failed to generate pass', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
