# Implement Check-in Validation API and Backend

## Priority
**CRITICAL** - Blocks check-in functionality

## Description
Build the backend API endpoints for validating QR tickets during check-in and recording attendance. This connects the existing scanner UI to actual validation and database logging.

## Current Status
- ✅ Check-in scanner UI exists (`/app/(checkin)/checkin/page.tsx`)
- ✅ Html5QrcodeScanner component integrated
- ⚠️ No backend validation endpoint
- ⚠️ No CheckIn model in database (exists in specs but not implemented)
- ⚠️ Scanner calls placeholder validation

## Requirements

### Database Schema
- [ ] Add `CheckIn` model to Prisma schema:
```prisma
enum CheckInType {
  PERIOD_ENTRY
  SESSION_ENTRY
}

model CheckIn {
  id          String   @id @default(uuid())
  ticketId    String
  type        CheckInType @default(PERIOD_ENTRY)
  sessionId   String?
  scannedByUserId String?
  scannedAt   DateTime @default(now())
  meta        Json?
  ticket      Ticket @relation(fields: [ticketId], references: [id])
  session     TrackSession? @relation(fields: [sessionId], references: [id])
  scannedBy   UserAccount? @relation(fields: [scannedByUserId], references: [id])
  
  @@index([ticketId, scannedAt])
  @@index([scannedAt])
}
```
- [ ] Run migration to add CheckIn table

### Validation Endpoint
- [ ] Create `POST /api/checkin/validate`
  - Accept QR token string in request body
  - Verify JWT signature
  - Decode token to extract ticketId, personId, periodId
  - Look up ticket by hash (compare hash of submitted token)
  - Verify ticket status is ACTIVE
  - Verify person has ACTIVE registrations in that period
  - Return validation result with:
    - Valid/invalid status
    - Person name
    - Period name
    - List of tracks registered
    - Payment status
    - Already checked in? (with timestamp)
    - Any warnings or errors

### Check-in Marking Endpoint
- [ ] Create `POST /api/checkin/mark`
  - Accept ticketId (from validation result)
  - Verify CHECKIN or ORG_CHECKIN role
  - Create CheckIn record with:
    - ticketId
    - type: PERIOD_ENTRY (for now)
    - scannedByUserId (from auth)
    - scannedAt (timestamp)
  - Handle duplicate check-ins:
    - If checked in within last 1 hour, return existing check-in
    - If checked in earlier, allow re-entry (multiple sessions)
  - Return success confirmation

### Authorization
- [ ] Validate user has CHECKIN or ORG_CHECKIN role
- [ ] For ORG_CHECKIN, verify scanning for their organization only
- [ ] For CHECKIN (global), allow any organization

### Error Handling
- [ ] Invalid token format → 400 Bad Request
- [ ] Expired token → 401 Unauthorized
- [ ] Ticket not found → 404 Not Found
- [ ] Ticket voided → 403 Forbidden
- [ ] No active registrations → 403 Forbidden
- [ ] Database errors → 500 Internal Server Error
- [ ] Log all errors with context

### Response Contracts

**Validation Success Response**
```typescript
{
  valid: true,
  ticket: {
    id: string
    status: 'ACTIVE'
  },
  person: {
    id: string
    firstName: string
    lastName: string
    email: string
  },
  period: {
    id: string
    name: string
    code: string
  },
  registrations: [
    {
      trackId: string
      trackTitle: string
      trackLevel: string
      chosenRole: 'LEADER' | 'FOLLOWER' | 'ANY'
      status: 'ACTIVE'
    }
  ],
  checkIns: [
    {
      id: string
      scannedAt: string
      scannedBy: string
    }
  ],
  warnings: string[]
}
```

**Validation Error Response**
```typescript
{
  valid: false,
  error: {
    code: 'INVALID_TOKEN' | 'EXPIRED' | 'NOT_FOUND' | 'VOIDED' | 'NO_REGISTRATION',
    message: string
  }
}
```

## Technical Implementation

