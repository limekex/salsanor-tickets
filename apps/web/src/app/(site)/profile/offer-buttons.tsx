'use client'

import { Button } from '@/components/ui/button'
import { acceptWaitlistOffer, declineWaitlistOffer } from '@/app/actions/waitlist'
import { useState, useTransition } from 'react'
import { payOrder } from '@/app/actions/payments'

export function AcceptOfferButton({ registrationId }: { registrationId: string }) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    function handleAccept() {
        startTransition(async () => {
            try {
                const res = await acceptWaitlistOffer(registrationId)
                if (res.success && res.orderId) {
                    // Redirect to pay
                    await payOrder(res.orderId)
                }
            } catch (e: any) {
                setError(e.message || 'Failed')
            }
        })
    }

    return (
        <div className="flex flex-col">
            <Button size="sm" onClick={handleAccept} disabled={isPending} className="bg-orange-600 hover:bg-orange-700 text-white">
                {isPending ? 'Processing...' : 'Accept & Pay'}
            </Button>
            {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
    )
}

export function DeclineOfferButton({ registrationId }: { registrationId: string }) {
    const [isPending, startTransition] = useTransition()

    function handleDecline() {
        if (!confirm('Are you sure you want to decline this spot? It will be offered to the next person.')) return

        startTransition(async () => {
            await declineWaitlistOffer(registrationId)
        })
    }

    return (
        <Button size="sm" variant="outline" onClick={handleDecline} disabled={isPending} className="text-orange-800 border-orange-200 hover:bg-orange-100">
            {isPending ? 'Declining...' : 'Decline'}
        </Button>
    )
}
