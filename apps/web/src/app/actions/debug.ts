'use server'

import { fulfillOrder } from '@/lib/fulfillment/service'
import { requireAdmin } from '@/utils/auth-admin'

export async function simulateFulfillment(orderId: string) {
    await requireAdmin()
    console.log(`Simulating fulfillment for ${orderId}`)
    await fulfillOrder(orderId, 'simulated_ref_' + Date.now())
    return { success: true }
}
