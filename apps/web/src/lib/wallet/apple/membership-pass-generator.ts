import { PKPass } from 'passkit-generator';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Apple Wallet Membership Pass Data
 * 
 * Issuer Model:
 * - RegiNor.events is the platform issuer (stable brand)
 * - Organizer is the membership organization (e.g., SalsaNor)
 * 
 * Pass Style: generic (for membership cards)
 */
interface MembershipPassData {
  // Core identifiers
  membershipId: string;       // Unique UUID - used as serialNumber
  memberNumber: string;       // Display member number (e.g., "M-2026-001")
  
  // Membership information
  organizerName: string;      // Organization name (e.g., "SalsaNor")
  organizerSlug: string;      // For class ID uniqueness
  tierName: string;           // Tier name (e.g., "Supporting Member")
  tierSlug: string;           // For color mapping
  accentColor?: string;       // Custom tier color (hex, e.g., "#2563eb")
  
  // Validity period
  validFrom: Date;
  validTo: Date;
  
  // Member details
  memberName: string;         // Full name
  memberPhotoUrl?: string;    // Optional photo
  
  // QR code for verification
  verificationToken: string;
  
  // Visual styling (optional overrides)
  backgroundColor?: string;
  foregroundColor?: string;
  labelColor?: string;
}

/**
 * Tier color mapping for membership cards
 */
const tierColors: Record<string, { bg: string; fg: string; label: string }> = {
  normal: { bg: 'rgb(71, 85, 105)', fg: 'rgb(255, 255, 255)', label: 'rgb(200, 200, 200)' },
  supporting: { bg: 'rgb(37, 99, 235)', fg: 'rgb(255, 255, 255)', label: 'rgb(200, 200, 200)' },
  family: { bg: 'rgb(22, 163, 74)', fg: 'rgb(255, 255, 255)', label: 'rgb(200, 200, 200)' },
  honorary: { bg: 'rgb(147, 51, 234)', fg: 'rgb(255, 255, 255)', label: 'rgb(200, 200, 200)' },
  vip: { bg: 'rgb(245, 158, 11)', fg: 'rgb(255, 255, 255)', label: 'rgb(200, 200, 200)' },
  board: { bg: 'rgb(220, 38, 38)', fg: 'rgb(255, 255, 255)', label: 'rgb(200, 200, 200)' },
};

const defaultColors = { bg: 'rgb(71, 85, 105)', fg: 'rgb(255, 255, 255)', label: 'rgb(200, 200, 200)' };

/**
 * Convert hex color to rgb string
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 'rgb(71, 85, 105)'; // default
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Calculate contrasting text color (white or black) based on background
 */
function getContrastTextColor(hex: string): { fg: string; label: string } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { fg: 'rgb(255, 255, 255)', label: 'rgb(200, 200, 200)' };
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance > 0.5) {
    return { fg: 'rgb(0, 0, 0)', label: 'rgb(100, 100, 100)' };
  }
  return { fg: 'rgb(255, 255, 255)', label: 'rgb(200, 200, 200)' };
}

/**
 * Minimal valid PNG as fallback
 */
const FALLBACK_ICON_BASE64 = 
  'iVBORw0KGgoAAAANSUhEUgAAAB0AAAAdCAIAAADZ8fBYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJ' +
  'bWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdp' +
  'bj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6' +
  'eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0' +
  'NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJo' +
  'dHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlw' +
  'dGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAv' +
  'IiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RS' +
  'ZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpD' +
  'cmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNl' +
  'SUQ9InhtcC5paWQ6MzMzMzMzMzMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MzMzMzMzMzMi' +
  'PiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDozMzMzMzMzMyIg' +
  'c3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDozMzMzMzMzMyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4g' +
  'PC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Ph4REREAAAAmSURBVHja' +
  'YvzPwMDAwMDEQCJgYmBgGNWMGlCjmlHDh1MzQIABAKk4AQGu7xQYAAAAAElFTkSuQmCC';

function getIconPng(): Buffer {
  const possiblePaths = [
    join(process.cwd(), 'public', 'wallet', 'icon.png'),
    join(process.cwd(), '..', '..', 'assets', 'WalletAssets', 'icon.png'),
    join(process.cwd(), '..', '..', 'assets', 'logo+fav_favicon.png'),
  ];

  for (const iconPath of possiblePaths) {
    if (existsSync(iconPath)) {
      return readFileSync(iconPath);
    }
  }

  return Buffer.from(FALLBACK_ICON_BASE64, 'base64');
}

function getLogoPng(): Buffer {
  const possiblePaths = [
    join(process.cwd(), 'public', 'wallet', 'logo.png'),
    join(process.cwd(), '..', '..', 'assets', 'WalletAssets', 'logo.png'),
    join(process.cwd(), '..', '..', 'assets', 'logo+fav_logo-full-white.png'),
  ];

  for (const logoPath of possiblePaths) {
    if (existsSync(logoPath)) {
      return readFileSync(logoPath);
    }
  }

  return getIconPng();
}

/**
 * Extracts the PEM portion from a string that might contain additional metadata
 */
function extractPEM(data: string): string {
  const pemMatch = data.match(/-----BEGIN [^-]+-----[\s\S]+?-----END [^-]+-----/);
  if (!pemMatch) {
    throw new Error(`No PEM data found in the provided string. Preview: ${data.substring(0, 100)}...`);
  }
  return pemMatch[0];
}

/**
 * Generate Apple Wallet pass for membership card
 */
