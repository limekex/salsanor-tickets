import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

/**
 * Generate a signed token for secure photo access
 * This prevents unauthorized access to member photos
 */
export function generatePhotoToken(profileId: string): string {
  const secret = process.env.PHOTO_ACCESS_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(profileId)
    .digest('hex')
    .substring(0, 32); // Use first 32 chars for shorter URL
}

/**
 * Verify a photo access token
 */
function verifyPhotoToken(profileId: string, token: string): boolean {
  const expectedToken = generatePhotoToken(profileId);
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expectedToken)
  );
}

/**
 * GET /api/profiles/[id]/photo?token=xxx
 * 
 * Returns the profile photo as an image.
 * Used by Google Wallet to fetch member photos.
 * 
 * SECURITY: Requires a valid signed token to prevent unauthorized access.
 * Token is generated using HMAC-SHA256 with a server secret.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.nextUrl.searchParams.get('token');

    // Validate token
    if (!token || token.length !== 32) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!verifyPhotoToken(id, token)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const profile = await prisma.personProfile.findUnique({
      where: { id },
      select: { photoUrl: true },
    });

    if (!profile?.photoUrl) {
      return new NextResponse('Not found', { status: 404 });
    }

    // Check if it's a base64 data URI
    if (profile.photoUrl.startsWith('data:')) {
      // Parse data URI: data:image/jpeg;base64,/9j/4AAQ...
      const matches = profile.photoUrl.match(/^data:([^;]+);base64,(.+)$/);
      
      if (!matches) {
        return new NextResponse('Invalid image format', { status: 400 });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];
      const imageBuffer = Buffer.from(base64Data, 'base64');

      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        },
      });
    }

    // If it's a regular URL, redirect to it
    return NextResponse.redirect(profile.photoUrl);
  } catch (error) {
    console.error('Error fetching profile photo:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
