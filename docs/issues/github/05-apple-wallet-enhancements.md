# Apple Wallet Pass Enhancements

## Overview

Apple Wallet Event Ticket implementation following best practices where:
- **RegiNor.events** is the selling platform and pass issuer (stable brand)
- **Organizer** varies per event (e.g., SalsaNor) and is displayed as "EVENT BY"

## Current Implementation ✅

### Issuer/Organizer Model
- `organizationName`: "RegiNor.events" (platform brand)
- `logoText`: "RegiNor.events"
- Organizer displayed in auxiliary fields as "EVENT BY <OrganizerName>"

### Pass Layout
| Area | Field | Content |
|------|-------|---------|
| Header | ticketType | VIP, General, etc. (if provided) |
| Primary | event | Event title |
| Secondary | dateTime | Full date & time (en-GB format) |
| Secondary | venue | Venue name |
| Auxiliary | organizer | "EVENT BY" + organizer name |
| Auxiliary | attendee | Attendee name |
| Auxiliary | ref | Reference code (first 8 chars) |
| Auxiliary | type | Ticket type (if provided) |
| Auxiliary | seat | Seat info (if provided) |

### Barcode
- QR code with opaque token for server-side validation
- `altText`: "from signup to showtime · Ref: ABC123"

### Back Fields (Flip Side)
1. Entry Instructions
2. Venue Address (if available)
3. Event Organizer name
4. Organizer Email (if available)
5. Organizer Website (if available)
6. Ticketing Platform: RegiNor.events
7. Platform Support: support@reginor.events
8. Ticket Reference
9. Ticket ID (UUID)

### Relevance Features
- `relevantDate`: Event start time (lock screen notification ~24h before)
- `expirationDate`: Event end time (pass grays out after)
- `locations`: Geo-based notifications when near venue (requires coordinates)

### Visual Assets
- `icon.png` / `icon@2x.png` / `icon@3x.png`
- `logo.png` / `logo@2x.png` / `logo@3x.png`
- `strip.png` / `strip@2x.png` / `strip@3x.png` (centered banner)

## Planned Enhancements

### 1. Header Fields - Membership & Ticket Types

**Priority:** Medium  
**Complexity:** Medium

Display premium status or membership level in the header field area (top-right of pass).

**Use Cases:**
- Show "MEMBER" badge for organization members
- Display ticket types: "VIP", "BACKSTAGE", "GENERAL"
- Show pass tier: "GOLD", "SILVER", "BRONZE"

**Implementation:**
```typescript
// In ticket-pass-generator.ts
if (data.ticketType) {
  pass.headerFields.push({
    key: 'ticketType',
    label: 'TYPE',
    value: data.ticketType, // "VIP", "BACKSTAGE", etc.
  });
}

if (data.isMember) {
  pass.headerFields.push({
    key: 'membership',
    label: 'STATUS',
    value: 'MEMBER',
  });
}
```

**Database Changes:**
```prisma
model EventTicket {
  // ... existing fields
  ticketType    String?   // "GENERAL", "VIP", "BACKSTAGE", etc.
}
```

---

### 2. Location-Based Notifications (Geofencing)

**Priority:** High  
**Complexity:** Medium

Enable lock screen notifications when user approaches the venue using GPS coordinates.

**Use Cases:**
- Pass appears on lock screen when arriving at venue
- Shows "You're near [Venue Name]" message
- Helps users quickly access tickets without searching

**Implementation:**

#### A. Add coordinates to Event model
```prisma
model Event {
  // ... existing fields
  venueLatitude   Float?
  venueLongitude  Float?
}
```

#### B. Geocoding when creating/updating events
```typescript
// In event creation API
import { geocodeAddress } from '@/lib/geocoding';

// When event is created with address
const coords = await geocodeAddress(
  `${locationName}, ${locationAddress}, ${city}`
);

await prisma.event.update({
  where: { id: eventId },
  data: {
    venueLatitude: coords.lat,
    venueLongitude: coords.lng,
  }
});
```

#### C. Pass generator already supports locations
```typescript
// Already implemented - just needs coordinates passed
if (data.venueLatitude && data.venueLongitude) {
  pass.setLocations({
    latitude: data.venueLatitude,
    longitude: data.venueLongitude,
    relevantText: `You're near ${data.venueName}`,
  });
}
```

**Geocoding Options:**
- Google Maps Geocoding API
- Mapbox Geocoding API
- OpenStreetMap Nominatim (free)
- Here Maps API

---

### 3. Seating Charts & Reserved Seating

**Priority:** Low  
**Complexity:** High

Enable seat selection with visual seating charts and different price categories.

**Use Cases:**
- Concert halls with numbered seats
- Theater performances
- VIP areas with premium pricing
- Standing vs. seated sections

**Database Changes:**
```prisma
model Venue {
  id            String    @id @default(uuid())
  name          String
  address       String?
  city          String?
  latitude      Float?
  longitude     Float?
  seatingChart  Json?     // SVG or seat map data
  VenueSection  VenueSection[]
  Event         Event[]
}

