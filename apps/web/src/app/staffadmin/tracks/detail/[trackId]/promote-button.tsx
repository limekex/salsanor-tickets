'use client'

import { Button } from '@/components/ui/button'
import { promoteToOffered } from '@/app/actions/waitlist'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

export function PromoteFromWaitlistButton({ registrationId }: { registrationId: string }) {
    const [isPending, startTransition] = useTransition()

    function handlePromote() {
        startTransition(async () => {
            try {
                const res = await promoteToOffered(registrationId)
                if (!res.success) {
                    throw new Error((res as any).error || 'Failed to promote')
                }
                toast.success('Waitlist offer sent', {
                    description: 'Participant has 48 hours to accept the offer'
                })
            } catch (e) {
                console.error(e)
                toast.error('Failed to send offer', {
                    description: e instanceof Error ? e.message : 'Unknown error'
                })
            }
        })
    }

    return (
        <Button 
            size="sm" 
            onClick={handlePromote} 
            disabled={isPending}
            variant="default"
        >
            {isPending ? 'Sending...' : 'Promote'}
        </Button>
    )
}
