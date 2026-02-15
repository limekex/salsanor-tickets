'use server'

import { prisma } from '@/lib/db'
import { requireAdmin } from '@/utils/auth-admin'
import { requireOrgAdmin } from '@/utils/auth-org-admin'
import Stripe from 'stripe'

/**
 * Sync Stripe fees for an order by fetching the balance transaction from Stripe
 * This is useful when the webhook missed the charge.updated event
 */
export async function syncStripeFees(orderId: string): Promise<{ success: boolean; message: string }> {
    // Try admin first, then org admin
    let isAdmin = false
    let userAccount = null
    
    try {
        await requireAdmin()
        isAdmin = true
    } catch {
        // Not admin, try org admin
        userAccount = await requireOrgAdmin()
    }

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
            Payment: true,
            Organizer: {
                select: {
                    id: true,
                    stripeConnectAccountId: true
                }
            }
        }
    })

    if (!order) {
        return { success: false, message: 'Order not found' }
    }

    // If org admin (not global admin), verify they have access to this order's org
    if (!isAdmin && userAccount) {
        const hasAccess = userAccount.UserAccountRole.some(
            role => role.organizerId === order.organizerId
        )
        if (!hasAccess) {
            return { success: false, message: 'You do not have access to this order' }
        }
    }

    if (!order.stripeChargeId) {
        return { success: false, message: 'No Stripe PaymentIntent ID on this order' }
    }

    const payment = order.Payment[0]
    if (!payment) {
        return { success: false, message: 'No payment record found for this order' }
    }

    // Check if already synced
    if (payment.stripeFeeCents !== null) {
        return { success: true, message: `Already synced: Stripe fee ${payment.stripeFeeCents} cents` }
    }

    // Get Stripe API key
    const config = await prisma.paymentConfig.findUnique({ where: { provider: 'STRIPE' } })
    const apiKey = config?.secretKey || process.env.STRIPE_SECRET_KEY

    if (!apiKey) {
        return { success: false, message: 'No Stripe API key configured' }
    }

    try {
        // For Connect payments, we need to use the connected account context
        const stripeOptions: Stripe.StripeConfig = { apiVersion: '2025-11-17.clover' as any }
        if (order.Organizer.stripeConnectAccountId) {
            stripeOptions.stripeAccount = order.Organizer.stripeConnectAccountId
        }

        const stripe = new Stripe(apiKey, stripeOptions)

        // Retrieve the PaymentIntent to get the charge
        const paymentIntent = await stripe.paymentIntents.retrieve(order.stripeChargeId, {
            expand: ['latest_charge']
        })

        const charge = paymentIntent.latest_charge as Stripe.Charge | null
        if (!charge) {
            return { success: false, message: 'No charge found on PaymentIntent' }
        }

        if (!charge.balance_transaction) {
            return { success: false, message: 'No balance transaction on charge yet (payment may be processing)' }
        }

        // Retrieve the balance transaction
        const balanceTransactionId = typeof charge.balance_transaction === 'string' 
            ? charge.balance_transaction 
            : charge.balance_transaction.id

        const balanceTransaction = await stripe.balanceTransactions.retrieve(balanceTransactionId)

        // Extract only the Stripe processing fee (not application fee)
        let stripeFeeCents = 0
        if (balanceTransaction.fee_details && balanceTransaction.fee_details.length > 0) {
            for (const feeDetail of balanceTransaction.fee_details) {
                if (feeDetail.type === 'stripe_fee') {
                    stripeFeeCents += feeDetail.amount
                }
            }
        } else {
            stripeFeeCents = balanceTransaction.fee
        }

        const netAmountCents = balanceTransaction.net

        // Update the Payment record
        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                stripeFeeCents,
                netAmountCents,
                stripeBalanceTransactionId: balanceTransactionId
            }
        })

        return { 
            success: true, 
            message: `Synced: Stripe fee ${stripeFeeCents} cents, Net ${netAmountCents} cents` 
        }

    } catch (error: any) {
        console.error('Error syncing Stripe fees:', error)
        return { success: false, message: `Stripe API error: ${error.message}` }
    }
}

/**
 * Sync Stripe fees for all orders missing fee data
 * @param organizerId - Optional: limit to a specific organization (required for org admins)
 */
export async function syncAllMissingStripeFees(organizerId?: string): Promise<{ success: boolean; message: string; synced: number; failed: number; total: number }> {
    // Try admin first, then org admin
    let isAdmin = false
    let userAccount = null
    
    try {
        await requireAdmin()
        isAdmin = true
    } catch {
        // Not admin, try org admin
        userAccount = await requireOrgAdmin()
    }

    // Build the where clause
    const whereClause: any = {
        status: 'PAID',
        stripeChargeId: { not: null },
        Payment: {
            some: {
                stripeFeeCents: null
            }
        }
    }

    // If org admin, require organizerId and verify access
    if (!isAdmin) {
        if (!organizerId) {
            return { success: false, message: 'Organization ID required for org admins', synced: 0, failed: 0, total: 0 }
        }
        
        const hasAccess = userAccount!.UserAccountRole.some(
            role => role.organizerId === organizerId
        )
        if (!hasAccess) {
            return { success: false, message: 'You do not have access to this organization', synced: 0, failed: 0, total: 0 }
        }
        
        whereClause.organizerId = organizerId
    } else if (organizerId) {
        // Admin can optionally filter by org
        whereClause.organizerId = organizerId
    }

    // Find all paid orders with payments missing stripeFeeCents
    const orders = await prisma.order.findMany({
        where: whereClause,
        select: { id: true }
    })

    let synced = 0
    let failed = 0

    for (const order of orders) {
        const result = await syncStripeFees(order.id)
        if (result.success && !result.message.startsWith('Already')) {
            synced++
        } else if (!result.success) {
            failed++
            console.log(`Failed to sync order ${order.id}: ${result.message}`)
        }
    }

    return {
        success: true,
        message: synced > 0 
            ? `Synced ${synced} orders` 
            : (orders.length === 0 ? 'No orders need syncing' : `No new fees synced`),
        synced,
        failed,
        total: orders.length
    }
}
