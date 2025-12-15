'use server'

import { createStripeCheckout } from '@/lib/payments/stripe'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

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
