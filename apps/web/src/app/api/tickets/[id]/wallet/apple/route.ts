import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { generateAppleTicketPass } from '@/lib/wallet/apple/ticket-pass-generator';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

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
                city: true,
                country: true,
                website: true,
                contactEmail: true,
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

    // Build venue address for back field (address + city)
    const venueAddressParts = [
      ticket.Event?.locationAddress,
      ticket.Event?.city,
    ].filter(Boolean);
    const venueAddress = venueAddressParts.length > 0 
      ? venueAddressParts.join(', ') 
      : undefined;

    // Debug: Log the actual event data from database
    console.log('[Apple Wallet Debug] Event data:', JSON.stringify({
      eventId: ticket.Event?.id,
      title: ticket.Event?.title,
      startDateTime: ticket.Event?.startDateTime,
      endDateTime: ticket.Event?.endDateTime,
      timezone: ticket.Event?.timezone,
      locationName: ticket.Event?.locationName,
      locationAddress: ticket.Event?.locationAddress,
      city: ticket.Event?.city,
      venueAddress,
      organizerName: ticket.Event?.Organizer?.name,
      organizerEmail: ticket.Event?.Organizer?.contactEmail,
      organizerWebsite: ticket.Event?.Organizer?.website,
      qrTokenHash: ticket.qrTokenHash,
    }, null, 2));

    // Generate Apple Wallet pass
    // Issuer: RegiNor.events (platform) - Organizer: varies per event (e.g., SalsaNor)
    // See: docs/issues/github/05-apple-wallet-enhancements.md for spec
    const passBuffer = await generateAppleTicketPass({
      // Core identifiers
      ticketId: ticket.id, // UUID - used as serialNumber to prevent pass overwrites!
      ticketNumber: String(ticket.ticketNumber || ticket.id.substring(0, 8).toUpperCase()),
      
      // Event information
      eventTitle: ticket.Event?.title || 'Event',
      eventDate: ticket.Event?.startDateTime || new Date(),
      eventEndDate: ticket.Event?.endDateTime || undefined,
      venueName: ticket.Event?.locationName || 'Venue TBA',
      venueAddress: venueAddress,
      // Note: venueLatitude/venueLongitude can be added when geocoding is implemented
      
      // Organizer (event owner - displayed as "EVENT BY")
      organizerName: ticket.Event?.Organizer?.name || 'Organizer',
      organizerEmail: ticket.Event?.Organizer?.contactEmail || undefined,
      organizerWebsite: ticket.Event?.Organizer?.website || undefined,
      
      // Attendee
      attendeeName: `${ticket.PersonProfile?.firstName || ''} ${ticket.PersonProfile?.lastName || ''}`.trim() || 'Guest',
      
      // Ticket details
      // ticketType: can be added when EventTicket.ticketType field exists
      
      // QR code for check-in (opaque token validated server-side)
      qrCode: ticket.qrTokenHash || ticket.id,
    });

    // Debug: Log buffer info
    console.log('[Apple Wallet] Pass buffer size:', passBuffer.length, 'bytes');
    console.log('[Apple Wallet] Pass buffer first bytes (hex):', passBuffer.slice(0, 4).toString('hex'));
    
    // Verify it's a valid ZIP (pkpass is a ZIP file)
    // ZIP files start with PK (0x504B)
    if (passBuffer.length < 100 || passBuffer[0] !== 0x50 || passBuffer[1] !== 0x4B) {
      console.error('[Apple Wallet] Invalid pass buffer - not a valid ZIP/pkpass file');
      console.error('[Apple Wallet] Buffer preview:', passBuffer.slice(0, 100).toString('utf-8'));
      return NextResponse.json(
        { error: 'Generated pass is invalid' },
        { status: 500 }
      );
    }

    // Debug: Save pass locally and inspect contents
    try {
      const debugPath = join(process.cwd(), 'debug-pass.pkpass');
      writeFileSync(debugPath, passBuffer);
      console.log('[Apple Wallet Debug] Saved pass to:', debugPath);
      
      // List ZIP contents using unzip command
      const listOutput = execSync(`unzip -l "${debugPath}"`, { encoding: 'utf-8' });
      console.log('[Apple Wallet Debug] Files in pkpass:\n', listOutput);
      
      // Extract and show pass.json
      const passJsonOutput = execSync(`unzip -p "${debugPath}" pass.json 2>/dev/null || echo "pass.json not found"`, { encoding: 'utf-8' });
      console.log('[Apple Wallet Debug] pass.json content:', passJsonOutput);
      
      // Check manifest.json
      const manifestOutput = execSync(`unzip -p "${debugPath}" manifest.json 2>/dev/null || echo "manifest.json not found"`, { encoding: 'utf-8' });
      console.log('[Apple Wallet Debug] manifest.json content:', manifestOutput);
      
    } catch (debugError) {
      console.error('[Apple Wallet Debug] Error inspecting pass:', debugError);
    }

    // Return the .pkpass file
    return new NextResponse(Uint8Array.from(passBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="ticket-${ticket.ticketNumber || ticket.id}.pkpass"`,
        'Content-Length': passBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating Apple Wallet pass:', error);
    return NextResponse.json(
      { error: 'Failed to generate pass', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
