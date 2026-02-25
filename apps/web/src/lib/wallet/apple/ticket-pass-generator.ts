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

export async function generateAppleTicketPass(data: TicketPassData): Promise<Buffer> {
  // Validate required environment variables
  const teamId = process.env.APPLE_TEAM_ID;
  const passTypeId = process.env.APPLE_TICKETS_PASS_TYPE_ID;
  const signerCert = process.env.APPLE_TICKETS_SIGNER_CERTIFICATE;
  const signerKey = process.env.APPLE_TICKETS_SIGNER_KEY;
  const signerKeyPassphrase = process.env.APPLE_TICKETS_SIGNER_KEY_PASSPHRASE;
  const wwdrCert = process.env.APPLE_WWDR_CERTIFICATE;

  if (!teamId || !passTypeId || !signerCert || !signerKey || !signerKeyPassphrase || !wwdrCert) {
    throw new Error('Missing required Apple Wallet environment variables for tickets');
  }

  // Decode base64-encoded PEM certificates and key to strings
  // passkit-generator expects PEM strings (with BEGIN/END headers), not raw buffers
  const signerCertPem = Buffer.from(signerCert, 'base64').toString('utf-8');
  const signerKeyPem = Buffer.from(signerKey, 'base64').toString('utf-8');
  const wwdrCertPem = Buffer.from(wwdrCert, 'base64').toString('utf-8');

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
