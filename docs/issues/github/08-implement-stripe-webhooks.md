# Implement Stripe Webhook Handler

## Priority
**CRITICAL** - Blocks automatic order fulfillment

## Description
Complete the Stripe webhook integration to handle payment events and trigger order fulfillment automatically when payments succeed.

## Current Status (Updated: 2. januar 2026)

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
- ✅ Order confirmation emails sent (text + HTML, no attachments yet)
- ✅ Transaction atomicity (Prisma transactions)
- ✅ Payment records created in database
- ✅ Error handling returns correct HTTP statuses

### ❌ Critical Missing
- ❌ **NO IDEMPOTENCY** - Events can be processed multiple times (CRITICAL)
- ❌ **NO RECEIPT/INVOICE PDF ATTACHMENT** - Emails lack receipt attachments
- ❌ Refund handling not implemented (`charge.refunded` only logs)
- ❌ Payment failure handling incomplete (`payment_intent.payment_failed`)
- ❌ Dispute/chargeback alerts missing (`charge.dispute.created`)
- ❌ Session expiry cleanup not implemented

### 🔧 Partial Implementation
- ⚠️ CreditNote model exists in database but not integrated with webhooks
- ⚠️ Email service lacks attachment support (Brevo SDK supports it, not implemented)
- ⚠️ Invoice generation exists but not triggered by orders
- ⚠️ Subscription events logged but not processed (future feature)

## Requirements

### Webhook Endpoint
- [x] Create `POST /api/webhooks/stripe`
- [x] Verify Stripe signature using webhook secret
- [x] Parse and validate webhook payload
- [x] Handle event types:
  - [x] `payment_intent.succeeded` (logged)
  - [ ] `payment_intent.payment_failed` (logged only, no action)
  - [ ] `charge.refunded` (logged only, no action)
  - [x] `checkout.session.completed` (fully functional)
  - [x] `checkout.session.async_payment_succeeded` (fully functional)
  - [x] `account.updated` (Stripe Connect sync)
- [ ] **CRITICAL: Implement idempotency** (process each event only once)
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
  - [ ] **MISSING: Attach receipt/invoice PDF to confirmation email**
  - [x] Log success
  - [x] Handle errors gracefully

### Payment Failure Handler
- [ ] On `payment_intent.payment_failed`:
  - [ ] Find Order by reference
  - [ ] Update Order status to CANCELLED
  - [ ] Send payment failed email (use email engine and template)
  - [ ] Log failure reason
  - **STATUS: Event is received but no action taken (only logged)**

### Refund Handler
- [ ] On `charge.refunded`:
  - [ ] Find Order and Payment by charge ID
  - [ ] Update Order status to REFUNDED
  - [ ] Update Registrations to CANCELLED
  - [ ] Void Ticket
  - [ ] Release capacity (allow waitlist promotion)
  - [ ] Generate CreditNote (model exists, integration missing)
  - [ ] Send refund confirmation email with credit note PDF attachment
  - **STATUS: Event is received but no action taken (only logged)**
  - **NOTE: CreditNote database model exists but not connected to webhook flow**

### Idempotency
- [ ] **CRITICAL: Add WebhookEvent model to Prisma schema**
- [ ] Store processed event IDs in database
- [ ] Check if event already processed before handling
- [x] Use database transactions for atomic updates (implemented)
- [ ] Handle duplicate webhook calls gracefully
- **STATUS: No idempotency - same event can trigger multiple fulfillments/emails**

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
- [ ] **CRITICAL: Duplicate webhooks are handled idempotently**
- [x] All events are logged
- [x] Errors are handled gracefully
- [x] Response time < 3 seconds
- [x] Stripe receives 200 status promptly
- [ ] Failed events can be retried manually (no dashboard yet)
- [ ] **MISSING: Receipt/invoice PDF attached to confirmation emails**
- [ ] **MISSING: Credit note PDF attached to refund emails**

## Security Checklist
- [ ] Verify webhook signature on every request
- [ ] Store webhook secret securely
- [ ] Use HTTPS only
- [ ] Rate limit webhook endpoint (prevent DoS)
- [ ] Log all verification failures
- [ ] Don't expose internal errors to Stripe

## Priority Action Items (Ranked)

### 🔴 CRITICAL - Must Fix Immediately
1. **Implement Idempotency System**
   - Add `WebhookEvent` model to Prisma schema
   - Store event ID before processing
   - Check for duplicate events
   - **Risk:** Same event can trigger multiple fulfillments, duplicate emails, duplicate tickets

2. **Add PDF Receipt/Invoice Attachments**
   - Generate PDF from order data
   - Extend email service to support attachments (Brevo SendSmtpEmail has `attachment` property)
   - Attach to order confirmation emails
   - **Gap:** Customers receive confirmation but no receipt document

### 🟠 HIGH Priority - Needed for Production
3. **Implement Refund Handler**
   - Connect `charge.refunded` event to existing CreditNote model
   - Generate credit note PDF
   - Update order/registration statuses
   - Send refund email with credit note attachment
   - Release inventory/waitlist

4. **Implement Payment Failure Handler**
   - Update order status to CANCELLED on `payment_intent.payment_failed`
   - Send failure notification email to customer
   - Log failure reasons for analytics

### 🟡 MEDIUM Priority - Operational Safety
5. **Dispute/Chargeback Alerts**
   - Email admin on `charge.dispute.created`
   - Flag orders for review
   - Track dispute outcomes

6. **Session Expiry Cleanup**
   - Handle `checkout.session.expired`
   - Mark orders as EXPIRED
   - Release reserved inventory

### Technical Debt
- Fulfillment error should return 200 (not 500) to prevent retries
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