export async function generateAppleMembershipPass(data: MembershipPassData): Promise<Buffer> {
  // Get certificates from environment (same vars as tickets)
  const signerCertB64 = process.env.APPLE_TICKETS_SIGNER_CERTIFICATE;
  const signerKeyB64 = process.env.APPLE_TICKETS_SIGNER_KEY;
  const wwdrCertB64 = process.env.APPLE_WWDR_CERTIFICATE;
  const passTypeId = process.env.APPLE_TICKETS_PASS_TYPE_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyPassphrase = process.env.APPLE_TICKETS_SIGNER_KEY_PASSPHRASE;

  if (!signerCertB64 || !signerKeyB64 || !wwdrCertB64 || !passTypeId || !teamId) {
    throw new Error('Missing required Apple Wallet environment variables');
  }

  // Decode certificates and extract PEM portion
  const signerCertPem = extractPEM(Buffer.from(signerCertB64, 'base64').toString('utf-8'));
  const signerKeyPem = extractPEM(Buffer.from(signerKeyB64, 'base64').toString('utf-8'));
  const wwdrCertPem = extractPEM(Buffer.from(wwdrCertB64, 'base64').toString('utf-8'));

  // Get tier colors (prefer custom accentColor over slug mapping)
  let backgroundColor: string;
  let foregroundColor: string;
  let labelColor: string;
  
  if (data.backgroundColor) {
    backgroundColor = data.backgroundColor;
    foregroundColor = data.foregroundColor || 'rgb(255, 255, 255)';
    labelColor = data.labelColor || 'rgb(200, 200, 200)';
  } else if (data.accentColor) {
    // Use custom tier accent color
    backgroundColor = hexToRgb(data.accentColor);
    const contrast = getContrastTextColor(data.accentColor);
    foregroundColor = data.foregroundColor || contrast.fg;
    labelColor = data.labelColor || contrast.label;
  } else {
    // Fall back to tier slug mapping
    const colors = tierColors[data.tierSlug] || defaultColors;
    backgroundColor = colors.bg;
    foregroundColor = data.foregroundColor || colors.fg;
    labelColor = data.labelColor || colors.label;
  }

  // Format dates
  const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });
  const validFromStr = dateFormatter.format(data.validFrom);
  const validToStr = dateFormatter.format(data.validTo);
  const membershipYear = new Date(data.validFrom).getFullYear();

  // Create verification URL for QR code
  const verificationUrl = `https://reginor.events/verify/membership/${data.verificationToken}`;

  // Create pass
  const pass = new PKPass(
    {},
    {
      wwdr: wwdrCertPem,
      signerCert: signerCertPem,
      signerKey: signerKeyPem,
      signerKeyPassphrase: keyPassphrase || '',
    },
    {
      passTypeIdentifier: passTypeId,
      teamIdentifier: teamId,
      serialNumber: data.membershipId,
      description: `${data.organizerName} Membership Card`,
      organizationName: 'RegiNor.events',
      logoText: data.organizerName,
      backgroundColor,
      foregroundColor,
      labelColor,
      sharingProhibited: false,
    }
  );

  // Use generic pass type for membership cards
  pass.type = 'generic';

  // Add barcode for verification
  pass.setBarcodes({
    message: verificationUrl,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
    altText: 'from signup to showtime',
  });

  // Primary field - member name
  pass.primaryFields.push({
    key: 'memberName',
    label: 'MEMBER',
    value: data.memberName,
  });

  // Secondary fields - tier and member number
  pass.secondaryFields.push(
    {
      key: 'tier',
      label: 'TIER',
      value: data.tierName,
    },
    {
      key: 'memberNumber',
      label: 'MEMBER #',
      value: data.memberNumber || 'Pending',
    }
  );

  // Auxiliary fields - validity
  pass.auxiliaryFields.push(
    {
      key: 'year',
      label: 'YEAR',
      value: membershipYear.toString(),
    },
    {
      key: 'validTo',
      label: 'VALID UNTIL',
      value: validToStr,
    }
  );

  // Back fields with full details
  pass.backFields.push(
    {
      key: 'organization',
      label: 'Organization',
      value: data.organizerName,
    },
    {
      key: 'memberDetails',
      label: 'Member Details',
      value: `${data.memberName}\nMember #: ${data.memberNumber || 'Pending'}\nTier: ${data.tierName}`,
    },
    {
      key: 'validity',
      label: 'Membership Period',
      value: `${validFromStr} – ${validToStr}`,
    },
    {
      key: 'verification',
      label: 'Verification',
      value: 'Scan the QR code to verify this membership. This membership card is issued via RegiNor.events.',
    }
  );

  // Set expiration date (day after validity ends)
  const expirationDate = new Date(data.validTo);
  expirationDate.setDate(expirationDate.getDate() + 1);
  pass.setExpirationDate(expirationDate);

  // Add icons
  const iconPng = getIconPng();
  const logoPng = getLogoPng();

  pass.addBuffer('icon.png', iconPng);
  pass.addBuffer('icon@2x.png', iconPng);
  pass.addBuffer('icon@3x.png', iconPng);
  pass.addBuffer('logo.png', logoPng);
  pass.addBuffer('logo@2x.png', logoPng);

  // Add member photo as thumbnail if available
  if (data.memberPhotoUrl) {
    try {
      const photoResponse = await fetch(data.memberPhotoUrl);
      if (photoResponse.ok) {
        const photoBuffer = Buffer.from(await photoResponse.arrayBuffer());
        pass.addBuffer('thumbnail.png', photoBuffer);
        pass.addBuffer('thumbnail@2x.png', photoBuffer);
      }
    } catch (error) {
      console.warn('Failed to fetch member photo for wallet pass:', error);
      // Continue without photo
    }
  }

  // Generate the pass
  return pass.getAsBuffer();
}
