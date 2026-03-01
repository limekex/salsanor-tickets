import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { generateGoogleMembershipPassUrl } from '@/lib/wallet/google/membership-pass-generator';
import { generatePhotoToken } from '@/app/api/profiles/[id]/photo/route';

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

    // Generate Google Wallet save URL
    console.log('Generating Google Wallet pass with data:', {
      membershipId: membership.id,
      organizerId: membership.organizerId,
      organizerName: membership.Organizer.name,
      tierName: membership.MembershipTier.name,
      tierSlug: membership.MembershipTier.slug,
      accentColor: membership.MembershipTier.accentColor,
      validFrom: membership.validFrom,
      validTo: membership.validTo,
    });
    
    // Generate member photo URL - use API endpoint instead of base64 data
    // Google Wallet needs a publicly accessible URL to fetch images
    // Include signed token for security - prevents unauthorized access
    const profileId = membership.PersonProfile.id;
    const photoToken = generatePhotoToken(profileId);
    const memberPhotoUrl = membership.PersonProfile.photoUrl
      ? `https://reginor.events/api/profiles/${profileId}/photo?token=${photoToken}`
      : undefined;

    const saveUrl = generateGoogleMembershipPassUrl({
      membershipId: membership.id,
      memberNumber: membership.memberNumber || '',
      organizerId: membership.organizerId,
      organizerName: membership.Organizer.name,
      organizerSlug: membership.Organizer.slug,
      organizerLogoUrl: membership.Organizer.logoUrl || undefined,
      organizerWebsite: membership.Organizer.website || undefined,
      tierName: membership.MembershipTier.name,
      tierSlug: membership.MembershipTier.slug,
      accentColor: membership.MembershipTier.accentColor || undefined,
      validFrom: membership.validFrom,
      validTo: membership.validTo,
      memberName: `${membership.PersonProfile.firstName} ${membership.PersonProfile.lastName}`.trim(),
      memberPhotoUrl: memberPhotoUrl,
      verificationToken: membership.verificationToken || membership.id,
    });

    return NextResponse.json({ saveUrl });
  } catch (error) {
    console.error('Error generating Google Wallet membership pass:', error);
    return NextResponse.json(
      { error: 'Failed to generate pass', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
