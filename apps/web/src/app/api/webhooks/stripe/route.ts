
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

    // ============================================
    // IDEMPOTENCY CHECK
    // ============================================
    // Check if this event has already been processed
    const existingEvent = await prisma.webhookEvent.findUnique({
        where: { id: event.id }
    })

    if (existingEvent) {
        console.log(`Webhook: Event ${event.id} already processed at ${existingEvent.processedAt}`)
        console.log(`Webhook: Status: ${existingEvent.status}`)
        return NextResponse.json({ 
            received: true, 
            alreadyProcessed: true,
            processedAt: existingEvent.processedAt 
        })
    }

    // Mark event as being processed (optimistic locking)
    try {
        await prisma.webhookEvent.create({
            data: {
                id: event.id,
                type: event.type,
                payload: event as any,
                status: 'PROCESSING'
            }
        })
    } catch (err: any) {
        // If this fails, another instance might be processing it
        if (err.code === 'P2002') { // Unique constraint violation
            console.log(`Webhook: Event ${event.id} is being processed by another instance`)
            return NextResponse.json({ 
                received: true, 
                alreadyProcessing: true 
            })
        }
        throw err
    }

    // ============================================
    // PROCESS EVENT WITH ERROR HANDLING
    // ============================================
    let processingError: string | null = null

    // Helper function to detect and handle thin payloads (Account v2 events)
    async function getFullObject<T>(eventObject: any, objectType: string, objectId: string): Promise<T> {
        // Check if this is a thin payload (missing expected properties)
        const isThinPayload = eventObject && typeof eventObject === 'object' && 
                              Object.keys(eventObject).length <= 3 // Thin payloads typically only have id, object, and maybe one more field
        
        if (isThinPayload) {
            console.log(`Webhook: Detected thin payload for ${objectType} ${objectId}, fetching full data from Stripe API`)
            
            // Get API key from config
            const config = await prisma.paymentConfig.findUnique({ where: { provider: 'STRIPE' } })
            const apiKey = config?.secretKey || process.env.STRIPE_SECRET_KEY
            if (!apiKey) {
                throw new Error('Failed to get Stripe API key for thin payload retrieval')
            }
            
            const stripe = new Stripe(apiKey, { apiVersion: '2025-11-17.clover' as any })
            
            // Fetch full object from Stripe
            const fullObject = await stripe.accounts.retrieve(objectId) as T
            console.log(`Webhook: Successfully retrieved full ${objectType} data`)
            return fullObject
        }
        
        return eventObject as T
    }

    // ============================================
    // HANDLE EVENT PROCESSING
    // ============================================
    try {
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
            // Account v2 events may use thin payloads - fetch full data if needed
            let account = event.data.object as Stripe.Account
            
            // Handle thin payload by fetching full account data
            try {
                account = await getFullObject<Stripe.Account>(account, 'account', account.id)
            } catch (err: any) {
                console.error(`Webhook: Failed to retrieve full account data: ${err.message}`)
                return NextResponse.json({ error: 'Failed to process thin payload' }, { status: 500 })
            }
            
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

        // Subscription events for auto-renewable memberships (future feature)
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
            const subscription = event.data.object as Stripe.Subscription
            console.log(`Webhook: Received ${event.type} for subscription ${subscription.id}`)
            
            // TODO: When auto-renewal is implemented:
            // 1. Find membership by subscription.metadata.membershipId
            // 2. Update validTo date based on subscription.current_period_end
            // 3. Update status based on subscription.status
            
            console.log(`Webhook: ℹ️  Auto-renewal not yet implemented, logging only`)
            break
        }

        case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription
            console.log(`Webhook: Received subscription.deleted for ${subscription.id}`)
            
            // TODO: When auto-renewal is implemented:
            // 1. Find membership by subscription.metadata.membershipId
            // 2. Mark as non-renewable or set validTo to current_period_end
            
            console.log(`Webhook: ℹ️  Auto-renewal not yet implemented, logging only`)
            break
        }

        case 'invoice.payment_succeeded': {
            const invoice = event.data.object as Stripe.Invoice
            console.log(`Webhook: Received invoice.payment_succeeded for ${invoice.id}`)
            
            // TODO: When auto-renewal is implemented:
            // 1. Find membership by invoice.subscription_details.metadata
            // 2. Extend validTo by one year
            // 3. Send renewal confirmation email
            
            console.log(`Webhook: ℹ️  Auto-renewal not yet implemented, logging only`)
            break
        }

        case 'invoice.payment_failed': {
            const invoice = event.data.object as Stripe.Invoice
            console.log(`Webhook: Received invoice.payment_failed for ${invoice.id}`)
            
            // TODO: When auto-renewal is implemented:
            // 1. Find membership by invoice.subscription_details.metadata
            // 2. Send payment failure notification email
            // 3. Mark membership for review if multiple failures
            
            console.log(`Webhook: ℹ️  Auto-renewal not yet implemented, logging only`)
            break
        }

        // Subscription Schedule events for auto-renewable memberships (future feature)
        case 'subscription_schedule.aborted':
        case 'subscription_schedule.canceled': {
            const schedule = event.data.object as Stripe.SubscriptionSchedule
            console.log(`Webhook: Received ${event.type} for schedule ${schedule.id}`)
            
            // TODO: When auto-renewal is implemented:
            // 1. Find membership by schedule.metadata.membershipId
            // 2. Update membership to non-renewable
            // 3. Notify customer
            
            console.log(`Webhook: ℹ️  Subscription schedule handling not yet implemented`)
            break
        }

        case 'subscription_schedule.completed':
        case 'subscription_schedule.created':
        case 'subscription_schedule.expiring':
        case 'subscription_schedule.released':
        case 'subscription_schedule.updated': {
            const schedule = event.data.object as Stripe.SubscriptionSchedule
            console.log(`Webhook: Received ${event.type} for schedule ${schedule.id}`)
            
            // TODO: When auto-renewal is implemented, handle schedule lifecycle
            console.log(`Webhook: ℹ️  Subscription schedule handling not yet implemented`)
            break
        }

        // Refund events
        case 'charge.refunded': {
            const charge = event.data.object as Stripe.Charge
            console.log(`Webhook: Received charge.refunded for ${charge.id}`)
            console.log(`  - Amount refunded: ${charge.amount_refunded / 100} ${charge.currency.toUpperCase()}`)
            console.log(`  - Refunded: ${charge.refunded ? 'Full' : 'Partial'}`)
            
            // TODO: When refund system is implemented:
            // 1. Find order by charge ID or payment_intent
            // 2. Update order status (REFUNDED or PARTIALLY_REFUNDED)
            // 3. Update registration statuses if applicable
            // 4. Send refund confirmation email
            // 5. Log refund in audit trail
            
            console.log(`Webhook: ℹ️  Refund handling not yet implemented, logging only`)
            break
        }

        case 'charge.refund.updated': {
            const refund = event.data.object as Stripe.Refund
            console.log(`Webhook: Received refund.updated for ${refund.id}`)
            console.log(`  - Status: ${refund.status}`)
            console.log(`  - Amount: ${refund.amount / 100} ${refund.currency.toUpperCase()}`)
            
            // TODO: Track refund status changes (pending → succeeded/failed)
            console.log(`Webhook: ℹ️  Refund tracking not yet implemented, logging only`)
            break
        }

        // Dispute events (chargebacks)
        case 'charge.dispute.created': {
            const dispute = event.data.object as Stripe.Dispute
            console.log(`Webhook: ⚠️  Dispute created for charge ${dispute.charge}`)
            console.log(`  - Amount: ${dispute.amount / 100} ${dispute.currency.toUpperCase()}`)
            console.log(`  - Reason: ${dispute.reason}`)
            
            // TODO: When dispute handling is implemented:
            // 1. Find order by charge ID
            // 2. Flag order for review
            // 3. Notify admin via email
            // 4. Prepare dispute evidence if applicable
            
            console.log(`Webhook: ⚠️  Dispute handling not yet implemented - ADMIN ATTENTION REQUIRED`)
            break
        }

        case 'charge.dispute.closed': {
            const dispute = event.data.object as Stripe.Dispute
            console.log(`Webhook: Dispute closed for charge ${dispute.charge}`)
            console.log(`  - Status: ${dispute.status}`)
            
            // TODO: Update order status based on dispute outcome
            console.log(`Webhook: ℹ️  Dispute resolution tracking not yet implemented`)
            break
        }

        // Additional checkout events
        case 'checkout.session.expired': {
            const session = event.data.object as Stripe.Checkout.Session
            console.log(`Webhook: Checkout session expired for order ${session.metadata?.orderId}`)
            
            // TODO: Clean up expired sessions
            // 1. Find order by session.metadata.orderId
            // 2. Mark as EXPIRED if still PENDING
            // 3. Release reserved inventory if applicable
            
            console.log(`Webhook: ℹ️  Session cleanup not yet implemented`)
            break
        }

        case 'checkout.session.async_payment_succeeded': {
            const session = event.data.object as Stripe.Checkout.Session
            console.log(`Webhook: Async payment succeeded for order ${session.metadata?.orderId}`)
            
            // Handle delayed payment methods (bank transfers, etc.)
            const orderId = session.metadata?.orderId
            if (orderId) {
                try {
                    await fulfillOrder(orderId, session.id)
                    console.log(`Webhook: ✅ Async payment fulfilled for order ${orderId}`)
                } catch (e) {
                    console.error('Webhook: Async payment fulfillment error', e)
                }
            }
            break
        }

        case 'checkout.session.async_payment_failed': {
            const session = event.data.object as Stripe.Checkout.Session
            console.log(`Webhook: ⚠️  Async payment failed for order ${session.metadata?.orderId}`)
            
            // TODO: Handle failed delayed payments
            // 1. Notify customer
            // 2. Mark order as FAILED
            // 3. Release inventory
            
            console.log(`Webhook: ⚠️  Async payment failure handling not yet implemented`)
            break
        }

        // Payment Intent events (backup/detailed tracking)
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent
            console.log(`Webhook: Payment intent succeeded ${paymentIntent.id}`)
            // Usually handled by checkout.session.completed, but useful for non-checkout flows
            break
        }

        case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object as Stripe.PaymentIntent
            console.log(`Webhook: ⚠️  Payment intent failed ${paymentIntent.id}`)
            console.log(`  - Last error: ${paymentIntent.last_payment_error?.message}`)
            
            // TODO: Log payment failures for analytics and customer support
            break
        }

        default:
            console.log(`Webhook: Unhandled event type ${event.type}`)
        }
    } catch (error: any) {
        // Capture error but don't throw - we want to return 200 to Stripe
        processingError = error.message || String(error)
        console.error(`Webhook: Error processing event ${event.id}:`, error)
    }

    // ============================================
    // MARK EVENT AS SUCCESSFULLY PROCESSED OR FAILED
    // ============================================
    try {
        await prisma.webhookEvent.update({
            where: { id: event.id },
            data: { 
                status: processingError ? 'FAILED' : 'PROCESSED',
                processedAt: new Date(),
                errorMessage: processingError
            }
        })
    } catch (err) {
        console.error(`Webhook: Failed to update event ${event.id} status:`, err)
    }

    return NextResponse.json({ received: true })
}
