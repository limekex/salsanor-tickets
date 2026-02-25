import { PKPass } from 'passkit-generator';

interface TicketPassData {
  ticketId: string;
  ticketNumber: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  organizerName: string;
  attendeeName: string;
  qrCode: string;
  eventImageUrl?: string;
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

  // Format event date for display
  const eventDateStr = new Intl.DateTimeFormat('no-NO', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(data.eventDate);

  // Create pass instance with passkit-generator
  const pass = new PKPass(
    {
      // Template directory (not needed for programmatic creation)
    },
    {
      // Certificates - must be PEM strings (not buffers)
      wwdr: wwdrCertPem,
      signerCert: signerCertPem,
      signerKey: signerKeyPem, // Private key for signing (PEM string)
      signerKeyPassphrase: signerKeyPassphrase,
    },
    {
      // Pass Type Identifier and Team ID
      passTypeIdentifier: passTypeId,
      teamIdentifier: teamId,
    }
  );

  // Set pass properties
  pass.type = 'eventTicket';
  pass.serialNumber = data.ticketNumber;
  pass.description = `Billett til ${data.eventTitle}`;
  pass.organizationName = data.organizerName;
  
  // Visual styling
  pass.backgroundColor = 'rgb(30, 30, 30)';
  pass.foregroundColor = 'rgb(255, 255, 255)';
  pass.labelColor = 'rgb(200, 200, 200)';

  // Add barcode (QR code)
  pass.setBarcodes({
    message: data.qrCode,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
  });

  // Add primary field (event name)
  pass.primaryFields.push({
    key: 'event',
    label: 'ARRANGEMENT',
    value: data.eventTitle,
  });

  // Add secondary fields (date and location)
  pass.secondaryFields.push(
    {
      key: 'date',
      label: 'DATO OG TID',
      value: eventDateStr,
    },
    {
      key: 'location',
      label: 'STED',
      value: data.eventLocation,
    }
  );

  // Add auxiliary field (attendee name)
  pass.auxiliaryFields.push({
    key: 'attendee',
    label: 'NAVN',
    value: data.attendeeName,
  });

  // Add back fields (additional info)
  pass.backFields.push(
    {
      key: 'ticketNumber',
      label: 'Billettnummer',
      value: data.ticketNumber,
    },
    {
      key: 'organizer',
      label: 'Arrangør',
      value: data.organizerName,
    }
  );

  // Set relevant date (event date)
  pass.relevantDate = data.eventDate.toISOString();

  // Optional: Add event image as strip image
  if (data.eventImageUrl) {
    try {
      const imageResponse = await fetch(data.eventImageUrl);
      if (imageResponse.ok) {
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        pass.addBuffer('strip.png', imageBuffer);
        pass.addBuffer('strip@2x.png', imageBuffer);
      }
    } catch (error) {
      console.error('Failed to fetch event image for pass:', error);
      // Continue without image
    }
  }

  // Generate and return the .pkpass file
  const passBuffer = await pass.getAsBuffer();
  return passBuffer;
}
