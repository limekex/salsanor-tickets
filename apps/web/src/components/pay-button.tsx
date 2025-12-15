
'use client'

import { Button } from '@/components/ui/button'
import { payOrder } from '@/app/actions/payments'
import { useTransition, useState } from 'react'

export function PayButton({ orderId }: { orderId: string }) {
    const [error, setError] = useState<string | null>(null)
    const [isPending, startTransition] = useTransition()

    return (
        <div className="w-full">
            <Button
                size="sm"
                className="w-full mt-4"
                onClick={() => startTransition(async () => {
                    setError(null)
                    const res = await payOrder(orderId)
                    if (res?.error) setError(res.error)
                })}
                disabled={isPending}
            >
                {isPending ? 'Redirecting...' : 'Pay Now'}
            </Button>
            {error && <p className="text-xs text-destructive mt-2 text-center">{error}</p>}
        </div>
    )
}
