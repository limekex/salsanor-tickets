import jwt from 'jsonwebtoken';

/**
 * Format slot times for display in wallet pass
 * Given slot indices, start time, and duration, produces human-readable times
 */
function formatSlotTimes(
  bookedSlots: number[] | undefined,
  slotStartTime: string | null | undefined,
  slotDurationMinutes: number | null | undefined,
  slotBreakMinutes: number = 0
): string | null {
  if (!bookedSlots?.length || !slotStartTime || !slotDurationMinutes) {
    return null
  }

  // Parse start time (HH:mm)
  const [startHour, startMinute] = slotStartTime.split(':').map(Number)
  if (isNaN(startHour) || isNaN(startMinute)) return null

  const slotInterval = slotDurationMinutes + slotBreakMinutes
  const times: string[] = []

  for (const slotIndex of bookedSlots) {
    const offsetMinutes = slotIndex * slotInterval
    const slotStartMinutes = startHour * 60 + startMinute + offsetMinutes
    const slotEndMinutes = slotStartMinutes + slotDurationMinutes

    const startH = Math.floor(slotStartMinutes / 60).toString().padStart(2, '0')
    const startM = (slotStartMinutes % 60).toString().padStart(2, '0')
    const endH = Math.floor(slotEndMinutes / 60).toString().padStart(2, '0')
    const endM = (slotEndMinutes % 60).toString().padStart(2, '0')

    times.push(`${startH}:${startM}-${endH}:${endM}`)
  }

  return times.join(', ')
}

/**
 * Build enrollment body text with track names and slot times
 */
function buildEnrollmentBody(data: CoursePassData): string {
  // If we have trackInfo with slot details, use that
  if (data.trackInfo?.length) {
    const lines: string[] = []
    for (const track of data.trackInfo) {
      const slotTimes = formatSlotTimes(
        track.bookedSlots, 
        track.slotStartTime, 
        track.slotDurationMinutes
      )
      if (slotTimes) {
        lines.push(`${track.name}: ${slotTimes}`)
      } else {
        lines.push(track.name)
      }
    }
    return lines.join('\n')
  }
  
  // Fall back to trackNames array
  return data.trackNames.join(', ')
}

/**
 * Google Wallet Course Pass Data
 * 
 * Issuer Model (same as Event Wallet):
 * - RegiNor.events is the selling platform and pass issuer (stable brand)
 * - Organizer varies per course (e.g., SalsaNor) and is displayed as "COURSE BY"
 */
export interface CourseTrackInfo {
  name: string
  bookedSlots?: number[]           // For PRIVATE template: slot indices
  bookedWeeks?: number[]           // For PRIVATE template: week indices
  slotStartTime?: string | null    // For PRIVATE template: "HH:mm"
  slotDurationMinutes?: number | null
}

interface CoursePassData {
  // Core identifiers
  ticketId: string;           // Unique ticket UUID
  periodId: string;           // CoursePeriod UUID (for class ID)
  
  // Course period information
  periodName: string;         // e.g., "Spring 2026"
  periodCode: string;         // e.g., "SP26" - short reference
  startDate: Date;            // Period start date
  endDate: Date;              // Period end date
  timezone?: string;          // e.g., "Europe/Oslo"
  venueName?: string;         // Location name
  city: string;               // City
  
  // Tracks registered for (may be multiple)
  trackNames: string[];       // e.g., ["Salsa Beginners", "Bachata Intermediate"]  - backward compat
  trackInfo?: CourseTrackInfo[];  // New: includes slot booking info
  
  // Organizer (course owner)
  organizerName: string;
  organizerEmail?: string;
  organizerWebsite?: string;
  
  // Attendee
  attendeeName: string;
  
  // QR code
  qrCode: string;
  
  // Visual
  imageUrl?: string;
}

/**
 * Format a date to ISO 8601 with timezone offset for Google Wallet
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

export function generateGoogleCoursePassUrl(data: CoursePassData): string {
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
  // Class = one per course period (shared template for all tickets to this period)
  // Object = one per ticket (unique to each attendee)
  const classId = `${issuerId}.course_${data.periodId}`;
  const objectId = `${issuerId}.course_ticket_${data.ticketId}`;

  // Format dates with correct timezone
  const timezone = data.timezone || 'Europe/Oslo';
  const startISO = toISOWithTimezone(data.startDate, timezone);
  const endISO = toISOWithTimezone(data.endDate, timezone);

  // Format date range for display
  const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: timezone,
  });
  const dateRangeStr = `${dateFormatter.format(data.startDate)} – ${dateFormatter.format(data.endDate)}`;

  // Build location string
  const location = data.venueName 
    ? `${data.venueName}, ${data.city}`
    : data.city;

  // Create the event ticket class (Google Wallet uses eventTicket for courses too)
  const eventTicketClass = {
    id: classId,
    // Course period name as event name
    eventName: {
      defaultValue: {
        language: 'en',
        value: data.periodName,
      },
    },
    // Venue information
    venue: {
      name: {
        defaultValue: {
          language: 'en',
          value: data.venueName || data.city,
        },
      },
      address: {
        defaultValue: {
          language: 'en',
          value: data.city,
        },
      },
    },
    // Date/time - use period start/end
    dateTime: {
      start: startISO,
      end: endISO,
    },
    // Review status (required)
    reviewStatus: 'UNDER_REVIEW',
    // Issuer name - RegiNor.events as platform
    issuerName: 'RegiNor.events',
    // Logo
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
  console.log('[Google Wallet Course] Class:', JSON.stringify(eventTicketClass, null, 2));

  // Create the event ticket object (specific to this ticket)
  const eventTicketObject: Record<string, unknown> = {
    id: objectId,
    classId: classId,
    state: 'ACTIVE',
    // Barcode/QR code
    barcode: {
      type: 'QR_CODE',
      value: data.qrCode,
      alternateText: `#${data.periodCode}`,
    },
    // Ticket holder name
    ticketHolderName: data.attendeeName,
    // Ticket number - use period code
    ticketNumber: data.periodCode,
    // Text modules for additional info
    textModulesData: [
      {
        id: 'organizer',
        header: 'COURSE BY',
        body: data.organizerName,
      },
      {
        id: 'tracks',
        header: 'ENROLLED IN',
        body: buildEnrollmentBody(data),
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

  // Add hero image - use course image if available, otherwise default
  const heroImageUrl = data.imageUrl || 'https://reginor.events/assets/logos/WalletStandardHero.jpg';
  eventTicketObject.heroImage = {
    sourceUri: {
      uri: heroImageUrl,
    },
  };

  // Log the object for debugging
  console.log('[Google Wallet Course] Object:', JSON.stringify(eventTicketObject, null, 2));

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
