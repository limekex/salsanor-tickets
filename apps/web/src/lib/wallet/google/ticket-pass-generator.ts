import jwt from 'jsonwebtoken';

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

export function generateGoogleTicketPassUrl(data: TicketPassData): string {
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
  const classId = `${issuerId}.event_ticket_class`;
  const objectId = `${issuerId}.${data.ticketId}`;

  // Format event date
  const eventDateStr = new Intl.DateTimeFormat('no-NO', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(data.eventDate);

  // Create the event ticket class (generic, reusable)
  const eventTicketClass = {
    id: classId,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: {
                firstValue: {
                  fields: [
                    {
                      fieldPath: 'object.textModulesData["date"]',
                    },
                  ],
                },
              },
              endItem: {
                firstValue: {
                  fields: [
                    {
                      fieldPath: 'object.textModulesData["location"]',
                    },
                  ],
                },
              },
            },
          },
        ],
      },
    },
    reviewStatus: 'UNDER_REVIEW',
    issuerName: data.organizerName,
  };

  // Create the event ticket object (specific to this ticket)
  const eventTicketObject = {
    id: objectId,
    classId: classId,
    state: 'ACTIVE',
    barcode: {
      type: 'QR_CODE',
      value: data.qrCode,
    },
    cardTitle: {
      defaultValue: {
        language: 'no',
        value: data.eventTitle,
      },
    },
    header: {
      defaultValue: {
        language: 'no',
        value: 'ARRANGEMENT',
      },
    },
    subheader: {
      defaultValue: {
        language: 'no',
        value: data.ticketNumber,
      },
    },
    textModulesData: [
      {
        id: 'attendee',
        header: 'NAVN',
        body: data.attendeeName,
      },
      {
        id: 'date',
        header: 'DATO OG TID',
        body: eventDateStr,
      },
      {
        id: 'location',
        header: 'STED',
        body: data.eventLocation,
      },
    ],
    validTimeInterval: {
      start: {
        date: new Date().toISOString(),
      },
      end: {
        date: new Date(data.eventDate.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours after event
      },
    },
  };

  // Add hero image if available
  if (data.eventImageUrl) {
    (eventTicketObject as any).heroImage = {
      sourceUri: {
        uri: data.eventImageUrl,
      },
    };
  }

  // Create JWT payload
  const claims = {
    iss: serviceAccount.client_email,
    aud: 'google',
    origins: [],
    typ: 'savetowallet',
    payload: {
      eventTicketClasses: [eventTicketClass],
      eventTicketObjects: [eventTicketObject],
    },
  };

  // Sign JWT
  const token = jwt.sign(claims, serviceAccount.private_key, {
    algorithm: 'RS256',
  });

  // Return the save URL
  return `https://pay.google.com/gp/v/save/${token}`;
}
