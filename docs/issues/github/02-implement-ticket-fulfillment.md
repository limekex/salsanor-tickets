# Implement Complete Ticket Fulfillment System

## Priority
**CRITICAL** - Blocks production launch

## Description
Implement the complete ticket generation, storage, and retrieval system that creates secure QR tickets after successful payment and fulfills registrations.

## Current Status
- ⚠️ Basic fulfillment service exists (`/lib/fulfillment/service.ts`)
- ⚠️ QR token generation is placeholder only (not secure)
- ⚠️ No proper signing/hashing of QR tokens
- ⚠️ Ticket model exists in Prisma schema ✅
- ⚠️ Webhook integration incomplete
- ✅ TicketQR display component exists

## Requirements

### Secure QR Token Generation
- [ ] Implement signed JWT-based QR tokens containing:
  - `periodId`
  - `personId`
  - `ticketId`
  - `issuedAt` timestamp
  - `nonce` for uniqueness
- [ ] Use secret key from environment variable
- [ ] Set token expiration (period duration)
- [ ] Generate cryptographic hash of token
- [ ] Store only `qrTokenHash` in database (not full token)

### Fulfillment Pipeline
- [ ] On payment success webhook:
  - [x] Mark Order as PAID
  - [x] Update all linked Registrations to ACTIVE
  - [ ] Generate one Ticket per person per period
  - [ ] Create QR token with signature
  - [ ] Hash and store in `qrTokenHash` field
  - [ ] Send confirmation email with ticket link
- [ ] Handle duplicate webhook calls (idempotency)
- [ ] Handle partial failures (rollback or retry)
- [ ] Log all fulfillment steps for debugging

### Ticket Retrieval API
- [ ] Create endpoint: `GET /api/tickets/[periodCode]`
  - Verify user authentication
  - Verify user has ACTIVE registration in period
  - Return signed QR token (NOT hash)
  - Include ticket metadata (period name, tracks, etc.)
- [ ] Create endpoint: `GET /api/tickets/download/[ticketId]`
  - Generate PDF ticket with QR code
  - Include participant name, period, tracks
  - Styled according to brand guidelines

### Error Handling
- [ ] Handle missing PersonProfile during fulfillment
- [ ] Handle duplicate ticket creation attempts
- [ ] Handle webhook payload validation errors
- [ ] Log errors to monitoring service
- [ ] Send admin alerts for critical fulfillment failures

### Email Notifications
- [ ] Design ticket confirmation email template
- [ ] Include QR code image inline
- [ ] Include link to web ticket view
- [ ] Include event details and instructions
- [ ] Support resending tickets

## Technical Implementation

### JWT Token Structure
```typescript
interface QRTokenPayload {
  iss: 'salsanor-tickets'
  sub: string // ticketId
  periodId: string
  personId: string
  iat: number
  exp: number
  nonce: string
}
```

### Token Generation Example
```typescript
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

function generateTicketToken(ticket: Ticket): string {
  const payload = {
    iss: 'salsanor-tickets',
    sub: ticket.id,
    periodId: ticket.periodId,
    personId: ticket.personId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(period.endDate.getTime() / 1000),
    nonce: crypto.randomBytes(16).toString('hex')
  }
  
  return jwt.sign(payload, process.env.TICKET_JWT_SECRET!)
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
```

### Fulfillment Service Update
```typescript
async function fulfillOrder(order: Order) {
  // 1. Update order status
  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'PAID' }
  })

  // 2. Activate registrations
  await prisma.registration.updateMany({
    where: { orderId: order.id },
    data: { status: 'ACTIVE' }
  })

  // 3. Generate ticket
  const existingTicket = await prisma.ticket.findUnique({
    where: {
      periodId_personId: {
        periodId: order.periodId,
        personId: order.purchaserPersonId
      }
    }
  })

  if (!existingTicket) {
    const ticket = await prisma.ticket.create({
      data: {
        periodId: order.periodId,
        personId: order.purchaserPersonId,
        status: 'ACTIVE'
      }
    })

    const token = generateTicketToken(ticket)
    const hash = hashToken(token)

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { qrTokenHash: hash }
    })

    // 4. Send email
    await sendTicketEmail(order.purchaserPersonId, ticket.id)
  }
}
```

## Database Changes
- [ ] Ensure `Ticket.qrTokenHash` is properly indexed
- [ ] Add `Ticket.qrTokenIssuedAt` if needed for rotation
- [ ] Consider `Ticket.qrTokenVersion` for invalidation

## Testing Checklist
- [ ] Unit test: token generation and signing
- [ ] Unit test: token hashing
- [ ] Integration test: full fulfillment flow
- [ ] Test: webhook idempotency
- [ ] Test: duplicate ticket prevention
- [ ] Test: token expiration validation
- [ ] E2E test: payment → webhook → ticket → email

## Security Considerations
- [ ] Store JWT secret in environment variable
- [ ] Never expose JWT secret to client
- [ ] Store only hash in database (one-way)
- [ ] Validate token signature on every scan
- [ ] Set appropriate token expiration
- [ ] Implement token rotation if needed
- [ ] Rate limit ticket API endpoints

## Success Criteria
- [ ] Payment success triggers automatic ticket generation
- [ ] Tickets are securely signed with JWT
- [ ] Only hashes are stored in database
- [ ] Participants receive email with ticket
- [ ] Ticket QR codes display correctly
- [ ] All fulfillment steps are logged
- [ ] Zero duplicate tickets created

## Dependencies
- Stripe webhook handling (payment success)
- Email service configured
- JWT library (`jsonwebtoken`)
- Environment variable: `TICKET_JWT_SECRET`

## Related Issues
- #[stripe-webhook-implementation] - Webhook handling
- #[check-in-validation] - QR validation during check-in
- #[email-notifications] - Email system

## References
- Specs: Phase 5 — Payments + fulfillment
- Specs: Phase 6 — Ticketing
- `/apps/web/src/lib/fulfillment/service.ts` (current placeholder)
