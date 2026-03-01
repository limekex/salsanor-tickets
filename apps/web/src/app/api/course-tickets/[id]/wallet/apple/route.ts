import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { generateAppleCoursePass } from '@/lib/wallet/apple/course-pass-generator';

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

    const { id: ticketId } = await params;

    // Get user's person profile
    const userAccount = await prisma.userAccount.findFirst({
      where: { supabaseUid: user.id },
      include: { PersonProfile: true }
    });

    if (!userAccount?.PersonProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Fetch the course ticket with period, tracks, and organizer details
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        CoursePeriod: {
          include: {
            Organizer: {
              select: {
                id: true,
                name: true,
                contactEmail: true,
                website: true,
                city: true,
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

    // Get the user's registered tracks for this period
    const registrations = await prisma.registration.findMany({
      where: {
        periodId: ticket.periodId,
        personId: ticket.personId,
        status: 'ACTIVE',
      },
      include: {
        CourseTrack: {
          select: {
            title: true,
          },
        },
      },
    });

    const trackNames = registrations.map(r => r.CourseTrack.title);

    // Build venue address
    const venueAddress = ticket.CoursePeriod.locationName 
      ? `${ticket.CoursePeriod.locationName}, ${ticket.CoursePeriod.city}`
      : ticket.CoursePeriod.city;

    // Generate Apple Wallet pass
    const passBuffer = await generateAppleCoursePass({
      ticketId: ticket.id,
      periodName: ticket.CoursePeriod.name,
      periodCode: ticket.CoursePeriod.code,
      startDate: ticket.CoursePeriod.startDate,
      endDate: ticket.CoursePeriod.endDate,
      venueName: ticket.CoursePeriod.locationName || undefined,
      venueAddress: venueAddress,
      city: ticket.CoursePeriod.city,
      trackNames: trackNames.length > 0 ? trackNames : ['Course enrollment'],
      organizerName: ticket.CoursePeriod.Organizer.name,
      organizerEmail: ticket.CoursePeriod.Organizer.contactEmail || undefined,
      organizerWebsite: ticket.CoursePeriod.Organizer.website || undefined,
      attendeeName: `${ticket.PersonProfile?.firstName || ''} ${ticket.PersonProfile?.lastName || ''}`.trim() || 'Guest',
      qrCode: ticket.qrTokenHash,
    });

    // Return the .pkpass file (convert Buffer to Uint8Array for NextResponse)
    const responseBuffer = new Uint8Array(passBuffer);
    return new NextResponse(responseBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="${ticket.CoursePeriod.code}-${ticket.id.substring(0, 8)}.pkpass"`,
        'Content-Length': passBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating Apple Wallet course pass:', error);
    return NextResponse.json(
      { error: 'Failed to generate pass', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
