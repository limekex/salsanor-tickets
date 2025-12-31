
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

    // Handle different event types
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session
            const orderId = session.metadata?.orderId

            if (orderId) {
                try {
                    await fulfillOrder(orderId, session.id)
                    
                    // Send order confirmation email
                    try {
                        const { emailService } = await import('@/lib/email/email-service')
                        const order = await prisma.order.findUnique({
                            where: { id: orderId },
                            include: {
                                purchaser: true,
                                period: {
                                    include: {
                                        organizer: true
                                    }
                                },
                                registrations: {
                                    include: {
                                        track: true
                                    }
                                }
                            }
                        })
                        
                        if (order?.purchaser?.email && order.period) {
                            const trackNames = order.registrations.map(r => r.track?.title || 'Track').join(', ')
                            const period = order.period // Type narrowing
                            await emailService.sendTransactional({
                                organizerId: period.organizerId,
                                templateSlug: 'order-confirmation',
                                recipientEmail: order.purchaser.email,
                                recipientName: `${order.purchaser.firstName} ${order.purchaser.lastName}`.trim() || undefined,
                                variables: {
                                    recipientName: order.purchaser.firstName || 'Customer',
                                    organizationName: period.organizer.name,
                                    eventName: period.name,
                                    orderNumber: order.id.slice(0, 8),
                                    orderTotal: `${order.currency.toUpperCase()} ${(order.totalCents / 100).toFixed(2)}`,
                                    ticketCount: order.registrations.length.toString(),
                                    trackNames: trackNames,
                                },
                                language: 'en',
                            })
                        }
                    } catch (emailError) {
                        // Log but don't fail webhook if email fails
                        console.error('Failed to send order confirmation email:', emailError)
                    }
                } catch (e) {
                    console.error('Fulfillment error', e)
                    return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 })
                }
            } else {
                console.error('Webhook: Missing orderId in metadata')
            }
            break
        }

        case 'account.updated': {
            const account = event.data.object as Stripe.Account
            
            console.log(`Webhook: Received account.updated for ${account.id}`)
            console.log(`  - Details submitted: ${account.details_submitted}`)
            console.log(`  - Charges enabled: ${account.charges_enabled}`)
            console.log(`  - Payouts enabled: ${account.payouts_enabled}`)
            
            // Find organizer with this Stripe account ID
            const organizer = await prisma.organizer.findFirst({
                where: { stripeConnectAccountId: account.id }
            })

            if (organizer) {
                console.log(`Webhook: Updating organizer ${organizer.slug} (${organizer.name})`)
                
                // Update organizer status based on Stripe account capabilities
                await prisma.organizer.update({
                    where: { id: organizer.id },
                    data: {
                        stripeOnboardingComplete: account.details_submitted || false,
                        stripeChargesEnabled: account.charges_enabled || false,
                        stripePayoutsEnabled: account.payouts_enabled || false,
                    }
                })

                console.log(`Webhook: ✅ Successfully updated organizer ${organizer.slug}`)
            } else {
                console.log(`Webhook: ℹ️  No organizer found for Stripe account ${account.id}`)
                console.log(`Webhook: This is expected for test events from 'stripe trigger'`)
                console.log(`Webhook: To test with your real account, trigger an update from Stripe Dashboard or complete onboarding`)
            }
            break
        }

        default:
            console.log(`Webhook: Unhandled event type ${event.type}`)
    }

    return NextResponse.json({ received: true })
}
