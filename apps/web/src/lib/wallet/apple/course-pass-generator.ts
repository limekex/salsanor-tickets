import { PKPass } from 'passkit-generator';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Apple Wallet Course Pass Data
 * 
 * Issuer Model:
 * - RegiNor.events is the selling platform and pass issuer (stable brand)
 * - Organizer varies per course (e.g., SalsaNor) and is displayed as "COURSE BY"
 * 
 * Pass Style: eventTicket (used for recurring series passes)
 */
export interface CourseTrackInfo {
  name: string
  bookedSlots?: number[]           // For PRIVATE template: slot indices
  bookedWeeks?: number[]           // For PRIVATE template: week indices
  slotStartTime?: string | null    // For PRIVATE template: "HH:mm"
  slotDurationMinutes?: number | null
}

/**
 * Format booked slots into readable time range
 */
function formatSlotTimes(
  bookedSlots: number[],
  slotStartTime: string,
  slotDurationMinutes: number,
  slotBreakMinutes: number = 0
): string {
  if (!bookedSlots.length) return ''
  const sorted = [...bookedSlots].sort((a, b) => a - b)
  const [startHours, startMins] = slotStartTime.split(':').map(Number)
  
  const firstSlotMinutes = startHours * 60 + startMins + 
    sorted[0] * (slotDurationMinutes + slotBreakMinutes)
  const lastSlotEndMinutes = startHours * 60 + startMins + 
    sorted[sorted.length - 1] * (slotDurationMinutes + slotBreakMinutes) + slotDurationMinutes
  
  const fmt = (m: number) => {
    const h = Math.floor(m / 60) % 24
    const mins = m % 60
    return `${h.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }
  
  return `${fmt(firstSlotMinutes)} - ${fmt(lastSlotEndMinutes)}`
}

interface CoursePassData {
  // Core identifiers
  ticketId: string;           // Unique UUID - used as serialNumber
  
  // Course period information
  periodName: string;         // e.g., "Spring 2026"
  periodCode: string;         // e.g., "SP26" - short reference
  startDate: Date;            // Period start date
  endDate: Date;              // Period end date
  venueName?: string;         // Location name
  venueAddress?: string;      // Full venue address
  city: string;
  
  // Tracks registered for
  trackNames: string[];       // e.g., ["Salsa Beginners", "Bachata Intermediate"] - backward compat
  trackInfo?: CourseTrackInfo[];  // New: includes slot booking info
  
  // Organizer (course owner)
  organizerName: string;
  organizerEmail?: string;
  organizerPhone?: string;
  organizerWebsite?: string;
  
  // Attendee
  attendeeName: string;
  
  // QR code
  qrCode: string;
  
  // Visual styling (optional overrides)
  backgroundColor?: string;
  foregroundColor?: string;
  labelColor?: string;
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
 * (like "Bag Attributes" from macOS Keychain exports)
 */
function extractPEM(data: string): string {
  const pemMatch = data.match(/-----BEGIN [^-]+-----[\s\S]+?-----END [^-]+-----/);
  if (!pemMatch) {
    throw new Error(`No PEM data found in the provided string. Preview: ${data.substring(0, 100)}...`);
  }
  return pemMatch[0];
}

/**
 * Generate Apple Wallet pass for course enrollment
 */
export async function generateAppleCoursePass(data: CoursePassData): Promise<Buffer> {
  // Get certificates from environment (same vars as event tickets)
  const signerCertB64 = process.env.APPLE_TICKETS_SIGNER_CERTIFICATE;
  const signerKeyB64 = process.env.APPLE_TICKETS_SIGNER_KEY;
  const wwdrCertB64 = process.env.APPLE_WWDR_CERTIFICATE;
  const passTypeId = process.env.APPLE_TICKETS_PASS_TYPE_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyPassphrase = process.env.APPLE_TICKETS_SIGNER_KEY_PASSPHRASE;

  if (!signerCertB64 || !signerKeyB64 || !wwdrCertB64 || !passTypeId || !teamId) {
    throw new Error('Missing required Apple Wallet environment variables');
  }

  // Decode certificates and extract PEM portion (strips macOS Keychain metadata)
  const signerCertPem = extractPEM(Buffer.from(signerCertB64, 'base64').toString('utf-8'));
  const signerKeyPem = extractPEM(Buffer.from(signerKeyB64, 'base64').toString('utf-8'));
  const wwdrCertPem = extractPEM(Buffer.from(wwdrCertB64, 'base64').toString('utf-8'));

  // Format dates
  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
  });
  const dateRangeStr = `${dateFormatter.format(data.startDate)} – ${dateFormatter.format(data.endDate)}`;

  // Build location string
  const location = data.venueName 
    ? `${data.venueName}, ${data.city}`
    : data.city;

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
      serialNumber: data.ticketId,
      description: 'Course Pass',
      organizationName: 'RegiNor.events',
      logoText: 'RegiNor.events',
      backgroundColor: data.backgroundColor ?? 'rgb(255, 255, 255)',
      foregroundColor: data.foregroundColor ?? 'rgb(0, 0, 0)',
      labelColor: data.labelColor ?? 'rgb(100, 100, 100)',
      sharingProhibited: false,
    }
  );

  pass.type = 'eventTicket';

  // Add barcode
  pass.setBarcodes({
    message: data.qrCode,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
    altText: 'from signup to showtime',
  });

  // Primary field - course period name
  pass.primaryFields.push({
    key: 'period',
    label: 'COURSE',
    value: data.periodName,
  });

  // Secondary fields - dates and location
  pass.secondaryFields.push(
    {
      key: 'dates',
      label: 'PERIOD',
      value: dateRangeStr,
    },
    {
      key: 'location',
      label: 'LOCATION',
      value: location,
    }
  );

  // Auxiliary fields - organizer, attendee, tracks
  pass.auxiliaryFields.push(
    {
      key: 'organizer',
      label: 'COURSE BY',
      value: data.organizerName,
    },
    {
      key: 'attendee',
      label: 'NAME',
      value: data.attendeeName,
    },
    {
      key: 'tracks',
      label: 'CLASSES',
      value: data.trackNames.length <= 2 
        ? data.trackNames.join(', ')
        : `${data.trackNames.slice(0, 2).join(', ')} +${data.trackNames.length - 2}`,
    }
  );

  // Back fields - full track list and details
  pass.backFields.push({
    key: 'ref',
    label: 'Reference',
    value: data.periodCode,
  });

  // Build full track list with slot times if available
  let trackListStr = ''
  if (data.trackInfo && data.trackInfo.length > 0) {
    trackListStr = data.trackInfo.map(track => {
      let line = track.name
      if (track.bookedSlots && track.bookedSlots.length > 0 && track.slotStartTime && track.slotDurationMinutes) {
        const slotTimes = formatSlotTimes(track.bookedSlots, track.slotStartTime, track.slotDurationMinutes)
        line += `\n  Time: ${slotTimes}`
      }
      return line
    }).join('\n')
  } else {
    trackListStr = data.trackNames.join('\n')
  }

  pass.backFields.push({
    key: 'tracksFull',
    label: 'Enrolled Tracks',
    value: trackListStr,
  });

  pass.backFields.push({
    key: 'instructions',
    label: 'Check-in Instructions',
    value: 'Present QR code at each class session for scanning. Please arrive at least 5 minutes before class starts.',
  });

  if (data.venueAddress) {
    pass.backFields.push({
      key: 'venueAddress',
      label: 'Venue Address',
      value: data.venueAddress,
    });
  }

  pass.backFields.push({
    key: 'organizerInfo',
    label: 'Course Organizer',
    value: data.organizerName,
  });

  if (data.organizerEmail) {
    pass.backFields.push({
      key: 'organizerEmail',
      label: 'Contact Email',
      value: data.organizerEmail,
    });
  }

  if (data.organizerWebsite) {
    pass.backFields.push({
      key: 'organizerWeb',
      label: 'Website',
      value: data.organizerWebsite,
    });
  }

  pass.backFields.push({
    key: 'platform',
    label: 'Ticketing Platform',
    value: 'RegiNor.events\nfrom signup to showtime',
  });

  pass.backFields.push({
    key: 'support',
    label: 'Support',
    value: 'support@reginor.events',
  });

  // Add relevant date for lock screen
  pass.setRelevantDate(data.startDate);

  // Add expiration date
  const expirationDate = new Date(data.endDate);
  expirationDate.setDate(expirationDate.getDate() + 7);
  pass.setExpirationDate(expirationDate);

  // Add icons
  const iconPng = getIconPng();
  const logoPng = getLogoPng();

  pass.addBuffer('icon.png', iconPng);
  pass.addBuffer('icon@2x.png', iconPng);
  pass.addBuffer('icon@3x.png', iconPng);
  pass.addBuffer('logo.png', logoPng);
  pass.addBuffer('logo@2x.png', logoPng);

  // Generate the pass
  return pass.getAsBuffer();
}
