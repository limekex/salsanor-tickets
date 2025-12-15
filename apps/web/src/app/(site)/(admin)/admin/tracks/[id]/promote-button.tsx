'use client'

import { Button } from '@/components/ui/button'
import { promoteToOffered } from '@/app/actions/waitlist'
import { useState, useTransition } from 'react'

export function PromoteButton({ registrationId }: { registrationId: string }) {
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | null>(null)

    function handlePromote() {
        startTransition(async () => {
            try {
                const res = await promoteToOffered(registrationId)
                if (!res.success) throw new Error('Failed')
            } catch (e) {
                setError('Failed')
                console.error(e)
            }
        })
    }

    return (
        <div className="flex flex-col items-end">
            <Button size="sm" onClick={handlePromote} disabled={isPending}>
                {isPending ? 'Sending...' : 'Promote'}
            </Button>
            {error && <span className="text-xs text-red-500">{error}</span>}
        </div>
    )
}
