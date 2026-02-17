# Implement Stripe Webhook Handler

## Priority
**CRITICAL** - Blocks automatic order fulfillment

## Description
Complete the Stripe webhook integration to handle payment events and trigger order fulfillment automatically when payments succeed.

## Current Status (Updated: 17. februar 2026)

### ✅ Completed
- ✅ Webhook endpoint `/api/webhooks/stripe` exists and functional
- ✅ Signature verification implemented (using webhook secret from DB or env)
- ✅ Event parsing and validation working
- ✅ `checkout.session.completed` triggers fulfillment automatically
- ✅ `checkout.session.async_payment_succeeded` handled
- ✅ `account.updated` syncs Stripe Connect status to organizers
- ✅ Thin payload handling for Account v2 events
- ✅ Email service with template system operational
- ✅ Fulfillment service creates tickets and activates registrations
- ✅ **Order confirmation emails with PDF attachments** (tickets + receipts)
- ✅ Transaction atomicity (Prisma transactions)
- ✅ Payment records created in database
- ✅ Error handling returns correct HTTP statuses
- ✅ **IDEMPOTENCY IMPLEMENTED** - Events tracked and processed only once (TESTED)
- ✅ WebhookEvent model stores all events with status tracking
- ✅ Optimistic locking prevents concurrent duplicate processing
- ✅ Error tracking without webhook failure (always returns 200)
- ✅ **Refund handler** - Full implementation with credit notes and emails
- ✅ **Payment failure handler** - Marks orders CANCELLED, sends notification
- ✅ **Session expiry cleanup** - Releases reservations for expired checkouts
- ✅ **ARN (Acquirer Reference Number)** - Stored from Stripe, displayed in emails and admin pages
- ✅ **Per-item refund calculation** - Refunds based on specific track price, not full order total
- ✅ **Credit note PDF generation** - Fixed lineItems population from registration data

### ❌ Still Missing (Non-Critical)
- ❌ Dispute/chargeback alerts (`charge.dispute.created`) - only logs, no admin notification
- ❌ Subscription events - logged but not processed (future feature for memberships)
- ❌ Manual retry mechanism for failed webhooks (no admin dashboard yet)

### 🔧 Notes
- CreditNote model fully integrated with refund webhook flow
- Email service supports PDF attachments (receipts, tickets, credit notes)
- Invoice auto-generated during fulfillment
- **ARN (Acquirer Reference Number)**: Retrieved from Stripe after refund via `destination_details.card.reference`. Stored in CreditNote model. Displayed in cancellation emails (NO/EN) with guidance for bank tracing. Also shown on staffadmin and admin order detail pages.
- **Per-item refunds**: Refund amount calculated from `pricingSnapshot.lineItems` to get the specific track price, not the full order total.
- **Credit note PDF**: Fixed to properly populate lineItems from Registration data (CourseTrack, CoursePeriod, PersonProfile).

## Requirements

### Webhook Endpoint
- [x] Create `POST /api/webhooks/stripe`
- [x] Verify Stripe signature using webhook secret
- [x] Parse and validate webhook payload
- [x] Handle event types:
  - [x] `payment_intent.succeeded` (logged)
  - [x] `payment_intent.payment_failed` (marks order CANCELLED, sends email)
  - [x] `charge.refunded` (creates credit note, cancels registrations, voids tickets, sends email)
  - [x] `checkout.session.completed` (fully functional with PDF attachments)
  - [x] `checkout.session.async_payment_succeeded` (fully functional)
  - [x] `checkout.session.expired` (marks order CANCELLED, releases reservations)
  - [x] `account.updated` (Stripe Connect sync)
- [x] **CRITICAL: Implement idempotency** (process each event only once)
- [x] Return 200 response quickly (< 5 seconds)
- [x] Log all webhook events for debugging

### Payment Success Handler
- [x] On `payment_intent.succeeded`: *(via checkout.session.completed)*
  - [x] Find Order by `providerCheckoutRef`
  - [x] Verify Order status is PENDING
  - [x] Update Order status to PAID
  - [x] Update all linked Registrations to ACTIVE (or PENDING_PAYMENT if validation required)
  - [x] Generate Ticket (call fulfillment service)
  - [x] Send confirmation email (text + HTML via email engine and template)
  - [x] **Attach receipt/invoice PDF to confirmation email**
  - [x] Log success
  - [x] Handle errors gracefully

### Payment Failure Handler
- [x] On `payment_intent.payment_failed`:
  - [x] Find Order by metadata.orderId
  - [x] Update Order status to CANCELLED
  - [x] Send payment failed email (use email engine and template)
  - [x] Log failure reason

