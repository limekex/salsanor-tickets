
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import Stripe from 'stripe'
import { fulfillOrder } from '@/lib/fulfillment/service'

export async function POST(req: Request) {
    const body = await req.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature') as string

    if (!signature) {
        console.error('Webhook: Missing signature')
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
    }

    // Get config from DB
    const config = await prisma.paymentConfig.findUnique({ where: { provider: 'STRIPE' } })
    const webhookSecret = config?.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET
    console.log('Webhook: Secret present?', !!webhookSecret)
    if (!webhookSecret) {
        console.error('Webhook: Missing webhook secret')
        return NextResponse.json({ error: 'Config error' }, { status: 500 })
    }

    // Since we initialized Stripe client with maybe-db-keys in lib, we should duplicate that logic 
    // or just assume we can verify signature using the secret we found.
    // Verification doesn't need API key, just secret.

    let event: Stripe.Event

    try {
        event = Stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        const orderId = session.metadata?.orderId

        if (orderId) {
            try {
                await fulfillOrder(orderId, session.id)
            } catch (e) {
                console.error('Fulfillment error', e)
                return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 })
            }
        } else {
            console.error('Webhook: Missing orderId in metadata')
        }
    } else {
    }

    return NextResponse.json({ received: true })
}
