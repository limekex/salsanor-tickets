
import Stripe from 'stripe'
import { prisma } from '@/lib/db'

// Helper to get active keys
async function getStripeClient() {
    // 1. Try DB config first for dynamic settings
    const config = await prisma.paymentConfig.findUnique({
        where: { provider: 'STRIPE' }
    })

    if (config?.enabled) {
        const key = config.isTest ? config.secretKey : config.secretKey
        // Fallback to ENV if DB key missing? 
        // For security, specs often say put keys in ENV. 
        // But user asked for DYNAMIC settings.
        // If key is present in DB, use it. Else use ENV.

        const validKey = key || process.env.STRIPE_SECRET_KEY

        if (validKey) {
            return new Stripe(validKey, {
                apiVersion: '2025-11-17.clover' as any,
                typescript: true,
            })
        }
    } else {
        // If DB config not found or disabled, fallback to ENV for MVP if configured
        if (process.env.STRIPE_SECRET_KEY) {
            return new Stripe(process.env.STRIPE_SECRET_KEY, {
                apiVersion: '2025-11-17.clover' as any,
                typescript: true,
            })
        }
    }

    // Return null or throw?
    return null
}

export async function createStripeCheckout(orderId: string, successUrl: string, cancelUrl: string) {
    const stripe = await getStripeClient()
    if (!stripe) {
        console.error('Stripe client init failed. Check DB config or ENV.')
        throw new Error('Payment provider not configured. Please contact admin.')
    }

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { registrations: { include: { track: true } } }
    })

    if (!order) throw new Error('Order not found')
    if (order.status === 'PAID') throw new Error('Order already paid')

    // Construct line items
    // Using simple total item for MVP to avoid complex mismatch handling with discounts?
    // Stripe supports Discounts, but our engine already calculated final prices.
    // Easiest is to send the FINAL line items as "Custom Amounts" or just products.
    // OR create "Ad-hoc" valid line items.

    // We cached the details in pricingSnapshot. But let's verify.
    // Better practice: Send 1 line item "Course Registration" with the TOTAL amount.
    // Why? Because discount logic is complex to map 1:1 to Stripe Coupons on the fly.
    // Display details in the "Description".

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'nok',
                    product_data: {
                        name: 'SalsaNor Course Registration',
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
            orderId: order.id
        }
    })

    // Update order with checkout ref
    await prisma.order.update({
        where: { id: orderId },
        data: {
            providerCheckoutRef: session.id
        }
    })

    return session.url
}