### Refund Handler
- [x] On `charge.refunded`:
  - [x] Find Order by payment_intent
  - [x] Update Order status to REFUNDED (full) or keep PAID (partial)
  - [x] Update Registrations to CANCELLED (full refund)
  - [x] Void Tickets (course and event)
  - [x] Generate CreditNote with proper Norwegian compliance data
  - [x] Generate credit note PDF
  - [x] Send refund confirmation email with credit note PDF attachment
  - [x] Idempotency check (skip if credit note already exists for refund)
  - [x] **Store ARN (Acquirer Reference Number)** for bank refund tracing
  - [x] **Include ARN in cancellation email** with guidance text
  - [x] **Calculate refund from per-item pricing** (not full order total)

### Session Expiry Handler
- [x] On `checkout.session.expired`:
  - [x] Find Order by metadata.orderId
  - [x] Mark Order as CANCELLED if still PENDING
  - [x] Cancel pending registrations
  - [x] Cancel pending event registrations

### Idempotency
- ✅ **COMPLETED: WebhookEvent model added to Prisma schema**
- ✅ Store processed event IDs in database (unique constraint on id)
- ✅ Check if event already processed before handling
- ✅ Use database transactions for atomic updates
- ✅ Handle duplicate webhook calls gracefully (returns early with alreadyProcessed flag)
- ✅ Optimistic locking for concurrent requests (P2002 error handling)
- ✅ Status tracking: PROCESSING → PROCESSED/FAILED
- ✅ Error messages stored without failing webhook response
- **STATUS: FULLY IMPLEMENTED AND TESTED**
- **TEST RESULTS:**
  - ✅ 12 events processed successfully
  - ✅ All events marked as PROCESSED
  - ✅ No duplicate event IDs in database
  - ✅ Idempotency check working (duplicate events skipped)
  - ✅ Always returns 200 to Stripe

### Error Handling
- [x] Invalid signature → 401 Unauthorized (implemented)
- [x] Unknown event type → 200 OK (log and ignore) (implemented)
- [x] Order not found → 404 (log error, still return 200) (implemented)
- [x] Fulfillment fails → Log error, return 500 (needs improvement - should return 200)
- [x] Database errors → Log, return 500 (Stripe will retry)

### Monitoring & Logging
- [ ] Log all webhook events to database or log service
- [ ] Track event processing status
- [ ] Alert on repeated failures
- [ ] Dashboard for webhook health
- [ ] Retry failed events manually

## Technical Implementation

### Webhook Route
```typescript
// app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/payments/stripe'
import { fulfillOrder } from '@/lib/fulfillment/service'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')
  
  if (!signature) {
    return new Response('No signature', { status: 401 })
  }
  
  let event: Stripe.Event
  
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response('Invalid signature', { status: 401 })
  }
  
  // Check idempotency
  const alreadyProcessed = await isEventProcessed(event.id)
  if (alreadyProcessed) {
    console.log(`Event ${event.id} already processed`)
    return new Response('OK', { status: 200 })
  }
  
  // Process event
  try {
    await processEvent(event)
    await markEventProcessed(event.id)
  } catch (error) {
    console.error('Error processing webhook:', error)
    // Still return 200 to prevent retries
    // Log error for manual investigation
    await logWebhookError(event.id, error.message)
  }
  
  return new Response('OK', { status: 200 })
}
```

### Event Processing
```typescript
async function processEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
      break
      
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
      break
      
    case 'charge.refunded':
      await handleRefund(event.data.object as Stripe.Charge)
      break
      
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break
      
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}
```

### Payment Success Handler
```typescript
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const order = await prisma.order.findFirst({
    where: {
      providerCheckoutRef: paymentIntent.id
    },
    include: {
      registrations: true
    }
  })
  
  if (!order) {
    console.error('Order not found for PaymentIntent:', paymentIntent.id)
    return
  }
  
  if (order.status === 'PAID') {
    console.log('Order already marked as paid:', order.id)
    return
  }
  
  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Update order
    await tx.order.update({
      where: { id: order.id },
      data: { status: 'PAID' }
    })
    
    // Update registrations
    await tx.registration.updateMany({
      where: { orderId: order.id },
      data: { status: 'ACTIVE' }
    })
    
    // Create payment record
    await tx.payment.create({
      data: {
        orderId: order.id,
        provider: 'STRIPE',
        providerPaymentRef: paymentIntent.id,
        status: 'SUCCEEDED',
        amountCents: paymentIntent.amount,
        currency: paymentIntent.currency.toUpperCase(),
        rawPayload: paymentIntent as any
      }
    })
  })
  
  // Fulfill order (generate ticket)
  await fulfillOrder(order)
  
  // Send confirmation email
  await sendOrderConfirmation(order)
  
  console.log('Order fulfilled successfully:', order.id)
}
```

