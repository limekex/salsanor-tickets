import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { generateAppleMembershipPass } from '@/lib/wallet/apple/membership-pass-generator';

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

    const { id: membershipId } = await params;

    // Get user's person profile
    const userAccount = await prisma.userAccount.findFirst({
      where: { supabaseUid: user.id },
      include: { PersonProfile: true }
    });

    if (!userAccount?.PersonProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Fetch the membership with organizer and tier details
    const membership = await prisma.membership.findUnique({
      where: { id: membershipId },
      include: {
        MembershipTier: {
          select: {
            name: true,
            slug: true,
            accentColor: true,
          },
        },
        Organizer: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            website: true,
          },
        },
        PersonProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photoUrl: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    // Verify membership ownership
    if (membership.personId !== userAccount.PersonProfile.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Verify membership is active
    if (membership.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Membership is not active' },
        { status: 400 }
      );
    }

    // Generate Apple Wallet pass
    const passBuffer = await generateAppleMembershipPass({
      membershipId: membership.id,
      memberNumber: membership.memberNumber || '',
      organizerName: membership.Organizer.name,
      organizerSlug: membership.Organizer.slug,
      tierName: membership.MembershipTier.name,
      tierSlug: membership.MembershipTier.slug,
      accentColor: membership.MembershipTier.accentColor || undefined,
      validFrom: membership.validFrom,
      validTo: membership.validTo,
      memberName: `${membership.PersonProfile.firstName} ${membership.PersonProfile.lastName}`.trim(),
      memberPhotoUrl: membership.PersonProfile.photoUrl || undefined,
      verificationToken: membership.verificationToken || membership.id,
    });

    // Return the .pkpass file (convert Buffer to Uint8Array for NextResponse)
    const responseBuffer = new Uint8Array(passBuffer);
    return new NextResponse(responseBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="${membership.Organizer.slug}-membership-${membership.memberNumber || membership.id.substring(0, 8)}.pkpass"`,
        'Content-Length': passBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating Apple Wallet membership pass:', error);
    return NextResponse.json(
      { error: 'Failed to generate pass', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
