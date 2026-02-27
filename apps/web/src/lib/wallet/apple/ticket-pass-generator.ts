import { PKPass } from 'passkit-generator';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createPublicKey, createPrivateKey, X509Certificate } from 'crypto';

/**
 * Apple Wallet Event Ticket Data
 * 
 * Issuer Model:
 * - RegiNor.events is the selling platform and pass issuer (stable brand)
 * - Organizer varies per event (e.g., SalsaNor) and is displayed as "EVENT BY"
 * 
 * Pass Style: eventTicket
 */
interface TicketPassData {
  // Core identifiers
  ticketId: string;           // Unique UUID - used as serialNumber to prevent overwrites
  ticketNumber: string;       // Display reference (e.g., "ABC123") - shown to user
  
  // Event information
  eventTitle: string;
  eventDate: Date;            // Start date/time (also used for relevantDate)
  eventEndDate?: Date;        // End date/time (optional, for expiration)
  venueName: string;          // Venue name (e.g., "Oslo Konserthus")
  venueAddress?: string;      // Full address for back field
  venueLatitude?: number;     // For location-based lock screen notifications
  venueLongitude?: number;
  
  // Organizer (event owner, e.g., SalsaNor)
  organizerName: string;      // Displayed as "EVENT BY <organizerName>"
  organizerEmail?: string;    // Contact for back field
  organizerPhone?: string;    // Contact for back field
  organizerWebsite?: string;  // Link for back field
  
  // Attendee
  attendeeName: string;
  
  // Ticket details
  ticketType?: string;        // e.g., "General Admission", "VIP", "Performer"
  seatSection?: string;       // Section/row/seat info (optional)
  
  // QR code
  qrCode: string;             // Opaque token validated server-side
  
  // Visual styling (optional overrides)
  backgroundColor?: string;   // RGB format: 'rgb(30, 30, 30)'
  foregroundColor?: string;   // RGB format: 'rgb(255, 255, 255)'
  labelColor?: string;        // RGB format: 'rgb(200, 200, 200)'
  
  // Entry instructions (optional, for back field)
  entryInstructions?: string;
}

/**
 * Minimal valid PNG as base64 - a simple 29x29 dark gray square.
 * This is used as fallback if no icon files are found.
 * Generated as a solid #1e1e1e color PNG.
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

/**
 * Get icon PNG buffer - tries to load from public/wallet, falls back to embedded PNG
 */
function getIconPng(): Buffer {
  // Try to load icon from various locations (process.cwd() is apps/web in Next.js)
  const possiblePaths = [
    join(process.cwd(), 'public', 'wallet', 'icon.png'),
    join(process.cwd(), '..', '..', 'assets', 'WalletAssets', 'icon.png'),
    join(process.cwd(), '..', '..', 'assets', 'logo+fav_favicon.png'),
  ];

  for (const iconPath of possiblePaths) {
    if (existsSync(iconPath)) {
      console.log('[Apple Wallet] Using icon from:', iconPath);
      return readFileSync(iconPath);
    }
  }

  // Fallback to embedded PNG
  console.log('[Apple Wallet] Using fallback embedded icon');
  return Buffer.from(FALLBACK_ICON_BASE64, 'base64');
}

/**
 * Get logo PNG buffer - tries to load from public/wallet, falls back to icon
 */
function getLogoPng(): Buffer {
  const possiblePaths = [
    join(process.cwd(), 'public', 'wallet', 'logo.png'),
    join(process.cwd(), '..', '..', 'assets', 'WalletAssets', 'logo.png'),
    join(process.cwd(), '..', '..', 'assets', 'logo+fav_logo-full-white.png'),
  ];

  for (const logoPath of possiblePaths) {
    if (existsSync(logoPath)) {
      console.log('[Apple Wallet] Using logo from:', logoPath);
      return readFileSync(logoPath);
    }
  }

  // Fallback to icon
  console.log('[Apple Wallet] Using icon as logo fallback');
  return getIconPng();
}

/**
 * Extracts the PEM portion from a string that might contain additional metadata
 * (like "Bag Attributes" from macOS Keychain exports)
 */
function extractPEM(data: string): string {
  // Extract content from -----BEGIN to -----END (inclusive)
  const pemMatch = data.match(/-----BEGIN [^-]+-----[\s\S]+?-----END [^-]+-----/);
  if (!pemMatch) {
    throw new Error(`No PEM data found in the provided string. Preview: ${data.substring(0, 100)}...`);
  }
  return pemMatch[0];
}

