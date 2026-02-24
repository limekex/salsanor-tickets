import { Pass } from '@walletpass/pass-js';

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

  // Decode base64 certificates to strings (PEM format)
  const signerCertPem = Buffer.from(signerCert, 'base64').toString('utf-8');
  const wwdrCertPem = Buffer.from(wwdrCert, 'base64').toString('utf-8');
  
  // Extract key from certificate (assuming PKCS12 or combined PEM)
  // For passkit-wallet, we need separate cert and key
  const signerKeyPem = signerCertPem; // If combined, else extract separately

  // Format event date for display
  const eventDateStr = new Intl.DateTimeFormat('no-NO', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(data.eventDate);

  // Create pass instance with @walletpass/pass-js
  const pass = new Pass({
    passTypeIdentifier: passTypeId,
    teamIdentifier: teamId,
    organizationName: data.organizerName,
    description: `Billett til ${data.eventTitle}`,
    serialNumber: data.ticketNumber,
    backgroundColor: 'rgb(30, 30, 30)',
    foregroundColor: 'rgb(255, 255, 255)',
    labelColor: 'rgb(200, 200, 200)',
    
    // Barcode (QR code)
    barcodes: [{
      message: data.qrCode,
      format: 'PKBarcodeFormatQR',
      messageEncoding: 'iso-8859-1',
    }],
    
    // Event ticket specific structure
    eventTicket: {
      primaryFields: [{
        key: 'event',
        label: 'ARRANGEMENT',
        value: data.eventTitle,
      }],
      secondaryFields: [
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
      ],
      auxiliaryFields: [{
        key: 'attendee',
        label: 'NAVN',
        value: data.attendeeName,
      }],
      backFields: [
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
      ],
    },
    
    // Relevant date (event date)
    relevantDate: data.eventDate.toISOString(),
  }, {
    // Certificates
    signerCert: signerCertPem,
    signerKey: signerKeyPem,
    signerKeyPassphrase: signerKeyPassphrase,
    wwdr: wwdrCertPem,
  });

  // Optional: Add event image as strip image
  if (data.eventImageUrl) {
    try {
      const imageResponse = await fetch(data.eventImageUrl);
      if (imageResponse.ok) {
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        pass.images.add('strip.png', imageBuffer);
        pass.images.add('strip@2x.png', imageBuffer);
      }
    } catch (error) {
      console.error('Failed to fetch event image for pass:', error);
      // Continue without image
    }
  }

  // Generate and return the .pkpass file
  const passBuffer = await pass.asBuffer();
  return passBuffer;
}