### Idempotency Storage
```typescript
// Add to Prisma schema
model WebhookEvent {
  id          String   @id // Stripe event ID
  type        String
  processedAt DateTime @default(now())
  payload     Json
  
  @@index([id])
}

async function isEventProcessed(eventId: string): Promise<boolean> {
  const event = await prisma.webhookEvent.findUnique({
    where: { id: eventId }
  })
  return !!event
}

async function markEventProcessed(eventId: string, type: string, payload: any) {
  await prisma.webhookEvent.create({
    data: {
      id: eventId,
      type,
      payload
    }
  })
}
```

## Environment Variables
```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Stripe Dashboard Configuration
- [ ] Create webhook endpoint in Stripe Dashboard
- [ ] Set URL: `https://yourdomain.com/api/webhooks/stripe`
- [ ] Select events to send:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
  - `checkout.session.completed`
- [ ] Copy webhook signing secret to `.env`

## Testing

### Local Testing with Stripe CLI
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

### Integration Tests
- [ ] Test: valid signature accepted
- [ ] Test: invalid signature rejected
- [ ] Test: payment success triggers fulfillment
- [ ] Test: duplicate event is idempotent
- [ ] Test: payment failure updates order
- [ ] Test: refund cancels registrations
- [ ] Test: unknown event type ignored
- [ ] Test: missing order handled gracefully

## Monitoring

### Webhook Dashboard
- [ ] List recent webhook events
- [ ] Show processing status
- [ ] Display errors
- [ ] Manual retry button
- [ ] Event payload viewer

### Alerts
- [ ] Alert on repeated webhook failures (> 5 in 1 hour)
- [ ] Alert on signature verification failures
- [ ] Alert on fulfillment failures
- [ ] Daily summary email of webhook activity

## Success Criteria
- [x] Webhooks are verified with Stripe signature
- [x] Payment success triggers automatic fulfillment
- [x] **Duplicate webhooks are handled idempotently**
- [x] All events are logged
- [x] Errors are handled gracefully
- [x] Response time < 3 seconds
- [x] Stripe receives 200 status promptly
- [ ] Failed events can be retried manually (no dashboard yet)
- [x] **Receipt/invoice PDF attached to confirmation emails**
- [x] **Credit note PDF attached to refund emails**

## Security Checklist
- [x] Verify webhook signature on every request
- [x] Store webhook secret securely
- [x] Use HTTPS only
- [ ] Rate limit webhook endpoint (prevent DoS)
- [x] Log all verification failures
- [x] Don't expose internal errors to Stripe

## Priority Action Items (Ranked)

### ✅ COMPLETED - All Critical Items Done
1. **Implement Idempotency System** ✅
   - WebhookEvent model added to Prisma schema
   - Store event ID before processing
   - Check for duplicate events
   - Optimistic locking prevents concurrent processing

2. **Add PDF Receipt/Invoice Attachments** ✅
   - Generate PDF from order data
   - Email service supports attachments
   - Attached to order confirmation emails

3. **Implement Refund Handler** ✅
   - `charge.refunded` creates CreditNote
   - Generate credit note PDF
   - Update order/registration statuses
   - Send refund email with credit note attachment
   - Void tickets (course + event)

4. **Implement Payment Failure Handler** ✅
   - Update order status to CANCELLED on `payment_intent.payment_failed`
   - Send failure notification email to customer
   - Log failure reasons

5. **Session Expiry Cleanup** ✅
   - Handle `checkout.session.expired`
   - Mark orders as CANCELLED
   - Release reserved registrations

### 🟡 MEDIUM Priority - Remaining Items
6. **Dispute/Chargeback Alerts**
   - Email admin on `charge.dispute.created`
   - Flag orders for review
   - Track dispute outcomes
   - **STATUS:** Event is logged but no admin notification sent

7. **Webhook Dashboard**
   - View recent webhook events
   - Manual retry mechanism
   - Error tracking and alerts

### Technical Debt
- Add webhook event dashboard for monitoring
- Manual retry mechanism for failed webhooks

## Related Issues
- #[ticket-fulfillment] - Order fulfillment
- #[email-notifications] - Confirmation emails
- #[stripe-integration] - Checkout integration

## References
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- Specs: Phase 5 — Payments + fulfillment