export async function generateAppleTicketPass(data: TicketPassData): Promise<Buffer> {
  // Validate required environment variables
  const teamId = process.env.APPLE_TEAM_ID;
  const passTypeId = process.env.APPLE_TICKETS_PASS_TYPE_ID;
  const signerCert = process.env.APPLE_TICKETS_SIGNER_CERTIFICATE;
  const signerKey = process.env.APPLE_TICKETS_SIGNER_KEY;
  const signerKeyPassphrase = process.env.APPLE_TICKETS_SIGNER_KEY_PASSPHRASE;
  const wwdrCert = process.env.APPLE_WWDR_CERTIFICATE;

  if (!teamId || !passTypeId || !signerCert || !signerKey || !signerKeyPassphrase || !wwdrCert) {
    throw new Error('Missing required Apple Wallet environment variables (check APPLE_TEAM_ID, APPLE_TICKETS_PASS_TYPE_ID, etc.)');
  }

  // Decode base64-encoded certificates and key, then extract only the PEM portion
  // This strips any metadata (like "Bag Attributes" from macOS Keychain exports)
  const signerCertPem = extractPEM(Buffer.from(signerCert, 'base64').toString('utf-8'));
  const signerKeyPem = extractPEM(Buffer.from(signerKey, 'base64').toString('utf-8'));
  const wwdrCertPem = extractPEM(Buffer.from(wwdrCert, 'base64').toString('utf-8'));

  // Debug: Log PEM information
  const keyHeaderMatch = signerKeyPem.match(/-----BEGIN ([^-]+)-----/);
  const keyType = keyHeaderMatch ? keyHeaderMatch[1] : 'UNKNOWN';
  console.log('[Apple Wallet Debug] Signer Key PEM Header:', keyType);
  console.log('[Apple Wallet Debug] Signer Key PEM Length:', signerKeyPem.length);
  console.log('[Apple Wallet Debug] Signer Key First 200 chars:', signerKeyPem.substring(0, 200));
  console.log('[Apple Wallet Debug] Signer Key Last 100 chars:', signerKeyPem.substring(signerKeyPem.length - 100));

  // Validate that we have the correct PEM types
  if (signerKeyPem.includes('BEGIN CERTIFICATE')) {
    throw new Error(
      'Configuration Error: APPLE_TICKETS_SIGNER_KEY contains a CERTIFICATE instead of a PRIVATE KEY.\n' +
      'The signer key should contain -----BEGIN PRIVATE KEY----- or -----BEGIN ENCRYPTED PRIVATE KEY-----, not -----BEGIN CERTIFICATE-----.\n' +
      'Please export your PRIVATE KEY (not the certificate) and base64-encode it for APPLE_TICKETS_SIGNER_KEY.\n' +
      'Hint: If you exported both from Keychain in one file, you need to split them and use only the PRIVATE KEY portion.'
    );
  }

  if (signerCertPem.includes('BEGIN PRIVATE KEY') || signerCertPem.includes('BEGIN ENCRYPTED PRIVATE KEY')) {
    throw new Error(
      'Configuration Error: APPLE_TICKETS_SIGNER_CERTIFICATE contains a PRIVATE KEY instead of a CERTIFICATE.\n' +
      'The certificate should contain -----BEGIN CERTIFICATE-----, not a private key.\n' +
      'Please export your CERTIFICATE (not the private key) and base64-encode it for APPLE_TICKETS_SIGNER_CERTIFICATE.'
    );
  }

  // Determine if key is encrypted (needs passphrase) or not
  const isKeyEncrypted = signerKeyPem.includes('ENCRYPTED');
  const effectivePassphrase = isKeyEncrypted ? signerKeyPassphrase : undefined;
  
  console.log('[Apple Wallet Debug] Key encrypted:', isKeyEncrypted);
  console.log('[Apple Wallet Debug] Using passphrase:', isKeyEncrypted ? 'yes' : 'no (key is unencrypted)');

  // Validate certificate and key match
  try {
    const cert = new X509Certificate(signerCertPem);
    const privateKey = createPrivateKey({
      key: signerKeyPem,
      passphrase: effectivePassphrase,
    });
    
    // Log certificate details
    console.log('[Apple Wallet Debug] Certificate Subject:', cert.subject);
    console.log('[Apple Wallet Debug] Certificate Issuer:', cert.issuer);
    console.log('[Apple Wallet Debug] Certificate Valid From:', cert.validFrom);
    console.log('[Apple Wallet Debug] Certificate Valid To:', cert.validTo);
    
    // Extract Pass Type ID from certificate (it's in the subject as UID)
    const uidMatch = cert.subject.match(/UID=([^,\n]+)/);
    const certPassTypeId = uidMatch ? uidMatch[1] : null;
    console.log('[Apple Wallet Debug] Certificate Pass Type ID (UID):', certPassTypeId);
    console.log('[Apple Wallet Debug] Configured Pass Type ID:', passTypeId);
    
    if (certPassTypeId && certPassTypeId !== passTypeId) {
      console.warn('[Apple Wallet Warning] Pass Type ID MISMATCH!');
      console.warn(`  Certificate has: ${certPassTypeId}`);
      console.warn(`  Config has: ${passTypeId}`);
    }
    
    // Extract Team ID from certificate (it's in the subject as OU)
    const ouMatch = cert.subject.match(/OU=([^,\n]+)/);
    const certTeamId = ouMatch ? ouMatch[1] : null;
    console.log('[Apple Wallet Debug] Certificate Team ID (OU):', certTeamId);
    console.log('[Apple Wallet Debug] Configured Team ID:', teamId);
    
    if (certTeamId && certTeamId !== teamId) {
      console.error('[Apple Wallet ERROR] Team ID MISMATCH!');
      console.error(`  Certificate has: ${certTeamId}`);
      console.error(`  Config has: ${teamId}`);
      console.error('  → Update APPLE_TEAM_ID in .env.local to match the certificate!');
      throw new Error(`Team ID mismatch: Certificate has "${certTeamId}" but APPLE_TEAM_ID is "${teamId}". Update .env.local.`);
    }
    
    // Verify key matches certificate
    const certPublicKey = cert.publicKey;
    const keyPublicKey = createPublicKey(privateKey);
    
    const certKeyPem = certPublicKey.export({ type: 'spki', format: 'pem' });
    const privateKeyPubPem = keyPublicKey.export({ type: 'spki', format: 'pem' });
    
    if (certKeyPem !== privateKeyPubPem) {
      console.error('[Apple Wallet Error] CERTIFICATE AND PRIVATE KEY DO NOT MATCH!');
      console.error('The private key was not generated from this certificate.');
      throw new Error('Certificate and private key do not match. Ensure you exported the key from the same certificate.');
    }
    
    console.log('[Apple Wallet Debug] Certificate and private key MATCH ✓');
  } catch (error) {
    if (error instanceof Error && error.message.includes('do not match')) {
      throw error;
    }
    console.warn('[Apple Wallet Warning] Could not fully validate cert/key pair:', error);
  }

  // Format event date for display
  const eventDateStr = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(data.eventDate);

  // Create pass instance with passkit-generator
  // CRITICAL: serialNumber must be GLOBALLY UNIQUE to prevent passes from overwriting each other
  // Using ticketId (UUID) ensures each ticket gets its own pass in Apple Wallet
  //
  // Issuer Model:
  // - organizationName = "RegiNor.events" (platform/issuer - stable brand)
  // - logoText = "RegiNor.events" (short text next to logo)
  // - Organizer (event owner) is displayed in auxiliary fields as "EVENT BY"
  const pass = new PKPass(
    {
      // Template directory (not needed for programmatic creation)
    },
    {
      // Certificates - must be PEM strings (not buffers)
      wwdr: wwdrCertPem,
      signerCert: signerCertPem,
      signerKey: signerKeyPem, // Private key for signing (PEM string)
      signerKeyPassphrase: effectivePassphrase,
    },
    {
      // Required pass data
      passTypeIdentifier: passTypeId,
      teamIdentifier: teamId,
      serialNumber: data.ticketId, // UUID ensures uniqueness - prevents pass overwrites!
      description: 'Event Ticket',
      // Platform branding (issuer)
      organizationName: 'RegiNor.events',
      logoText: 'RegiNor.events',
      // Visual styling - light theme for clean professional look
      backgroundColor: data.backgroundColor ?? 'rgb(255, 255, 255)',
      foregroundColor: data.foregroundColor ?? 'rgb(0, 0, 0)',
      labelColor: data.labelColor ?? 'rgb(100, 100, 100)',
      // Sharing allowed by default
      sharingProhibited: false,
    }
  );

  // Set pass type
  pass.type = 'eventTicket';

  // Add barcode (QR code) with tagline and reference as altText
  // altText appears near QR and provides fallback if scan fails
  const refCode = data.ticketNumber.length > 8 
    ? data.ticketNumber.substring(0, 8).toUpperCase() 
    : data.ticketNumber.toUpperCase();
  pass.setBarcodes({
    message: data.qrCode,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
    altText: `from signup to showtime · Ref: ${refCode}`,
  });

  // Add header field (top right of pass) - shows ticket type if provided
  if (data.ticketType) {
    pass.headerFields.push({
      key: 'ticketType',
      label: 'TYPE',
      value: data.ticketType,
    });
  }

  // Add primary field (event name)
  pass.primaryFields.push({
    key: 'event',
    label: 'EVENT',
    value: data.eventTitle,
  });

  // Add secondary fields (date/time and venue)
  pass.secondaryFields.push(
    {
      key: 'dateTime',
      label: 'DATE & TIME',
      value: eventDateStr,
    },
    {
      key: 'venue',
      label: 'LOCATION',
      value: data.venueName,
    }
  );

  // Add auxiliary fields
  // Order: Organizer (EVENT BY), Attendee, Reference, Ticket Type, Seat
  pass.auxiliaryFields.push(
    {
      key: 'organizer',
      label: 'EVENT BY',
      value: data.organizerName,
    },
    {
      key: 'attendee',
      label: 'NAME',
      value: data.attendeeName,
    },
    {
      key: 'ref',
      label: '#',
      value: refCode,
    }
  );

  // Add ticket type if provided (e.g., "VIP", "General Admission")
  if (data.ticketType) {
    pass.auxiliaryFields.push({
      key: 'type',
      label: 'TICKET',
      value: data.ticketType,
    });
  }

  // Add seat info if provided
  if (data.seatSection) {
    pass.auxiliaryFields.push({
      key: 'seat',
      label: 'SEAT',
      value: data.seatSection,
    });
  }

  // Add back fields (shown when pass is flipped)
  // Contains: Entry instructions, Organizer contact, Platform contact, Policies
  
  // Entry instructions
  pass.backFields.push({
    key: 'entryInfo',
    label: 'Entry Instructions',
    value: data.entryInstructions ?? 'Present QR code at entrance for scanning. Please have your ticket ready before reaching the entrance.',
  });

  // Venue address (if different from venue name)
  if (data.venueAddress) {
    pass.backFields.push({
      key: 'venueAddress',
      label: 'Venue Address',
      value: data.venueAddress,
    });
  }

  // Organizer contact section
  pass.backFields.push({
    key: 'organizerInfo',
    label: 'Event Organizer',
    value: data.organizerName,
  });

  if (data.organizerEmail) {
    pass.backFields.push({
      key: 'organizerEmail',
      label: 'Organizer Email',
      value: data.organizerEmail,
    });
  }

  if (data.organizerPhone) {
    pass.backFields.push({
      key: 'organizerPhone',
      label: 'Organizer Phone',
      value: data.organizerPhone,
    });
  }

  if (data.organizerWebsite) {
    pass.backFields.push({
      key: 'organizerWebsite',
      label: 'Organizer Website',
      value: data.organizerWebsite,
    });
  }

  // Platform contact
  pass.backFields.push(
    {
      key: 'platformInfo',
      label: 'Ticketing Platform',
      value: 'RegiNor.events',
    },
    {
      key: 'platformSupport',
      label: 'Platform Support',
      value: 'support@reginor.events',
    }
  );

  // Ticket reference
  pass.backFields.push(
    {
      key: 'ticketRef',
      label: 'Ticket Reference',
      value: data.ticketNumber,
    },
    {
      key: 'ticketId',
      label: 'Ticket ID',
      value: data.ticketId,
    }
  );

  // Set relevant date (triggers lock screen notification ~24h before event)
  pass.relevantDate = data.eventDate.toISOString();

  // Set expiration date if end date provided (pass becomes "expired" after event)
  if (data.eventEndDate) {
    pass.expirationDate = data.eventEndDate.toISOString();
  }

  // Add location for geo-based lock screen notifications (shows when near venue)
  if (data.venueLatitude && data.venueLongitude) {
    pass.setLocations({
      latitude: data.venueLatitude,
      longitude: data.venueLongitude,
      relevantText: `You're near ${data.venueName}`,
    });
  }

  // Note: Semantics for Siri/Spotlight integration can be added via pass.props
  // when passkit-generator supports it. See docs/issues/github/05-apple-wallet-enhancements.md

  // Add required icon files (Apple Wallet won't open passes without icons)
  // Apple will scale the icon as needed for different resolutions
  const iconPng = getIconPng();
  pass.addBuffer('icon.png', iconPng);
  pass.addBuffer('icon@2x.png', iconPng);
  pass.addBuffer('icon@3x.png', iconPng);

  // Add logo (displayed at top-left of pass header)
  // Using a smaller version or same as icon for subtle branding
  const logoPng = getLogoPng();
  pass.addBuffer('logo.png', logoPng);
  pass.addBuffer('logo@2x.png', logoPng);
  pass.addBuffer('logo@3x.png', logoPng);

  // Note: Strip image removed for cleaner look on white background

  // Generate and return the .pkpass file
  try {
    console.log('[Apple Wallet] Generating .pkpass buffer...');
    const passBuffer = await pass.getAsBuffer();
    console.log('[Apple Wallet] Pass generated successfully, size:', passBuffer.length, 'bytes');
    return passBuffer;
  } catch (error) {
    console.error('[Apple Wallet] Error generating pass buffer:', error);
    throw new Error(`Failed to generate Apple Wallet pass: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
