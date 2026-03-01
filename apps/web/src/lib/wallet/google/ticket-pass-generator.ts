import jwt from 'jsonwebtoken';

/**
 * Google Wallet Event Ticket Data
 * 
 * Issuer Model (same as Apple Wallet):
 * - RegiNor.events is the selling platform and pass issuer (stable brand)
 * - Organizer varies per event (e.g., SalsaNor) and is displayed as "EVENT BY"
 */
interface TicketPassData {
  // Core identifiers
  ticketId: string;           // Unique ticket UUID
  ticketNumber: string;       // Display reference (e.g., "ABC123")
  eventId: string;            // Event UUID (for class ID)
  
  // Event information
  eventTitle: string;
  eventDate: Date;            // Start date/time
  eventEndDate?: Date;        // End date/time (optional)
  timezone?: string;          // e.g., "Europe/Oslo"
  venueName: string;          // Venue name
  venueAddress?: string;      // Full address
  
  // Organizer (event owner)
  organizerName: string;
  organizerEmail?: string;
  organizerWebsite?: string;
  
  // Attendee
  attendeeName: string;
  
  // Ticket details
  ticketType?: string;        // e.g., "General Admission", "VIP"
  
  // QR code
  qrCode: string;
  
  // Visual
  eventImageUrl?: string;
}

/**
 * Format a date to ISO 8601 with timezone offset for Google Wallet
 * E.g., "2026-03-01T18:00:00+01:00"
 */
function toISOWithTimezone(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  
  // Get timezone offset
  const offsetFormatter = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  });
  const formatted = offsetFormatter.format(date);
  const offsetMatch = formatted.match(/GMT([+-])(\d{1,2}):?(\d{2})?/);
  
  let offset = '+00:00';
  if (offsetMatch) {
    const sign = offsetMatch[1];
    const hours = offsetMatch[2].padStart(2, '0');
    const minutes = offsetMatch[3] || '00';
    offset = `${sign}${hours}:${minutes}`;
  }
  
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}${offset}`;
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
  // Class = one per event (shared template for all tickets to this event)
  // Object = one per ticket (unique to each attendee)
  const classId = `${issuerId}.event_${data.eventId}`;
  const objectId = `${issuerId}.ticket_${data.ticketId}`;

  // Format event date with correct timezone
  const eventTimezone = data.timezone || 'Europe/Oslo';
  
  // ISO format with timezone offset for Google Wallet dateTime field
  const eventStartISO = toISOWithTimezone(data.eventDate, eventTimezone);
  const eventEndISO = data.eventEndDate 
    ? toISOWithTimezone(data.eventEndDate, eventTimezone) 
    : undefined;

  // Reference code (short version for display)
  const refCode = data.ticketNumber.length > 8 
    ? data.ticketNumber.substring(0, 8).toUpperCase() 
    : data.ticketNumber.toUpperCase();

  // Create the event ticket class (defines the template for this event type)
  // Required fields: eventName, reviewStatus, venue (with name + address)
  const eventTicketClass = {
    id: classId,
    // Required: Event name displayed on the pass
    eventName: {
      defaultValue: {
        language: 'en',
        value: data.eventTitle,
      },
    },
    // Venue information - requires EITHER place_id OR (name + address)
    venue: {
      name: {
        defaultValue: {
          language: 'en',
          value: data.venueName,
        },
      },
      address: {
        defaultValue: {
          language: 'en',
          value: data.venueAddress || data.venueName,
        },
      },
    },
    // Date/time with correct timezone offset (Google auto-translates labels)
    dateTime: {
      start: eventStartISO,
      ...(eventEndISO && { end: eventEndISO }),
    },
    // Review status (required)
    reviewStatus: 'UNDER_REVIEW',
    // Issuer name - RegiNor.events as platform
    issuerName: 'RegiNor.events',
    // Logo - hosted on reginor.events (must be publicly accessible)
    logo: {
      sourceUri: {
        uri: 'https://reginor.events/assets/logos/GoogleWalletIssuerLogo.png',
      },
      contentDescription: {
        defaultValue: {
          language: 'en',
          value: 'RegiNor.events',
        },
      },
    },
    // Homepage link
    homepageUri: {
      uri: 'https://reginor.events',
      description: 'RegiNor.events - from signup to showtime',
    },
  };

  // Log the class for debugging
  console.log('[Google Wallet] Class:', JSON.stringify(eventTicketClass, null, 2));

  // Create the event ticket object (specific to this ticket)
  // Simplified to identify issues
  const eventTicketObject: Record<string, unknown> = {
    id: objectId,
    classId: classId,
    state: 'ACTIVE',
    // Barcode/QR code
    barcode: {
      type: 'QR_CODE',
      value: data.qrCode,
      alternateText: `#${refCode}`,
    },
    // Ticket holder name
    ticketHolderName: data.attendeeName,
    // Ticket number
    ticketNumber: refCode,
    // Text modules for additional info (organizer only - date/time/location shown by Google)
    textModulesData: [
      {
        id: 'organizer',
        header: 'EVENT BY',
        body: data.organizerName,
      },
    ],
    // Links section
    linksModuleData: {
      uris: [
        {
          uri: 'https://reginor.events',
          description: 'RegiNor.events',
        },
      ],
    },
  };

  // Add hero image - use event image if available, otherwise default RegiNor hero
  const heroImageUrl = data.eventImageUrl || 'https://reginor.events/assets/logos/WalletStandardHero.jpg';
  eventTicketObject.heroImage = {
    sourceUri: {
      uri: heroImageUrl,
    },
  };

  // Log the object for debugging
  console.log('[Google Wallet] Object:', JSON.stringify(eventTicketObject, null, 2));

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
