'use server'

import { createStripeCheckout } from '@/lib/payments/stripe'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { prisma } from '@/lib/db'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function payOrder(orderId: string) {
    const headersList = await headers()
    const origin = headersList.get('origin') || 'http://localhost:3000'

    try {
        const url = await createStripeCheckout(
            orderId,
            `${origin}/success?orderId=${orderId}`, // simple success page
            `${origin}/profile` // cancel goes back to profile
        )
        if (url) redirect(url)
    } catch (e: any) {
        console.error(e)
        // If redirect throws (Next.js specific), let it bubble
        if (e.message === 'NEXT_REDIRECT') throw e
        return { error: e.message }
    }
}

export async function cancelOrder(orderId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        return { error: 'Not authenticated' }
    }

    try {
        // Get order with user verification
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { 
                purchaser: true,
                registrations: true
            }
        })

        if (!order) {
            return { error: 'Order not found' }
        }

        // Verify user owns this order
        const userAccount = await prisma.userAccount.findUnique({
            where: { supabaseUid: user.id },
            include: { personProfile: true }
        })

        if (order.purchaserPersonId !== userAccount?.personProfile?.id) {
            return { error: 'Not authorized' }
        }

        // Only allow canceling unpaid orders
        if (order.status !== 'DRAFT' && order.status !== 'PENDING') {
            return { error: 'Cannot cancel paid orders' }
        }

        // Delete registrations and order
        await prisma.$transaction([
            prisma.registration.deleteMany({
                where: { orderId: orderId }
            }),
            prisma.order.delete({
                where: { id: orderId }
            })
        ])

        revalidatePath('/profile')
        return { success: true }
    } catch (e: any) {
        console.error(e)
        return { error: e.message || 'Failed to cancel order' }
    }
}