model VenueSection {
  id              String    @id @default(uuid())
  venueId         String
  name            String    // "Orchestra", "Balcony", "VIP Lounge"
  sectionType     SectionType // SEATED, STANDING, VIP
  capacity        Int
  priceMultiplier Decimal   @default(1.0) // 1.5 for VIP = 50% more
  coordinates     Json?     // SVG coordinates for interactive map
  Venue           Venue     @relation(fields: [venueId], references: [id])
  Seat            Seat[]
}

model Seat {
  id          String    @id @default(uuid())
  sectionId   String
  row         String?   // "A", "B", "1", "2"
  number      String    // "1", "2", "101"
  status      SeatStatus @default(AVAILABLE)
  Section     VenueSection @relation(fields: [sectionId], references: [id])
  EventTicket EventTicket[]
}

model EventTicket {
  // ... existing fields
  seatId        String?
  seatSection   String?   // Denormalized for wallet display
  seatRow       String?
  seatNumber    String?
  Seat          Seat?     @relation(fields: [seatId], references: [id])
}

enum SectionType {
  SEATED
  STANDING
  VIP
  BACKSTAGE
}

enum SeatStatus {
  AVAILABLE
  RESERVED
  SOLD
  BLOCKED
}
```

**Wallet Pass Display:**
```typescript
if (data.seatSection) {
  pass.auxiliaryFields.push({
    key: 'seat',
    label: 'SEAT',
    value: data.seatRow && data.seatNumber 
      ? `${data.seatSection} - Row ${data.seatRow}, Seat ${data.seatNumber}`
      : data.seatSection,
  });
}
```

**UI Components Needed:**
- Interactive seating chart (SVG-based)
- Seat selection component
- Price tier display
- Availability indicators (color-coded)

---

### 4. Semantics for Siri & Spotlight Integration

**Priority:** Medium  
**Complexity:** Low

Enable Siri and Spotlight to understand and surface pass content intelligently.

**Use Cases:**
- "Hey Siri, show me my concert ticket"
- Pass appears in Spotlight search results
- Calendar integration suggestions
- Proactive suggestions based on event time

**Implementation:**
```typescript
// Semantics object for pass.json
const semantics = {
  eventName: data.eventTitle,
  eventType: 'PKEventTypeGeneric', // or PKEventTypeLivePerformance, PKEventTypeSports, etc.
  eventStartDate: data.eventDate.toISOString(),
  eventEndDate: data.eventEndDate?.toISOString(),
  venueName: data.venueName,
  venueLocation: data.venueLatitude && data.venueLongitude ? {
    latitude: data.venueLatitude,
    longitude: data.venueLongitude,
  } : undefined,
  // For seated events
  seatDescription: data.seatSection,
  // Performer information (future)
  performerNames: data.performers, // ["Artist Name"]
};

// Note: passkit-generator may need property access
// pass.props.semantics = semantics;
```

**Event Types Available:**
- `PKEventTypeGeneric` - General events
- `PKEventTypeLivePerformance` - Concerts, theater
- `PKEventTypeMovie` - Film screenings
- `PKEventTypeSports` - Sporting events
- `PKEventTypeConference` - Conferences, seminars

---

## Implementation Priority

| Feature | Priority | Effort | User Impact |
|---------|----------|--------|-------------|
| Header Fields | Medium | Low | Medium |
| Location Notifications | High | Medium | High |
| Seating Charts | Low | High | Medium |
| Semantics/Siri | Medium | Low | Low |

## Recommended Order

1. **Location-Based Notifications** - High impact, medium effort
2. **Header Fields** - Quick win once ticketType is in schema
3. **Semantics** - Low effort addition
4. **Seating Charts** - Major feature, plan carefully

## Related Files

- [ticket-pass-generator.ts](../../apps/web/src/lib/wallet/apple/ticket-pass-generator.ts) - Pass generation
- [apple/route.ts](../../apps/web/src/app/api/tickets/[id]/wallet/apple/route.ts) - API endpoint
- [schema.prisma](../../packages/database/prisma/schema.prisma) - Database schema

## Apple Documentation References

- [Pass Design Guide](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/)
- [eventTicket Dictionary](https://developer.apple.com/documentation/walletpasses/pass/eventticket)
- [Semantics](https://developer.apple.com/documentation/walletpasses/semantictags)
- [Location](https://developer.apple.com/documentation/walletpasses/pass/locations)
