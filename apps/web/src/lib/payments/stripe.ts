
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
            registrations: { 
                include: { 
                    track: { 
                        include: { 
                            period: { 
                                include: { 
                                    organizer: true 
                                } 
                            } 
                        } 
                    } 
                } 
            },
            memberships: {
                include: {
                    tier: {
                        include: {
                            organizer: true
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
    
    if (order.registrations.length > 0) {
        // Course/period order
        const organizers = new Set(
            order.registrations
                .map(r => r.track?.period?.organizer)
                .filter((org): org is NonNullable<typeof org> => org !== null)
        )
        
        if (organizers.size === 0) throw new Error('No organizer found for order')
        if (organizers.size > 1) {
            throw new Error('Orders with multiple organizers are not supported. Please checkout separately.')
        }
        
        organizer = Array.from(organizers)[0]
    } else if (order.memberships.length > 0) {
        // Membership order
        const organizers = new Set(
            order.memberships
                .map(m => m.tier?.organizer)
                .filter((org): org is NonNullable<typeof org> => org !== null)
        )
        
        if (organizers.size === 0) throw new Error('No organizer found for membership order')
        if (organizers.size > 1) {
            throw new Error('Membership orders with multiple organizers are not supported. Please checkout separately.')
        }
        
        organizer = Array.from(organizers)[0]
    } else {
        throw new Error('Order has no registrations or memberships')
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

    // Update order with checkout ref
    await prisma.order.update({
        where: { id: orderId },
        data: {
            providerCheckoutRef: session.id
        }
    })

    return session.url
}

