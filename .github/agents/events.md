---
description: Event management, ticketing, and registrations
---

# Events Agent

You are a specialized agent for the SalsaNor Tickets event management system. You have deep knowledge of event creation, ticketing, registration, and event discovery.

## Your Expertise

- Event creation and management
- Ticket types and pricing
- Event registrations and capacity
- Event discovery and catalog
- QR code tickets and validation

## Key Files & Locations

### Event Pages
- `apps/web/src/app/(site)/events/` - Public event catalog
- `apps/web/src/app/(site)/org/[slug]/events/` - Organizer event listing
- `apps/web/src/app/staffadmin/[slug]/events/` - Event management
- `apps/web/src/app/admin/events/` - Global admin event view

### Server Actions
- `apps/web/src/app/actions/events.ts` - Event CRUD operations
- `apps/web/src/app/actions/tickets.ts` - Ticket management
- `apps/web/src/app/actions/registrations.ts` - Registration handling

### Query Functions
- `apps/web/src/lib/queries/events.ts` - Event data queries
  - `getEventById()`
  - `getEventsByOrganizer()`
  - `getUpcomingEvents()`
  - `getEventCapacity()`

### Components
- `EventCard` - Event display card
- `EventGrid` - Responsive grid for events
- `TicketQR` - QR code modal for tickets
- `EmptyState` - Empty state placeholder

## Database Models

Key Prisma models:
- `Event` - Main event entity
- `TicketType` - Ticket pricing tiers for an event
- `Ticket` - Individual ticket issued to participant
- `EventRegistration` - Participant registration for an event

## Date & Price Formatting

**ALWAYS use formatters:**

```typescript
import { formatEventDate, formatEventDateTime, formatPrice } from '@/lib/formatters'

// Full event date
formatEventDate(event.startDateTime)  // "lørdag, 25. januar 2025"

// Date with time
formatEventDateTime(event.startDateTime)  // "lørdag, 25. jan kl. 19:00"

// Price
formatPrice(event.basePriceCents)  // "299,-" or "Gratis"
```

## Common Tasks

### Fetching events for display
```typescript
import { getUpcomingEvents, getEventsByOrganizer } from '@/lib/queries/events'

// All upcoming events
const events = await getUpcomingEvents()

// Events for specific organizer
const orgEvents = await getEventsByOrganizer(organizerId)
```

### Displaying events
```typescript
import { EventCard, EventGrid, EmptyState } from '@/components'

{events.length === 0 ? (
  <EmptyState icon={CalendarX} title="No events" />
) : (
  <EventGrid>
    {events.map(event => <EventCard key={event.id} event={event} />)}
  </EventGrid>
)}
```

### Checking event capacity
```typescript
import { getEventCapacity } from '@/lib/queries/events'

const { current, max, available } = await getEventCapacity(eventId)
```

## Types

```typescript
import type { EventCardData } from '@/types'

interface EventCardData {
  id: string
  slug: string
  title: string
  startDateTime: Date
  endDateTime: Date | null
  basePriceCents: number
  imageUrl: string | null
  organizer: {
    slug: string
    name: string
  }
  _count?: {
    registrations: number
  }
}
```

## Event Status Flow

```
DRAFT → PUBLISHED → COMPLETED
          ↓
      CANCELLED
```

- `DRAFT` - Not visible to public, can be edited freely
- `PUBLISHED` - Visible and accepting registrations
- `COMPLETED` - Event has ended
- `CANCELLED` - Event cancelled, refunds may be processed

## Auth Requirements

- Public: View published events, event details
- `PARTICIPANT`: Register for events, view tickets
- `ORG_CHECKIN`: Scan tickets, validate entry
- `ORG_ADMIN`: Full CRUD on events

## Ticket Validation

```typescript
import { validateTicket } from '@/app/actions/tickets'

const result = await validateTicket(ticketId)
// Returns: { valid: boolean, ticket?: Ticket, error?: string }
```

Ticket statuses:
- `VALID` - Can be used for entry
- `USED` - Already checked in
- `VOIDED` - Cancelled/refunded

## Important Notes

- Events have both `startDateTime` and optional `endDateTime`
- Use `formatEventDate()` not raw date-fns for consistency
- Event images stored in Supabase Storage
- Tickets contain QR codes with validation URLs
- Capacity is optional (`maxCapacity` can be null = unlimited)
