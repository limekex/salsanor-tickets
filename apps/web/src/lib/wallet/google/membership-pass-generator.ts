import jwt from 'jsonwebtoken';

/**
 * Google Wallet Membership Pass Data
 * 
 * Issuer Model:
 * - RegiNor.events is the platform issuer
 * - Organizer is the membership organization (e.g., SalsaNor)
 * 
 * Pass Type: loyaltyObject (for membership/loyalty cards)
 */
interface MembershipPassData {
  // Core identifiers
  membershipId: string;       // Unique UUID
  memberNumber: string;       // Display member number
  organizerId: string;        // For class ID
  
  // Organization information
  organizerName: string;
  organizerSlug: string;
  organizerLogoUrl?: string;
  organizerWebsite?: string;
  
  // Membership tier
  tierName: string;
  tierSlug: string;
  accentColor?: string;  // Custom tier color (hex)
  
  // Validity
  validFrom: Date;
  validTo: Date;
  
  // Member details
  memberName: string;
  memberPhotoUrl?: string;
  
  // Verification
  verificationToken: string;
}

/**
 * Tier color mapping for Google Wallet
 * Uses hex colors
 */
const tierColors: Record<string, string> = {
  normal: '#475569',
  supporting: '#2563eb',
  family: '#16a34a',
  honorary: '#9333ea',
  vip: '#f59e0b',
  board: '#dc2626',
};

const defaultColor = '#475569';

/**
 * Generate Google Wallet membership pass save URL
 */
export function generateGoogleMembershipPassUrl(data: MembershipPassData): string {
  // Validate required environment variables
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const serviceAccountJson = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT;

  if (!issuerId || !serviceAccountJson) {
    throw new Error('Missing required Google Wallet environment variables');
  }

  // Decode service account JSON
  const serviceAccount = JSON.parse(
    Buffer.from(serviceAccountJson, 'base64').toString('utf-8')
  );

  // Create unique class and object IDs
  // IDs must be alphanumeric with dots, underscores, or hyphens (no special chars)
  // Sanitize UUIDs by removing hyphens
  // Add version suffix to force Google to create new object (cache busting)
  const sanitizedOrgId = data.organizerId.replace(/-/g, '');
  const sanitizedMembershipId = data.membershipId.replace(/-/g, '');
  const classId = `${issuerId}.membership_${sanitizedOrgId}`;
  const objectId = `${issuerId}.member_${sanitizedMembershipId}_v6`;

  // Get tier color (prefer custom accentColor over slug mapping)
  const tierColor = data.accentColor || tierColors[data.tierSlug] || defaultColor;

  // Format expiry date - short format to save bytes
  const validToStr = data.validTo.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Verification URL - use short token
  const verificationUrl = `https://reginor.events/v/m/${data.verificationToken}`;

  // Hero image URLs - only use actual URLs, not base64 data URIs (too large for JWT)
  const isValidUrl = (url?: string): url is string => url !== undefined && url.startsWith('https://') && !url.startsWith('data:');
  const heroUrl = isValidUrl(data.memberPhotoUrl) ? data.memberPhotoUrl : 'https://reginor.events/assets/logos/WalletMemberHero.jpg';
  const logoUrl = isValidUrl(data.organizerLogoUrl) ? data.organizerLogoUrl : 'https://reginor.events/assets/logos/GoogleWalletIssuerLogo.png';
  
  console.log('Google Wallet heroUrl:', heroUrl.substring(0, 100));
  console.log('Google Wallet memberPhotoUrl was:', data.memberPhotoUrl?.substring(0, 50) || 'undefined');

  // Minimal class (no template override to save bytes)
  const genericClass = { id: classId };

  // Object with all visual elements
  const genericObject: Record<string, unknown> = {
    id: objectId,
    classId: classId,
    cardTitle: { defaultValue: { language: 'en', value: `${data.organizerName}` } },
    header: { defaultValue: { language: 'en', value: data.memberName } },
    subheader: { defaultValue: { language: 'en', value: data.memberNumber || 'Member' } },
    hexBackgroundColor: tierColor,
    logo: { sourceUri: { uri: logoUrl } },
    heroImage: { sourceUri: { uri: heroUrl } },
    barcode: { type: 'QR_CODE', value: verificationUrl, alternateText: 'from signup to showtime' },
    textModulesData: [
      { header: 'Tier', body: data.tierName, id: 'tier' },
      { header: 'Valid', body: validToStr, id: 'exp' },
      { header: 'Info', body: 'Present this card when requested by your organization.', id: 'info' },
    ],
  };

  // Create JWT claims
  const claims = {
    iss: serviceAccount.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    origins: ['https://reginor.events', 'http://localhost:3000'],
    payload: {
      genericClasses: [genericClass],
      genericObjects: [genericObject],
    },
  };

  // Debug logging
  console.log('Google Wallet JWT payload:', JSON.stringify(claims.payload, null, 2));

  // Sign the JWT
  const token = jwt.sign(claims, serviceAccount.private_key, {
    algorithm: 'RS256',
  });

  // Return the save URL
  return `https://pay.google.com/gp/v/save/${token}`;
}
