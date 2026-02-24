import { PKPass } from 'passkit-wallet';

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
  const signerKeyPassphrase = process.env.APPLE_TICKETS_SIGNER_KEY_PASSPHRASE;
  const wwdrCert = process.env.APPLE_WWDR_CERTIFICATE;

  if (!teamId || !passTypeId || !signerCert || !signerKeyPassphrase || !wwdrCert) {
    throw new Error('Missing required Apple Wallet environment variables for tickets');
  }

  // Decode base64 certificates
  const signerCertBuffer = Buffer.from(signerCert, 'base64');
  const wwdrCertBuffer = Buffer.from(wwdrCert, 'base64');

  // Create pass instance
  const pass = new PKPass(
    {
      passTypeIdentifier: passTypeId,
      teamIdentifier: teamId,
      organizationName: data.organizerName,
      description: `Billett til ${data.eventTitle}`,
      serialNumber: data.ticketNumber,
      backgroundColor: 'rgb(30, 30, 30)',
      foregroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(200, 200, 200)',
    },
    {
      signerCert: signerCertBuffer,
      signerKey: signerCertBuffer, // passkit-wallet uses same buffer for cert+key
      signerKeyPassphrase: signerKeyPassphrase,
      wwdr: wwdrCertBuffer,
    }
  );

  // Add barcode (QR code)
  pass.setBarcodes({
    message: data.qrCode,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
  });

  // Event info in primary field
  pass.primaryFields.add({
    key: 'event',
    label: 'ARRANGEMENT',
    value: data.eventTitle,
  });

  // Event date and location in secondary fields
  const eventDateStr = new Intl.DateTimeFormat('no-NO', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(data.eventDate);

  pass.secondaryFields.add({
    key: 'date',
    label: 'DATO OG TID',
    value: eventDateStr,
  });

  pass.secondaryFields.add({
    key: 'location',
    label: 'STED',
    value: data.eventLocation,
  });

  // Attendee name in auxiliary field
  pass.auxiliaryFields.add({
    key: 'attendee',
    label: 'NAVN',
    value: data.attendeeName,
  });

  // Ticket number in back field
  pass.backFields.add({
    key: 'ticketNumber',
    label: 'Billettnummer',
    value: data.ticketNumber,
  });

  pass.backFields.add({
    key: 'organizer',
    label: 'Arrangør',
    value: data.organizerName,
  });

  // Set relevant date (event date)
  pass.setRelevantDate(data.eventDate);

  // Optional: Add event image as strip image
  if (data.eventImageUrl) {
    try {
      const imageResponse = await fetch(data.eventImageUrl);
      if (imageResponse.ok) {
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        pass.addImage('strip', imageBuffer);
        pass.addImage('strip@2x', imageBuffer);
      }
    } catch (error) {
      console.error('Failed to fetch event image for pass:', error);
      // Continue without image
    }
  }

  // Generate and return the .pkpass file
  const passBuffer = await pass.generate();
  return passBuffer;
}