### Token Validation Logic
```typescript
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

async function validateTicketToken(token: string) {
  // 1. Verify JWT signature
  const decoded = jwt.verify(token, process.env.TICKET_JWT_SECRET!)
  
  // 2. Hash token and look up
  const hash = crypto.createHash('sha256').update(token).digest('hex')
  
  const ticket = await prisma.ticket.findFirst({
    where: { qrTokenHash: hash },
    include: {
      person: true,
      period: true
    }
  })
  
  if (!ticket) {
    throw new Error('Ticket not found')
  }
  
  if (ticket.status !== 'ACTIVE') {
    throw new Error('Ticket is not active')
  }
  
  // 3. Get active registrations
  const registrations = await prisma.registration.findMany({
    where: {
      personId: ticket.personId,
      periodId: ticket.periodId,
      status: 'ACTIVE'
    },
    include: { track: true }
  })
  
  if (registrations.length === 0) {
    throw new Error('No active registrations found')
  }
  
  // 4. Get check-in history
  const checkIns = await prisma.checkIn.findMany({
    where: { ticketId: ticket.id },
    orderBy: { scannedAt: 'desc' },
    take: 10
  })
  
  return {
    ticket,
    registrations,
    checkIns
  }
}
```

### Check-in Duplication Logic
```typescript
async function createCheckIn(ticketId: string, userId: string) {
  // Check for recent check-in (within 1 hour)
  const recentCheckIn = await prisma.checkIn.findFirst({
    where: {
      ticketId,
      scannedAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000)
      }
    }
  })
  
  if (recentCheckIn) {
    return {
      duplicate: true,
      checkIn: recentCheckIn
    }
  }
  
  const checkIn = await prisma.checkIn.create({
    data: {
      ticketId,
      type: 'PERIOD_ENTRY',
      scannedByUserId: userId,
      scannedAt: new Date()
    }
  })
  
  return {
    duplicate: false,
    checkIn
  }
}
```

## Testing Checklist
- [ ] Unit test: JWT validation
- [ ] Unit test: token hashing and lookup
- [ ] Unit test: duplicate check-in detection
- [ ] Integration test: validate endpoint with valid token
- [ ] Integration test: validate endpoint with invalid token
- [ ] Integration test: mark check-in endpoint
- [ ] Test: expired token rejection
- [ ] Test: voided ticket rejection
- [ ] Test: no registration found
- [ ] Test: ORG_CHECKIN organization scoping
- [ ] E2E test: scan QR → validate → mark → success

## Security Checklist
- [ ] Verify JWT signature on every request
- [ ] Rate limit validation endpoint (prevent brute force)
- [ ] Rate limit check-in endpoint
- [ ] Validate user authorization (CHECKIN/ORG_CHECKIN roles)
- [ ] Log all check-in attempts (for audit trail)
- [ ] Sanitize error messages (don't leak token details)
- [ ] Use HTTPS only
- [ ] CORS properly configured for scanner app

## Performance Considerations
- [ ] Index on `Ticket.qrTokenHash` for fast lookup
- [ ] Index on `CheckIn.ticketId` and `scannedAt`
- [ ] Cache validation results briefly (5-10 seconds)
- [ ] Optimize query with proper includes
- [ ] Consider connection pooling for high-traffic events

## Success Criteria
- [ ] Scanner can validate any valid ticket
- [ ] Invalid tokens are rejected with clear errors
- [ ] Check-ins are logged to database
- [ ] Duplicate check-ins are handled gracefully
- [ ] Authorization is properly enforced
- [ ] Response time < 500ms for validation
- [ ] All errors are logged and monitored

## Dependencies
- #[ticket-fulfillment] - Ticket generation must be complete
- Prisma schema with CheckIn model
- JWT secret configured
- User authentication system
- CHECKIN and ORG_CHECKIN roles

## Related Issues
- #[checkin-scanner-ui] - Frontend scanner (exists)
- #[ticket-fulfillment] - Ticket generation
- #[pwa-configuration] - Offline capability

## References
- Specs: Phase 6 — Ticketing & Check-in control app
- `/apps/web/src/app/(checkin)/checkin/page.tsx` (scanner UI)
