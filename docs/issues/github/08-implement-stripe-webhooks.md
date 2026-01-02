# Implement Stripe Webhook Handler

## Priority
**CRITICAL** - Blocks automatic order fulfillment

## Description
Complete the Stripe webhook integration to handle payment events and trigger order fulfillment automatically when payments succeed.

## Current Status
- ⚠️ Basic webhook route may exist but incomplete
- ⚠️ No signature verification
- ⚠️ No event processing
- ⚠️ No fulfillment trigger
- ✅ Stripe integration exists for checkout
- ✅ Fulfillment service exists (basic)

## Requirements

### Webhook Endpoint
- [ ] Create `POST /api/webhooks/stripe`
- [ ] Verify Stripe signature using webhook secret
- [ ] Parse and validate webhook payload
- [ ] Handle event types:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
  - `checkout.session.completed` (if using Checkout)
- [ ] Implement idempotency (process each event only once)
- [ ] Return 200 response quickly (< 5 seconds)
- [ ] Log all webhook events for debugging

### Payment Success Handler
- [ ] On `payment_intent.succeeded`:
  - Find Order by `providerCheckoutRef`
  - Verify Order status is PENDING
  - Update Order status to PAID
  - Update all linked Registrations to ACTIVE
  - Generate Ticket (call fulfillment service)
  - Send confirmation email
  - Log success
  - Handle errors gracefully

### Payment Failure Handler
- [ ] On `payment_intent.payment_failed`:
  - Find Order by reference
  - Update Order status to CANCELLED
  - Send payment failed email
  - Log failure reason

### Refund Handler
- [ ] On `charge.refunded`:
  - Find Order and Payment
  - Update Order status to REFUNDED
  - Update Registrations to CANCELLED
  - Void Ticket
  - Release capacity (allow waitlist promotion)
  - Send refund confirmation email

### Idempotency
- [ ] Store processed event IDs in database
- [ ] Check if event already processed before handling
- [ ] Use database transactions for atomic updates
- [ ] Handle duplicate webhook calls gracefully

### Error Handling
- [ ] Invalid signature → 401 Unauthorized
- [ ] Unknown event type → 200 OK (log and ignore)
- [ ] Order not found → 404 (log error, still return 200)
- [ ] Fulfillment fails → Log error, return 200, retry later
- [ ] Database errors → Log, return 500 (Stripe will retry)

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
- [ ] Webhooks are verified with Stripe signature
- [ ] Payment success triggers automatic fulfillment
- [ ] Duplicate webhooks are handled idempotently
- [ ] All events are logged
- [ ] Errors are handled gracefully
- [ ] Response time < 3 seconds
- [ ] Stripe receives 200 status promptly
- [ ] Failed events can be retried manually

## Security Checklist
- [ ] Verify webhook signature on every request
- [ ] Store webhook secret securely
- [ ] Use HTTPS only
- [ ] Rate limit webhook endpoint (prevent DoS)
- [ ] Log all verification failures
- [ ] Don't expose internal errors to Stripe

## Dependencies
- Stripe SDK configured
- Fulfillment service ready
- Email service configured
- Ticket generation implemented

## Related Issues
- #[ticket-fulfillment] - Order fulfillment
- #[email-notifications] - Confirmation emails
- #[stripe-integration] - Checkout integration

## References
- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- Specs: Phase 5 — Payments + fulfillment
