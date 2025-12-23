# Stripe Webhook Setup Guide

## Endpoints du trenger

### 1. Webhook Endpoint URL
```
Stage:  https://stage.reginor.events/api/webhooks/stripe
Prod:   https://reginor.events/api/webhooks/stripe
```

---

## Events du må subscribe til

### Required Events (må ha)

#### Payment Events
- `checkout.session.completed` - Når betaling er fullført
- `checkout.session.async_payment_succeeded` - Asynkron betaling success (Klarna, etc)
- `checkout.session.async_payment_failed` - Asynkron betaling feilet
- `payment_intent.succeeded` - Betalingsintent success
- `payment_intent.payment_failed` - Betaling feilet

#### Refund Events
- `charge.refunded` - Når en refundering skjer
- `payment_intent.refunded` - Payment intent refundert

#### Customer Events (hvis du bruker Stripe Customer)
- `customer.created` - Ny kunde opprettet
- `customer.updated` - Kunde oppdatert
- `customer.deleted` - Kunde slettet

### Optional Events (nice to have)

#### Dispute Events
- `charge.dispute.created` - Tvist opprettet
- `charge.dispute.closed` - Tvist løst

#### Card Events (for saved cards)
- `payment_method.attached` - Betalingsmetode lagt til
- `payment_method.detached` - Betalingsmetode fjernet

---

## Sett opp webhooks i Stripe Dashboard

### For Stage (Test Mode)

1. Gå til [Stripe Dashboard](https://dashboard.stripe.com/test/webhooks)
2. Klikk **"Add endpoint"**
3. **Endpoint URL:** `https://stage.reginor.events/api/webhooks/stripe`
4. **Description:** RegiNor Stage Webhook
5. **Listen to:** Events on your account
6. **Select events:**
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `customer.created`
   - `customer.updated`
   - `customer.deleted`
7. **Klikk "Add endpoint"**
8. **Kopier "Signing secret"** (starter med `whsec_...`)
9. Legg til i `.env.stage`:
   ```env
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

### For Prod (Live Mode)

1. Bytt til **Live mode** i Stripe Dashboard
2. Gå til [Webhooks](https://dashboard.stripe.com/webhooks)
3. Gjenta samme prosess som over, men med:
   - **Endpoint URL:** `https://reginor.events/api/webhooks/stripe`
   - **Description:** RegiNor Production Webhook
4. Kopier den nye "Signing secret"
5. Legg til i `.env.prod`:
   ```env
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

---

## Webhook Handler Implementation

Sjekk at du har denne filen (hvis ikke, lag den):

**Filsti:** `apps/web/src/app/api/webhooks/stripe/route.ts`

### Minimal implementasjon (hvis den ikke finnes):

```typescript
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@salsanor/database'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: Request) {
  try {
    const body = await req.text()
    const signature = headers().get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )

    console.log('Stripe webhook received:', event.type)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentSucceeded(paymentIntent)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailed(paymentIntent)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        await handleRefund(charge)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Get order ID from metadata
  const orderId = session.metadata?.orderId

  if (!orderId) {
    console.error('No orderId in session metadata')
    return
  }

  // Update order status to PAID
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PAID',
      stripePaymentIntentId: session.payment_intent as string,
    },
  })

  // Update all registrations in this order to ACTIVE
  await prisma.registration.updateMany({
    where: { orderId },
    data: { status: 'ACTIVE' },
  })

  console.log(`Order ${orderId} marked as PAID`)
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  // Additional handling if needed
  console.log('Payment succeeded:', paymentIntent.id)
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  // Handle failed payment
  console.log('Payment failed:', paymentIntent.id)
}

async function handleRefund(charge: Stripe.Charge) {
  // Handle refund
  const orderId = charge.metadata?.orderId

  if (orderId) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'REFUNDED' },
    })

    await prisma.registration.updateMany({
      where: { orderId },
      data: { status: 'REFUNDED' },
    })

    console.log(`Order ${orderId} refunded`)
  }
}
```

---

## Test webhooks lokalt (under utvikling)

### Installer Stripe CLI
```bash
brew install stripe/stripe-cli/stripe
```

### Login til Stripe
```bash
stripe login
```

### Forward webhooks til lokal server
```bash
# Start Next.js dev server først
npm run dev

# I en annen terminal, forward webhooks
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Dette gir deg en midlertidig webhook secret. Bruk den i `.env.local`:
```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### Test en event
```bash
stripe trigger checkout.session.completed
```

---

## Verifiser webhook funker

### I Stripe Dashboard

1. Gå til **Webhooks**
2. Klikk på ditt endpoint
3. Se **"Recent attempts"** - skal være grønne ✓
4. Hvis røde ✗, klikk for å se error

### Manuell test

1. Send en test-event fra Stripe Dashboard:
   - Gå til webhook endpoint
   - Klikk **"Send test webhook"**
   - Velg `checkout.session.completed`
   - Klikk **"Send test webhook"**

2. Sjekk logs:
   - På serveren: `pm2 logs reginor-stage`
   - Eller i Next.js dev: se console output

---

## Sikkerhet

✅ **ALLTID verifiser webhook signature**
- Stripe CLI bruker `stripe.webhooks.constructEvent()`
- Kaster error hvis signature er ugyldig

✅ **Bruk HTTPS i prod/stage**
- Webhooks fungerer ikke over HTTP

✅ **Logg alle events**
- For debugging og audit trail

✅ **Idempotency**
- Webhooks kan komme flere ganger
- Sjekk om order allerede er processed før du oppdaterer

---

## Neste steg

1. ✅ API keys lagt til i .env.stage og .env.prod
2. ⏳ Deploy stage-appen til serveren
3. ⏳ Sett opp webhook i Stripe (test mode)
4. ⏳ Test en betaling på stage
5. ⏳ Sjekk at webhook mottas og order oppdateres
6. ⏳ Gjenta for prod når stage fungerer
