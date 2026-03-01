import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { generateGoogleTicketPassUrl } from '@/lib/wallet/google/ticket-pass-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params as required by Next.js 15+
    const { id: ticketId } = await params;

    // Get user's person profile
    const userAccount = await prisma.userAccount.findFirst({
      where: { supabaseUid: user.id },
      include: { PersonProfile: true }
    });

    if (!userAccount?.PersonProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Fetch the ticket with event, organizer, and person details
    // Include all location/time fields needed for wallet passes
    const ticket = await prisma.eventTicket.findUnique({
      where: { id: ticketId },
      include: {
        Event: {
          select: {
            id: true,
            title: true,
            startDateTime: true,
            endDateTime: true,
            timezone: true,
            locationName: true,
            locationAddress: true,
            city: true,
            imageUrl: true,
            Organizer: {
              select: {
                id: true,
                name: true,
                contactEmail: true,
                website: true,
                city: true,
                country: true,
              },
            },
          },
        },
        PersonProfile: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Verify ticket ownership
    if (ticket.personId !== userAccount.PersonProfile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify ticket is active
    if (ticket.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Ticket is not active' },
        { status: 400 }
      );
    }

    // Build address string from components
    // Format: "Address, City" (for Google Wallet venue address)
    const addressParts = [
      ticket.Event?.locationAddress,
      ticket.Event?.city,
    ].filter(Boolean);
    const venueAddress = addressParts.length > 0 
      ? addressParts.join(', ') 
      : undefined;

    // Generate Google Wallet save URL
    // NOTE: Use same fields as Apple Wallet/PDF for consistency:
    // - eventDate: Event.startDateTime (full datetime)
    // - qrCode: ticket.qrTokenHash (scannable token for check-in)
    const saveUrl = generateGoogleTicketPassUrl({
      ticketId: ticket.id,
      ticketNumber: String(ticket.ticketNumber || `TICKET-${ticket.id.substring(0, 8)}`),
      eventId: ticket.Event?.id || ticket.eventId,
      eventTitle: ticket.Event?.title || 'Event',
      eventDate: ticket.Event?.startDateTime || new Date(),
      eventEndDate: ticket.Event?.endDateTime || undefined,
      timezone: ticket.Event?.timezone || 'Europe/Oslo',
      venueName: ticket.Event?.locationName || 'TBA',
      venueAddress: venueAddress,
      organizerName: ticket.Event?.Organizer?.name || 'Organizer',
      organizerEmail: ticket.Event?.Organizer?.contactEmail || undefined,
      organizerWebsite: ticket.Event?.Organizer?.website || undefined,
      attendeeName: `${ticket.PersonProfile?.firstName || ''} ${ticket.PersonProfile?.lastName || ''}`.trim() || 'Guest',
      qrCode: ticket.qrTokenHash || ticket.id,
      eventImageUrl: ticket.Event?.imageUrl || undefined,
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
