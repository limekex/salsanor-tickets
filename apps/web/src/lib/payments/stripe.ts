
import Stripe from 'stripe'
import { prisma } from '@/lib/db'

interface StripeClientOptions {
    useConnectAccount?: string // Stripe Connect account ID
}

// Helper to get active keys
async function getStripeClient(options?: StripeClientOptions) {
    // Get dynamic configuration from database
    const config = await prisma.paymentConfig.findUnique({
        where: { provider: 'STRIPE' }
    })

    if (!config?.enabled) {
        throw new Error('Stripe payment provider is not enabled')
    }

    // Platform secret key: prefer database, fallback to environment variable
    const stripeKey = config.secretKey || process.env.STRIPE_SECRET_KEY

    if (!stripeKey) {
        throw new Error('STRIPE_SECRET_KEY must be set in environment variables or Admin Settings')
    }

    const stripeConfig: Stripe.StripeConfig = {
        apiVersion: '2025-11-17.clover' as any,
        typescript: true,
    }

    // If using Stripe Connect, add connect account header
    if (options?.useConnectAccount && config.useStripeConnect) {
        stripeConfig.stripeAccount = options.useConnectAccount
    }

    return {
        client: new Stripe(stripeKey, stripeConfig),
        config
    }
}

export async function createStripeCheckout(orderId: string, successUrl: string, cancelUrl: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { 
            Registration: { 
                include: { 
                    CourseTrack: { 
                        include: { 
                            CoursePeriod: { 
                                include: { 
                                    Organizer: true 
                                } 
                            } 
                        } 
                    } 
                } 
            },
            EventRegistration: {
                include: {
                    Event: {
                        include: {
                            Organizer: true
                        }
                    }
                }
            },
            Membership: {
                include: {
                    MembershipTier: {
                        include: {
                            Organizer: true
                        }
                    }
                }
            }
        }
    })

    if (!order) throw new Error('Order not found')
    if (order.status === 'PAID') throw new Error('Order already paid')

    // Get organizer from registrations or memberships
    let organizer = null
    
    if (order.Registration.length > 0) {
        // Course/period order - use organizer IDs to deduplicate
        const organizerIds = new Set(
            order.Registration
                .map(r => r.CourseTrack?.CoursePeriod?.Organizer?.id)
                .filter((id): id is string => id != null)
        )
        
        if (organizerIds.size === 0) throw new Error('No organizer found for order')
        if (organizerIds.size > 1) {
            throw new Error('Orders with multiple organizers are not supported. Please checkout separately.')
        }
        
        // Get the full organizer object
        const organizerId = Array.from(organizerIds)[0]
        organizer = order.Registration
            .map(r => r.CourseTrack?.CoursePeriod?.Organizer)
            .find(org => org?.id === organizerId)!
    } else if (order.EventRegistration && order.EventRegistration.length > 0) {
        // Event order - use organizer IDs to deduplicate
        const organizerIds = new Set(
            order.EventRegistration
                .map(r => r.Event?.Organizer?.id)
                .filter((id): id is string => id != null)
        )
        
        if (organizerIds.size === 0) throw new Error('No organizer found for event order')
        if (organizerIds.size > 1) {
            throw new Error('Event orders with multiple organizers are not supported. Please checkout separately.')
        }
        
        // Get the full organizer object
        const organizerId = Array.from(organizerIds)[0]
        organizer = order.EventRegistration
            .map(r => r.Event?.Organizer)
            .find(org => org?.id === organizerId)!
    } else if (order.Membership.length > 0) {
        // Membership order - use organizer IDs to deduplicate
        const organizerIds = new Set(
            order.Membership
                .map(m => m.MembershipTier?.Organizer?.id)
                .filter((id): id is string => id != null)
        )
        
        if (organizerIds.size === 0) throw new Error('No organizer found for membership order')
        if (organizerIds.size > 1) {
            throw new Error('Membership orders with multiple organizers are not supported. Please checkout separately.')
        }
        
        // Get the full organizer object
        const organizerId = Array.from(organizerIds)[0]
        organizer = order.Membership
            .map(m => m.MembershipTier?.Organizer)
            .find(org => org?.id === organizerId)!
    } else {
        throw new Error('Order has no registrations, event registrations, or memberships')
    }

    // Get Stripe client (with Connect account if configured)
    const stripeData = await getStripeClient({
        useConnectAccount: organizer.stripeConnectAccountId || undefined
    })

    if (!stripeData) {
        console.error('Stripe client init failed. Check DB config or ENV.')
        throw new Error('Payment provider not configured. Please contact admin.')
    }

    const { client: stripe, config } = stripeData

    // Build session options
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'nok',
                    product_data: {
                        name: 'RegiNor Course Registration',
                        description: `Order ${orderId.slice(0, 8)}`,
                    },
                    unit_amount: order.totalCents,
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            orderId: order.id,
            organizerId: organizer.id,
        }
    }

    // If using Stripe Connect, add application fee
    if (config?.useStripeConnect && organizer.stripeConnectAccountId) {
        // Use organizer-specific fees if set, otherwise fall back to global config
        const platformFeePercent = organizer.platformFeePercent !== null && organizer.platformFeePercent !== undefined
            ? Number(organizer.platformFeePercent)
            : (config.platformFeePercent ? Number(config.platformFeePercent) : 0)
        
        const platformFeeFixed = organizer.platformFeeFixed !== null && organizer.platformFeeFixed !== undefined
            ? organizer.platformFeeFixed
            : (config.platformFeeFixed || 0)
        
        const percentFee = Math.round((order.totalCents * platformFeePercent) / 100)
        const totalPlatformFee = percentFee + platformFeeFixed

        console.log(`Platform Fee Calculation for ${organizer.slug}:`, {
            useOrgSpecific: organizer.platformFeePercent !== null,
            percentFee: platformFeePercent,
            fixedFee: platformFeeFixed,
            orderTotal: order.totalCents,
            calculatedFee: totalPlatformFee
        })

        if (totalPlatformFee > 0) {
            sessionOptions.payment_intent_data = {
                application_fee_amount: totalPlatformFee,
            }
        }
    }

    const session = await stripe.checkout.sessions.create(sessionOptions)

    // Update order with checkout ref and status to PENDING (awaiting payment)
    await prisma.order.update({
        where: { id: orderId },
        data: {
            providerCheckoutRef: session.id,
            status: 'PENDING'
        }
    })

    // Also update all related registrations to PENDING_PAYMENT status
    if (order.Registration.length > 0) {
        await prisma.registration.updateMany({
            where: { orderId },
            data: { status: 'PENDING_PAYMENT' }
        })
    }

    if (order.EventRegistration.length > 0) {
        await prisma.eventRegistration.updateMany({
            where: { orderId },
            data: { status: 'PENDING_PAYMENT' }
        })
    }

    return session.url
}

